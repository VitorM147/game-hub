import { CREATORS } from "@/data/creators";

export function CreatorsList() {
  return (
    <ul className="divide-y divide-line-soft border border-line bg-surface">
      {CREATORS.map((c) => (
        <li key={c.ra} className="flex items-baseline justify-between gap-4 px-5 py-3">
          <span className="font-display text-xl font-semibold">{c.name}</span>
          <span className="label shrink-0 text-mute">RA {c.ra}</span>
        </li>
      ))}
    </ul>
  );
}
