#!/usr/bin/env python3
"""
Upload QE podcast thumbnails to YouTube via the Data API v3.

Prerequisites:
  1. Enable YouTube Data API v3 in Google Cloud Console
  2. Create OAuth 2.0 credentials (Desktop app type)
  3. Download the client secret JSON → save as client_secret.json in this directory
  4. pip install google-api-python-client google-auth-oauthlib

Usage:
  python upload-youtube-thumbnails.py          # Upload all 26 thumbnails
  python upload-youtube-thumbnails.py --dry-run # Preview what would be uploaded
  python upload-youtube-thumbnails.py --episode 05  # Upload just one episode
"""

import os
import sys
import argparse
import json
import tempfile
from PIL import Image
from google_auth_oauthlib.flow import InstalledAppFlow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

MAX_THUMBNAIL_BYTES = 2_097_152  # YouTube's 2 MB limit

# ── Config ──────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
THUMBNAIL_DIR = os.path.join(BASE_DIR, "final")
CREDS_DIR = os.path.join(os.path.dirname(BASE_DIR), "..", ".credentials")
CLIENT_SECRET_FILE = os.path.join(CREDS_DIR, "youtube-client-secret.json")
TOKEN_FILE = os.path.join(CREDS_DIR, "youtube-token-qe.json")
SCOPES = ["https://www.googleapis.com/auth/youtube"]

# ── Episode → New YouTube Video ID mapping ──────────────────────────
# Built from catalog.json (title → old_id) + progress.json (old_id → new_id)
EPISODE_MAP = {
    "00-teaser": "84IrxXcTkbE",
    "01": "Ad-Fi8eo1jA",
    "02": "GQ6_WqnxNw8",
    "03": "m6KWYdR7Ozw",
    "04": "0nGMyzONKh8",
    "05": "WRQzzGMeDXc",
    "06": "c9Fw6CFKYGk",
    "07": "dUjbOhMygDY",
    "08": "7bTO55moAmg",
    "09": "hC-Xo2VSoUE",
    "10": "9dA2Nk8ActY",
    "11": "6d4x44EkAHw",
    "12": "KWbMnB4LoW8",
    "13": "UIcrNaX1Az8",
    "14": "ZXudfbtqJDs",
    "15": "RHhSHr8uIFo",
    "16": "IzAkfYn-HCY",
    "17": "dMoh3U7qH6I",
    "18": "v8iND36k2yg",
    "19": "dgj_i6Xxp_g",
    "20": "-yc1jUYC--E",
    "21": "pL7BVSrZk4o",
    "22": "oQrQBDIuJbE",
    "23": "iTzcu-JU8Mk",
    "24": "jlvBbn-nwZc",
    "25": "Bmee2V1BdDs",
}


def get_authenticated_service():
    """Authenticate via OAuth 2.0 and return a YouTube API service."""
    creds = None

    # Load existing token
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)

    # Refresh or run new auth flow
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            print("[auth] Refreshing expired token...")
            creds.refresh(Request())
        else:
            if not os.path.exists(CLIENT_SECRET_FILE):
                print(f"ERROR: {CLIENT_SECRET_FILE} not found.")
                print()
                print("Setup instructions:")
                print("  1. Go to https://console.cloud.google.com/apis/credentials")
                print("  2. Create OAuth 2.0 Client ID (type: Desktop app)")
                print("  3. Download the JSON and save as:")
                print(f"     {CLIENT_SECRET_FILE}")
                sys.exit(1)

            print("[auth] Starting OAuth flow (browser will open)...")
            flow = InstalledAppFlow.from_client_secrets_file(
                CLIENT_SECRET_FILE, SCOPES
            )
            creds = flow.run_local_server(port=0)

        # Save token for reuse
        with open(TOKEN_FILE, "w") as f:
            f.write(creds.to_json())
        print(f"[auth] Token saved to {TOKEN_FILE}")

    return build("youtube", "v3", credentials=creds)


