from __future__ import annotations

import math
import os
import time
from importlib.metadata import PackageNotFoundError, version
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from threading import Condition, Event, Lock, Thread
from typing import Any, Iterator

import cv2
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from cv.detector import LicensePlatePipeline, YOLOVehicleDetector

PROJECT_ROOT = Path(__file__).resolve().parent.parent
VIDEO_DIRECTORY = PROJECT_ROOT / "videos"
SUPPORTED_VIDEO_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv", ".mpeg", ".mpg"}
VIDEO_START = datetime.fromisoformat(os.getenv("PROTOTYPE_C01_START", "2026-01-01T10:05:00+00:00"))

CAMERAS: dict[str, dict[str, Any]] = {
    "C01": {"camera_id": "C01", "name": "Madiwala Signal", "location": "Madiwala Signal, Bengaluru, Karnataka, India", "latitude": 12.9216, "longitude": 77.6174, "prototype_time_offset_minutes": 0},
    "C02": {"camera_id": "C02", "name": "St John's Signal", "location": "St John's Signal, Bengaluru, Karnataka, India", "latitude": 12.9345, "longitude": 77.6142, "prototype_time_offset_minutes": int(os.getenv("PROTOTYPE_C02_OFFSET_MINUTES", "6"))},
}


def find_camera_video() -> Path:
    files = sorted(path for path in VIDEO_DIRECTORY.iterdir() if path.is_file() and path.suffix.lower() in SUPPORTED_VIDEO_EXTENSIONS) if VIDEO_DIRECTORY.is_dir() else []
    if not files:
        raise FileNotFoundError(f"No supported video found in: {VIDEO_DIRECTORY}")
    return files[0]


def observation_timestamp(camera_id: str, frame_number: int, fps: float) -> datetime:
    offset = timedelta(minutes=CAMERAS[camera_id]["prototype_time_offset_minutes"])
    return VIDEO_START + offset + timedelta(seconds=max(0, frame_number - 1) / max(fps, 1))


class CameraStream:
    def __init__(self, camera_id: str, video_path: Path, observations: list[dict[str, Any]], observation_lock: Lock, plate_pipeline: LicensePlatePipeline) -> None:
        self.camera_id = camera_id
        self.video_path = video_path
        self.camera = CAMERAS[camera_id]
        self.detector = YOLOVehicleDetector()
        self.plate_pipeline = plate_pipeline
        self.observations = observations
        self.observation_lock = observation_lock
        self.latest_jpeg: bytes | None = None
        self.vehicle_count = 0
        self.frame_number = 0
        self.version = 0
        self.condition = Condition()
        self.stop_event = Event()
        self.track_last_ocr: dict[int, int] = {}
        self.last_vehicle_detections = 0
        self.last_plate_detections = 0
        self.last_ocr_attempts = 0
        self.last_successful_ocr = 0
        self.worker = Thread(target=self._run, name=f"camera-{camera_id}", daemon=True)

    def start(self) -> None:
        self.worker.start()

    def stop(self) -> None:
        self.stop_event.set()
        with self.condition:
            self.condition.notify_all()
        self.worker.join(timeout=3)

    def _record_ocr(self, frame: Any, detection: dict[str, Any], fps: float) -> list[dict[str, Any]]:
        track_id = detection.get("track_id")
        if track_id is None or self.frame_number - self.track_last_ocr.get(track_id, -10_000) < 15:
            return []
        self.track_last_ocr[track_id] = self.frame_number
        results = self.plate_pipeline.recognize(frame, detection["bbox"], self.camera_id, track_id, self.frame_number)
        for result in results:
            plate = result["plate"]
            confidence = result["ocr_confidence"]
            if plate is None or confidence is None:
                continue
            timestamp = observation_timestamp(self.camera_id, self.frame_number, fps)
            observation = {
                "observation_id": f"{self.camera_id}-{track_id}-{self.frame_number}",
                "camera_id": self.camera_id,
                "camera_name": self.camera["name"],
                "track_id": track_id,
                "plate": plate,
                "ocr_confidence": confidence,
                "vehicle_type": detection["class_name"],
                "timestamp": timestamp.isoformat(),
                "frame_number": self.frame_number,
                "vehicle_bbox": detection["bbox"],
                "plate_bbox": result["plate_bbox"],
                "latitude": self.camera["latitude"],
                "longitude": self.camera["longitude"],
            }
            with self.observation_lock:
                same_track = [item for item in self.observations if item["camera_id"] == self.camera_id and item["track_id"] == track_id]
                if not same_track or confidence >= max(item["ocr_confidence"] for item in same_track):
                    self.observations[:] = [item for item in self.observations if not (item["camera_id"] == self.camera_id and item["track_id"] == track_id)]
                    self.observations.append(observation)
        return results

    def _run(self) -> None:
        while not self.stop_event.is_set():
            capture = cv2.VideoCapture(str(self.video_path))
            if not capture.isOpened():
                print(f"Unable to open {self.camera_id} video: {self.video_path}")
                self.stop_event.wait(1)
                continue
            fps = capture.get(cv2.CAP_PROP_FPS) or 30.0
            try:
                while not self.stop_event.is_set():
                    started_at = time.perf_counter()
                    success, frame = capture.read()
                    if not success:
                        break
                    self.frame_number += 1
                    self.plate_pipeline.reset_frame_diagnostics()
                    detections = self.detector.track_frame(frame)
                    for detection in detections:
                        detection["plate_results"] = self._record_ocr(frame, detection, fps)
                    annotated = self.detector.draw_detections(frame, detections)
                    self.last_vehicle_detections = len(detections)
                    self.last_plate_detections = self.plate_pipeline.frame_plate_detections
                    self.last_ocr_attempts = self.plate_pipeline.frame_ocr_attempts
                    self.last_successful_ocr = self.plate_pipeline.frame_successful_ocr
                    if self.frame_number == 1 or self.frame_number % 100 == 0 or self.last_plate_detections:
                        print(f"{self.camera_id} Frame {self.frame_number}: Vehicles detected: {self.last_vehicle_detections}; License plates detected: {self.last_plate_detections}; OCR attempts: {self.last_ocr_attempts}")
                    encoded, buffer = cv2.imencode(".jpg", annotated)
                    if not encoded:
                        continue
                    with self.condition:
                        self.latest_jpeg = buffer.tobytes()
                        self.vehicle_count = len(detections)
                        self.version += 1
                        self.condition.notify_all()
                    elapsed = time.perf_counter() - started_at
                    self.stop_event.wait(max(0.0, 1.0 / fps - elapsed))
            finally:
                capture.release()

    def get_frame(self, last_version: int) -> tuple[int, bytes | None, int]:
        with self.condition:
            self.condition.wait_for(lambda: self.version > last_version or self.stop_event.is_set(), timeout=2)
            return self.version, self.latest_jpeg, self.vehicle_count


