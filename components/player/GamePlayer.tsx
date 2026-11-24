"use client";

import { ArrowLeft, Download, ExternalLink, Keyboard, Maximize2, Minimize2, RotateCw, TriangleAlert, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { FavoriteButton } from "@/components/games/FavoriteButton";
import { Button, ButtonLink, ExternalButton } from "@/components/ui/Button";
import { ControlsList } from "@/components/ui/Keys";
import { LogoMark } from "@/components/ui/Logo";
import { useFullscreenSupport } from "@/hooks/useFullscreenSupport";
import { usePrefs } from "@/hooks/useStore";
import { formatSize } from "@/lib/format";
import { recordPlay } from "@/lib/store";
import type { Availability, ControlBinding, ImageAsset } from "@/types/game";

export interface PlayerGame {
  slug: string;
  title: string;
  availability: Availability;
  playableUrl?: string;
  downloadUrl?: string;
  downloadSizeKB?: number;
  controls: ControlBinding[];
  aspect: { width: number; height: number };
  coverImage: ImageAsset;
  screenshots: ImageAsset[];
  touchUntested: boolean;
  touchSupported: boolean;
}

type Phase = "checking" | "loading" | "booting" | "ready" | "error";

const BOOT_TIMEOUT_S = 90;

function useCoarsePointer() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(pointer: coarse)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(pointer: coarse)").matches,
    () => false,
  );
}

/** Em telas estreitas o painel de controles cobriria o jogo, então só abre sozinho no desktop. */
function useWideScreen() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(min-width: 1024px)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => false,
  );
}

