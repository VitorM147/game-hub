import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2.5 font-display text-[17px] font-semibold uppercase tracking-[0.08em] transition-colors duration-150 select-none disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "h-12 bg-accent pr-5 pl-0 text-accent-ink hover:bg-[#b0ee7a] active:bg-[#88cc4c] rounded-xs",
  secondary: "h-12 px-5 border border-line bg-surface text-ink hover:border-mute hover:bg-card rounded-xs",
  ghost: "h-10 px-3 text-mute hover:text-ink rounded-xs",
};

/** Ícone do botão primário vira um bloco escuro encostado à esquerda (assinatura visual da JoyStation). */
function Inner({ variant, icon, children }: { variant: Variant; icon?: ReactNode; children: ReactNode }) {
  if (variant === "primary") {
    return (
      <>
        <span className="grid h-12 w-12 place-items-center bg-[#0d1707] text-accent">{icon}</span>
        <span>{children}</span>
      </>
    );
  }
  return (
    <>
      {icon}
      <span>{children}</span>
    </>
  );
}

type CommonProps = { variant?: Variant; icon?: ReactNode; className?: string; children: ReactNode };

export function ButtonLink({
  variant = "secondary",
  icon,
  className = "",
  children,
  ...props
}: CommonProps & ComponentProps<typeof Link>) {
  return (
    <Link className={`${base} ${variants[variant]} ${className}`} {...props}>
      <Inner variant={variant} icon={icon}>
        {children}
      </Inner>
    </Link>
  );
}

export function ExternalButton({
  variant = "secondary",
  icon,
  className = "",
  children,
  ...props
}: CommonProps & ComponentProps<"a">) {
  return (
    <a className={`${base} ${variants[variant]} ${className}`} {...props}>
      <Inner variant={variant} icon={icon}>
        {children}
      </Inner>
    </a>
  );
}

export function Button({
  variant = "secondary",
  icon,
  className = "",
  children,
  ...props
}: CommonProps & ComponentProps<"button">) {
  return (
    <button type="button" className={`${base} ${variants[variant]} ${className}`} {...props}>
      <Inner variant={variant} icon={icon}>
        {children}
      </Inner>
    </button>
  );
}
