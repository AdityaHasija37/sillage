export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-5xl leading-none">{title}</h1>
      {subtitle && <p className="mt-3 text-muted-foreground">{subtitle}</p>}
      <div className="mt-8">{children}</div>
    </div>
  );
}
