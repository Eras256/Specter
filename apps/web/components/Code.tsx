export function Code({ title, children }: { title?: string; children: string }) {
  return (
    <div className="panel overflow-hidden">
      {title && (
        <div className="flex items-center gap-2 border-b border-line bg-panel-2 px-4 py-2">
          <span className="dot dot-review" />
          <span className="mono text-[11px] text-ink-faint">{title}</span>
        </div>
      )}
      <pre className="scroll-thin overflow-x-auto px-4 py-4">
        <code className="mono whitespace-pre text-ink">{children}</code>
      </pre>
    </div>
  );
}
