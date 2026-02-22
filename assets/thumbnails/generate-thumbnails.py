#!/usr/bin/env python3
"""
QE Podcast Thumbnail Generator
Generates scenic backgrounds via OpenRouter (Gemini), then composites
logo + title text + guest name using Pillow.
"""

import os
import sys
import json
import time
import base64
import requests
from PIL import Image, ImageDraw, ImageFont, ImageEnhance
from io import BytesIO

# ── Config ──────────────────────────────────────────────────────────
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
MODEL = "google/gemini-2.5-flash-image"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(BASE_DIR, "final")
BG_DIR = os.path.join(BASE_DIR, "backgrounds")
LOGO_PATH = os.path.join(BASE_DIR, "..", "question-everything-logo.png")
FONTS_DIR = os.path.join(BASE_DIR, "..", "fonts")
FONT_BOLD = os.path.join(FONTS_DIR, "Oswald-Regular.ttf")   # title text
FONT_REG  = os.path.join(FONTS_DIR, "Inter-Medium.ttf")     # guest name

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(BG_DIR, exist_ok=True)

# ── Episode Data ────────────────────────────────────────────────────
EPISODES = [
    {
        "num": "00-teaser",
        "title": "QUESTION EVERYTHING (EXCEPT THIS PODCAST!)",
        "guest": None,
        "prompt": (
            "Two weathered wooden chairs facing each other on a rocky mountain "
            "overlook at dawn, a vast valley of fog rolling beneath them. The chairs "
            "are simple and imperfect — one slightly turned as if mid-conversation. "
            "Beyond the fog, layers of mountain ridges fade into the distance. "
            "Dramatic golden hour lighting with warm amber and soft pink tones "
            "breaking through clouds on the horizon."
        ),
    },
    {
        "num": "01",
        "title": "GET TO KNOW US",
        "guest": None,
        "prompt": (
            "Two dirt paths converging into one at a wooded trailhead, shot from "
            "ground level looking forward into the trail. Autumn leaves scattered "
            "along the paths. A hand-carved wooden trail marker post stands at the "
            "junction point. Morning light filters through the tree canopy creating "
            "dappled golden light on the forest floor."
        ),
    },
    {
        "num": "02",
        "title": "PHILOSOPHICAL JOURNEY",
        "guest": None,
        "prompt": (
            "A long stone corridor inside an ancient library or monastery, with "
            "towering bookshelves lining both walls. A single beam of warm light "
            "streams through a high arched window at the far end, illuminating dust "
            "motes floating in the air. The perspective draws the eye deep into the "
            "corridor. Old leather-bound books fill the shelves. Warm amber tones "
            "from the light contrast with the cool stone walls."
        ),
    },
    {
        "num": "03",
        "title": "ATTENTION HEIST",
        "guest": None,
        "prompt": (
            "A busy city intersection at night, shot from slightly above street "
            "level. Hundreds of glowing screens — billboards, phone screens, digital "
            "displays — compete for attention in every direction, their light washing "
            "the scene in blue and white. In the center of the frame, a single figure "
            "stands still on the crosswalk, looking up at the night sky while the "
            "world of screens swirls around them. Cool blue and neon tones dominate, "
            "with a single warm streetlamp casting an amber glow on the figure."
        ),
    },
    {
        "num": "04",
        "title": "THE MORALITY OF MASS DESTRUCTION",
        "guest": None,
        "prompt": (
            "A vast, empty desert landscape at dusk — cracked earth stretching to the "
            "horizon. In the middle distance, a lone concrete watchtower or bunker "
            "stands silhouetted against a heavy, dramatic sky. The sky is layered "
            "with deep oranges, reds, and dark purples as the sun sets behind thick "
            "clouds. The landscape feels post-apocalyptic in its emptiness and "
            "stillness. Dramatic warm-to-cool gradient in the sky."
        ),
    },
    {
        "num": "05",
        "title": "THE DIGITAL DIVIDE",
        "guest": None,
        "prompt": (
            "A long wooden pier extending over a calm lake at twilight, shot from the "
            "entrance of the pier looking outward. On the near end of the pier, a "
            "warm lantern glows amber on a post. At the far end, a figure sits alone, "
            "the cool blue twilight reflecting off the water around them. The left "
            "side of the frame is warmer (the lantern's glow on wooden planks), "
            "gradually transitioning to cool blues and silvers on the right."
        ),
    },
    {
        "num": "06",
        "title": "WHERE DO YOU GET YOUR NEWS FROM?",
        "guest": None,
        "prompt": (
            "An old-fashioned newspaper stand on a street corner at golden hour. "
            "Stacks of newspapers and magazines fill the wooden kiosk, their "
            "headlines illegible but layered thick. A few newspapers have blown onto "
            "the sidewalk. Behind the stand, the blurry glow of a large digital "
            "billboard casts cool blue light, contrasting with the warm wood and "
            "paper of the stand. Warm golden tones on the physical newspapers, cool "
            "digital blue from the billboard behind."
        ),
    },
    {
        "num": "07",
        "title": "THE SCIENCE AND FICTION OF TERRENCE HOWARD",
        "guest": None,
        "prompt": (
            "A dimly lit university lecture hall, shot from the back row looking down "
            "toward the front. A large green chalkboard dominates the front wall, "
            "covered in a chaotic mix of mathematical equations — some elegantly "
            "written, others scrawled and crossed out, circles and arrows connecting "
            "ideas. A single desk lamp illuminates the board from below, casting "
            "dramatic upward shadows. Chalk dust hangs in the air. Warm amber from "
            "the desk lamp against the cool dark green of the chalkboard."
        ),
    },
    {
        "num": "08",
        "title": "COMBATTING CONSPIRACY THEORIES",
        "guest": None,
        "prompt": (
            "A weathered community bulletin board on the side of an old brick "
            "building in a small town. The board is covered in overlapping layers of "
            "flyers, posters, and newspaper clippings — some connected by red string, "
            "others pinned at odd angles. A single bare bulb above the board casts "
            "harsh warm light, creating strong shadows. The surrounding brick wall "
            "and sidewalk are bathed in late afternoon golden light."
        ),
    },
    {
        "num": "09",
        "title": "REVISITING LONELINESS",
        "guest": None,
        "prompt": (
            "A single empty park bench in a vast public park at dusk, shot from a low "
            "angle. The bench faces outward toward a distant city skyline, its lights "
            "just beginning to flicker on. Fallen autumn leaves gather around the "
            "bench legs. The park is empty — no people visible anywhere. A single "
            "old-fashioned street lamp near the bench casts a warm amber pool of "
            "light in the gathering blue twilight."
        ),
    },
    {
        "num": "10",
        "title": "RACE TO AI SUPREMACY",
        "guest": None,
        "prompt": (
            "A desolate crossroads on a rural two-lane highway at twilight, shot from "
            "ground level at the center of the intersection. The two roads stretch in "
            "four directions toward distant horizons. A weathered road sign stands at "
            "the junction, its text illegible. Storm clouds gather on one horizon "
            "while the other shows a sliver of clear sky with warm amber light "
            "breaking through. Power lines run along one road, disappearing into the "
            "distance."
        ),
    },
    {
        "num": "11",
        "title": "CURATE LESS, LIVE MORE",
        "guest": None,
        "prompt": (
            "An open doorway in a plain white wall, shot from inside looking out. "
            "Through the door, a wild, overgrown meadow bursts with untamed "
            "wildflowers and tall grass swaying in the wind, bathed in warm "
            "late-afternoon golden light. The interior side of the frame is clean, "
            "sterile, and cool-toned — a perfectly organized but empty room. The "
            "contrast between the controlled interior and the chaotic, beautiful "
            "exterior is the tension. Dramatic golden hour warmth flooding through "
            "the doorway."
        ),
    },
    {
        "num": "12",
        "title": "HOPE IN THE CYCLE",
        "guest": None,
        "prompt": (
            "A grand civic rotunda interior — marble columns, a domed ceiling — shot "
            "looking upward from the floor. A large pendulum hangs from the center of "
            "the dome, caught mid-swing. Late afternoon sunlight streams through tall "
            "arched windows, casting long golden shafts of light across the marble "
            "floor. The architecture is timeless and dignified. Dust motes float in "
            "the light beams. Warm amber sunlight against cool grey-white marble."
        ),
    },
    {
        "num": "13",
        "title": "MEDICINE, MORALITY, AND THE ETHICS OF PROGRESS",
        "guest": None,
        "prompt": (
            "An old apothecary shelf — dark wood, glass bottles of various sizes "
            "filled with liquids of amber, green, and clear tones — shot in dramatic "
            "chiaroscuro lighting. A brass mortar and pestle sits on the worn wooden "
            "counter in the foreground. A single warm light source from the left "
            "illuminates the glass bottles, creating rich reflections and deep "
            "shadows. The shelves stretch into soft-focus darkness on the right."
        ),
    },
    {
        "num": "14",
        "title": "WORDS, HEALTH, AND HARM",
        "guest": None,
        "prompt": (
            "Stone courthouse steps in autumn, shot from a low angle. A vintage "
            "megaphone lies abandoned on the middle step, slightly tilted. Dry autumn "
            "leaves — burnt orange and deep red — have gathered around it and continue "
            "to blow across the steps. The building's columns rise behind, partially "
            "visible. Late afternoon light casts long dramatic shadows across the "
            "stone. Warm autumn amber and orange tones against cool grey stone."
        ),
    },
    {
        "num": "15",
        "title": "THE CLASSROOM REVOLUTION",
        "guest": "Lauren Escobar-Phani",
        "prompt": (
            "A New York City public school classroom, shot from the back corner. "
            "Morning sunlight streams through tall, old windows with wire-reinforced "
            "glass, casting warm light across rows of empty wooden desks. On one desk "
            "in the foreground, a worn textbook sits next to an open laptop — the old "
            "and new side by side. A faded world map hangs on the wall. The "
            "chalkboard at the front still has faint traces of erased writing. Warm "
            "golden morning light against cool institutional green walls."
        ),
    },
    {
        "num": "16",
        "title": "REEL PHILOSOPHY: GROUNDHOG DAY",
        "guest": None,
        "prompt": (
            "A charming small-town main street in winter, shot from the middle of the "
            "road looking toward a prominent clock tower. The clock reads 6:00. Light "
            "snow falls, and the same set of footprints appears multiple times on the "
            "snowy sidewalk — walking in the same direction, slightly offset, as if "
            "someone has walked the same path again and again. Warm amber light "
            "spills from storefronts onto the snow. The sky is that pre-dawn "
            "blue-grey of early morning."
        ),
    },
    {
        "num": "17",
        "title": "LET KIDS OWN THEIR REVELATIONS",
        "guest": "Jared Posey",
        "prompt": (
            "A forest clearing, shot from inside the tree line looking outward. A "
            "single child-sized figure stands in the center of the clearing, arms "
            "slightly raised, looking up at dramatic rays of sunlight breaking "
            "through the tree canopy above. The surrounding trees are tall and "
            "ancient, creating a natural cathedral. Ferns and wildflowers carpet the "
            "forest floor. Warm golden shafts cutting through deep forest green "
            "shadows."
        ),
    },
    {
        "num": "18",
        "title": "SAVING THE SOUL OF THE CLASSROOM",
        "guest": "Rachel Guerrero",
        "prompt": (
            "A close-up of an old wooden teacher's desk near a classroom window. A "
            "small potted plant sits on the desk, reaching toward the window light. "
            "Beside it, a stack of well-worn books and a handwritten note partially "
            "visible. Warm afternoon sunlight pours through the window, casting the "
            "plant's shadow across the desk surface. The window looks out onto a "
            "blurry green schoolyard. The desk's surface shows years of use — "
            "scratches, ink marks, character."
        ),
    },
    {
        "num": "19",
        "title": "THE MYSTERY OF SATOSHI NAKAMOTO",
        "guest": None,
        "prompt": (
            "A dark server room stretching into deep perspective, rows of tall black "
            "server racks on both sides with small green and amber LED lights "
            "blinking in the darkness. The floor is reflective, creating mirror-like "
            "repetitions of the lights. At the far end of the aisle, a single "
            "monitor glows with a warm amber light, its screen content "
            "indistinguishable. Cool dark tones with pinpoints of green and amber "
            "light."
        ),
    },
    {
        "num": "20",
        "title": "AI, SPEED, AND STAYING IN THE SHIRE",
        "guest": None,
        "prompt": (
            "Rolling green hills in soft evening light — lush, gentle, pastoral — "
            "with a round wooden door set into a grassy hillside in the foreground (a "
            "hobbit-hole, warm light glowing from within). In the far background, "
            "barely visible on the distant horizon through a slight haze, the sharp "
            "geometric silhouettes of a futuristic city skyline rise — glass and "
            "steel catching the last light. Warm golden-green pastoral tones in the "
            "foreground, cool steel-grey on the distant horizon."
        ),
    },
    {
        "num": "21",
        "title": "ECHOES OF THE FUTURE",
        "guest": None,
        "prompt": (
            "A vintage turntable with a vinyl record spinning, placed on a wooden "
            "table in front of a floor-to-ceiling glass window of a modern office "
            "building. Through the window, a city skyline at dusk — lights beginning "
            "to glow. The turntable's warm wood grain and analog craftsmanship "
            "contrasts with the sleek glass and steel of the building. The vinyl "
            "catches a warm amber reflection from the sunset outside."
        ),
    },
    {
        "num": "22",
        "title": "RAPID RIFFS",
        "guest": None,
        "prompt": (
            "A lived-in cafe table shot from slightly above, covered in a creative "
            "mess — scattered newspaper pages, an open laptop, two half-finished "
            "coffees in ceramic mugs, a few pens, a dog-eared paperback book, and a "
            "phone face-down. Morning light streams in from a window to the left, "
            "casting warm light across the clutter and creating soft shadows. The "
            "cafe background is soft-focus — exposed brick, warm wood, other empty "
            "tables."
        ),
    },
    {
        "num": "23",
        "title": "TRIBES, TWEETS, AND THE TROUBLE WITH TRUTH",
        "guest": None,
        "prompt": (
            "The interior of a classic American town hall, shot from the center aisle "
            "looking toward a wooden podium at the front. The room is divided — the "
            "left side lit in warm amber from tall windows, the right side in cooler "
            "shadow. A sharp line of light cuts diagonally across the floor between "
            "the two sides. Rows of empty wooden chairs face the podium on both "
            "sides."
        ),
    },
    {
        "num": "24",
        "title": "WHY KNOWING YOURSELF MATTERS",
        "guest": "Suneet Bhatt",
        "prompt": (
            "A tall corporate ladder leaning against a plain concrete wall, shot from "
            "ground level. But the scene's focus is to the left — a figure walking "
            "away from the ladder through an open gate into a vast, open landscape of "
            "rolling fields leading to distant mountains. The figure is small but "
            "purposeful, heading toward the horizon. Behind them, the ladder casts a "
            "long shadow. Late afternoon golden hour light illuminates the open "
            "field, while the wall and ladder remain in cooler shadow."
        ),
    },
    {
        "num": "25",
        "title": "THE JOURNEY TO YOURSELF",
        "guest": "Ruth Pearce",
        "prompt": (
            "A theater dressing room, shot from slightly above. A row of masks — "
            "dramatic, comedic, neutral — hang on hooks along a worn brick wall. "
            "Below them, a single wooden chair faces a large mirror surrounded by "
            "warm vanity bulbs. The mirror reflects the empty chair and the masks "
            "behind it. One mask has fallen to the floor. The vanity bulbs cast warm, "
            "honest light while the rest of the room fades into shadow."
        ),
    },
    {
        "num": "27",
        "title": "KIDS DON'T NEED A SEAT. THEY NEED THE WHEEL.",
        "guest": "Anand Sanwal",
        "prompt": (
            "An open two-lane road stretching toward distant mountains, shot from "
            "the driver's perspective through a vintage car windshield. The steering "
            "wheel is prominent in the lower foreground — worn leather, classic "
            "design. The road ahead is wide and empty, cutting through open desert "
            "scrubland with wildflowers sprouting through cracks in the asphalt. "
            "Golden hour light floods through the windshield, casting long warm "
            "shadows across the dashboard. The distant mountains glow amber and "
            "purple against a vast sky."
        ),
    },
]

