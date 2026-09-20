"""
Build job-class idle GIFs from LuizMelo CC0 sprite sheets.
Maps packs → RuneDelve JobClass portrait files under public/assets/camp/delvers/portraits/
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
UNPACK = ROOT / "public" / "assets" / "camp" / "delvers" / "_unpack"
OUT = ROOT / "public" / "assets" / "camp" / "delvers" / "portraits"
SRC = ROOT / "public" / "assets" / "camp" / "delvers" / "luizmelo"

# Job → (idle sheet path, output gif name)
JOBS = {
    "rogue": (
        UNPACK / "rogue" / "Medieval Warrior Pack 2" / "Sprites" / "Idle.png",
        "rogue.gif",
    ),
    "arcanist": (
        UNPACK / "arcanist" / "Evil Wizard 3" / "Sprites" / "Idle.png",
        "arcanist.gif",
    ),
    "warden": (
        UNPACK / "warden" / "Wizard Pack" / "Idle.png",
        "warden.gif",
    ),
    "geomancer": (
        UNPACK / "geomancer" / "EVil Wizard 2" / "Sprites" / "Idle.png",
        "geomancer.gif",
    ),
    "paladin": (
        UNPACK / "paladin" / "Medieval Warrior Pack 3" / "Sprites" / "Idle.png",
        "paladin.gif",
    ),
}


def frame_width(im: Image.Image) -> int:
    """Frame width. Square packs use the sheet height. Wider packs (Wizard Pack) stay planted."""
    w, h = im.size
    if h and w % h == 0:
        return h
    px = im.convert("RGBA").load()
    best_fw = h
    best_var = 1e18
    for fw in range(max(64, h // 2), min(w, int(h * 1.8)) + 1):
        if w % fw != 0:
            continue
        count = w // fw
        if count < 2 or count > 16:
            continue
        centers: list[float] = []
        for index in range(count):
            xs = [
                x
                for y in range(h)
                for x in range(fw)
                if px[index * fw + x, y][3] > 20
            ]
            if xs:
                centers.append((min(xs) + max(xs)) / 2)
        if len(centers) < 2:
            continue
        mean = sum(centers) / len(centers)
        var = sum((c - mean) ** 2 for c in centers) / len(centers)
        if var < best_var:
            best_var = var
            best_fw = fw
    return best_fw


def split_strip(im: Image.Image) -> list[Image.Image]:
    """Cut a horizontal strip into frames that keep the figure standing still."""
    w, h = im.size
    fw = frame_width(im)
    frames: list[Image.Image] = []
    for x in range(0, w - fw + 1, fw):
        frames.append(im.crop((x, 0, x + fw, h)).convert("RGBA"))
    return frames


def trim_alpha(im: Image.Image, pad: int = 2) -> Image.Image:
    """Crop transparent padding so characters fill the portrait frame."""
    bbox = im.getbbox()
    if not bbox:
        return im
    l, t, r, b = bbox
    l = max(0, l - pad)
    t = max(0, t - pad)
    r = min(im.width, r + pad)
    b = min(im.height, b + pad)
    return im.crop((l, t, r, b))


def fit_canvas(im: Image.Image, size: int = 128) -> Image.Image:
    """Place trimmed sprite on a square canvas, bottom-centered."""
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    # Scale to fit height ~90% of canvas
    target_h = int(size * 0.92)
    scale = min(size / im.width, target_h / im.height)
    nw = max(1, int(im.width * scale))
    nh = max(1, int(im.height * scale))
    scaled = im.resize((nw, nh), Image.Resampling.NEAREST)
    x = (size - nw) // 2
    y = size - nh
    canvas.paste(scaled, (x, y), scaled)
    return canvas


def to_rgb_gif_frames(frames: list[Image.Image], duration_ms: int = 120) -> tuple[list[Image.Image], list[int]]:
    """Convert RGBA frames to RGB with a solid dark backdrop (avoids GIF palette holes)."""
    bg = (10, 8, 12)
    out: list[Image.Image] = []
    for fr in frames:
        rgb = Image.new("RGB", fr.size, bg)
        rgb.paste(fr, mask=fr.split()[3] if fr.mode == "RGBA" else None)
        # Quantize per-frame for cleaner colors
        pal = rgb.quantize(colors=128, method=Image.Quantize.MEDIANCUT)
        out.append(pal.convert("P"))
    durations = [duration_ms] * len(out)
    return out, durations


def build_one(name: str, src: Path, dest_name: str) -> None:
    im = Image.open(src)
    print(f"{name}: {src.name} {im.size} mode={im.mode}")
    raw = split_strip(im)
    print(f"  frames={len(raw)} frame_size={raw[0].size if raw else None}")
    trimmed = [fit_canvas(trim_alpha(f)) for f in raw]
    gif_frames, durations = to_rgb_gif_frames(trimmed, duration_ms=110)
    OUT.mkdir(parents=True, exist_ok=True)
    dest = OUT / dest_name
    gif_frames[0].save(
        dest,
        save_all=True,
        append_images=gif_frames[1:],
        duration=durations,
        loop=0,
        optimize=False,
        disposal=2,
    )
    # Also keep a master idle sheet copy under luizmelo/
    SRC.mkdir(parents=True, exist_ok=True)
    sheet_copy = SRC / f"{name}-idle.png"
    im.convert("RGBA").save(sheet_copy)
    print(f"  wrote {dest} ({dest.stat().st_size} bytes) + {sheet_copy.name}")


def main() -> None:
    for name, (src, dest_name) in JOBS.items():
        if not src.exists():
            raise SystemExit(f"Missing sheet: {src}")
        build_one(name, src, dest_name)


if __name__ == "__main__":
    main()
