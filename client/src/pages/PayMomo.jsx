import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Smartphone, CheckCircle2, XCircle, Loader2, KeyRound } from 'lucide-react';
import { api, money } from '../api.js';
import { NETWORKS, guessNetwork, normalizePhone } from '../momo.js';
import NetworkPicker from '../components/NetworkPicker.jsx';

const POLL_MS = 4000;
const GIVE_UP_MS = 150000; // mobile money prompts expire after a couple of minutes
const DEFAULT_CODE_HELP = 'Dial *110# to generate a voucher code, then enter it below.'; // Telecel

// Defined outside PayMomo so inputs keep focus while typing.
const Card = ({ children }) => <div className="mx-auto max-w-md px-4 py-16 text-center">{children}</div>;

export default function PayMomo() {
  const { orderNo } = useParams();
  const { state } = useLocation();
  const nav = useNavigate();
  const started = useRef(false);

  const [order, setOrder] = useState(null);
  const [stage, setStage] = useState('loading'); // loading | form | otp | waiting | paid | failed | timeout
  const [phone, setPhone] = useState(state?.phone || '');
  const [picked, setPicked] = useState(state?.network || null); // customer's choice; falls back to a guess from the number
  const [networks, setNetworks] = useState({ mtn: true, telecel: false, airteltigo: false }); // id -> can pay online
  const [code, setCode] = useState('');
  const [codeHelp, setCodeHelp] = useState('');
  const [error, setError] = useState('');

  const network = picked || guessNetwork(phone);
  const label = network ? NETWORKS[network].label : 'mobile money';

  async function start(p = phone, n = network) {
    setError('');
    if (!normalizePhone(p)) return setError('Enter a valid mobile money number, e.g. 024 123 4567');
    if (!n) return setError('Choose your mobile money network');
    setStage('waiting');
    try {
      const res = await api.chargeMomo(orderNo, p, n);
      if (res.next === 'otp') { setCodeHelp(res.message || DEFAULT_CODE_HELP); setCode(''); setStage('otp'); }
    } catch (e) {
      setError(e.message);
      setStage('form');
    }
  }

  async function sendCode(e) {
    e.preventDefault();
    setError('');
    if (!/^[A-Za-z0-9]{4,10}$/.test(code.trim())) return setError('Enter the voucher code from your phone');
    setStage('waiting');
    try {
      await api.submitMomoCode(orderNo, code.trim());
    } catch (err) {
      setError(err.message);
      setStage('otp');
    }
  }

  useEffect(() => {
    api.paymentNetworks().then((list) => setNetworks(Object.fromEntries(list.map((n) => [n.id, n.available])))).catch(() => {});
  }, []);

  useEffect(() => {
    api.trackOrder(orderNo).then((o) => {
      setOrder(o);
      if (o.payment_status === 'paid') return setStage('paid');
      if (o.payment_method !== 'momo_now') return nav(`/order/${orderNo}`, { replace: true });
      const n = state?.network || o.payment_network || guessNetwork(state?.phone);
      if (!picked && n) setPicked(n);
      // The server refuses a network that can't take online payment and says so; start() shows that message.
      if (state?.phone && n && !started.current) { started.current = true; start(state.phone, n); }
      else setStage('form');
    }).catch((e) => { setError(e.message); setStage('failed'); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNo]);

  // While the customer approves on their phone, ask the server every few seconds.
  useEffect(() => {
    if (stage !== 'waiting') return;
    const began = Date.now();
    const id = setInterval(async () => {
      try {
        const { payment_status } = await api.paymentStatus(orderNo);
        if (payment_status === 'paid') setStage('paid');
        else if (payment_status === 'failed') { setError('The payment was declined or cancelled.'); setStage('failed'); }
        else if (Date.now() - began > GIVE_UP_MS) setStage('timeout');
      } catch { /* keep polling through network blips */ }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [stage, orderNo]);

  useEffect(() => {
    if (stage !== 'paid') return;
    const t = setTimeout(() => nav(`/order/${orderNo}`, { replace: true }), 2000);
    return () => clearTimeout(t);
  }, [stage, orderNo, nav]);

  const amount = order ? money(order.total) : '';

  if (stage === 'loading') return <Card><Loader2 className="mx-auto h-8 w-8 animate-spin text-leaf" /></Card>;

  if (stage === 'paid') return (
    <Card>
      <CheckCircle2 className="mx-auto h-14 w-14 text-leaf" />
      <h1 className="mt-5 text-3xl font-extrabold">Payment received</h1>
      <p className="mt-2 text-black/65">{amount} paid for order {orderNo}. Taking you to your order...</p>
      <Link to={`/order/${orderNo}`} className="btn-green mt-6">View order</Link>
    </Card>
  );

  if (stage === 'otp') return (
    <Card>
      <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-leaf-soft"><KeyRound className="h-9 w-9 text-leaf" /></span>
      <h1 className="mt-6 text-3xl font-extrabold">Enter your voucher code</h1>
      <p className="mt-2 text-lg text-black/70">{codeHelp}</p>
      <form onSubmit={sendCode} className="mt-6 space-y-4 text-left">
        <div>
          <label className="label" htmlFor="vc">Voucher code</label>
          <input id="vc" className="field" inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        {error && <p role="alert" className="text-sm text-chili">{error}</p>}
        <button className="btn-green w-full py-3.5">Confirm payment of {amount}</button>
      </form>
    </Card>
  );

  if (stage === 'waiting') return (
    <Card>
      <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-leaf-soft"><Smartphone className="h-9 w-9 text-leaf" /></span>
      <h1 className="mt-6 text-3xl font-extrabold">Check your phone</h1>
      <p className="mt-2 text-lg text-black/70">Approve the payment of <strong>{amount}</strong> and enter your {label} PIN.</p>
      <p className="mt-6 flex items-center justify-center gap-2 text-sm text-black/60"><Loader2 className="h-4 w-4 animate-spin" /> Waiting for your approval...</p>
      <p className="mx-auto mt-6 max-w-sm rounded-xl bg-black/[0.04] p-3 text-xs text-black/60">
        {network === 'mtn'
          ? 'No prompt? Dial *170# and check My Approvals, or try again.'
          : 'No prompt? Check that the number is on the network you picked, then try again.'}
      </p>
    </Card>
  );

  if (stage === 'failed' || stage === 'timeout') return (
    <Card>
      <XCircle className="mx-auto h-14 w-14 text-chili" />
      <h1 className="mt-5 text-3xl font-extrabold">{stage === 'timeout' ? "We didn't get your approval" : "Payment didn't go through"}</h1>
      <p className="mt-2 text-black/65">{error || 'The prompt may have expired. Your order is saved, so you can try again.'}</p>
      <div className="mt-6 flex justify-center gap-3">
        <button className="btn-green" onClick={() => { setError(''); setStage('form'); }}>Try again</button>
        <Link to={`/order/${orderNo}`} className="btn-ghost">View order</Link>
      </div>
    </Card>
  );

  // stage === 'form'
  return (
    <Card>
      <h1 className="text-3xl font-extrabold">Pay {amount}</h1>
      <p className="mt-2 text-black/65">Order {orderNo}. We'll send a prompt to your {label} number.</p>
      <form onSubmit={(e) => { e.preventDefault(); start(); }} className="mt-6 space-y-4 text-left">
        <div>
          <p className="label">Network</p>
          <NetworkPicker value={network} onChange={setPicked} available={networks} />
        </div>
        <div><label className="label" htmlFor="mp">{label} number</label><input id="mp" className="field" inputMode="tel" required placeholder="024 000 0000" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        {error && <p role="alert" className="text-sm text-chili">{error}</p>}
        <button className="btn-green w-full py-3.5"><Smartphone className="h-4 w-4" /> Send prompt to my phone</button>
      </form>
    </Card>
  );
}
