import type { ReactNode } from 'react';

export function Section({
  children,
  className = '',
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`container-x py-16 sm:py-20 ${className}`}>
      {children}
    </section>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="h-eyebrow">{children}</p>;
}

export function SectionHead({
  eyebrow,
  title,
  sub,
  center,
}: {
  eyebrow?: string;
  title: ReactNode;
  sub?: ReactNode;
  center?: boolean;
}) {
  return (
    <div className={`max-w-3xl ${center ? 'mx-auto text-center' : ''}`}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h2>
      {sub && <p className="mt-3 text-[15px] leading-relaxed text-ink-dim">{sub}</p>}
    </div>
  );
}

export function Card({
  children,
  className = '',
  accent,
}: {
  children: ReactNode;
  className?: string;
  accent?: 'specter' | 'safe' | 'block' | 'review';
}) {
  const ring =
    accent === 'specter'
      ? 'hover:border-specter/40'
      : accent === 'safe'
        ? 'hover:border-safe/40'
        : accent === 'block'
          ? 'hover:border-block/40'
          : accent === 'review'
            ? 'hover:border-review/40'
            : 'hover:border-line';
  return <div className={`panel p-5 transition ${ring} ${className}`}>{children}</div>;
}

export function Stat({ value, label, accent }: { value: string; label: string; accent?: string }) {
  return (
    <div className="panel px-5 py-6">
      <div className={`kpi ${accent ?? ''}`}>{value}</div>
      <div className="mt-1.5 text-sm text-ink-dim">{label}</div>
    </div>
  );
}

export function Pill({
  children,
  tone = 'specter',
}: {
  children: ReactNode;
  tone?: 'specter' | 'safe' | 'block' | 'review';
}) {
  const m = {
    specter: 'text-specter-soft border-specter/30 bg-specter/10',
    safe: 'text-safe border-safe/30 bg-safe/10',
    block: 'text-block border-block/30 bg-block/10',
    review: 'text-review border-review/30 bg-review/10',
  }[tone];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${m}`}
    >
      {children}
    </span>
  );
}
