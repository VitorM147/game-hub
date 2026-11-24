import Link from "next/link";

/** Marca própria: quadrado com canto cortado + wordmark. Sem ícone genérico de gamepad. */
export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={className} aria-hidden="true">
      <path d="M0 0h20l8 8v20H0z" fill="#9be15d" />
      <path d="M7 8h5v5H7zM16 15h5v5h-5zM7 15h5v5H7z" fill="#0d1707" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-2.5" aria-label="Game Hub — página inicial">
      <LogoMark />
      <span className="font-display text-[22px] font-bold uppercase leading-none tracking-[0.14em] text-ink">
        Game<span className="text-accent">Hub</span>
      </span>
    </Link>
  );
}
