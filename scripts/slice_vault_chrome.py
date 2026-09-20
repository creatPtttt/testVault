"""
Slice Dragon Regalia sheets into single-use UI chrome for Muster Ledger / Stash.
Source: Tiny RPG — Dragon Regalia GUI (CC0) by tiopalada on OpenGameArt.
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DR = ROOT / "public" / "assets" / "ui" / "dragon-regalia"
OUT = ROOT / "public" / "assets" / "ui" / "vault-chrome"
OUT.mkdir(parents=True, exist_ok=True)


def save(im: Image.Image, name: str) -> None:
    path = OUT / name
    im.save(path)
    print(f"wrote {path.name} {im.size}")


def main() -> None:
    # Close button sheet — typically 4 states in a row
    close = Image.open(DR / "20240713dragonCloseButton-Sheet.png").convert("RGBA")
    cw = close.width // 4 if close.width >= 4 else close.width
    save(close.crop((0, 0, cw, close.height)), "btn-close.png")

    # Item slot states (filled sheet = 4 variants)
    filled = Image.open(DR / "20240713dragonFilledFrame-Sheet.png").convert("RGBA")
    fw = filled.width // 4
    save(filled.crop((0, 0, fw, filled.height)), "slot-gold.png")
    save(filled.crop((fw * 3, 0, fw * 4, filled.height)), "slot-iron.png")

    empty = Image.open(DR / "20240713dragonEmptyFrame.png").convert("RGBA")
    save(empty, "slot-empty.png")

    # Portrait ornate frame
    portrait = Image.open(DR / "20240713dragonPortraitFrame.png").convert("RGBA")
    save(portrait, "portrait-frame.png")

    # Equipment frames for dossier
    for src, dest in [
        ("20240713dragonWeaponFrame.png", "frame-weapon.png"),
        ("20240713dragonChestFrame.png", "frame-chest.png"),
        ("20240713dragonRingFrame.png", "frame-ring.png"),
        ("20240713dragonShieldFrame.png", "frame-shield.png"),
    ]:
        save(Image.open(DR / src).convert("RGBA"), dest)

    # Copy modal panel + header for stable paths
    save(Image.open(ROOT / "public" / "assets" / "ui" / "panel-dragon.png").convert("RGBA"), "modal-panel.png")
    header = Image.open(DR / "20240707dragonHeaderA.png").convert("RGBA")
    # Darken header toward antique gold / blood parchment
    pixels = header.load()
    for y in range(header.height):
        for x in range(header.width):
            r, g, b, a = pixels[x, y]
            if a < 8:
                continue
            # Push magenta → deep bronze / wine
            nr = min(255, int(r * 0.55 + g * 0.15))
            ng = min(255, int(g * 0.35 + r * 0.1))
            nb = min(255, int(b * 0.25))
            pixels[x, y] = (nr, ng, nb, a)
    save(header, "modal-header-bar.png")

    print("vault-chrome ready")


if __name__ == "__main__":
    main()
