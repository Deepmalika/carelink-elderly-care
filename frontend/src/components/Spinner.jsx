export default function Spinner({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-muted">
      <div
        className="w-10 h-10 rounded-full border-4 border-pine-100 border-t-pine-500 animate-spin"
        role="status"
        aria-label={label}
      />
      <span className="text-sm">{label}</span>
    </div>
  );
}
