"""
Train a YOLOv8 classification model for Eco Mais.

Expected raw dataset layout:
    ml/datasets/recyclables_raw/
        plastic_pet/
            image1.jpg
        non_recyclable/
            image2.jpg

This script creates the train/val split required by YOLOv8 and copies the
best trained model to ml/models/recyclable_classifier.pt.
"""

from __future__ import annotations

import argparse
import random
import shutil
from pathlib import Path

from ultralytics import YOLO


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train Eco Mais YOLOv8 classifier.")
    parser.add_argument("--raw-dir", default="ml/datasets/recyclables_raw")
    parser.add_argument("--dataset-dir", default="ml/datasets/recyclables_yolo_cls")
    parser.add_argument("--output", default="ml/models/recyclable_classifier.pt")
    parser.add_argument("--base-model", default="yolov8n-cls.pt")
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--imgsz", type=int, default=224)
    parser.add_argument("--val-ratio", type=float, default=0.2)
    parser.add_argument("--seed", type=int, default=42)
    return parser.parse_args()


def list_images(class_dir: Path) -> list[Path]:
    return sorted(
        path for path in class_dir.iterdir()
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
    )


def prepare_dataset(raw_dir: Path, dataset_dir: Path, val_ratio: float, seed: int) -> None:
    if not raw_dir.exists():
        raise SystemExit(f"Raw dataset not found: {raw_dir}")

    if dataset_dir.exists():
        shutil.rmtree(dataset_dir)

    random.seed(seed)
    class_dirs = sorted(path for path in raw_dir.iterdir() if path.is_dir())
    if len(class_dirs) < 2:
        raise SystemExit("Create at least two class folders before training.")

    for class_dir in class_dirs:
        images = list_images(class_dir)
        if len(images) < 5:
            raise SystemExit(f"Class {class_dir.name} needs at least 5 images.")

        random.shuffle(images)
        val_count = max(1, int(len(images) * val_ratio))
        split = {
            "val": images[:val_count],
            "train": images[val_count:],
        }

        for split_name, split_images in split.items():
            target_class_dir = dataset_dir / split_name / class_dir.name
            target_class_dir.mkdir(parents=True, exist_ok=True)
            for image in split_images:
                shutil.copy2(image, target_class_dir / image.name)


def main() -> None:
    args = parse_args()
    raw_dir = Path(args.raw_dir)
    dataset_dir = Path(args.dataset_dir)
    output = Path(args.output)

    prepare_dataset(raw_dir, dataset_dir, args.val_ratio, args.seed)

    model = YOLO(args.base_model)
    results = model.train(
        data=str(dataset_dir),
        epochs=args.epochs,
        imgsz=args.imgsz,
        project="ml/runs",
        name="recyclable_classifier",
    )

    best_model = Path(results.save_dir) / "weights" / "best.pt"
    output.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(best_model, output)
    print(f"Saved trained model to {output}")


if __name__ == "__main__":
    main()
