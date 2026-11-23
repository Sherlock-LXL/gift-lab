"""Encrypt an existing final_model.npz; never read training data or retrain.

Run with a Python that has NumPy, and Node.js on PATH:
  python scripts/pack-predictor.py /path/to/final_model.npz
The passcode is requested without echo. GIFT_MODEL_PIN may be used in automation.
Only the encrypted envelope is written into the website.
"""
import getpass
import json
import os
from pathlib import Path
import subprocess
import sys

import numpy as np

FEATURE_ORDER = [
    "interest_match", "need_utility", "emotional_personalization", "aesthetic_confidence",
    "selection_safety", "storage_friendliness", "value_fit",
    "cat_jewelry_accessories", "cat_fandom_collectibles", "cat_books_stationery",
    "cat_electronics_imaging", "cat_beauty_fragrance", "cat_bags_clothing", "cat_daily_life",
]
ENCRYPT = """
import { randomBytes, pbkdf2Sync, createCipheriv } from 'node:crypto';
let input = '';
for await (const part of process.stdin) input += part;
const {pin, model} = JSON.parse(input);
const salt = randomBytes(16), iv = randomBytes(12), iterations = 600000;
const key = pbkdf2Sync(pin, salt, iterations, 32, 'sha256');
const cipher = createCipheriv('aes-256-gcm', key, iv);
cipher.setAAD(Buffer.from('gift-lab-vault-v1'));
const encrypted = Buffer.concat([cipher.update(JSON.stringify(model)), cipher.final(), cipher.getAuthTag()]);
key.fill(0);
console.log(JSON.stringify({
  format: 'gift-lab-vault-v1', kdf: 'PBKDF2-SHA256', iterations,
  salt: salt.toString('base64'), iv: iv.toString('base64'), ciphertext: encrypted.toString('base64')
}, null, 2));
"""


def main():
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python scripts/pack-predictor.py /path/to/final_model.npz")
    pin = os.environ.get("GIFT_MODEL_PIN") or getpass.getpass("Six-digit passcode: ")
    if len(pin) != 6 or not pin.isascii() or not pin.isdigit():
        raise SystemExit("Passcode must contain exactly six ASCII digits.")
    model = {"format": "gift-lab-mlp-v1", "feature_order": FEATURE_ORDER}
    shapes = {"W1": (14, 8), "b1": (8,), "W2": (8, 1), "b2": (1,)}
    with np.load(sys.argv[1], allow_pickle=False) as archive:
        for name, shape in shapes.items():
            value = archive[name]
            if value.shape != shape or not np.isfinite(value).all():
                raise SystemExit(f"Unexpected shape or invalid values in {name}.")
            model[name] = value.tolist()
    result = subprocess.run(
        ["node", "--input-type=module", "-e", ENCRYPT],
        input=json.dumps({"pin": pin, "model": model}, allow_nan=False),
        text=True, capture_output=True, check=True,
    )
    output = Path(__file__).resolve().parents[1] / "src/predictor/model.vault.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(result.stdout, encoding="utf-8")
    print(f"Encrypted model written to {output.name}; no raw weights or passcode exported.")


if __name__ == "__main__":
    main()
