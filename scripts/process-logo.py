"""
Process the Triploo logo:
- input is a dark navy mark on a light gray background
- output is a transparent PNG with the mark recoloured white,
  smooth alpha so anti-aliased edges stay clean.

Run:
    python3 scripts/process-logo.py <input.png> <output.png> [hex_color]
    python3 scripts/process-logo.py --icon <input.png> <output.png> <size>

hex_color defaults to #FFFFFF (white).
"""
import sys
from PIL import Image

def hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def process(in_path, out_path, fg_hex="#FFFFFF"):
    img = Image.open(in_path).convert("RGBA")
    fg_r, fg_g, fg_b = hex_to_rgb(fg_hex)
    px = img.load()
    w, h = img.size
    for x in range(w):
        for y in range(h):
            r, g, b, a = px[x, y]
            # luminance (ITU-R BT.601)
            lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0
            # Two-stop ramp: anything brighter than HI is the background (alpha 0),
            # anything darker than LO is the mark (alpha 255), in between we
            # interpolate so anti-aliased edges stay smooth.
            LO, HI = 0.20, 0.80
            if lum >= HI:
                new_alpha = 0
            elif lum <= LO:
                new_alpha = 255
            else:
                new_alpha = int((HI - lum) / (HI - LO) * 255)
            if a < 255:
                new_alpha = int(new_alpha * (a / 255))
            px[x, y] = (fg_r, fg_g, fg_b, new_alpha)
    img.save(out_path, "PNG", optimize=True)
    print(f"wrote {out_path} ({w}x{h})")

def make_icon(in_path, out_path, size, padding_ratio=0.18, bg_hex="#070707"):
    """Build a square PWA icon from a transparent-bg source. Tight-trim,
    pad to a square with extra room, fill with `bg_hex` (default canvas
    black), then resize to `size`. Use bg_hex=None to keep transparent."""
    src = Image.open(in_path).convert("RGBA")
    bbox = src.getbbox()
    if bbox:
        src = src.crop(bbox)
    w, h = src.size
    base = max(w, h)
    pad = int(base * padding_ratio)
    side = base + pad * 2
    bg = (0, 0, 0, 0) if bg_hex is None else (*hex_to_rgb(bg_hex), 255)
    canvas = Image.new("RGBA", (side, side), bg)
    canvas.paste(src, ((side - w) // 2, (side - h) // 2), src)
    canvas = canvas.resize((size, size), Image.LANCZOS)
    canvas.save(out_path, "PNG", optimize=True)
    print(f"wrote {out_path} ({size}x{size}, bg={bg_hex})")

if __name__ == "__main__":
    if len(sys.argv) >= 5 and sys.argv[1] == "--icon":
        make_icon(sys.argv[2], sys.argv[3], int(sys.argv[4]))
        sys.exit(0)
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    color = sys.argv[3] if len(sys.argv) > 3 else "#FFFFFF"
    process(sys.argv[1], sys.argv[2], color)
