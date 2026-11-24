"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useFullscreenSupport } from "@/hooks/useFullscreenSupport";
import type { ImageAsset } from "@/types/game";

export function ScreenshotGallery({ images, title }: { images: ImageAsset[]; title: string }) {
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const canFullscreen = useFullscreenSupport();
  const viewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === viewerRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  if (images.length === 0) return null;
  const current = images[index];

  function go(delta: number) {
    setIndex((i) => (i + delta + images.length) % images.length);
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await viewerRef.current?.requestFullscreen();
    } catch {
      // O navegador pode negar a tela cheia; o botão simplesmente não muda de estado.
    }
  }

  return (
    <div>
      <div
        ref={viewerRef}
        tabIndex={0}
        role="group"
        aria-roledescription="galeria"
        aria-label={`Capturas de tela de ${title}. Use as setas para trocar de imagem.`}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            go(1);
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            go(-1);
          }
        }}
        className={`group relative border border-line bg-base ${fullscreen ? "grid place-items-center" : ""}`}
      >
        <div className={`relative ${fullscreen ? "h-full w-full" : "aspect-[3/2]"}`}>
          <Image
            key={current.src}
            src={current.src}
            alt={current.alt}
            fill
            sizes="(min-width: 1024px) 60vw, 100vw"
            className="object-contain [image-rendering:pixelated]"
          />
        </div>
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-base/90 px-4 py-2.5">
          <p className="label text-ink">
            <span className="text-accent">{String(index + 1).padStart(2, "0")}</span>
            <span className="text-mute"> / {String(images.length).padStart(2, "0")}</span>
            {current.caption && <span className="ml-3 normal-case tracking-normal text-mute">{current.caption}</span>}
          </p>
          {canFullscreen && (
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={fullscreen ? "Sair da tela cheia" : "Ver em tela cheia"}
              className="label flex shrink-0 items-center gap-1.5 text-ink hover:text-accent"
            >
              {fullscreen ? <Minimize2 aria-hidden="true" className="h-4 w-4" /> : <Maximize2 aria-hidden="true" className="h-4 w-4" />}
              {fullscreen ? "Sair" : "Tela cheia"}
            </button>
          )}
        </div>
      </div>

      <div className="rail mt-2 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Miniaturas">
        {images.map((img, i) => (
          <button
            key={img.src}
            type="button"
            onClick={() => setIndex(i)}
            aria-pressed={i === index}
            aria-label={`Ver captura ${i + 1}: ${img.caption ?? ""}`}
            className={`relative aspect-[3/2] w-[110px] shrink-0 overflow-hidden border bg-base ${
              i === index ? "border-accent" : "border-line opacity-60 hover:opacity-100"
            }`}
          >
            <Image src={img.src} alt="" fill sizes="110px" className="object-cover [image-rendering:pixelated]" />
          </button>
        ))}
      </div>
    </div>
  );
}
