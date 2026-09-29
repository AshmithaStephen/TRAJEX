# Trajex

Trajex is a small end-to-end prototype for vehicle observations and multi-camera trajectory reconstruction. It uses the existing traffic video twice: once as C01 Madiwala Signal and once as C02 St John's Signal. The streams have independent YOLO + ByteTrack workers and camera-local track IDs.

## Setup

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

The source video is `videos/traffic.mp4.mp4`, and the existing `yolo11n.pt` model is reused. If PaddlePaddle does not have a wheel for the local Python version, install the compatible PaddlePaddle wheel for that Python version first, then run `python -m pip install paddleocr`.

## Plate model configuration

The standard vehicle YOLO model is not treated as a plate detector. Set a dedicated Ultralytics plate model before starting the backend:

```powershell
$env:PLATE_MODEL_PATH = "C:\path\to\plate-detector.pt"
```

If it is unset or cannot load, the backend still runs YOLO + ByteTrack and reports `License plate detector model not configured`. It does not fabricate plate text or observations. PaddleOCR is initialized once and plate recognition is attempted periodically per local track.

## Start the application

Backend:

```powershell
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Frontend, in a second terminal:

```powershell
npm run dev
```

Open `http://localhost:8443/` (or the Vite preview URL shown by the terminal).

## Prototype configuration

Camera metadata, prototype coordinates, and the C02 time offset are stored in `backend/main.py` in `CAMERAS`. C01 starts at `2026-01-01T10:05:00+00:00` by default. C02 uses the same source video with a configurable six-minute offset:

```powershell
$env:PROTOTYPE_C02_OFFSET_MINUTES = "6"
```

This offset is simulation data and can be removed when real feeds are connected. Each camera creates its own `YOLOVehicleDetector`, calls `model.track(..., tracker="bytetrack.yaml", persist=True)`, and therefore does not reuse the other camera's ByteTrack state. A plate such as `KA01AB1234`, when actually recognized, becomes `VEH_KA01AB1234`; local track IDs remain camera-specific.

## API

- `GET /api/cameras` returns C01/C02 metadata, status, and plate detector status.
- `GET /api/cameras/{camera_id}/status` returns current frame and vehicle count.
- `GET /api/cameras/C01/stream` and `/api/cameras/C02/stream` return independent MJPEG streams from the same source video.
- `GET /api/vehicles/{plate}/observations` returns OCR-backed vehicle observations.
- `GET /api/vehicles/{plate}/trajectory` returns the deterministic trajectory response.
- `GET /api/observations` lists all OCR-backed observations and recognized plates.
- `GET /api/diagnostics/vision` reports model loading, package versions, frame counters, plate boxes, OCR attempts, and the last successful OCR result.

For an isolated OCR check after a real crop is saved, run `python cv/ocr_smoke_test.py`. The current Python 3.14 environment has no compatible PaddlePaddle wheel; use Python 3.10 or 3.11 for the PaddleOCR environment.

Trajectory reconstruction normalizes plates, groups observations, sorts timestamps, removes same-camera duplicates within one minute, calculates Haversine distance and elapsed time, flags transitions over 140 km/h, and returns camera sequence plus route geometry. No AI or LLM chooses the route.

## End-to-end test

1. Start the backend and frontend.
2. Open **Live Cameras** and confirm both C01 and C02 show the same video with different local tracking workers.
3. Set `PLATE_MODEL_PATH` to a compatible dedicated plate model and confirm the camera status reports `ready`.
4. Wait for an actual OCR observation, then search that returned plate in **Vehicle Search**.
5. Open **View Trajectory** and verify the camera sequence, timestamps, OCR confidence, distance, duration, speed, and transition warning come from the API.

Without a dedicated plate model, the video and tracking flow remains testable, but vehicle search and trajectory correctly report that no OCR-backed observation is available.
