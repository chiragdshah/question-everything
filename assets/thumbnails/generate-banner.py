#!/usr/bin/env python3
"""
QE Podcast YouTube Channel Banner Generator

Generates a 2048x1152 channel banner using:
  - OpenRouter (Gemini) for background generation
  - Pillow for compositing logo + text

YouTube banner safe zones (within 2048x1152):
  - TV:      full 2048x1152
  - Desktop: ~2048x423 center strip
  - Mobile:  ~1546x423 center strip (THE CRITICAL SAFE ZONE)

All important content (logo, text) is placed within the mobile-safe
center zone so it displays correctly on every device.

Usage:
  python generate-banner.py                     # Generate with AI background
  python generate-banner.py --bg path/to/bg.png # Use a custom background image
  python generate-banner.py --prompt "..."       # Override the background prompt
"""

import os
import sys
import argparse
import base64
import time
import requests
from PIL import Image, ImageDraw, ImageFont, ImageEnhance, ImageFilter
from io import BytesIO

# ── Config ──────────────────────────────────────────────────────────
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
MODEL = "google/gemini-2.5-flash-image"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = BASE_DIR
LOGO_PATH = os.path.join(BASE_DIR, "..", "question-everything-logo.png")
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FONT_REG = "/System/Library/Fonts/Supplemental/Arial.ttf"

# Banner dimensions
BANNER_W = 2048
BANNER_H = 1152

# YouTube safe zones (within 2048x1152)
# Mobile-safe center: 1546x423
SAFE_W = 1546
SAFE_H = 423
SAFE_X = (BANNER_W - SAFE_W) // 2   # 251
SAFE_Y = (BANNER_H - SAFE_H) // 2   # 365

MAX_FILE_BYTES = 6_000_000  # YouTube's 6 MB limit

# Default background prompt — atmospheric, wide, no text
DEFAULT_BG_PROMPT = (
    "A dramatic wide panoramic landscape at golden hour — rolling hills "
    "of amber and deep green stretching to distant mountain ridges under "
    "a vast sky with layered clouds catching warm sunset light. "
    "The scene is cinematic and contemplative, with depth and atmosphere. "
    "Slightly desaturated, editorial feel. Rich warm amber and golden tones "
    "with cool blue-grey in the shadows. "
    "No text, no words, no logos, no watermarks, no people. "
    "Ultra-wide panoramic format, suitable as a background banner."
)


def generate_background(prompt_text, output_path, retries=3):
    """Call OpenRouter API to generate a background image."""
    if os.path.exists(output_path):
        print(f"  [skip] Background already exists: {os.path.basename(output_path)}")
        return True

    full_prompt = f"Generate an image: {prompt_text}"

    for attempt in range(retries):
        try:
            print(f"  [gen] Calling {MODEL} (attempt {attempt + 1}/{retries})...")
            resp = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": MODEL,
                    "messages": [{"role": "user", "content": full_prompt}],
                },
                timeout=120,
            )
            data = resp.json()

            if "error" in data:
                print(f"  [error] API error: {data['error'].get('message', data['error'])}")
                if attempt < retries - 1:
                    time.sleep(10)
                    continue
                return False

            images = data.get("choices", [{}])[0].get("message", {}).get("images", [])
            if not images:
                print(f"  [error] No images in response")
                if attempt < retries - 1:
                    time.sleep(10)
                    continue
                return False

            url = images[0].get("image_url", {}).get("url", "")
            if url.startswith("data:"):
                _, b64data = url.split(",", 1)
                img_bytes = base64.b64decode(b64data)
                with open(output_path, "wb") as f:
                    f.write(img_bytes)
                print(f"  [ok] Background saved ({len(img_bytes)} bytes)")
                return True

        except Exception as e:
            print(f"  [error] Exception: {e}")
            if attempt < retries - 1:
                time.sleep(10)
                continue
            return False

    return False


