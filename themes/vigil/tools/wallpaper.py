"""Turn a picture into a vector wallpaper Vigil can draw behind the conversation.

Claude's backdrops take vector drawings only, under 131,072 characters, so a
photo or painting has to be redrawn. This does it in three layers:

  1. the background: the picture, softened, as a coarse grid of colors that
     the drawing blurs back into smooth gradients (no banding);
  2. the subject, if you mark it with --subject: cut out, traced in color in
     detail, and outlined, so it stays sharp;
  3. a glow, if you mark it with --glow: the brightest pixels in that box
     (lightning, a lamp) traced crisp, with a soft halo.

  python tools/wallpaper.py picture.jpg wallpaper.svg --subject .4,.1,.89,1 --glow .66,0,.9,.55

Boxes are fractions of the picture's width and height: left,top,right,bottom.
Then, in Claude Code: /vigil wallpaper /path/to/wallpaper.svg

Needs: pip install vtracer opencv-python-headless numpy pillow
"""
import argparse
import os
import re

import cv2
import numpy as np
import vtracer
from PIL import Image

LIMIT = 126_000  # leaves room for Vigil's rain around it
VW = 1000  # the drawing's own width, in units


def box(text):
    values = [float(v) for v in text.split(',')]
    if len(values) != 4:
        raise argparse.ArgumentTypeError('a box is left,top,right,bottom as fractions')
    return values


def hexc(bgr):
    b, g, r = (int(v) for v in bgr)
    return f'#{r:02x}{g:02x}{b:02x}'


def kmeans(lab, k):
    crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 40, 0.3)
    _, labels, centers = cv2.kmeans(lab, k, None, crit, 4, cv2.KMEANS_PP_CENTERS)
    return labels.flatten(), centers


