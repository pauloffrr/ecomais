"""
Collect training images from a notebook webcam.

Usage:
    python ml/collect_webcam_images.py plastic_pet
    python ml/collect_webcam_images.py non_recyclable --camera 1

Controls:
    s or Space: save current frame
    q: quit
"""

from __future__ import annotations

import argparse
from datetime import datetime
from pathlib import Path

import cv2


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Collect webcam images for YOLOv8 classification.")
    parser.add_argument("class_name", help="Class folder name, e.g. plastic_pet or non_recyclable.")
    parser.add_argument("--camera", type=int, default=0, help="OpenCV camera index.")
    parser.add_argument(
        "--output-dir",
        default="ml/datasets/recyclables_raw",
        help="Directory where class folders will be created.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    class_dir = Path(args.output_dir) / args.class_name
    class_dir.mkdir(parents=True, exist_ok=True)

    cap = cv2.VideoCapture(args.camera)
    if not cap.isOpened():
        raise SystemExit(f"Could not open camera index {args.camera}")

    saved = 0
    print("Press 's' or Space to save a frame. Press 'q' to quit.")
    print(f"Saving images to: {class_dir}")

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                print("Could not read frame from camera.")
                break

            preview = frame.copy()
            cv2.putText(
                preview,
                f"{args.class_name} | saved: {saved} | s/space=save q=quit",
                (12, 28),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 255, 0),
                2,
                cv2.LINE_AA,
            )
            cv2.imshow("Eco Mais dataset collector", preview)

            key = cv2.waitKey(1) & 0xFF
            if key == ord("q"):
                break
            if key in (ord("s"), 32):
                timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S_%f")
                image_path = class_dir / f"{args.class_name}_{timestamp}.jpg"
                cv2.imwrite(str(image_path), frame)
                saved += 1
                print(f"Saved {image_path}")
    finally:
        cap.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