# ── Prompt suffix (appended to all prompts) ─────────────────────────
PROMPT_SUFFIX = (
    " Cinematic photography style, slightly desaturated to feel editorial "
    "and premium. No text, no words, no logos, no watermarks, no overlays. "
    "16:9 wide landscape format."
)


def generate_background(prompt_text, output_path, retries=3):
    """Call OpenRouter API to generate a background image."""
    if os.path.exists(output_path):
        print(f"  [skip] Background already exists: {os.path.basename(output_path)}")
        return True

    full_prompt = f"Generate an image: {prompt_text}{PROMPT_SUFFIX}"

    for attempt in range(retries):
        try:
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
                    print(f"  [retry] Waiting 10s before retry {attempt + 2}/{retries}...")
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


def wrap_text(draw, text, font, max_width):
    """Word-wrap text to fit within max_width, with anti-widow protection.

    After greedy wrapping, if the last line has only 1 word and the title
    has more than 3 words, pull one word from the penultimate line down
    to eliminate the orphan. Exception: 3-word titles where the final word
    is long enough to stand alone (e.g. "THE CLASSROOM / REVOLUTION").
    """
    words = text.split()
    lines = []
    current_line = ""
    for word in words:
        test = f"{current_line} {word}".strip()
        bbox = draw.textbbox((0, 0), test, font=font)
        if bbox[2] - bbox[0] > max_width and current_line:
            lines.append(current_line)
            current_line = word
        else:
            current_line = test
    if current_line:
        lines.append(current_line)

    # Anti-widow: fix single-word last lines
    if len(lines) >= 2:
        last_words = lines[-1].split()
        if len(last_words) == 1 and len(words) > 3:
            # Pull last word from penultimate line down to join the orphan
            prev_words = lines[-2].split()
            if len(prev_words) >= 2:
                moved_word = prev_words.pop()
                lines[-2] = " ".join(prev_words)
                lines[-1] = f"{moved_word} {lines[-1]}"

    return lines


