from PIL import Image

src = Image.open(r"public/assets/ui/seal/chain-hang-left-keyed.png").convert("RGBA")
w, h = src.size
px = src.load()

# 1) Force near-black matte to transparent
out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
op = out.load()
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if a < 12:
            continue
        lum = 0.3 * r + 0.59 * g + 0.11 * b
        if lum < 28 and max(r, g, b) < 48:
            continue
        op[x, y] = (r, g, b, a)

bbox = out.getbbox()
print("bbox", bbox)
cropped = out.crop(bbox)
cw, ch = cropped.size

# 2) Drop spike hooks — keep middle links for seamless tiling
top = int(ch * 0.18)
bot = int(ch * 0.82)
mid = cropped.crop((0, top, cw, bot))
mw, mh = mid.size
print("mid", mw, mh)


def recolor(im: Image.Image) -> Image.Image:
    """Push palette toward heavy rusted iron (not jewelry gold)."""
    p = im.load()
    iw, ih = im.size
    for y in range(ih):
        for x in range(iw):
            r, g, b, a = p[x, y]
            if a < 8:
                continue
            nr = int(r * 0.52 + 16)
            ng = int(g * 0.34 + 7)
            nb = int(b * 0.24 + 3)
            lum = 0.3 * nr + 0.59 * ng + 0.11 * nb
            if lum > 105:
                nr = int(nr * 0.7)
                ng = int(ng * 0.62)
                nb = int(nb * 0.55)
            p[x, y] = (min(255, nr), min(255, ng), min(255, nb), a)
    return im


mid = recolor(mid)

# 3) Stack mid section into a long strip
tile_h = mh * 3
tile = Image.new("RGBA", (mw + 10, tile_h), (0, 0, 0, 0))
for i in range(3):
    tile.paste(mid, (5, i * mh), mid)

# 4) Upscale nearest-neighbor for chunkier weight
scale = 1.45
tw, th = tile.size
tile = tile.resize((int(tw * scale), int(th * scale)), Image.NEAREST)

# 5) Final fringe wipe
p = tile.load()
tw, th = tile.size
for y in range(th):
    for x in range(tw):
        r, g, b, a = p[x, y]
        if a > 0 and (0.3 * r + 0.59 * g + 0.11 * b) < 18:
            p[x, y] = (0, 0, 0, 0)

path = r"public/assets/ui/seal/chain-iron-tile.png"
tile.save(path)
print("saved", path, tile.size)

prev = Image.new("RGBA", tile.size, (36, 110, 70, 255))
prev.paste(tile, (0, 0), tile)
prev.convert("RGB").save(r"public/assets/ui/seal/_preview_chain-iron.png")
print("preview ok")
