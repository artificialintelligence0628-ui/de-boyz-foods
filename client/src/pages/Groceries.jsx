import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, Check } from 'lucide-react';
import { api } from '../api.js';
import ItemCard from '../components/ItemCard.jsx';

export default function Groceries() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const [inStockOnly, setInStockOnly] = useState(true);
  const [cats, setCats] = useState([]);
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api.categories().then(setCats).catch(() => {}); }, []);
  useEffect(() => {
    setItems(null);
    setError('');
    const p = {};
    if (q) p.q = q;
    if (category) p.category = category;
    if (inStockOnly) p.in_stock = '1';
    api.products(p).then(setItems).catch((e) => { setError(e.message); setItems([]); });
  }, [q, category, inStockOnly]);

  const pick = (id) => {
    const next = new URLSearchParams(params);
    id ? next.set('category', id) : next.delete('category');
    setParams(next);
  };
  const chip = (active) =>
    `rounded-full px-5 py-2 font-semibold transition ${active ? 'bg-leaf text-white' : 'border border-black/10 bg-white text-ink hover:bg-black/5'}`;

  return (
    <div className="px-4 pb-12 pt-8 sm:px-6">
      <h1 className="text-4xl font-extrabold tracking-tight">Groceries</h1>
      <p className="mt-1 text-lg text-black/65">
        {q ? <>Results for &ldquo;{q}&rdquo;</> : 'Fresh produce and everyday essentials, delivered to you.'}
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-2 font-semibold text-black/70"><SlidersHorizontal className="h-4 w-4" /> Categories</span>
        <button className={chip(!category)} onClick={() => pick('')}>All</button>
        {cats.map((c) => (
          <button key={c.id} className={chip(String(c.id) === category)} onClick={() => pick(c.id)}>{c.name}</button>
        ))}

        <label className="ml-auto flex cursor-pointer items-center gap-2 font-medium text-black/70">
          <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} className="peer sr-only" />
          <span className="grid h-6 w-6 place-items-center rounded-md border border-black/25 bg-white text-white peer-checked:border-leaf peer-checked:bg-leaf peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-leaf">
            <Check className={`h-4 w-4 ${inStockOnly ? '' : 'opacity-0'}`} strokeWidth={3} />
          </span>
          In stock only
        </label>
      </div>

      <div className="mt-6">
        {error && <p role="alert" className="mb-4 text-chili">{error}</p>}
        {items === null ? (
          <p className="text-black/50">Loading groceries...</p>
        ) : items.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-black/10 bg-white px-6 py-12 text-center text-black/60">
            Nothing here yet. Try another category or search.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {items.map((p) => <ItemCard key={p.id} item={p} type="product" />)}
          </div>
        )}
      </div>
    </div>
  );
}
