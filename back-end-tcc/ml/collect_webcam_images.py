"""Collect webcam images for the YOLOv8 recyclable classifier.

Usage:
    python ml/collect_webcam_images.py plastic_pet
    python ml/collect_webcam_images.py non_recyclable --camera 1

Keys:
    s or space: save current frame
    q: quit
"""

from __future__ import annotations

import argparse
from datetime import datetime
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

ML_DIR = Path(__file__).resolve().parent
DEFAULT_OUTPUT_DIR = ML_DIR / "dataset" / "raw"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Capture labeled webcam images for YOLOv8 classification."
    )
    parser.add_argument(
        "class_name",
        choices=MATERIAL_CLASSES,
        help="Material class folder where captured images will be saved.",
    )
    parser.add_argument(
        "--camera",
        type=int,
        default=0,
        help="OpenCV camera index. Default: 0.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help=f"Dataset raw output directory. Default: {DEFAULT_OUTPUT_DIR}",
    )
    parser.add_argument(
        "--width",
        type=int,
        default=640,
        help="Requested capture width. Default: 640.",
    )
    parser.add_argument(
        "--height",
        type=int,
        default=480,
        help="Requested capture height. Default: 480.",
    )
    return parser.parse_args()


def next_image_path(class_dir: Path, class_name: str) -> Path:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    return class_dir / f"{class_name}_{timestamp}.jpg"


def main() -> int:
    args = parse_args()

    try:
        import cv2
    except Exception as exc:
        print("OpenCV could not be loaded.")
        print("This usually means OpenCV and NumPy were installed with incompatible versions.")
        print("For this project, prefer a Python 3.12 virtualenv and reinstall requirements:")
        print("  python3.12 -m venv ../venv312")
        print("  source ../venv312/bin/activate")
        print("  pip install -r requirements.txt")
        print(f"Original error: {exc}")
        return 1

    class_dir = args.output_dir / args.class_name
    class_dir.mkdir(parents=True, exist_ok=True)

    cap = cv2.VideoCapture(args.camera)
    if not cap.isOpened():
        print(f"Could not open camera index {args.camera}.")
        return 1

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, args.width)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, args.height)

    saved_count = len(list(class_dir.glob("*.jpg")))
    print(f"Saving images to: {class_dir}")
    print("Press 's' or space to save, 'q' to quit.")

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                print("Could not read frame from camera.")
                return 1

            preview = frame.copy()
            cv2.putText(
                preview,
                f"{args.class_name} | saved: {saved_count}",
                (12, 28),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.75,
                (0, 255, 0),
                2,
                cv2.LINE_AA,
            )
            cv2.imshow("Eco Mais dataset capture", preview)

            key = cv2.waitKey(1) & 0xFF
            if key == ord("q"):
                break
            if key in (ord("s"), 32):
                image_path = next_image_path(class_dir, args.class_name)
                cv2.imwrite(str(image_path), frame)
                saved_count += 1
                print(f"Saved {image_path}")
    finally:
        cap.release()
        cv2.destroyAllWindows()

    print(f"Done. Total images in class folder: {saved_count}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
