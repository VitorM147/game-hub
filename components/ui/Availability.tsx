import { AVAILABILITY_LABEL } from "@/lib/format";
import type { Availability as A } from "@/types/game";

/** Quadrado cheio = jogável agora. Vazado = só baixando. Sem cor extra fora da paleta. */
export function AvailabilityBadge({ availability, className = "" }: { availability: A; className?: string }) {
  const on = availability === "web";
  return (
    <span className={`label inline-flex items-center gap-2 ${on ? "text-accent" : "text-mute"} ${className}`}>
      <span
        aria-hidden="true"
        className={`h-2 w-2 ${on ? "bg-accent" : "border border-mute"}`}
      />
      {AVAILABILITY_LABEL[availability]}
    </span>
  );
}
