"""Run local predictions with the trained Eco Mais YOLOv8 classifier.

Usage:
    python ml/test_yolov8_classifier.py ml/dataset/raw/plastic_pet
    python ml/test_yolov8_classifier.py uploads/images/discard_59_20260611_042002.jpg
"""

from __future__ import annotations

import argparse
from pathlib import Path


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
ML_DIR = Path(__file__).resolve().parent
DEFAULT_MODEL = ML_DIR / "models" / "recyclable_classifier.pt"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Test the trained YOLOv8 classifier.")
    parser.add_argument("path", type=Path, help="Image file or folder to classify.")
    parser.add_argument(
        "--model",
        type=Path,
        default=DEFAULT_MODEL,
        help=f"Model path. Default: {DEFAULT_MODEL}",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=20,
        help="Maximum images to test when path is a folder. Default: 20.",
    )
    return parser.parse_args()


def find_images(path: Path, limit: int) -> list[Path]:
    if path.is_file():
        return [path]

    images = sorted(
        image
        for image in path.rglob("*")
        if image.is_file() and image.suffix.lower() in IMAGE_EXTENSIONS
    )
    return images[:limit]


def load_model(model_path: Path):
    try:
        import torch
        from ultralytics import YOLO
    except ImportError as exc:
        raise RuntimeError("Install backend requirements before testing the classifier.") from exc

    original_torch_load = torch.load

    def torch_load_compatible(*load_args, **load_kwargs):
        load_kwargs.setdefault("weights_only", False)
        return original_torch_load(*load_args, **load_kwargs)

    torch.load = torch_load_compatible
    try:
        return YOLO(str(model_path))
    finally:
        torch.load = original_torch_load


def main() -> int:
    args = parse_args()

    if not args.model.exists():
        print(f"Model not found: {args.model}")
        return 1

    images = find_images(args.path, args.limit)
    if not images:
        print(f"No images found in: {args.path}")
        return 1

    model = load_model(args.model)
    print(f"Model classes: {model.names}")

    for image_path in images:
        result = model(str(image_path), verbose=False)[0]
        class_name = model.names[result.probs.top1]
        confidence = float(result.probs.top1conf)
        print(f"{image_path}: {class_name} ({confidence:.3f})")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
