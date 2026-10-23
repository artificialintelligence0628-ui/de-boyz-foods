import { Plus, Minus } from 'lucide-react';
import { money } from '../api.js';
import { useCart } from '../context/CartContext.jsx';

// Shared card for groceries (type="product") and hot meals (type="meal").
export default function ItemCard({ item, type, accent = 'green' }) {
  const cart = useCart();
  const line = cart.items.find((c) => c.type === type && c.id === item.id);
  const soldOut = type === 'product' && !item.in_stock;
  const tone = accent === 'red' ? 'btn-red' : 'btn-green';
  const entry = { ...item, type };

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-black/5 bg-white transition hover:shadow-card">
      <div className="aspect-square bg-[#F1F0EE]">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-black/30"><Plus strokeWidth={1.25} className="h-12 w-12" /></div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-sans text-lg font-medium leading-snug">{item.name}</h3>
        {item.unit && <p className="text-black/55">{item.unit}</p>}
        {item.description && <p className="mt-3 text-black/65">{item.description}</p>}

        <div className="mt-auto flex items-center justify-between pt-5">
          <span className="font-display text-2xl font-bold">{money(item.price)}</span>
          {soldOut ? (
            <span className="text-sm font-medium text-chili">Out of stock</span>
          ) : line ? (
            <div className="flex items-center gap-2">
              <button onClick={() => cart.setQty(entry, line.qty - 1)} className="btn-ghost h-10 w-10 p-0" aria-label={`Remove one ${item.name}`}><Minus className="h-4 w-4" /></button>
              <span className="w-5 text-center font-semibold">{line.qty}</span>
              <button onClick={() => cart.add(entry)} className={`${tone} h-10 w-10 p-0`} aria-label={`Add one ${item.name}`}><Plus className="h-4 w-4" /></button>
            </div>
          ) : (
            <button onClick={() => cart.add(entry)} className="inline-flex items-center gap-2 rounded-full bg-black/[0.05] px-5 py-2.5 font-semibold hover:bg-black/10">
              <Plus className="h-4 w-4" /> Add
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
