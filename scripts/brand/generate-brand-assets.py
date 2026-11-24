#!/usr/bin/env python3
"""Gera os ativos de marca da JoyStation em public/brand/ e app/.

Requisitos (só para regenerar; o site não depende deles): Python 3, fonttools, Pillow.
Uso: python3 scripts/brand/generate-brand-assets.py

O símbolo é um "J" em pixel art dentro de um bloco de canto cortado, com um botão redondo.
Não imita formas de nenhum console. O wordmark usa Rajdhani Bold (OFL), convertida em
curvas, então os SVGs não dependem de fonte instalada.
"""
import io
import os
import random

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
FONT_WOFF = os.path.join(ROOT, "node_modules/@fontsource/rajdhani/files/rajdhani-latin-700-normal.woff")
INTER_TTF = "/usr/share/fonts/opentype/inter/Inter-Medium.otf"
BASE, SURFACE, CARD, INK, MUTE, ACCENT, ACCENT_INK, LINE = "#0B0D12", "#151922", "#1C2230", "#F3F5F7", "#969EAD", "#9BE15D", "#0D1707", "#2A3142"

# J em grade 5x5 (linha, coluna)
J_CELLS = [(0, 3), (1, 3), (2, 3), (3, 0), (3, 3), (4, 1), (4, 2)]


def mark_svg(size=32, bg=ACCENT, fg=ACCENT_INK, x=0, y=0):
    """Símbolo em coordenadas 0..32 escaladas para `size`."""
    k = size / 32
    cell = 4.4
    ox, oy = 5, 5.2
    parts = [f'<path d="M0 0H23L32 9V32H0Z" fill="{bg}"/>']
    for r, c in J_CELLS:
        parts.append(f'<rect x="{ox + c * cell + 0.5:.2f}" y="{oy + r * cell + 0.5:.2f}" width="{cell - 1:.2f}" height="{cell - 1:.2f}" fill="{fg}"/>')
    parts.append(f'<circle cx="{ox + 1 * cell + 2.2:.2f}" cy="{oy + 1 * cell + 0.2:.2f}" r="2.6" fill="{fg}"/>')
    return f'<g transform="translate({x} {y}) scale({k})">' + "".join(parts) + "</g>"


def word_path(text, size, letter_spacing=0.14):
    f = TTFont(FONT_WOFF)
    gs, cmap, upm = f.getGlyphSet(), f.getBestCmap(), f["head"].unitsPerEm
    s = size / upm
    x, d = 0.0, []
    for ch in text:
        name = cmap[ord(ch)]
        pen = SVGPathPen(gs)
        gs[name].draw(TransformPen(pen, (s, 0, 0, -s, x, size * 0.78)))
        d.append((x, pen.getCommands()))
        x += gs[name].width * s + letter_spacing * size
    return d, x - letter_spacing * size


def logo_svg(fg_text, accent, mark_bg, mark_fg, h=40, pad=0):
    wd, w = word_path("JOYSTATION", h * 0.86)
    ox = h + 12
    paths = ""
    for i, (x, d) in enumerate(wd):
        color = accent if i < 3 else fg_text
        paths += f'<path transform="translate({ox + 0:.2f} {(h - h * 0.86) / 2 + 0:.2f})" d="{d}" fill="{color}"/>'
    width = ox + w + pad
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width:.0f} {h}" width="{width:.0f}" height="{h}" role="img" aria-label="JoyStation">'
            f'<title>JoyStation</title>{mark_svg(h, mark_bg, mark_fg)}{paths}</svg>\n')


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(text)


def icon_svg(bg=ACCENT, fg=ACCENT_INK):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" role="img" aria-label="JoyStation">{mark_svg(32, bg, fg)}</svg>\n'