def composite_banner(bg_path, output_path):
    """Composite background + gradient + logo + text into the channel banner."""
    # Load and resize background to banner dimensions
    bg = Image.open(bg_path).convert("RGBA")
    scale = max(BANNER_W / bg.width, BANNER_H / bg.height)
    bg = bg.resize((int(bg.width * scale), int(bg.height * scale)), Image.LANCZOS)
    left = (bg.width - BANNER_W) // 2
    top = (bg.height - BANNER_H) // 2
    bg = bg.crop((left, top, left + BANNER_W, top + BANNER_H))

    # Slight brightness reduction for text contrast
    bg = ImageEnhance.Brightness(bg).enhance(0.80)

    # Center gradient overlay — darker band in the middle for text readability
    gradient = Image.new("RGBA", (BANNER_W, BANNER_H), (0, 0, 0, 0))
    draw_grad = ImageDraw.Draw(gradient)

    # Horizontal dark band across the center (safe zone area)
    band_top = SAFE_Y - 40
    band_bottom = SAFE_Y + SAFE_H + 40
    band_center = (band_top + band_bottom) // 2

    for y in range(band_top, band_bottom):
        dist_from_center = abs(y - band_center)
        max_dist = (band_bottom - band_top) // 2
        # Stronger in center, fades to edges
        alpha = int(140 * (1 - (dist_from_center / max_dist) ** 1.5))
        alpha = max(0, min(alpha, 140))
        draw_grad.line([(0, y), (BANNER_W, y)], fill=(0, 0, 0, alpha))

    bg = Image.alpha_composite(bg, gradient)

    # Logo — centered vertically in safe zone, positioned left of center
    logo = Image.open(LOGO_PATH).convert("RGBA")
    logo_height = 280
    logo_ratio = logo_height / logo.height
    logo = logo.resize(
        (int(logo.width * logo_ratio), logo_height), Image.LANCZOS
    )

    # Center the entire composition (logo + text) within the safe zone
    # Logo sits to the left, text to the right
    gap = 30  # space between logo and text
    logo_x = SAFE_X + (SAFE_W // 2) - logo.width - (gap // 2) - 40
    logo_y = SAFE_Y + (SAFE_H - logo_height) // 2
    bg.paste(logo, (logo_x, logo_y), logo)

    draw = ImageDraw.Draw(bg)

    # Text block — to the right of the logo, vertically centered in safe zone
    text_x = logo_x + logo.width + gap

    # Show name
    show_name = "QUESTION\nEVERYTHING"
    title_size = 72
    title_font = ImageFont.truetype(FONT_BOLD, title_size)

    # Tagline
    tagline = "(EXCEPT THIS PODCAST!)"
    tagline_size = 28
    tagline_font = ImageFont.truetype(FONT_REG, tagline_size)

    # Measure text block height for vertical centering
    name_lines = show_name.split("\n")
    line_height = int(title_size * 1.12)
    name_block_h = len(name_lines) * line_height
    tagline_gap = 12
    total_text_h = name_block_h + tagline_gap + tagline_size

    text_y_start = SAFE_Y + (SAFE_H - total_text_h) // 2

    # Draw show name
    for i, line in enumerate(name_lines):
        draw.text(
            (text_x, text_y_start + i * line_height),
            line,
            font=title_font,
            fill=(255, 255, 255, 255),
        )

    # Draw tagline
    tagline_y = text_y_start + name_block_h + tagline_gap
    draw.text(
        (text_x, tagline_y),
        tagline,
        font=tagline_font,
        fill=(255, 255, 255, 190),
    )

    # Convert and save — ensure under 6MB
    bg = bg.convert("RGB")
    bg.save(output_path, "PNG", optimize=True)

    file_size = os.path.getsize(output_path)
    if file_size > MAX_FILE_BYTES:
        print(f"  [compress] PNG is {file_size / 1e6:.1f} MB, converting to JPEG...")
        for quality in (95, 90, 85, 80):
            jpeg_path = output_path.rsplit(".", 1)[0] + ".jpg"
            bg.save(jpeg_path, "JPEG", quality=quality, optimize=True)
            jpeg_size = os.path.getsize(jpeg_path)
            if jpeg_size <= MAX_FILE_BYTES:
                print(f"  [ok] JPEG saved at quality={quality} ({jpeg_size / 1e6:.1f} MB)")
                # Remove the oversized PNG
                if jpeg_path != output_path:
                    os.remove(output_path)
                return jpeg_path
        print(f"  [warn] Could not get under 6 MB even at quality=80")
        return jpeg_path

    print(f"  [ok] Banner saved: {os.path.basename(output_path)} ({file_size / 1e6:.1f} MB)")
    return output_path


def draw_safe_zone_guides(img_path):
    """Draw safe-zone guides on a copy of the banner for preview."""
    img = Image.open(img_path).convert("RGBA")
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Mobile safe zone (innermost — must-see content)
    draw.rectangle(
        [SAFE_X, SAFE_Y, SAFE_X + SAFE_W, SAFE_Y + SAFE_H],
        outline=(0, 255, 0, 180), width=2,
    )

    # Desktop safe zone (full width, center height)
    desktop_h = 423
    desktop_y = (BANNER_H - desktop_h) // 2
    draw.rectangle(
        [0, desktop_y, BANNER_W, desktop_y + desktop_h],
        outline=(255, 255, 0, 140), width=2,
    )

    result = Image.alpha_composite(img, overlay)
    guide_path = img_path.rsplit(".", 1)[0] + "-guides." + img_path.rsplit(".", 1)[1]
    result.convert("RGB").save(guide_path)
    print(f"  [ok] Safe-zone guide: {os.path.basename(guide_path)}")
    print(f"       Green = mobile safe zone | Yellow = desktop safe zone")
    return guide_path


def main():
    parser = argparse.ArgumentParser(description="Generate QE YouTube channel banner")
    parser.add_argument("--bg", type=str, help="Path to a custom background image (skips AI generation)")
    parser.add_argument("--prompt", type=str, help="Override the background generation prompt")
    parser.add_argument("--no-guides", action="store_true", help="Skip generating the safe-zone guide image")
    parser.add_argument("--output", type=str, default=None, help="Output filename (default: qe-channel-banner.png)")
    args = parser.parse_args()

    output_name = args.output or "qe-channel-banner.png"
    output_path = os.path.join(OUTPUT_DIR, output_name)
    bg_path = os.path.join(OUTPUT_DIR, "banner-background.png")

    print("=" * 50)
    print("QE Podcast — YouTube Channel Banner Generator")
    print(f"Output: {BANNER_W}x{BANNER_H} (max {MAX_FILE_BYTES / 1e6:.0f} MB)")
    print("=" * 50)
    print()

    # Step 1: Get background
    if args.bg:
        bg_path = args.bg
        print(f"[1/3] Using custom background: {bg_path}")
    else:
        prompt = args.prompt or DEFAULT_BG_PROMPT
        print(f"[1/3] Generating background via {MODEL}...")
        if not OPENROUTER_API_KEY:
            print("ERROR: Set OPENROUTER_API_KEY environment variable")
            print("  Or use --bg to provide a custom background image")
            sys.exit(1)
        if not generate_background(prompt, bg_path):
            print("FAILED: Could not generate background")
            sys.exit(1)

    # Step 2: Composite banner
    print(f"\n[2/3] Compositing banner...")
    final_path = composite_banner(bg_path, output_path)

    # Step 3: Safe zone guides
    if not args.no_guides:
        print(f"\n[3/3] Generating safe-zone guide overlay...")
        draw_safe_zone_guides(final_path)
    else:
        print(f"\n[3/3] Skipping safe-zone guides")

    print()
    print("=" * 50)
    print("Done! Upload your banner at:")
    print("  https://studio.youtube.com → Customization → Branding → Banner image")
    print("=" * 50)


if __name__ == "__main__":
    main()
