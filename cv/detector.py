from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import cv2
from ultralytics import YOLO


class YOLOVehicleDetector:
    """Detect cars, motorcycles, buses, and trucks in a video."""

    VEHICLE_CLASSES = {"car", "motorcycle", "bus", "truck"}

    def __init__(self, model_name: str = "yolo11n.pt") -> None:
        print("Loading YOLO model...")
        try:
            self.model = YOLO(model_name)
        except Exception as error:
            raise RuntimeError(f"Unable to load YOLO model '{model_name}': {error}") from error

        self.vehicle_class_ids = {
            class_id
            for class_id, class_name in self.model.names.items()
            if str(class_name).lower() in self.VEHICLE_CLASSES
        }
        if not self.vehicle_class_ids:
            raise RuntimeError("The YOLO model does not contain the requested vehicle classes.")

    def track_frame(self, frame: Any) -> list[dict[str, Any]]:
        """Return vehicle detections with local ByteTrack IDs for this stream."""
        results = self.model.track(
            frame,
            classes=sorted(self.vehicle_class_ids),
            tracker="bytetrack.yaml",
            persist=True,
            verbose=False,
        )
        detections: list[dict[str, Any]] = []

        for result in results:
            if result.boxes is None:
                continue

            boxes = result.boxes.xyxy.cpu().tolist()
            confidences = result.boxes.conf.cpu().tolist()
            class_ids = result.boxes.cls.cpu().tolist()
            track_ids = result.boxes.id.int().cpu().tolist() if result.boxes.id is not None else [None] * len(boxes)

            for bbox, confidence, class_id, track_id in zip(boxes, confidences, class_ids, track_ids):
                class_name = str(self.model.names[int(class_id)])
                detections.append(
                    {
                        "class_name": class_name,
                        "confidence": float(confidence),
                        "bbox": [int(coordinate) for coordinate in bbox],
                        "track_id": int(track_id) if track_id is not None else None,
                    }
                )

        return detections

    def detect_frame(self, frame: Any) -> list[dict[str, Any]]:
        """Backward-compatible untracked detection API."""
        results = self.model(frame, classes=sorted(self.vehicle_class_ids), verbose=False)
        detections: list[dict[str, Any]] = []
        for result in results:
            if result.boxes is None:
                continue
            for bbox, confidence, class_id in zip(
                result.boxes.xyxy.cpu().tolist(),
                result.boxes.conf.cpu().tolist(),
                result.boxes.cls.cpu().tolist(),
            ):
                detections.append({
                    "class_name": str(self.model.names[int(class_id)]),
                    "confidence": float(confidence),
                    "bbox": [int(coordinate) for coordinate in bbox],
                })
        return detections

    @staticmethod
    def draw_detections(frame: Any, detections: list[dict[str, Any]]) -> Any:
        """Draw detection boxes and labels onto a frame."""
        for detection in detections:
            x1, y1, x2, y2 = detection["bbox"]
            track_id = detection.get("track_id")
            label = f"{detection['class_name'].upper()}"
            if track_id is not None:
                label += f"  Track {track_id}  {detection['confidence']:.2f}"
            else:
                label += f"  {detection['confidence']:.2f}"

            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 220, 120), 2)
            cv2.putText(
                frame,
                label,
                (x1, max(y1 - 10, 20)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (0, 220, 120),
                2,
                cv2.LINE_AA,
            )
            for plate in detection.get("plate_results", []):
                px1, py1, px2, py2 = plate["plate_bbox"]
                plate_text = plate.get("plate")
                plate_confidence = plate.get("ocr_confidence")
                label = "PLATE"
                if plate_text is not None and plate_confidence is not None:
                    label = f"PLATE {plate_text} {plate_confidence:.2f}"
                cv2.rectangle(frame, (px1, py1), (px2, py2), (255, 180, 0), 1)
                cv2.putText(frame, label, (px1, max(py1 - 6, 16)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 180, 0), 1, cv2.LINE_AA)

        return frame

    def process_video(
        self,
        video_path: str | Path,
        output_path: str | Path,
        show_video: bool = True,
    ) -> None:
        """Process, display, and save an annotated copy of a video."""
        input_path = Path(video_path)
        destination = Path(output_path)

        if not input_path.is_file():
            raise FileNotFoundError(f"Input video not found: {input_path}")

        print("Opening video...")
        capture = cv2.VideoCapture(str(input_path))
        if not capture.isOpened():
            raise RuntimeError(f"Unable to open video: {input_path}")

        destination.parent.mkdir(parents=True, exist_ok=True)
        fps = capture.get(cv2.CAP_PROP_FPS) or 30.0
        width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
        if width <= 0 or height <= 0:
            capture.release()
            raise RuntimeError(f"Invalid video dimensions: {input_path}")

        writer = cv2.VideoWriter(
            str(destination),
            cv2.VideoWriter_fourcc(*"mp4v"),
            fps,
            (width, height),
        )
        if not writer.isOpened():
            capture.release()
            raise RuntimeError(f"Unable to create output video: {destination}")

        frame_number = 0
        try:
            while True:
                success, frame = capture.read()
                if not success:
                    break

                frame_number += 1
                detections = self.detect_frame(frame)
                self.draw_detections(frame, detections)
                writer.write(frame)

                if show_video:
                    cv2.imshow("UrbanTrace YOLO Vehicle Detection", frame)
                    if cv2.waitKey(1) & 0xFF == ord("q"):
                        print("Stopped by user.")
                        break

                if frame_number == 1 or frame_number % 100 == 0:
                    print(f"Frame: {frame_number}")
                    print(f"Vehicles detected: {len(detections)}")
        finally:
            capture.release()
            writer.release()
            if show_video:
                cv2.destroyAllWindows()

        if frame_number == 0:
            raise RuntimeError(f"The video contains no readable frames: {input_path}")

        print("Detection complete.")
        print(f"Processed video saved to: {destination}")


class LicensePlatePipeline:
    """Optional dedicated plate detector plus PaddleOCR; never fabricates text."""

    def __init__(self) -> None:
        self.model_path = os.getenv("PLATE_MODEL_PATH", "").strip()
        self.detector: YOLO | None = None
        self.ocr: Any | None = None
        self.error: str | None = None
        self.debug_directory = Path("debug")
        self.debug_plate_directory = self.debug_directory / "plates"
        self.debug_vehicle_directory = self.debug_directory / "vehicles"
        self.saved_debug_crops = 0
        self.frame_plate_detections = 0
        self.frame_ocr_attempts = 0
        self.frame_successful_ocr = 0
        self.last_plate: str | None = None
        self.last_ocr_confidence: float | None = None
        if self.model_path:
            try:
                self.detector = YOLO(self.model_path)
                class_names = [str(name).lower() for name in self.detector.names.values()]
                if not any("plate" in name or "license" in name for name in class_names):
                    self.detector = None
                    self.error = "Configured plate model has no license-plate class"
            except Exception as error:
                self.error = f"Unable to load license plate detector: {error}"
        else:
            self.error = "License plate detector model not configured"

        try:
            from paddleocr import PaddleOCR

            self.ocr = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
        except Exception as error:
            if self.error is None:
                self.error = f"PaddleOCR initialization failed: {error}"

    def reset_frame_diagnostics(self) -> None:
        self.frame_plate_detections = 0
        self.frame_ocr_attempts = 0
        self.frame_successful_ocr = 0

    @staticmethod
    def preprocess_plate(crop: Any) -> list[Any]:
        """Keep the original crop and one conservative upscale candidate."""
        upscaled = cv2.resize(crop, None, fx=3, fy=3, interpolation=cv2.INTER_CUBIC)
        return [crop, upscaled]

    def recognize(self, frame: Any, vehicle_bbox: list[int], camera_id: str = "unknown", track_id: int | None = None, frame_number: int = 0) -> list[dict[str, Any]]:
        if self.detector is None:
            return []
        x1, y1, x2, y2 = vehicle_bbox
        crop = frame[max(0, y1):max(y1 + 1, y2), max(0, x1):max(x1 + 1, x2)]
        if crop.size == 0:
            return []

        detected_plates: list[dict[str, Any]] = []
        for result in self.detector(crop, verbose=False):
            if result.boxes is None:
                continue
            for plate_box in result.boxes.xyxy.cpu().tolist():
                px1, py1, px2, py2 = [int(value) for value in plate_box]
                plate_crop = crop[max(0, py1):max(py1 + 1, py2), max(0, px1):max(px1 + 1, px2)]
                if plate_crop.size == 0:
                    continue
                self.frame_plate_detections += 1
                full_plate_bbox = [x1 + px1, y1 + py1, x1 + px2, y1 + py2]
                if self.saved_debug_crops < 20:
                    self.debug_plate_directory.mkdir(parents=True, exist_ok=True)
                    self.debug_vehicle_directory.mkdir(parents=True, exist_ok=True)
                    prefix = f"{camera_id}_track{track_id}_frame{frame_number}"
                    cv2.imwrite(str(self.debug_plate_directory / f"{prefix}.jpg"), plate_crop)
                    cv2.imwrite(str(self.debug_vehicle_directory / f"{prefix}.jpg"), crop)
                    self.saved_debug_crops += 1
                recognized_text: str | None = None
                ocr_confidence: float | None = None
                if self.ocr is not None:
                    self.frame_ocr_attempts += 1
                    for candidate in self.preprocess_plate(plate_crop):
                        for row in self.ocr.ocr(candidate, cls=True) or []:
                            for item in row or []:
                                text, confidence = item[1]
                                normalized = "".join(char for char in str(text).upper() if char.isalnum())
                                if normalized and (ocr_confidence is None or float(confidence) > ocr_confidence):
                                    recognized_text = normalized
                                    ocr_confidence = float(confidence)
                if recognized_text is not None and ocr_confidence is not None:
                    self.frame_successful_ocr += 1
                    self.last_plate = recognized_text
                    self.last_ocr_confidence = ocr_confidence
                detected_plates.append({"plate_bbox": full_plate_bbox, "plate": recognized_text, "ocr_confidence": ocr_confidence})
        return detected_plates
