"""Offline, owner-only utility for issuing BRD special-title codes.

Requires: python -m pip install cryptography
Keep the private signing key OUTSIDE the repository (and backups of it private).

Example:
  python scripts/issue-special-title.py --key "C:/Private/BRD_Title_Issuer_PRIVATE.txt" --title moon-developer --name Kire

The title ID must also be present in src/profile/specialTitles.ts.
"""
import argparse
import base64
import json
from pathlib import Path

from cryptography.hazmat.primitives import serialization


def b64url(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def issue(key_path: Path, title_id: str, name: str) -> str:
    content = key_path.read_bytes()
    start = content.find(b"-----BEGIN PRIVATE KEY-----")
    end_marker = b"-----END PRIVATE KEY-----"
    end = content.find(end_marker)
    if start < 0 or end < 0:
        raise ValueError("The key file does not contain a PKCS8 private key.")
    pem = content[start:end + len(end_marker)] + b"\n"
    signing_key = serialization.load_pem_private_key(pem, password=None)
    payload = b64url(json.dumps({
        "v": 1, "id": title_id, "subject": name.strip().lower(),
    }, separators=(",", ":"), ensure_ascii=False).encode("utf-8"))
    signature = b64url(signing_key.sign(payload.encode("ascii")))
    return f"brd1.{payload}.{signature}"


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Issue a signed BRD special-title unlock code.")
    parser.add_argument("--key", type=Path, required=True, help="Private signing key, stored OUTSIDE the repository")
    parser.add_argument("--title", required=True, help="Registered title ID, e.g. moon-developer")
    parser.add_argument("--name", required=True, help="Exact profile display name")
    args = parser.parse_args()
    if not args.title or any(char not in "abcdefghijklmnopqrstuvwxyz0123456789-" for char in args.title):
        parser.error("The title ID must contain only lowercase letters, numbers and hyphens.")
    if not args.name.strip():
        parser.error("Provide a profile display name.")
    print(issue(args.key, args.title, args.name))
