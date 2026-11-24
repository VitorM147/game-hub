import Link from "next/link";

export function SectionHeading({
  id,
  title,
  eyebrow,
  action,
}: {
  id?: string;
  title: string;
  eyebrow?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 border-b border-line pb-3">
      <div>
        {eyebrow && <p className="label mb-1.5 text-accent">{eyebrow}</p>}
        <h2 id={id} className="font-display text-[30px] font-bold uppercase leading-none tracking-[0.03em]">
          {title}
        </h2>
      </div>
      {action && (
        <Link href={action.href} className="label shrink-0 text-mute transition-colors hover:text-ink">
          {action.label} →
        </Link>
      )}
    </div>
  );
}