def haversine_km(first: dict[str, Any], second: dict[str, Any]) -> float:
    radius = 6371.0088
    lat1, lon1, lat2, lon2 = map(math.radians, [first["latitude"], first["longitude"], second["latitude"], second["longitude"]])
    a = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return radius * 2 * math.asin(math.sqrt(a))


def trajectory_for(plate: str, observations: list[dict[str, Any]]) -> dict[str, Any]:
    normalized = "".join(plate.upper().split())
    matches = sorted((item for item in observations if item["plate"] == normalized), key=lambda item: item["timestamp"])
    if not matches:
        raise HTTPException(status_code=404, detail=f"Vehicle {normalized} not found")
    deduped: list[dict[str, Any]] = []
    for item in matches:
        if deduped and item["camera_id"] == deduped[-1]["camera_id"]:
            previous = datetime.fromisoformat(deduped[-1]["timestamp"])
            current = datetime.fromisoformat(item["timestamp"])
            if (current - previous).total_seconds() < 60:
                continue
        deduped.append(item)
    total_distance = 0.0
    warnings: list[bool] = []
    for previous, current in zip(deduped, deduped[1:]):
        seconds = (datetime.fromisoformat(current["timestamp"]) - datetime.fromisoformat(previous["timestamp"])).total_seconds()
        distance = haversine_km(previous, current)
        total_distance += distance
        warnings.append(seconds <= 0 or distance / max(seconds / 3600, 0.001) > 140)
    duration = (datetime.fromisoformat(deduped[-1]["timestamp"]) - datetime.fromisoformat(deduped[0]["timestamp"])).total_seconds() / 60 if len(deduped) > 1 else 0
    return {
        "vehicle": {"plate": normalized, "global_vehicle_id": f"VEH_{normalized}"},
        "observations": deduped,
        "camera_sequence": [item["camera_id"] for item in deduped],
        "total_distance_km": round(total_distance, 3),
        "journey_duration_minutes": round(duration, 2),
        "average_speed_kmh": round(total_distance / max(duration / 60, 0.001), 2) if duration else 0,
        "transition_warning": any(warnings),
        "route_geometry": [{"latitude": item["latitude"], "longitude": item["longitude"]} for item in deduped],
    }


def get_stream(request: Request, camera_id: str) -> CameraStream:
    stream = request.app.state.camera_streams.get(camera_id)
    if stream is None:
        raise HTTPException(status_code=503, detail=f"Camera {camera_id} stream is not ready")
    return stream


