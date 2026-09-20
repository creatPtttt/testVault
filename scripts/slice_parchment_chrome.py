"""
Slice Parchment GUI + stage Dark World / Dark ARPG chrome for vault modals.
Sources in /mod (user-provided) → public/assets/ui/parchment/
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MOD = ROOT / "mod"
OUT = ROOT / "public" / "assets" / "ui" / "parchment"
SRC = OUT / "_src"
OUT.mkdir(parents=True, exist_ok=True)


def save(im: Image.Image, name: str, scale: int = 1) -> None:
    if scale > 1:
        im = im.resize((im.width * scale, im.height * scale), Image.Resampling.NEAREST)
    path = OUT / name
    im.save(path)
    print(f"  {name} {im.size}")


def main() -> None:
    print("panels.png → 3×48 panels")
    panels = Image.open(MOD / "panels.png").convert("RGBA")
    # Three 48×48 tiles left→right: ornate light, simple light, dark ornate
    save(panels.crop((0, 0, 48, 48)), "panel-parchment-ornate.png", scale=4)
    save(panels.crop((48, 0, 96, 48)), "panel-parchment-simple.png", scale=4)
    save(panels.crop((96, 0, 144, 48)), "panel-abyss.png", scale=4)

    print("buttons.png → bars + corner sets")
    buttons = Image.open(MOD / "buttons.png").convert("RGBA")
    # Sheet is 176×48. Bars appear ~80×12-ish in 2 cols × 3 rows; corners on right.
    # Empirically: left bars column x0–95, right bars x96–?, corners further right.
    # Use connected-component style crops from known layout (Arne16 parchment GUI):
    # Row heights ~16px for bars.
    bar_h = 16
    for i, tone in enumerate(("iron", "bronze", "gold")):
        y0 = i * bar_h
        # Left ornate-end bar (approx width 80)
        save(buttons.crop((0, y0, 80, y0 + bar_h)), f"bar-{tone}-flourish.png", scale=3)
        # Right gem-end bar
        save(buttons.crop((80, y0, 160, y0 + bar_h)), f"bar-{tone}-gem.png", scale=3)

    # Corner clusters on the far right (~16×16 each set)
    # columns starting ~160
    cx0 = 160
    for i, tone in enumerate(("iron", "bronze", "gold")):
        y0 = i * 16
        if cx0 + 16 <= buttons.width and y0 + 16 <= buttons.height:
            save(buttons.crop((cx0, y0, min(cx0 + 16, buttons.width), y0 + 16)), f"corner-{tone}.png", scale=3)

    print("labels.png → title banners")
    labels = Image.open(MOD / "labels.png").convert("RGBA")
    # 64×32 → two 64×16 banners
    save(labels.crop((0, 0, 64, 16)), "label-flourish.png", scale=4)
    save(labels.crop((0, 16, 64, 32)), "label-gem.png", scale=4)

    print("slots.png → slot corner ornaments")
    slots = Image.open(MOD / "slots.png").convert("RGBA")
    # 76×36 ≈ 4 cols × 2 rows of ~19×18 — save full sheet scaled for CSS sprites
    save(slots, "slots-sheet.png", scale=3)

    # Dark ARPG concrete panel (CC-BY) — interior texture / alt shell
    dark_panel = SRC / "dark-arpg" / "panel.png"
    if dark_panel.exists():
        save(Image.open(dark_panel).convert("RGBA"), "stone-panel.png", scale=1)
        save(Image.open(SRC / "dark-arpg" / "button_0.png").convert("RGBA"), "stone-button.png", scale=1)
        save(Image.open(SRC / "dark-arpg" / "divider.png").convert("RGBA"), "stone-divider.png", scale=1)
        save(Image.open(SRC / "dark-arpg" / "golden_frame.png").convert("RGBA"), "stone-slot.png", scale=1)

    # Dark World inventory (CC0)
    dw = SRC / "dark-world" / "Dark World - Free Asset Pack - v1.0" / "Inventory"
    if dw.exists():
        save(Image.open(dw / "inventory_slot_1x1.png").convert("RGBA"), "inv-slot.png", scale=4)
        save(Image.open(dw / "inventory_bag_frame.png").convert("RGBA"), "inv-bag-frame.png", scale=3)

    license_txt = """Parchment GUI (buttons/labels/panels/slots) — zwonky / OpenGameArt — CC0
Dark World Asset Pack — Kaishido — CC0
Dark ARPG UI — vault13dweller — CC-BY 4.0 (see sources.txt in _src/dark-arpg)
Sliced for RuneDelve vault modals (distinct from Gate Dragon Regalia chrome).
"""
    (OUT / "LICENSE.txt").write_text(license_txt, encoding="utf-8")
    print("done →", OUT)


if __name__ == "__main__":
    main()
