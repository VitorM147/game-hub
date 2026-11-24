import Link from "next/link";
import { BRAND } from "@/config/brand";

/** Marca própria: bloco de canto cortado com um "J" em pixels e um botão redondo. Sem ícone genérico de gamepad. */
export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  const cells: Array<[number, number]> = [[0, 3], [1, 3], [2, 3], [3, 0], [3, 3], [4, 1], [4, 2]];
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d="M0 0H23L32 9V32H0Z" fill="#9be15d" />
      {cells.map(([r, c]) => (
        <rect key={`${r}${c}`} x={5 + c * 4.4 + 0.5} y={5.2 + r * 4.4 + 0.5} width="3.4" height="3.4" fill="#0d1707" />
      ))}
      <circle cx="11.6" cy="9.8" r="2.6" fill="#0d1707" />
    </svg>
  );
}

export function Wordmark({ className = "text-[22px]" }: { className?: string }) {
  return (
    <span className={`font-display font-bold uppercase leading-none tracking-[0.14em] text-ink ${className}`}>
      <span className="text-accent">Joy</span>Station
    </span>
  );
}

export function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-2.5" aria-label={`${BRAND.name} — página inicial`}>
      <LogoMark />
      <Wordmark />
    </Link>
  );
}
