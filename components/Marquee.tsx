// Magic UI's marquee, restyled as the club's volt ticker tape: the same
// set of phrases twice on one track, sliding left forever (CSS in
// globals.css). The second set is hidden from screen readers.
export default function Marquee({ items }: { items: string[] }) {
  const set = (hidden: boolean) => (
    <div className="marquee-set" aria-hidden={hidden || undefined}>
      {items.map((t) => (
        <span key={t} style={{ display: "contents" }}>
          <span>{t}</span>
          <span className="marquee-dot" />
        </span>
      ))}
    </div>
  );
  return (
    <div className="marquee" role="marquee" aria-label={items.join(", ")}>
      <div className="marquee-track">
        {set(false)}
        {set(true)}
      </div>
    </div>
  );
}
