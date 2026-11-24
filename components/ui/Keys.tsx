import type { ControlBinding } from "@/types/game";

export function Keys({ keys }: { keys: string[] }) {
  return (
    <span className="inline-flex flex-nowrap gap-1" aria-label={keys.join(" ")}>
      {keys.map((k) => (
        <kbd key={k} className="keycap">
          {k}
        </kbd>
      ))}
    </span>
  );
}

export function ControlsList({ controls, compact = false }: { controls: ControlBinding[]; compact?: boolean }) {
  return (
    <dl className={compact ? "space-y-2.5" : "divide-y divide-line-soft"}>
      {controls.map((c) => (
        <div key={c.action} className={compact ? "flex items-center gap-3" : "flex items-center gap-4 py-3"}>
          <dt className={compact ? "w-[8.5rem] shrink-0" : "w-44 shrink-0"}>
            <Keys keys={c.keys} />
          </dt>
          <dd className="text-[14px] leading-snug text-mute">{c.action}</dd>
        </div>
      ))}
    </dl>
  );
}
