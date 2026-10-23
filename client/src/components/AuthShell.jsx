export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-2 text-black/60">{subtitle}</p>}
      <div className="mt-6 rounded-2xl border border-black/5 bg-white p-6">{children}</div>
    </div>
  );
}