def composite_thumbnail(bg_path, title, guest, output_path):
    """Composite background + gradient + logo + text into final thumbnail."""
    # Load and resize background to 1920x1080
    bg = Image.open(bg_path).convert("RGBA")
    scale = max(1920 / bg.width, 1080 / bg.height)
    bg = bg.resize((int(bg.width * scale), int(bg.height * scale)), Image.LANCZOS)
    left = (bg.width - 1920) // 2
    top = (bg.height - 1080) // 2
    bg = bg.crop((left, top, left + 1920, top + 1080))

    # Slightly darken
    bg = ImageEnhance.Brightness(bg).enhance(0.85)

    # Gradient overlay — starts at 42% from top for readable text area
    gradient = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0))
    draw_grad = ImageDraw.Draw(gradient)
    gradient_start = int(1080 * 0.42)
    for y in range(gradient_start, 1080):
        progress = (y - gradient_start) / (1080 - gradient_start)
        alpha = int(225 * progress ** 1.2)
        draw_grad.line([(0, y), (1920, y)], fill=(0, 0, 0, min(alpha, 225)))
    bg = Image.alpha_composite(bg, gradient)

    # Logo — ~15% of image height
    logo = Image.open(LOGO_PATH).convert("RGBA")
    logo_height = 165
    logo_ratio = logo_height / logo.height
    logo = logo.resize(
        (int(logo.width * logo_ratio), logo_height), Image.LANCZOS
    )
    logo_x = 40
    BOTTOM_MARGIN = 45
    logo_y = 1080 - logo_height - BOTTOM_MARGIN
    bg.paste(logo, (logo_x, logo_y), logo)

    draw = ImageDraw.Draw(bg)
    text_x = logo_x + logo.width + 22

    # Available vertical space: from logo_y to (image bottom - bottom padding)
    BOTTOM_PAD = 18  # minimum pixels below last text line
    available_height = 1080 - logo_y - BOTTOM_PAD

    # Dynamic font sizing: start large, shrink until everything fits
    # Text block = title lines + optional guest line
    GUEST_FONT_RATIO = 0.47  # guest font size relative to title font
    LINE_HEIGHT_RATIO = 1.06  # line height relative to font size
    GUEST_GAP = 8  # pixels between last title line and guest

    title_size = 76  # start size
    MIN_TITLE_SIZE = 48  # never go below this

    while title_size >= MIN_TITLE_SIZE:
        title_font = ImageFont.truetype(FONT_BOLD, title_size)
        guest_size = max(28, int(title_size * GUEST_FONT_RATIO))
        line_height = int(title_size * LINE_HEIGHT_RATIO)

        # Wrap width scales slightly with font size to keep right side open
        max_text_width = int((1920 - text_x) * 0.55)
        lines = wrap_text(draw, title, title_font, max_text_width)

        # Calculate total block height
        title_block_height = len(lines) * line_height
        if guest:
            total_height = title_block_height + GUEST_GAP + guest_size
        else:
            total_height = title_block_height

        if total_height <= available_height:
            break  # it fits!
        title_size -= 2  # shrink and retry

    # Load final fonts at chosen size
    title_font = ImageFont.truetype(FONT_BOLD, title_size)
    guest_size = max(28, int(title_size * GUEST_FONT_RATIO))
    guest_font = ImageFont.truetype(FONT_REG, guest_size)
    line_height = int(title_size * LINE_HEIGHT_RATIO)
    max_text_width = int((1920 - text_x) * 0.55)
    lines = wrap_text(draw, title, title_font, max_text_width)

    # Title top aligns with logo top
    title_y = logo_y
    for i, line in enumerate(lines):
        draw.text(
            (text_x, title_y + i * line_height),
            line,
            font=title_font,
            fill=(255, 255, 255, 255),
        )

    # Guest name below title block
    if guest:
        guest_text = f"with {guest}"
        guest_y = title_y + len(lines) * line_height + GUEST_GAP
        draw.text(
            (text_x, guest_y),
            guest_text,
            font=guest_font,
            fill=(255, 255, 255, 210),
        )

    if title_size < 76:
        print(f"  [note] Font scaled to {title_size}px ({len(lines)} lines)")

    # Save
    bg = bg.convert("RGB")
    bg.save(output_path, "PNG")
    print(f"  [ok] Thumbnail saved: {os.path.basename(output_path)}")


