"""
Build Barracks hub assets:
  - Yard props (Kenney Tiny Dungeon markers, darkened, CC0)
  - Job idle strips from eldiran-sheet.png (project character sheet)

NOTE: armory-vault.png is an authored hi-bit building — do not overwrite it here.
"""

from __future__ import annotations

import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARKERS = os.path.join(ROOT, "public", "assets", "town", "markers")
OUT_CAMP = os.path.join(ROOT, "public", "assets", "camp")
OUT_DELVERS = os.path.join(OUT_CAMP, "delvers")
OUT_PROPS = os.path.join(OUT_CAMP, "props")
SHEET = os.path.join(OUT_DELVERS, "eldiran-sheet.png")

os.makedirs(OUT_DELVERS, exist_ok=True)
os.makedirs(OUT_PROPS, exist_ok=True)


def key_black(im: Image.Image, thr: int = 18) -> Image.Image:
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 0 and r + g + b < thr * 3:
                px[x, y] = (0, 0, 0, 0)
    return im


def key_magenta(im: Image.Image) -> Image.Image:
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r > 230 and g < 50 and b > 230:
                px[x, y] = (0, 0, 0, 0)
    return im


def load_marker(name: str) -> Image.Image:
    im = Image.open(os.path.join(MARKERS, name)).convert("RGBA")
    im = key_black(im)
    box = im.getbbox()
    return im.crop(box) if box else im


def darken(im: Image.Image, factor: float = 0.72) -> Image.Image:
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 8:
                continue
            nr = int(r * factor * 0.88)
            ng = int(g * factor * 0.85)
            nb = int(min(255, b * factor * 1.05 + 12))
            px[x, y] = (nr, ng, nb, a)
    return im


def build_props() -> None:
    mapping = {
        "woodenCrates_S.png": "crates.png",
        "barrelsStacked_S.png": "barrels.png",
        "stoneColumn_S.png": "column.png",
    }
    for src, dst in mapping.items():
        im = darken(load_marker(src), 0.78)
        path = os.path.join(OUT_PROPS, dst)
        im.save(path)
        print("prop", dst, im.size)


def build_delver_sprites() -> None:
    sheet = key_magenta(Image.open(SHEET).convert("RGBA"))
    cell = 32
    jobs = {
        "paladin": 4,
        "arcanist": 5,
        "rogue": 8,
        "geomancer": 9,
        "warden": 6,
    }
    for slug, row in jobs.items():
        frames = []
        for col in (0, 1, 2):
            frames.append(
                sheet.crop((col * cell, row * cell, (col + 1) * cell, (row + 1) * cell))
            )
        alert = frames[0].copy()
        ap = alert.load()
        for y in range(8, 14):
            for x in range(10, 22):
                r, g, b, a = ap[x, y]
                if a > 200 and r + g + b < 120:
                    ap[x, y] = (220, 190, 80, 255)
        frames[2] = alert

        strip = Image.new("RGBA", (cell * 3, cell), (0, 0, 0, 0))
        for i, fr in enumerate(frames):
            strip.paste(fr, (i * cell, 0), fr)
        strip = darken(strip, 0.7)
        big = strip.resize((cell * 3 * 6, cell * 6), Image.NEAREST)
        path = os.path.join(OUT_DELVERS, f"{slug}-idle.png")
        big.save(path)
        print("sprite", slug, big.size)


def write_license() -> None:
    path = os.path.join(OUT_CAMP, "LICENSE.txt")
    with open(path, "w", encoding="utf-8") as f:
        f.write(
            """Barracks ground: public/assets/town/sanctum-ground.png (project town art).
Command Tent: public/assets/town/props/barracks.png.
Armory Vault: authored hi-bit dark fantasy building (armory-vault.png).
Yard props: Kenney Tiny Dungeon markers (CC0) — crates, barrels, column.
Delver idle strips: cropped from delvers/eldiran-sheet.png (project character sheet).
"""
        )
    print("license ok")


if __name__ == "__main__":
    build_props()
    build_delver_sprites()
    write_license()
    print("ok")
