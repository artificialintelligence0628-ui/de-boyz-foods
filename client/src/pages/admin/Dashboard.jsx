import { useEffect, useState } from 'react';
import { api, money } from '../../api.js';
import { MealsManager, ProductsManager } from './CatalogManager.jsx';

const STATUSES = ['new', 'confirmed', 'preparing', 'out_for_delivery', 'completed', 'cancelled'];
const PAY = { momo_now: 'Mobile money (pay now)', momo: 'MoMo on delivery', cash: 'Cash' };
const NETWORK = { mtn: 'MTN', telecel: 'Telecel', airteltigo: 'AirtelTigo' };
const LABEL = { new: 'New', confirmed: 'Confirmed', preparing: 'Preparing', out_for_delivery: 'Out for delivery', completed: 'Completed', cancelled: 'Cancelled' };

export default function Dashboard() {
  const [tab, setTab] = useState('orders');
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    api.admin.stats().then(setStats).catch((e) => setError(e.message));
    api.admin.orders().then(setOrders).catch((e) => setError(e.message));
  };
  useEffect(load, []);

  async function setStatus(id, status) {
    try {
      const row = await api.admin.setOrderStatus(id, status);
      setOrders((cur) => cur.map((o) => (o.id === id ? { ...o, status: row.status } : o)));
    } catch (e) { setError(e.message); }
  }

  const tabBtn = (id, label) => (
    <button onClick={() => setTab(id)} className={`rounded-full px-5 py-2 text-sm font-semibold ${tab === id ? 'bg-leaf text-white' : 'bg-white ring-1 ring-black/10 hover:bg-black/5'}`}>{label}</button>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-4xl font-extrabold tracking-tight">Admin</h1>

      {stats && (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[['Orders today', stats.orders_today], ['Revenue today', money(stats.revenue_today)], ['New orders', stats.new_orders]].map(([k, v]) => (
            <div key={k} className="rounded-2xl border border-black/5 bg-white p-5">
              <p className="text-sm text-black/60">{k}</p><p className="font-display text-3xl font-bold">{v}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 flex gap-2">{tabBtn('orders', 'Orders')}{tabBtn('meals', 'Today\'s meals')}{tabBtn('products', 'Groceries')}</div>
      {error && <p role="alert" className="mt-4 text-chili">{error}</p>}

      {tab === 'orders' && (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-black/5 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-black/5 text-black/60">
              <tr><th className="p-4">Order</th><th className="p-4">Customer</th><th className="p-4">Items</th><th className="p-4">Total</th><th className="p-4">Payment</th><th className="p-4">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {orders === null && <tr><td className="p-6 text-black/50" colSpan={6}>Loading orders...</td></tr>}
              {orders?.length === 0 && <tr><td className="p-6 text-black/60" colSpan={6}>No orders yet.</td></tr>}
              {orders?.map((o) => (
                <tr key={o.id} className="align-top">
                  <td className="p-4 font-semibold">{o.order_no}<div className="text-xs font-normal text-black/50">{new Date(o.created_at).toLocaleString()}</div></td>
                  <td className="p-4">{o.customer_name}<div className="text-xs text-black/50">{o.phone}</div><div className="text-xs text-black/50">{o.fulfillment === 'pickup' ? 'Pickup' : o.address}</div></td>
                  <td className="p-4">{o.items.map((i, n) => <div key={n}>{i.qty} &times; {i.name}</div>)}</td>
                  <td className="p-4 font-semibold">{money(o.total)}</td>
                  <td className="p-4">{PAY[o.payment_method]} <span className="text-xs text-black/50">({o.payment_status})</span>{o.payment_method === 'momo_now' && NETWORK[o.payment_network] && <div className="text-xs text-black/50">{NETWORK[o.payment_network]}</div>}</td>
                  <td className="p-4">
                    <select value={o.status} onChange={(e) => setStatus(o.id, e.target.value)} className="field py-1.5" aria-label={`Status for ${o.order_no}`}>
                      {STATUSES.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'meals' && <MealsManager setError={setError} />}
      {tab === 'products' && <ProductsManager setError={setError} />}
    </div>
  );
}