def main():
    if not OPENROUTER_API_KEY:
        print("ERROR: Set OPENROUTER_API_KEY environment variable")
        sys.exit(1)

    # Filter to a single episode if argument provided
    if len(sys.argv) > 1:
        target = sys.argv[1]
        episodes = [e for e in EPISODES if e["num"] == target]
        if not episodes:
            print(f"ERROR: Episode {target} not found in EPISODES list")
            sys.exit(1)
    else:
        episodes = EPISODES

    print(f"Generating {len(episodes)} thumbnail(s)...")
    print(f"Backgrounds: {BG_DIR}")
    print(f"Final output: {OUTPUT_DIR}")
    print()

    failed = []

    for i, ep in enumerate(episodes):
        num = ep["num"]
        title = ep["title"]
        guest = ep["guest"]
        label = f"[{i+1}/{len(episodes)}] Episode {num}: {title}"
        if guest:
            label += f" | with {guest}"
        print(label)

        bg_path = os.path.join(BG_DIR, f"ep-{num}-bg.png")
        final_path = os.path.join(OUTPUT_DIR, f"ep-{num}-thumbnail.png")

        # Generate background
        if not generate_background(ep["prompt"], bg_path):
            print(f"  [FAILED] Could not generate background")
            failed.append(num)
            continue

        # Composite final thumbnail
        try:
            composite_thumbnail(bg_path, title, guest, final_path)
        except Exception as e:
            print(f"  [FAILED] Compositing error: {e}")
            failed.append(num)
            continue

        sys.stdout.flush()

        # Rate limit: small delay between API calls
        if i < len(episodes) - 1 and not os.path.exists(
            os.path.join(BG_DIR, f"ep-{episodes[i+1]['num']}-bg.png")
        ):
            time.sleep(3)

    print()
    print("=" * 50)
    print(f"Done! {len(episodes) - len(failed)}/{len(episodes)} thumbnail(s) generated.")
    if failed:
        print(f"Failed: {', '.join(failed)}")
    print(f"Output folder: {OUTPUT_DIR}")
    sys.stdout.flush()


if __name__ == "__main__":
    main()