def mjpeg_frames(stream: CameraStream) -> Iterator[bytes]:
    last_version = -1
    while not stream.stop_event.is_set():
        last_version, jpeg, _ = stream.get_frame(last_version)
        if jpeg is None:
            continue
        yield b"--frame\r\nContent-Type: image/jpeg\r\nContent-Length: " + str(len(jpeg)).encode("ascii") + b"\r\n\r\n" + jpeg + b"\r\n"


@asynccontextmanager
async def lifespan(app: FastAPI):
    video_path = find_camera_video()
    observations: list[dict[str, Any]] = []
    observation_lock = Lock()
    plate_pipeline = LicensePlatePipeline()
    app.state.observations = observations
    app.state.observation_lock = observation_lock
    app.state.camera_streams = {camera_id: CameraStream(camera_id, video_path, observations, observation_lock, plate_pipeline) for camera_id in CAMERAS}
    for stream in app.state.camera_streams.values():
        stream.start()
    yield
    for stream in app.state.camera_streams.values():
        stream.stop()


app = FastAPI(title="UrbanTrace Camera API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8443", "http://127.0.0.1:8443"], allow_methods=["GET"], allow_headers=["*"])


@app.get("/api/cameras")
def cameras(request: Request) -> list[dict[str, Any]]:
    return [{**camera, "status": "LIVE", "plate_detector_status": request.app.state.camera_streams[camera_id].plate_pipeline.error or "ready"} for camera_id, camera in CAMERAS.items()]


def installed_version(package_name: str) -> str | None:
    try:
        return version(package_name)
    except PackageNotFoundError:
        return None


@app.get("/api/diagnostics/vision")
def vision_diagnostics(request: Request) -> dict[str, Any]:
    streams = request.app.state.camera_streams
    pipeline = next(iter(streams.values())).plate_pipeline
    latest = max(streams.values(), key=lambda stream: stream.frame_number)
    return {
        "python": os.sys.version.split()[0],
        "packages": {
            "paddleocr": installed_version("paddleocr"),
            "paddlepaddle": installed_version("paddlepaddle"),
            "ultralytics": installed_version("ultralytics"),
        },
        "yolo": {"loaded": all(stream.detector.model is not None for stream in streams.values())},
        "bytetrack": {"loaded": True, "independent_camera_workers": len(streams)},
        "plate_detector": {"loaded": pipeline.detector is not None, "model_path": pipeline.model_path or None, "error": pipeline.error if pipeline.detector is None else None},
        "paddleocr": {"loaded": pipeline.ocr is not None},
        "camera": latest.camera_id,
        "last_vehicle_detections": latest.last_vehicle_detections,
        "last_plate_detections": latest.last_plate_detections,
        "last_ocr_attempts": latest.last_ocr_attempts,
        "last_successful_ocr": latest.last_successful_ocr,
        "last_plate": pipeline.last_plate,
        "last_ocr_confidence": pipeline.last_ocr_confidence,
        "debug_crops_saved": pipeline.saved_debug_crops,
    }


@app.get("/api/observations")
def all_observations(request: Request) -> dict[str, Any]:
    observations = sorted(request.app.state.observations, key=lambda item: item["timestamp"])
    return {"count": len(observations), "plates": sorted({item["plate"] for item in observations}), "observations": observations}


@app.get("/api/cameras/{camera_id}")
def camera_info(camera_id: str) -> dict[str, Any]:
    if camera_id not in CAMERAS:
        raise HTTPException(status_code=404, detail="Camera not found")
    return {**CAMERAS[camera_id], "status": "LIVE"}


@app.get("/api/cameras/{camera_id}/status")
def camera_status(camera_id: str, request: Request) -> dict[str, Any]:
    stream = get_stream(request, camera_id)
    return {**CAMERAS[camera_id], "status": "LIVE", "vehicles_detected": stream.vehicle_count, "frame": stream.frame_number, "plate_detector_status": stream.plate_pipeline.error or "ready"}


@app.get("/api/cameras/{camera_id}/stream")
def camera_stream(camera_id: str, request: Request) -> StreamingResponse:
    return StreamingResponse(mjpeg_frames(get_stream(request, camera_id)), media_type="multipart/x-mixed-replace; boundary=frame", headers={"Cache-Control": "no-cache", "Connection": "keep-alive"})


@app.get("/api/vehicles/{plate}/trajectory")
def vehicle_trajectory(plate: str, request: Request) -> dict[str, Any]:
    return trajectory_for(plate, request.app.state.observations)


@app.get("/api/vehicles/{plate}/observations")
def vehicle_observations(plate: str, request: Request) -> dict[str, Any]:
    normalized = "".join(plate.upper().split())
    matches = sorted((item for item in request.app.state.observations if item["plate"] == normalized), key=lambda item: item["timestamp"])
    return {"plate": normalized, "global_vehicle_id": f"VEH_{normalized}", "observations": matches}