function clock(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/* ───────────────────────── Modo web: iframe + estados reais de carregamento ───────────────────────── */

function WebStage({
  game,
  iframeRef,
  onReady,
  onRetry,
}: {
  game: PlayerGame;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  onReady: () => void;
  onRetry: () => void;
}) {
  const url = game.playableUrl!;
  const [phase, setPhase] = useState<Phase>("checking");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [hint, setHint] = useState(false);
  const coarse = useCoarsePointer();
  const [forceStart, setForceStart] = useState(false);
  const gated = coarse && game.touchUntested && !forceStart;

  // 1) Verifica se o pacote do jogo existe de fato.
  useEffect(() => {
    if (gated) return;
    let cancelled = false;
    const ctrl = new AbortController();
    fetch(url, { method: "HEAD", cache: "no-store", signal: ctrl.signal })
      .then((r) => {
        if (cancelled) return;
        if (!r.ok) throw new Error(`O servidor respondeu ${r.status} ao procurar o jogo.`);
        recordPlay(game.slug);
        setPhase("loading");
      })
      .catch((e: unknown) => {
        if (cancelled || (e instanceof DOMException && e.name === "AbortError")) return;
        setError(e instanceof Error ? e.message : "Não foi possível alcançar o pacote do jogo.");
        setPhase("error");
      });
    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [url, game.slug, gated]);

  // 2) Relógio de espera + 3) detecção do canvas do jogo (mesma origem).
  useEffect(() => {
    if (phase !== "loading" && phase !== "booting") return;
    const tick = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(tick);
  }, [phase]);

  useEffect(() => {
    if (phase !== "booting") return;
    const poll = window.setInterval(() => {
      try {
        const doc = iframeRef.current?.contentDocument;
        const canvas = doc?.getElementById("canvas") ?? doc?.querySelector("canvas");
        if (canvas && canvas.getBoundingClientRect().width > 8 && (canvas as HTMLCanvasElement).width > 8) {
          setPhase("ready");
          setHint(true);
          onReady();
          window.setTimeout(() => setHint(false), 8000);
        }
      } catch {
        // iframe ainda navegando.
      }
    }, 500);
    return () => window.clearInterval(poll);
  }, [phase, iframeRef, onReady]);

  // Limite de espera: se o jogo não ativar o canvas a tempo, mostra o erro com opção de tentar de novo.
  const waiting = phase === "loading" || phase === "booting";
  useEffect(() => {
    if (!waiting) return;
    const t = window.setTimeout(() => {
      setError(`O jogo não iniciou em ${BOOT_TIMEOUT_S} s. A conexão pode estar lenta ou o ambiente de execução não carregou.`);
      setPhase("error");
    }, BOOT_TIMEOUT_S * 1000);
    return () => window.clearTimeout(t);
  }, [waiting]);

  if (gated) {
    return (
      <div className="grid h-full place-items-center p-6">
        <div className="max-w-md border border-line bg-surface p-6">
          <TriangleAlert aria-hidden="true" className="h-6 w-6 text-mute" />
          <h2 className="mt-3 font-display text-3xl font-bold uppercase">Feito para teclado</h2>
          <p className="mt-2 text-[14px] text-mute">
            Este jogo usa WASD ou setas e teclas como P, M e Enter. Em celulares e tablets ele não foi testado e pode não funcionar.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => setForceStart(true)}>
              Tentar mesmo assim
            </Button>
            <ButtonLink variant="ghost" href={`/games/${game.slug}`}>
              Voltar
            </ButtonLink>
          </div>
        </div>
      </div>
    );
  }

  const steps: { label: string; done: boolean; active: boolean }[] = [
    { label: "Verificando o pacote do jogo", done: phase !== "checking", active: phase === "checking" },
    { label: "Carregando o ambiente de execução (WebAssembly)", done: phase === "booting" || phase === "ready", active: phase === "loading" },
    { label: "Iniciando o jogo", done: phase === "ready", active: phase === "booting" },
  ];

  return (
    <div className="relative h-full w-full bg-black">
      {(phase === "loading" || phase === "booting" || phase === "ready") && (
        <iframe
          ref={iframeRef}
          src={url}
          title={`Jogo: ${game.title}`}
          allow="autoplay; fullscreen; gamepad"
          // Os jogos são do mesmo domínio e precisam de scripts e de localStorage (recordes). O sandbox bloqueia o resto:
          // navegar a página de cima, abrir janelas, enviar formulários e usar diálogos do navegador.
          sandbox="allow-scripts allow-same-origin allow-pointer-lock"
          referrerPolicy="no-referrer"
          onLoad={() => {
            setPhase((p) => (p === "loading" ? "booting" : p));
          }}
          className="absolute inset-0 h-full w-full border-0 bg-black"
        />
      )}

      {phase !== "ready" && phase !== "error" && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-base p-6" role="status" aria-live="polite">
          <div className="w-full max-w-md">
            <div className="flex items-center gap-3">
              <LogoMark className="h-8 w-8" />
              <div>
                <p className="label text-accent">Iniciando</p>
                <p className="font-display text-2xl font-bold uppercase leading-none">{game.title}</p>
              </div>
            </div>
            <ol className="mt-7 space-y-3">
              {steps.map((s) => (
                <li key={s.label} className={`flex items-center gap-3 text-[14px] ${s.done ? "text-ink" : s.active ? "text-ink" : "text-mute"}`}>
                  <span
                    aria-hidden="true"
                    className={`grid h-4 w-4 place-items-center border ${s.done ? "border-accent bg-accent" : s.active ? "border-accent" : "border-line"}`}
                  >
                    {s.active && <span className="h-1.5 w-1.5 animate-pulse bg-accent" />}
                  </span>
                  {s.label}
                  <span className="sr-only">{s.done ? " — concluído" : s.active ? " — em andamento" : " — aguardando"}</span>
                </li>
              ))}
            </ol>
            <div className="relative mt-7 h-1 overflow-hidden bg-line" aria-hidden="true">
              <span className="absolute inset-y-0 left-0 w-1/3 animate-scan bg-accent" />
            </div>
            <p className="label mt-3 flex justify-between text-mute">
              <span>Tempo {clock(elapsed)}</span>
              <span>limite {clock(BOOT_TIMEOUT_S)}</span>
            </p>
            {elapsed >= 12 && (
              <p className="mt-4 text-[13px] text-mute">
                A primeira abertura baixa o ambiente Python/WebAssembly e pode demorar. As próximas ficam mais rápidas, pois o navegador guarda os arquivos.
              </p>
            )}
          </div>
        </div>
      )}

      {phase === "error" && (
        <div className="absolute inset-0 z-10 grid place-items-center overflow-auto bg-base p-6" role="alert">
          <div className="w-full max-w-lg border border-alert/60 bg-surface p-6">
            <p className="label flex items-center gap-2 text-alert">
              <TriangleAlert aria-hidden="true" className="h-4 w-4" /> Falha ao iniciar
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold uppercase">Não foi possível abrir o jogo</h2>
            <p className="mt-2 text-[14px] text-mute">{error}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="primary" icon={<RotateCw aria-hidden="true" className="h-5 w-5" />} onClick={onRetry}>
                Tentar novamente
              </Button>
              <ExternalButton variant="ghost" href={url} target="_blank" rel="noopener noreferrer" icon={<ExternalLink aria-hidden="true" className="h-4 w-4" />}>
                Abrir em outra aba
              </ExternalButton>
            </div>
          </div>
        </div>
      )}

      {hint && !coarse && (
        <p className="label pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 bg-base/90 px-3 py-1.5 text-ink">
          Clique no jogo para ativar o teclado
        </p>
      )}
    </div>
  );
}

