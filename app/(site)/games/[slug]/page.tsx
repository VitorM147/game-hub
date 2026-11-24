import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GameGrid } from "@/components/games/GameGrid";
import { PlayActions } from "@/components/games/PlayActions";
import { ShareButton } from "@/components/games/ShareButton";
import { ScreenshotGallery } from "@/components/games/ScreenshotGallery";
import { AvailabilityBadge } from "@/components/ui/Availability";
import { ControlsList } from "@/components/ui/Keys";
import { Tag } from "@/components/ui/Tag";
import { categoryLabel, getAllGames, getEditorialGames, getGameBySlug, getRelatedGames } from "@/lib/catalog";
import { formatDate, formatSize } from "@/lib/format";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return [...getAllGames(), ...getEditorialGames()].map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const game = getGameBySlug(slug);
  if (!game) return {};
  return {
    title: game.title,
    description: game.description,
    alternates: { canonical: `/games/${game.slug}` },
    openGraph: { title: game.title, description: game.description, images: [{ url: game.coverImage.src, width: game.coverImage.width, height: game.coverImage.height, alt: game.coverImage.alt }] },
  };
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="pt-12">
      <h2 id={id} className="mb-5 border-b border-line pb-3 font-display text-[28px] font-bold uppercase tracking-[0.03em]">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function GamePage({ params }: Params) {
  const { slug } = await params;
  const game = getGameBySlug(slug);
  if (!game) notFound();
  const related = getRelatedGames(game);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: game.title,
    description: game.description,
    genre: game.genre,
    image: game.coverImage.src,
    datePublished: game.releaseDate,
    inLanguage: "pt-BR",
  };

  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      {/* Banner horizontal: recorte da arte de capa na faixa do título. */}
      <div className="relative h-[210px] overflow-hidden border-b border-line bg-surface sm:h-[300px] lg:h-[380px]">
        <Image src={game.coverImage.src} alt="" fill priority sizes="100vw" className="object-cover object-top" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-base via-base/30 to-transparent" />
      </div>

      <div className="mx-auto w-full max-w-[1360px] px-4 sm:px-6 lg:px-8">
        <div className="relative -mt-20 sm:-mt-28">
          <nav aria-label="Trilha" className="label mb-3 text-mute">
            <Link href="/games" className="hover:text-ink">
              Explorar jogos
            </Link>
            <span aria-hidden="true"> / </span>
            <span className="text-ink">{game.title}</span>
          </nav>
          <h1 className="max-w-4xl font-display text-[44px] font-bold uppercase leading-[0.95] sm:text-6xl">{game.title}</h1>
          {game.tagline && <p className="mt-3 font-mono text-[12px] uppercase tracking-[0.06em] text-mute">{game.tagline}</p>}
        </div>

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0">
            {game.screenshots.length > 0 && (
<section id="galeria" aria-label="Capturas de tela">
              <ScreenshotGallery images={game.screenshots} title={game.title} />
            </section>
)}

            <Section id="sobre" title="Sobre o jogo">
              <p className="max-w-[65ch] text-[16px] leading-[1.7] text-ink/90">{game.description}</p>
              {game.mechanics && game.mechanics.length > 0 && (
                <div className="mt-6">
                  <h3 className="label mb-2 text-mute">Mecânicas principais</h3>
                  <ul className="flex flex-wrap gap-2">
                    {game.mechanics.map((m) => (
                      <li key={m} className="border border-line px-3 py-1 text-[13px] text-ink/90">{m}</li>
                    ))}
                  </ul>
                </div>
              )}
              {game.highlights && (
                <ul className="mt-5 grid gap-x-8 gap-y-2 sm:grid-cols-2">
                  {game.highlights.map((h) => (
                    <li key={h} className="flex gap-3 text-[14px] text-ink/85">
                      <span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 bg-accent" />
                      {h}
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {game.story.length > 0 && (
<Section id="historia" title="História">
              <div className="max-w-[65ch] space-y-4 text-[16px] leading-[1.7] text-ink/85">
                {game.story.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            </Section>
)}

            {game.objectives.length > 0 && (
<Section id="objetivos" title="Objetivos">
              <ol className="space-y-3">
                {game.objectives.map((o, i) => (
                  <li key={o} className="flex gap-4 text-[15px] text-ink/90">
                    <span className="label mt-1 w-6 shrink-0 text-accent">{String(i + 1).padStart(2, "0")}</span>
                    {o}
                  </li>
                ))}
              </ol>
            </Section>
)}

            {game.controls.length > 0 && (
<Section id="controles" title="Controles">
              <div className="max-w-2xl border border-line bg-surface px-5">
                <ControlsList controls={game.controls} />
              </div>
            </Section>
)}

            {game.trailerUrl && (
              <Section id="trailer" title="Trailer">
                <a href={game.trailerUrl} className="inline-flex items-center gap-2 text-accent underline underline-offset-4" target="_blank" rel="noopener noreferrer">
                  Assistir ao trailer <ExternalLink aria-hidden="true" className="h-4 w-4" />
                </a>
              </Section>
            )}

            {game.credits.length > 0 && (
<Section id="creditos" title="Créditos">
              <ul className="grid gap-px border border-line bg-line sm:grid-cols-2">
                {game.credits.map((c) => (
                  <li key={c.name} className="bg-surface p-4">
                    <p className="font-display text-xl font-semibold">{c.name}</p>
                    <p className="mt-1 text-[13px] text-mute">{c.role}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[12px] text-mute">Gráficos, sons e músicas foram criados pelo próprio grupo, sem materiais de terceiros.</p>
            </Section>
)}
          </div>

          <aside aria-label="Informações do jogo" className="lg:sticky lg:top-24 lg:self-start">
            <div className="border border-line bg-surface p-5">
              <AvailabilityBadge availability={game.availability} />
              <div className="mt-4 [&>div]:flex-col [&>div]:items-stretch [&_a]:w-full [&_button]:w-full">
                <PlayActions game={game} />
                <ShareButton title={game.title} path={`/games/${game.slug}`} />
              </div>
              {game.notice && <p className="mt-4 border-l-2 border-line pl-3 text-[13px] leading-relaxed text-mute">{game.notice}</p>}
              {game.availability === "web" && game.input.touch === "supported" && (
                <p className="mt-4 text-[12px] leading-relaxed text-mute">
                  No PC, use o teclado. No celular, use a alavanca e os botões na tela (verificado em emulação de celular; ainda não em aparelhos reais).
                </p>
              )}
              {game.availability === "web" && game.downloadUrl && (
                <p className="mt-4 text-[12px] text-mute">
                  Prefere instalar? <a className="text-ink underline underline-offset-4 hover:text-accent" href={game.downloadUrl} download>Baixar a versão original para PC{game.downloadSizeKB ? ` (${formatSize(game.downloadSizeKB)})` : ""}</a>
                </p>
              )}
            </div>

            <dl className="mt-4 space-y-4 border border-line p-5 text-[14px]">
              {[
                ["Gênero", game.genre],
                ["Lançamento", formatDate(game.releaseDate)],
                ...(game.availability === "web" ? [["Onde jogar", "PC (Windows/Mac) e celular, direto no navegador"]] : []),
                ...(game.developer ? [["Desenvolvedora", game.developer]] : []),
                ["Tecnologias", game.technologies.join(" · ")],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="label text-mute">{k}</dt>
                  <dd className="mt-1 text-ink">{v}</dd>
                </div>
              ))}
              {game.requirements && (
                <div>
                  <dt className="label text-mute">Requisitos</dt>
                  <dd className="mt-1 space-y-1 text-ink/90">
                    {game.requirements.map((r) => (
                      <p key={r}>{r}</p>
                    ))}
                  </dd>
                </div>
              )}
              <div>
                <dt className="label mb-2 text-mute">Categorias e tags</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {game.categories.map((c) => (
                    <Tag key={c} href={`/games?category=${c}`}>
                      {categoryLabel(c)}
                    </Tag>
                  ))}
                  {game.tags.map((t) => (
                    <Tag key={t}>{t}</Tag>
                  ))}
                </dd>
              </div>
              {game.repositoryUrl && (
                <div>
                  <dt className="label text-mute">Código-fonte</dt>
                  <dd className="mt-1">
                    <a href={game.repositoryUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-ink underline underline-offset-4 hover:text-accent">
                      Repositório no GitHub <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </aside>
        </div>

        {related.length > 0 && (
          <section aria-labelledby="relacionados" className="pt-16">
            <h2 id="relacionados" className="mb-5 border-b border-line pb-3 font-display text-[28px] font-bold uppercase">
              Jogos relacionados
            </h2>
            <GameGrid games={related} compact />
          </section>
        )}
      </div>
    </article>
  );
}