def compact(svg_text, scale):
    """vtracer's paths, translated and scaled into whole drawing units, relative."""
    found = re.findall(r'<path d="([^"]+)" fill="(#[0-9A-Fa-f]{6})" transform="translate\(([-\d.]+),([-\d.]+)\)"/>', svg_text)
    out = []
    for d, fill, tx, ty in found:
        tx, ty = float(tx), float(ty)
        segs, cmd, nums = [], None, []
        for t in re.findall(r'[MLCQZz]|-?\d*\.?\d+', d):
            if t in 'MLCQZz':
                if cmd:
                    segs.append((cmd, nums))
                cmd, nums = t, []
            else:
                nums.append(float(t))
        if cmd:
            segs.append((cmd, nums))
        dd, cx, cy, sx, sy = '', 0, 0, 0, 0

        def put(v):
            nonlocal dd
            s = str(int(v))
            dd += s if (dd[-1:] in 'mlcqz' or s.startswith('-')) else ' ' + s

        for cmd, nums in segs:
            if cmd in 'Zz':
                dd += 'z'
                cx, cy = sx, sy
                continue
            pts = [(round((nums[i] + tx) * scale), round((nums[i + 1] + ty) * scale)) for i in range(0, len(nums), 2)]
            dd += cmd.lower()
            group = {'C': 3, 'Q': 2}.get(cmd, 1)
            for k in range(0, len(pts), group):
                for x, y in pts[k:k + group]:
                    put(x - cx)
                    put(y - cy)
                cx, cy = pts[k:k + group][-1]
            if cmd == 'M':
                sx, sy = cx, cy
        out.append(f'<path d="{dd}" fill="{fill.lower()}"/>')
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('picture')
    ap.add_argument('out')
    ap.add_argument('--subject', type=box, help='box around the subject to keep sharp')
    ap.add_argument('--glow', type=box, help='box holding a bright light to trace crisp')
    ap.add_argument('--grid', type=int, default=125, help='background grid columns: 1000 divided by a whole number (more: sharper, larger)')
    ap.add_argument('--grid-colors', type=int, default=20)
    ap.add_argument('--soften', type=float, default=.85, help='background blur, in grid cells')
    ap.add_argument('--detail', type=int, default=700, help='width the subject is traced at')
    ap.add_argument('--colors', type=int, default=15, help='subject colors')
    ap.add_argument('--deepen', type=float, default=1.12, help='darken the subject\'s tones (1: as traced)')
    ap.add_argument('--mist', type=float, default=0.22, help='height of the mist over the bottom, a fraction (0: none)')
    args = ap.parse_args()

    src = cv2.cvtColor(np.array(Image.open(args.picture).convert('RGB')), cv2.COLOR_RGB2BGR)
    sh, sw = src.shape[:2]
    vh = round(sh * VW / sw)
    layers = []
    fg_full = np.zeros((sh, sw), np.uint8)

    # ---- the subject
    subject, ink = [], ''
    if args.subject:
        fw = args.detail
        fh = round(sh * fw / sw)
        img = cv2.resize(src, (fw, fh), interpolation=cv2.INTER_AREA)
        x0, y0, x1, y1 = (int(v * s) for v, s in zip(args.subject, (fw, fh, fw, fh)))
        mask = np.zeros(img.shape[:2], np.uint8)
        cv2.grabCut(img, mask, (x0, y0, min(fw - 1, x1) - x0, min(fh - 1, y1) - y0), np.zeros((1, 65)), np.zeros((1, 65)), 6, cv2.GC_INIT_WITH_RECT)
        fg = np.where((mask == 1) | (mask == 3), 255, 0).astype(np.uint8)
        fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        fg = cv2.morphologyEx(fg, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
        count, labels, stats, _ = cv2.connectedComponentsWithStats(fg)
        if count > 1:
            fg = np.where(labels == 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA]), 255, 0).astype(np.uint8)
        if args.subject[3] >= 0.99:
            # A subject that runs off the bottom keeps running off it.
            r0 = fh - max(2, int(fh * 0.04))
            fg[r0:] = fg[r0]
        fg_full = cv2.resize(fg, (sw, sh), interpolation=cv2.INTER_NEAREST)
        smooth = cv2.bilateralFilter(img, 7, 30, 5)
        smooth = cv2.addWeighted(smooth, 1.6, cv2.GaussianBlur(smooth, (0, 0), 1.6), -0.6, 0)
        lab = cv2.cvtColor(smooth, cv2.COLOR_BGR2LAB).reshape(-1, 3).astype(np.float32)
        lab[:, 0] = 255 * (lab[:, 0] / 255) ** 0.6  # more clusters in the shadows
        keep = fg.reshape(-1) > 0
        labels, centers = kmeans(lab[keep], args.colors)
        lab[keep] = centers[labels]
        lab[:, 0] = 255 * (lab[:, 0] / 255) ** (1 / 0.6 * args.deepen)
        q = cv2.cvtColor(lab.reshape(smooth.shape).astype(np.uint8), cv2.COLOR_LAB2BGR)
        Image.fromarray(np.dstack([cv2.cvtColor(q, cv2.COLOR_BGR2RGB), fg]), 'RGBA').save(args.out + '.subject.png')
        vtracer.convert_image_to_svg_py(args.out + '.subject.png', args.out + '.subject.svg', colormode='color', hierarchical='stacked',
                                        mode='spline', filter_speckle=8, color_precision=8, layer_difference=10, corner_threshold=80,
                                        length_threshold=7.0, max_iterations=10, splice_threshold=70, path_precision=2)
        subject = compact(open(args.out + '.subject.svg').read(), VW / fw)
        for scratch in (args.out + '.subject.png', args.out + '.subject.svg'):
            os.remove(scratch)
        outline = cv2.resize(fg, (VW, vh), interpolation=cv2.INTER_LINEAR)
        contours, _ = cv2.findContours((outline > 127).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for c in contours:
            if cv2.contourArea(c) >= 200:
                c = cv2.approxPolyDP(c, 1.0, True).reshape(-1, 2)
                ink += 'M' + 'L'.join(f'{x} {y}' for x, y in c) + 'Z'

    # ---- the background, the subject painted out of it
    behind = cv2.inpaint(src, cv2.dilate(fg_full, np.ones((9, 9), np.uint8)), 6, cv2.INPAINT_TELEA) if args.subject else src
    gw = args.grid
    k = round(VW / gw)  # a cell's side in drawing units; the grid is drawn at full size so the blur is too
    gh = -(-vh // k)
    small = cv2.resize(cv2.medianBlur(behind, 5), (gw, gh), interpolation=cv2.INTER_AREA)
    labels, centers = kmeans(cv2.cvtColor(small, cv2.COLOR_BGR2LAB).reshape(-1, 3).astype(np.float32), args.grid_colors)
    grid = cv2.cvtColor(centers.astype(np.uint8)[labels].reshape(small.shape), cv2.COLOR_LAB2BGR)
    # Past every edge by a few cells, so the blur fades out of view, not into it.
    pad = 4
    grid = cv2.copyMakeBorder(grid, pad, pad, pad, pad, cv2.BORDER_REPLICATE)
    gh, gw = grid.shape[:2]
    runs = {}
    for y in range(gh):
        x = 0
        while x < gw:
            c = hexc(grid[y, x])
            end = x
            while end + 1 < gw and hexc(grid[y, end + 1]) == c:
                end += 1
            runs.setdefault(c, []).append((x, y, end - x + 1))
            x = end + 1
    cells = []
    for color, rs in runs.items():
        d, px, py = '', 0, 0
        for i, (x, y, w) in enumerate(rs):
            d += (f'M{(x - pad) * k} {(y - pad) * k}' if i == 0 else f'm{(x - px) * k} {(y - py) * k}') + f'h{w * k}v{k}h-{w * k}z'
            px, py = x, y
        cells.append(f'<path d="{d}" fill="{color}"/>')
    layers.append(f'<g filter="url(#wb)">{"".join(cells)}</g>')

    # ---- a bright light, traced crisp
    if args.glow:
        lum = cv2.cvtColor(src, cv2.COLOR_BGR2GRAY)
        x0, y0, x1, y1 = (int(v * s) for v, s in zip(args.glow, (sw, sh, sw, sh)))
        bright = np.zeros_like(lum)
        bright[y0:y1, x0:x1] = np.where(lum[y0:y1, x0:x1] > 215, 255, 0)
        bright = cv2.morphologyEx(bright, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
        _, bright = cv2.threshold(cv2.resize(bright, (VW, vh), interpolation=cv2.INTER_AREA), 90, 255, cv2.THRESH_BINARY)
        contours, _ = cv2.findContours(bright, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        d = ''
        for c in contours:
            if cv2.contourArea(c) >= 3:
                c = cv2.approxPolyDP(c, 0.8, True).reshape(-1, 2)
                d += 'M' + 'L'.join(f'{x} {y}' for x, y in c) + 'Z'
        if d:
            layers.append(f'<path d="{d}" fill="#eef3ff" filter="url(#glow)"/><path d="{d}" fill="#f6f8ff"/>')

    layers.extend(subject)
    if ink:
        layers.append(f'<path d="{ink}" fill="none" stroke="#06070a" stroke-width="1.6" stroke-linejoin="round" opacity=".85"/>')
    if args.mist > 0:
        base = cv2.resize(src[int(sh * (1 - args.mist / 2)):], (1, 1), interpolation=cv2.INTER_AREA)[0, 0]
        top = vh * (1 - args.mist)
        layers.append(f'<rect y="{top:.0f}" width="{VW}" height="{vh - top:.0f}" fill="url(#mist)"/>')
        mist_color = hexc(base)
    defs = (f'<defs><filter id="wb" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="{args.soften * k:g}"/></filter>'
            '<filter id="glow" x="-50%" y="-20%" width="200%" height="140%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="3"/></filter>'
            + (f'<linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{mist_color}" stop-opacity="0"/>'
               f'<stop offset=".6" stop-color="{mist_color}" stop-opacity=".55"/><stop offset="1" stop-color="{mist_color}" stop-opacity=".85"/></linearGradient>' if args.mist > 0 else '')
            + '</defs>')
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VW} {vh}" preserveAspectRatio="xMidYMid slice" '
           f'width="100%" height="100%">{defs}{"".join(layers)}</svg>')
    open(args.out, 'w').write(svg)
    verdict = 'fits' if len(svg) <= LIMIT else f'is over the {LIMIT:,} Vigil can take: lower --grid, --detail or --colors'
    print(f'{args.out}: {len(svg):,} characters, which {verdict}.')


if __name__ == '__main__':
    main()
