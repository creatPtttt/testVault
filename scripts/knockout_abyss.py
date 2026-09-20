"""Punch the solid black backdrop out of generated expedition sprites."""

from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = Path(r"C:\Users\Administrator\.cursor\projects\e-cursor-rdav\assets")
OUT = ROOT / "public" / "assets" / "expeditions"

SPRITES = [
    "zone-tunnels.png",
    "zone-vaults.png",
    "zone-crucible.png",
    "minecart.png",
]


def knockout(src: Path, dst: Path, thresh: int = 14) -> None:
    im = Image.open(src).convert("RGBA")
    w, h = im.size
    px = im.load()
    seen = bytearray(w * h)

    def dark(x: int, y: int) -> bool:
        r, g, b, _a = px[x, y]
        return r <= thresh and g <= thresh and b <= thresh

    q: deque[tuple[int, int]] = deque()
    for x in range(w):
        for y in (0, h - 1):
            if dark(x, y):
                seen[y * w + x] = 1
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            i = y * w + x
            if not seen[i] and dark(x, y):
                seen[i] = 1
                q.append((x, y))

    while q:
        x, y = q.popleft()
        r, g, b, _a = px[x, y]
        px[x, y] = (r, g, b, 0)
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if nx < 0 or ny < 0 or nx >= w or ny >= h:
                continue
            i = ny * w + nx
            if seen[i] or not dark(nx, ny):
                continue
            seen[i] = 1
            q.append((nx, ny))

    # Soften the leftover black fringe around the cutout
    fringe = []
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0 or r + g + b > 90:
                continue
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] == 0:
                    fringe.append((x, y))
                    break
    for x, y in fringe:
        r, g, b, _a = px[x, y]
        px[x, y] = (r, g, b, 0)

    dst.parent.mkdir(parents=True, exist_ok=True)
    im.save(dst)


def main() -> None:
    ground_src = SRC / "abyss-ground.png"
    ground_dst = OUT / "abyss-ground.png"
    ground_dst.parent.mkdir(parents=True, exist_ok=True)
    Image.open(ground_src).save(ground_dst)
    for name in SPRITES:
        knockout(SRC / name, OUT / name)
        print("cut", name)


if __name__ == "__main__":
    main()
