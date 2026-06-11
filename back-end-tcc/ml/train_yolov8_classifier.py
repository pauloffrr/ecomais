"""Train the Eco Mais YOLOv8 classification model.

Expected raw dataset layout:
    ml/dataset/raw/plastic_pet/*.jpg
    ml/dataset/raw/metal_aluminum/*.jpg
    ml/dataset/raw/non_recyclable/*.jpg

This script creates a YOLO classification dataset with train/val folders,
trains a YOLOv8 classifier, and copies best.pt to:
    ml/models/recyclable_classifier.pt
"""

from __future__ import annotations

import argparse
import random
import shutil
from pathlib import Path


MATERIAL_CLASSES = [
    "plastic_pet",
    "plastic_hdpe",
    "glass_clear",
    "glass_colored",
    "paper_cardboard",
    "paper_newspaper",
    "metal_aluminum",
    "metal_steel",
    "organic",
    "electronic",
    "non_recyclable",
]

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

ML_DIR = Path(__file__).resolve().parent
DEFAULT_RAW_DIR = ML_DIR / "dataset" / "raw"
DEFAULT_PREPARED_DIR = ML_DIR / "dataset" / "yolo_cls"
DEFAULT_MODEL_OUTPUT = ML_DIR / "models" / "recyclable_classifier.pt"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train YOLOv8 classifier for Eco Mais.")
    parser.add_argument(
        "--raw-dir",
        type=Path,
        default=DEFAULT_RAW_DIR,
        help=f"Raw dataset directory. Default: {DEFAULT_RAW_DIR}",
    )
    parser.add_argument(
        "--prepared-dir",
        type=Path,
        default=DEFAULT_PREPARED_DIR,
        help=f"Generated YOLO classification dataset. Default: {DEFAULT_PREPARED_DIR}",
    )
    parser.add_argument(
        "--output-model",
        type=Path,
        default=DEFAULT_MODEL_OUTPUT,
        help=f"Final model path used by the backend. Default: {DEFAULT_MODEL_OUTPUT}",
    )
    parser.add_argument(
        "--base-model",
        default="yolov8n-cls.pt",
        help="Ultralytics classification base model. Default: yolov8n-cls.pt.",
    )
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--imgsz", type=int, default=224)
    parser.add_argument("--batch", type=int, default=16)
    parser.add_argument("--val-ratio", type=float, default=0.2)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument(
        "--device",
        default=None,
        help="Training device, e.g. cpu, 0, mps. Default: Ultralytics auto.",
    )
    parser.add_argument(
        "--project",
        type=Path,
        default=ML_DIR / "runs",
        help="Training run output directory.",
    )
    parser.add_argument(
        "--name",
        default="recyclable_classifier",
        help="Training run name.",
    )
    parser.add_argument(
        "--keep-prepared",
        action="store_true",
        help="Do not delete an existing prepared dataset before recreating it.",
    )
    return parser.parse_args()


def find_images(class_dir: Path) -> list[Path]:
    return sorted(
        path
        for path in class_dir.iterdir()
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
    )


def copy_split(images: list[Path], class_name: str, prepared_dir: Path, val_ratio: float) -> None:
    val_count = max(1, int(round(len(images) * val_ratio))) if len(images) > 1 else 0
    val_images = set(images[:val_count])

    for image_path in images:
        split = "val" if image_path in val_images else "train"
        destination_dir = prepared_dir / split / class_name
        destination_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy2(image_path, destination_dir / image_path.name)


def prepare_dataset(
    raw_dir: Path,
    prepared_dir: Path,
    val_ratio: float,
    seed: int,
    keep_prepared: bool,
) -> list[str]:
    if not raw_dir.exists():
        raise FileNotFoundError(
            f"Raw dataset not found: {raw_dir}. Collect images before training."
        )

    if prepared_dir.exists() and not keep_prepared:
        shutil.rmtree(prepared_dir)

    rng = random.Random(seed)
    available_classes: list[str] = []

    for class_name in MATERIAL_CLASSES:
        class_dir = raw_dir / class_name
        if not class_dir.exists():
            continue

        images = find_images(class_dir)
        if not images:
            continue

        rng.shuffle(images)
        copy_split(images, class_name, prepared_dir, val_ratio)
        available_classes.append(class_name)
        print(f"{class_name}: {len(images)} images")

    if len(available_classes) < 2:
        raise ValueError(
            "At least two classes with images are required for classification training."
        )

    return available_classes


def train(args: argparse.Namespace) -> Path:
    try:
        import torch
        from ultralytics import YOLO
    except ImportError as exc:
        raise RuntimeError(
            "Ultralytics is not installed. Install backend requirements first: "
            "pip install -r requirements.txt"
        ) from exc

    # PyTorch 2.6+ changed torch.load's default to weights_only=True.
    # Ultralytics 8.1.x checkpoints need the trusted legacy loading path.
    original_torch_load = torch.load

    def torch_load_compatible(*load_args, **load_kwargs):
        load_kwargs.setdefault("weights_only", False)
        return original_torch_load(*load_args, **load_kwargs)

    torch.load = torch_load_compatible

    classes = prepare_dataset(
        raw_dir=args.raw_dir,
        prepared_dir=args.prepared_dir,
        val_ratio=args.val_ratio,
        seed=args.seed,
        keep_prepared=args.keep_prepared,
    )

    print(f"Training classes: {', '.join(classes)}")
    try:
        model = YOLO(args.base_model)

        train_kwargs = {
            "data": str(args.prepared_dir),
            "epochs": args.epochs,
            "imgsz": args.imgsz,
            "batch": args.batch,
            "project": str(args.project),
            "name": args.name,
            "exist_ok": True,
        }
        if args.device is not None:
            train_kwargs["device"] = args.device

        results = model.train(**train_kwargs)
    finally:
        torch.load = original_torch_load

    best_model = Path(results.save_dir) / "weights" / "best.pt"
    if not best_model.exists():
        raise FileNotFoundError(f"Training finished, but best.pt was not found: {best_model}")

    args.output_model.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(best_model, args.output_model)
    return args.output_model


def main() -> int:
    args = parse_args()
    output_model = train(args)
    print(f"Model saved to: {output_model}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
