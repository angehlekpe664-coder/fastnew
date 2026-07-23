export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
    </div>
  );
}

export function Skeleton({ className = "h-20" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}