# ---------- SVG ----------
b = os.path.join(ROOT, "public/brand")
dark = logo_svg(INK, ACCENT, ACCENT, ACCENT_INK)           # para fundos escuros
light = logo_svg("#0B0D12", "#3F7D12", "#3F7D12", "#F3F5F7")  # para fundos claros
write(f"{b}/logo.svg", dark)
write(f"{b}/logo-dark.svg", dark)
write(f"{b}/logo-light.svg", light)
write(f"{b}/icon.svg", icon_svg())
write(os.path.join(ROOT, "app/icon.svg"), icon_svg())

# ---------- raster ----------
tt = TTFont(FONT_WOFF)
tt.flavor = None
buf = io.BytesIO()
tt.save(buf)
rajdhani = buf.getvalue()


def rfont(size):
    return ImageFont.truetype(io.BytesIO(rajdhani), size)


def draw_mark(img, x, y, size):
    S = 4
    m = Image.new("RGBA", (size * S, size * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(m)
    k = size * S / 32
    d.polygon([(0, 0), (23 * k, 0), (32 * k, 9 * k), (32 * k, 32 * k), (0, 32 * k)], fill=ACCENT)
    cell = 4.4
    for r, c in J_CELLS:
        x0, y0 = (5 + c * cell + 0.5) * k, (5.2 + r * cell + 0.5) * k
        d.rectangle([x0, y0, x0 + (cell - 1) * k, y0 + (cell - 1) * k], fill=ACCENT_INK)
    cx, cy, rr = (5 + cell + 2.2) * k, (5.2 + cell + 0.2) * k, 2.6 * k
    d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=ACCENT_INK)
    m = m.resize((size, size), Image.LANCZOS)
    img.paste(m, (x, y), m)


def spaced(draw, xy, text, font, fills, spacing):
    x, y = xy
    for i, ch in enumerate(text):
        draw.text((x, y), ch, font=font, fill=fills(i))
        x += draw.textlength(ch, font=font) + spacing
    return x


def background(w, h, seed):
    img = Image.new("RGB", (w, h), BASE)
    d = ImageDraw.Draw(img)
    for gx in range(0, w, 24):
        for gy in range(0, h, 24):
            d.point((gx, gy), fill="#1B2030")
    rng = random.Random(seed)
    for _ in range(26):  # blocos de pixel esparsos, só como textura
        gx, gy = rng.randrange(0, w // 24) * 24, rng.randrange(0, h // 24) * 24
        d.rectangle([gx + 8, gy + 8, gx + 15, gy + 15], fill=rng.choice(["#171C28", "#1C2230"]))
    return img


def social(w, h, big):
    img = background(w, h, 7)
    d = ImageDraw.Draw(img)
    m = int(h * 0.18)
    mark = int(h * 0.26) if big else int(h * 0.3)
    draw_mark(img, m, (h - mark) // 2 - int(h * 0.1), mark)
    fw = rfont(int(h * (0.19 if big else 0.25)))
    tx = m + mark + int(h * 0.06)
    ty = (h - mark) // 2 - int(h * 0.1) + (mark - int(h * (0.19 if big else 0.25))) // 2 - int(h * 0.035)
    end = spaced(d, (tx, ty), "JOYSTATION", fw, lambda i: ACCENT if i < 3 else INK, int(h * 0.022))
    fs = rfont(int(h * 0.1))
    d.text((m, h - m - int(h * 0.06) - int(h * 0.17)), "Seu mundo. Seus jogos.", font=fs, fill=INK)
    fi = ImageFont.truetype(INTER_TTF, int(h * 0.04))
    d.text((m, h - m - int(h * 0.04)), "Jogos independentes direto no navegador", font=fi, fill=MUTE)
    d.rectangle([0, h - 6, w, h], fill=ACCENT)
    return img


og = social(1200, 630, True)
og.save(f"{b}/og-image.jpg", quality=90)
bn = social(1600, 400, False)
bn.save(f"{b}/banner.webp", quality=88)
# apple touch icon (180) sobre fundo da marca
ap = Image.new("RGB", (180, 180), BASE)
draw_mark(ap, 26, 26, 128)
ap.save(os.path.join(ROOT, "app/apple-icon.png"))
print("ok")
