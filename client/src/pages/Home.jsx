import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Leaf, Flame, Truck, Wallet, Clock, MousePointerClick } from 'lucide-react';
import { api, money } from '../api.js';
import ItemCard from '../components/ItemCard.jsx';

function HeroCard({ tone, badge, BadgeIcon, title, text, cta, to, image }) {
  const green = tone === 'green';
  return (
    <section className={`relative flex min-h-[16rem] flex-col justify-between overflow-hidden rounded-3xl p-6 text-white shadow-card ${green ? 'bg-leaf' : 'bg-chili'}`}>
      {/* Drop photos at client/public/images/groceries.jpg and food.jpg; the card still looks right without them. */}
      <img src={image} alt="" onError={(e) => (e.currentTarget.style.display = 'none')}
        className="absolute right-0 top-0 hidden h-[62%] w-[34%] object-cover sm:block" />
      <div className="relative max-w-[62%] sm:max-w-[60%]">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
          <BadgeIcon className="h-4 w-4" /> {badge}
        </span>
        <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h2>
        <p className="mt-2 text-base leading-snug text-white/90">{text}</p>
      </div>
      <Link to={to} className={`relative mt-6 flex items-center justify-between gap-2 rounded-full bg-white px-6 py-2.5 text-base font-bold ${green ? 'text-leaf' : 'text-chili'}`}>
        <span className="flex items-center gap-3">{cta} <ArrowRight className="h-5 w-5" /></span>
      </Link>
    </section>
  );
}

export default function Home() {
  const [meals, setMeals] = useState(null);
  const [settings, setSettings] = useState({ freeDeliveryThreshold: 200 });

  useEffect(() => {
    api.mealsToday().then((m) => setMeals(Array.isArray(m) ? m : [])).catch(() => setMeals([]));
    api.storeSettings().then(setSettings).catch(() => {});
  }, []);

  const trust = [
    { Icon: Truck, title: 'Free Delivery', text: `On orders over ${money(settings.freeDeliveryThreshold)}` },
    { Icon: Wallet, title: 'Pay on Delivery', text: 'MoMo or cash' },
    { Icon: Clock, title: 'Fresh Daily', text: 'Meals cooked today' },
    { Icon: MousePointerClick, title: 'Easy Ordering', text: 'No account needed' },
  ];

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pb-8 pt-8 sm:px-6">
        <p className="text-center text-xs font-bold uppercase tracking-[0.25em] text-leaf">
          Fresh groceries &amp; hot Ghanaian meals, ordered in minutes.
        </p>
        <h1 className="mt-4 text-center text-2xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
          What would you like today?
        </h1>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <HeroCard tone="green" BadgeIcon={Leaf} badge="Fresh & everyday essentials" title="Buy Groceries"
            text="Shop for groceries and everyday essentials. Delivered to your door." cta="Shop Groceries" to="/groceries" image="/images/groceries.jpg" />
          <HeroCard tone="red" BadgeIcon={Flame} badge="Today's hot Ghanaian specials" title="Order Food"
            text="See today's available meals and place an order for pickup or delivery." cta="Order Food" to="/food" image="/images/food.jpg" />
        </div>
      </div>

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-3 text-2xl font-bold"><Flame className="h-6 w-6 text-chili" /> Today's Hot Meals</h2>
          <Link to="/food" className="font-semibold text-leaf hover:underline">View menu &rsaquo;</Link>
        </div>
        <div className="mt-5">
          {meals === null ? (
            <p className="rounded-3xl border border-dashed border-black/10 bg-white px-6 py-12 text-center text-black/50">Loading today's meals...</p>
          ) : meals.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-black/10 bg-white px-6 py-12 text-center text-black/60">
              No meals posted for today yet. Please check back later.
            </p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {meals.slice(0, 4).map((m) => <ItemCard key={m.id} item={m} type="meal" accent="red" />)}
            </div>
          )}
        </div>
      </section>

      <section className="border-t border-black/5 bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {trust.map(({ Icon, title, text }) => (
            <div key={title} className="flex items-start gap-3">
              <Icon className="mt-0.5 h-5 w-5 text-leaf" />
              <div><p className="font-display font-bold">{title}</p><p className="text-sm text-black/60">{text}</p></div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
