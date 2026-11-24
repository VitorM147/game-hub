import Link from "next/link";

export function Tag({ children, href }: { children: React.ReactNode; href?: string }) {
  const cls =
    "label inline-flex items-center border border-line px-2 py-1 text-mute transition-colors rounded-xs";
  return href ? (
    <Link href={href} className={`${cls} hover:border-mute hover:text-ink`}>
      {children}
    </Link>
  ) : (
    <span className={cls}>{children}</span>
  );
}
