"""
Process the Triploo logo:
- input is a dark navy mark on a light gray background
- output is a transparent PNG with the mark recoloured white,
  smooth alpha so anti-aliased edges stay clean.

Run:
    python3 scripts/process-logo.py <input.png> <output.png> [hex_color]

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

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    color = sys.argv[3] if len(sys.argv) > 3 else "#FFFFFF"
    process(sys.argv[1], sys.argv[2], color)
