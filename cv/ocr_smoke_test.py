from __future__ import annotations

import sys
from importlib.metadata import PackageNotFoundError, version
from pathlib import Path


def package_version(name: str) -> str | None:
    try:
        return version(name)
    except PackageNotFoundError:
        return None


crop_paths = sorted(Path("debug/plates").glob("*.jpg"))
print(f"Python: {sys.version.split()[0]}")
print(f"PaddleOCR: {package_version('paddleocr')}")
print(f"PaddlePaddle: {package_version('paddlepaddle')}")
if not crop_paths:
    raise SystemExit("No saved plate crop found. Configure PLATE_MODEL_PATH and run the backend first.")

try:
    from paddleocr import PaddleOCR
    import cv2
except ImportError as error:
    raise SystemExit(f"OCR dependencies unavailable: {error}") from error

image_path = crop_paths[0]
image = cv2.imread(str(image_path))
if image is None:
    raise SystemExit(f"Unable to read plate crop: {image_path}")

ocr = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
for label, candidate in [("original", image), ("upscaled", cv2.resize(image, None, fx=3, fy=3, interpolation=cv2.INTER_CUBIC))]:
    rows = ocr.ocr(candidate, cls=True) or []
    print(f"{label}: {rows}")
print(f"Tested crop: {image_path}")
