export function Logo({ className = '' }: { className?: string }) {
  // The Specter wordmark (white chrome lettering, transparent background) — reads
  // on the dark nav/footer. Intrinsic size is 974×267 (≈3.65:1).
  return (
    // biome-ignore lint/performance/noImgElement: a tiny static brand asset; next/image adds no value here
    <img
      src="/logo-wordmark.png"
      alt="Specter"
      width={974}
      height={267}
      className={`h-7 w-auto select-none ${className}`}
    />
  );
}