/* ───────────────────────── Modo sem versão web: demonstração + download real ───────────────────────── */

function UnavailableStage({ game }: { game: PlayerGame }) {
  const [shot, setShot] = useState(0);
  const current = game.screenshots[shot];
  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto grid max-w-6xl gap-8 p-5 sm:p-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div>
          <div className="relative aspect-[3/2] border border-line bg-base">
            <Image
              key={current?.src ?? game.coverImage.src}
              src={current?.src ?? game.coverImage.src}
              alt={current?.alt ?? game.coverImage.alt}
              fill
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="object-contain [image-rendering:pixelated]"
              priority
            />
            <span className="label absolute left-0 top-0 bg-base px-3 py-1.5 text-mute">Demonstração · capturas reais</span>
          </div>
          <div className="rail mt-2 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Capturas de tela">
            {game.screenshots.map((s, i) => (
              <button
                key={s.src}
                type="button"
                aria-pressed={i === shot}
                aria-label={`Ver captura ${i + 1}: ${s.caption ?? ""}`}
                onClick={() => setShot(i)}
                className={`relative aspect-[3/2] w-[96px] shrink-0 overflow-hidden border bg-base ${i === shot ? "border-accent" : "border-line opacity-60 hover:opacity-100"}`}
              >
                <Image src={s.src} alt="" fill sizes="96px" className="object-cover [image-rendering:pixelated]" />
              </button>
            ))}
          </div>
        </div>

        <div role="status">
          <p className="label flex items-center gap-2 text-mute">
            <span aria-hidden="true" className="h-2 w-2 border border-mute" /> Versão web indisponível
          </p>
          <h2 className="mt-3 font-display text-4xl font-bold uppercase leading-[0.95]">Este jogo ainda não roda aqui</h2>
          <p className="mt-3 text-[14px] leading-relaxed text-mute">
            O pacote para o navegador não foi publicado neste portal. A versão para computador funciona e pode ser baixada abaixo; as imagens ao lado são capturas
            reais do jogo.
          </p>
          {game.downloadUrl && (
            <div className="mt-6">
              <ExternalButton variant="primary" href={game.downloadUrl} download icon={<Download aria-hidden="true" className="h-5 w-5" />}>
                Baixar para PC{game.downloadSizeKB ? ` · ${formatSize(game.downloadSizeKB)}` : ""}
              </ExternalButton>
              <p className="mt-3 text-[12px] text-mute">Requer Python 3.10+ e pygame-ce. As instruções estão no README dentro do arquivo.</p>
            </div>
          )}
          <div className="mt-8 border-t border-line pt-5">
            <h3 className="label mb-3 text-mute">Controles</h3>
            <ControlsList controls={game.controls} compact />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Casca do player ───────────────────────── */

export function GamePlayer({ game }: { game: PlayerGame }) {
  const prefs = usePrefs();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [panel, setPanel] = useState<boolean | null>(null); // null = segue a preferência
  const [fullscreen, setFullscreen] = useState(false);
  const canFullscreen = useFullscreenSupport();
  const [reloadKey, setReloadKey] = useState(0);
  const web = game.availability === "web" && !!game.playableUrl;
  const touchLayout = useCoarsePointer() && game.touchSupported;

  const wide = useWideScreen();
  const panelOpen = panel ?? (prefs.showControlsHint && wide);

  useEffect(() => {
    const onChange = () => {
      const fs = document.fullscreenElement === stageRef.current;
      setFullscreen(fs);
      if (!fs) {
        try {
          screen.orientation?.unlock?.();
        } catch {
          // Sem suporte.
        }
      }
      iframeRef.current?.contentWindow?.focus();
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const focusGame = useCallback(() => {
    iframeRef.current?.focus();
    iframeRef.current?.contentWindow?.focus();
  }, []);

  async function lockLandscape() {
    try {
      const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
      await o.lock?.("landscape");
    } catch {
      // Navegador/aparelho sem suporte (ex.: iPhone) ou desktop: ignora.
    }
  }

  function unlockOrientation() {
    try {
      screen.orientation?.unlock?.();
    } catch {
      // Sem suporte.
    }
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        unlockOrientation();
      } else {
        await stageRef.current?.requestFullscreen();
        // Em celulares (Android/Chrome) só é possível travar a orientação em tela cheia; se falhar, segue normal.
        if (game.aspect.width > game.aspect.height) await lockLandscape();
      }
    } catch {
      // Tela cheia negada pelo navegador.
    }
    focusGame();
  }

  const barButton =
    "label inline-flex h-9 items-center gap-2 rounded-xs border border-line bg-surface px-3 text-ink transition-colors hover:border-mute hover:bg-card";

  return (
    <div className="flex h-dvh flex-col bg-base">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line bg-base px-3 sm:gap-3 sm:px-4">
        <Link href="/games" className={barButton} aria-label="Voltar ao catálogo">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          <span className="hidden sm:inline">Catálogo</span>
        </Link>
        <div className="flex min-w-0 items-center gap-3 border-l border-line pl-3">
          <Link href={`/games/${game.slug}`} className="truncate font-display text-xl font-bold uppercase leading-none hover:text-accent">
            {game.title}
          </Link>
          <span className={`label hidden items-center gap-2 sm:inline-flex ${web ? "text-accent" : "text-mute"}`}>
            <span aria-hidden="true" className={`h-2 w-2 ${web ? "bg-accent" : "border border-mute"}`} />
            {web ? "No navegador" : "Somente download"}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <FavoriteButton slug={game.slug} title={game.title} className="!h-9 !w-9 !border-line !bg-surface" />
          {web && (
          <button
            type="button"
            className={barButton}
            aria-pressed={panelOpen}
            aria-controls="painel-controles"
            onClick={() => {
              setPanel(!panelOpen);
              focusGame();
            }}
          >
            <Keyboard aria-hidden="true" className="h-4 w-4" />
            <span className="hidden md:inline">Controles</span>
          </button>
          )}
          {web && (
            <>
              <button type="button" className={barButton} onClick={() => setReloadKey((k) => k + 1)} aria-label="Reiniciar o jogo">
                <RotateCw aria-hidden="true" className="h-4 w-4" />
                <span className="hidden md:inline">Reiniciar</span>
              </button>
              {canFullscreen && (
                <button type="button" className={barButton} onClick={toggleFullscreen} aria-label={fullscreen ? "Sair da tela cheia" : "Tela cheia"}>
                  {fullscreen ? <Minimize2 aria-hidden="true" className="h-4 w-4" /> : <Maximize2 aria-hidden="true" className="h-4 w-4" />}
                  <span className="hidden md:inline">Tela cheia</span>
                </button>
              )}
            </>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div ref={stageRef} className={`relative min-w-0 flex-1 bg-black ${web ? "grid place-items-center [container-type:size]" : ""}`}>
          {web ? (
            <div
              className="relative bg-black"
              style={
                touchLayout
                  ? { width: "100cqw", height: "100cqh" } // celular: o jogo ocupa a tela e posiciona os próprios controles de toque
                  : {
                      aspectRatio: `${game.aspect.width} / ${game.aspect.height}`,
                      width: `min(100cqw, calc(100cqh * ${game.aspect.width / game.aspect.height}))`,
                    }
              }
            >
              <WebStage key={reloadKey} game={game} iframeRef={iframeRef} onReady={focusGame} onRetry={() => setReloadKey((k) => k + 1)} />
            </div>
          ) : (
            <UnavailableStage game={game} />
          )}
        </div>

        {panelOpen && web && (
          <aside
            id="painel-controles"
            aria-label="Controles do jogo"
            className="absolute inset-y-12 right-0 z-30 w-[min(340px,92vw)] overflow-auto border-l border-line bg-surface p-5 lg:static lg:inset-auto lg:w-[320px] lg:shrink-0"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl font-bold uppercase">Controles</h2>
              <button
                type="button"
                onClick={() => {
                  setPanel(false);
                  focusGame();
                }}
                aria-label="Fechar painel de controles"
                className="grid h-8 w-8 place-items-center rounded-xs text-mute hover:text-ink"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4">
              <ControlsList controls={game.controls} compact />
            </div>
            {web && (
              <div className="mt-6 space-y-3 border-t border-line pt-4 text-[13px] text-mute">
                <p>Se as teclas não responderem, clique uma vez dentro do jogo.</p>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
