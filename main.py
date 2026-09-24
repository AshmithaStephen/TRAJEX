from pathlib import Path

from cv.detector import YOLOVehicleDetector


PROJECT_ROOT = Path(__file__).resolve().parent
VIDEO_DIRECTORY = PROJECT_ROOT / "videos"
OUTPUT_VIDEO = PROJECT_ROOT / "output" / "yolo_detection.mp4"


def find_input_video() -> Path:
    supported_extensions = {".mp4", ".avi", ".mov", ".mkv", ".mpeg", ".mpg"}
    video_files = sorted(
        path for path in VIDEO_DIRECTORY.iterdir() if path.is_file() and path.suffix.lower() in supported_extensions
    ) if VIDEO_DIRECTORY.is_dir() else []

    if not video_files:
        raise FileNotFoundError(f"No supported video found in: {VIDEO_DIRECTORY}")

    return video_files[0]


def main() -> None:
    input_video = find_input_video()
    print(f"Opening video: {input_video}")
    detector = YOLOVehicleDetector()
    detector.process_video(input_video, OUTPUT_VIDEO, show_video=True)


if __name__ == "__main__":
    try:
        main()
    except (FileNotFoundError, RuntimeError) as error:
        print(f"Error: {error}")
        raise SystemExit(1) from error
