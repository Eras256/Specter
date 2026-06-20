export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 2.2 4 5.2v6.1c0 4.6 3.2 8.3 8 10.5 4.8-2.2 8-5.9 8-10.5V5.2L12 2.2Z"
          stroke="url(#g)"
          strokeWidth="1.6"
          fill="rgba(139,92,246,0.10)"
        />
        <path
          d="M8.6 12.1l2.5 2.6 4.4-5"
          stroke="#a78bfa"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <defs>
          <linearGradient id="g" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
            <stop stopColor="#a78bfa" />
            <stop offset="1" stopColor="#6d28d9" />
          </linearGradient>
        </defs>
      </svg>
      <span className="text-[15px] font-semibold tracking-tight text-ink">Specter</span>
    </span>
  );
}
