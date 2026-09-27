export function EmptyState({ title, body, action }) {
  return (
    <div className="card text-center py-12 border-dashed animate-fade-in">
      <h3 className="text-lg font-bold mb-1">{title}</h3>
      {body && <p className="text-muted max-w-md mx-auto">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="rounded-lg bg-red-50 border border-clay/30 text-clay px-4 py-3 text-sm font-medium animate-banner-in" role="alert">
      {message}
    </div>
  );
}

export function SuccessBanner({ message }) {
  if (!message) return null;
  return (
    <div className="rounded-lg bg-pine-50 border border-pine-300 text-pine-700 px-4 py-3 text-sm font-medium animate-banner-in" role="status">
      {message}
    </div>
  );
}