def prepare_thumbnail(thumbnail_path):
    """If the file exceeds 2 MB, convert to JPEG at decreasing quality until it fits.
    Returns (upload_path, mimetype, was_compressed). Caller cleans up temp files."""
    size = os.path.getsize(thumbnail_path)
    if size <= MAX_THUMBNAIL_BYTES:
        return thumbnail_path, "image/png", False

    img = Image.open(thumbnail_path).convert("RGB")
    for quality in (95, 90, 85, 80):
        tmp = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
        img.save(tmp.name, "JPEG", quality=quality)
        if os.path.getsize(tmp.name) <= MAX_THUMBNAIL_BYTES:
            return tmp.name, "image/jpeg", True
        os.unlink(tmp.name)

    # Last resort: lowest quality
    tmp = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
    img.save(tmp.name, "JPEG", quality=70)
    return tmp.name, "image/jpeg", True


def upload_thumbnail(youtube, video_id, thumbnail_path):
    """Upload a thumbnail for a specific video, compressing if needed."""
    upload_path, mimetype, compressed = prepare_thumbnail(thumbnail_path)
    try:
        if compressed:
            new_size_kb = os.path.getsize(upload_path) / 1024
            print(f"  [compress] PNG→JPEG ({new_size_kb:.0f} KB)")
        media = MediaFileUpload(upload_path, mimetype=mimetype)
        response = youtube.thumbnails().set(
            videoId=video_id,
            media_body=media,
        ).execute()
        return response
    finally:
        if compressed and os.path.exists(upload_path):
            os.unlink(upload_path)


def main():
    parser = argparse.ArgumentParser(description="Upload QE thumbnails to YouTube")
    parser.add_argument("--dry-run", action="store_true", help="Preview without uploading")
    parser.add_argument("--episode", type=str, help="Upload a single episode (e.g. '05' or '00-teaser')")
    args = parser.parse_args()

    # Determine which episodes to process
    if args.episode:
        if args.episode not in EPISODE_MAP:
            print(f"ERROR: Episode '{args.episode}' not found in map.")
            print(f"Valid episodes: {', '.join(sorted(EPISODE_MAP.keys()))}")
            sys.exit(1)
        episodes = {args.episode: EPISODE_MAP[args.episode]}
    else:
        episodes = EPISODE_MAP

    # Verify all thumbnail files exist
    missing = []
    for ep_num, video_id in episodes.items():
        thumb_path = os.path.join(THUMBNAIL_DIR, f"ep-{ep_num}-thumbnail.png")
        if not os.path.exists(thumb_path):
            missing.append(ep_num)

    if missing:
        print(f"ERROR: Missing thumbnail files for episodes: {', '.join(missing)}")
        sys.exit(1)

    print(f"{'[DRY RUN] ' if args.dry_run else ''}Uploading {len(episodes)} thumbnails to YouTube")
    print(f"Thumbnail dir: {THUMBNAIL_DIR}")
    print()

    if args.dry_run:
        for ep_num, video_id in sorted(episodes.items()):
            thumb_path = os.path.join(THUMBNAIL_DIR, f"ep-{ep_num}-thumbnail.png")
            size_mb = os.path.getsize(thumb_path) / (1024 * 1024)
            print(f"  ep-{ep_num} → {video_id}  ({size_mb:.1f} MB)")
        print()
        print("Re-run without --dry-run to upload.")
        return

    # Authenticate
    youtube = get_authenticated_service()

    # Upload
    succeeded = []
    failed = []

    for ep_num, video_id in sorted(episodes.items()):
        thumb_path = os.path.join(THUMBNAIL_DIR, f"ep-{ep_num}-thumbnail.png")
        size_mb = os.path.getsize(thumb_path) / (1024 * 1024)
        print(f"[{len(succeeded) + len(failed) + 1}/{len(episodes)}] ep-{ep_num} → {video_id} ({size_mb:.1f} MB)")

        try:
            response = upload_thumbnail(youtube, video_id, thumb_path)
            items = response.get("items", [])
            if items:
                res = items[0].get("maxres") or items[0].get("high") or items[0].get("default", {})
                print(f"  [ok] {res.get('width', '?')}x{res.get('height', '?')}")
            else:
                print(f"  [ok] Thumbnail set (no resolution info returned)")
            succeeded.append(ep_num)
        except Exception as e:
            print(f"  [FAILED] {e}")
            failed.append(ep_num)

    print()
    print("=" * 50)
    print(f"Done! {len(succeeded)}/{len(episodes)} uploaded successfully.")
    if failed:
        print(f"Failed: {', '.join(failed)}")


if __name__ == "__main__":
    main()
