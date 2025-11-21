import io
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.config import settings
from app.models.entities.enums import DetectionResult, DetectionStatus
from app.models.schemas.detection import Detection
from app.models.schemas.users import User


@pytest.fixture(autouse=True)
def mock_process_video(monkeypatch):
    """Stub the heavy ML processing for predictability in tests."""

    def _mock_process_video(self, video_file_content, filename, fps, threshold):
        return {
            "status": DetectionStatus.COMPLETED,
            "result": DetectionResult.REAL,
            "confidence_score": 0.95,
            "average_fake_probability": 0.05,
            "fake_ratio": 0.1,
            "total_frames_processed": 10,
            "fake_frames": 1,
            "real_frames": 9,
            "fps_used": fps,
            "threshold_used": threshold,
            "processing_time_seconds": 0.1,
            "frame_predictions": {"frames": []},
            "error_message": None,
        }

    monkeypatch.setattr(
        "app.api.routes.detection.DetectionService.process_video", _mock_process_video
    )


def _post_analyze(
    client: TestClient,
    *,
    file_name: str,
    save_report: bool,
    fps: int = 3,
    threshold: float = 0.5,
    headers: dict | None = None,
) -> tuple[int, dict]:
    files = {
        "file": (
            file_name,
            io.BytesIO(b"fake-video-content"),
            "video/mp4",
        )
    }
    data = {
        "fps": str(fps),
        "threshold": str(threshold),
        "save_report": "true" if save_report else "false",
    }
    response = client.post(
        f"{settings.API_V1_STR}/detection/analyze", data=data, files=files, headers=headers or {}
    )
    return response.status_code, response.json()


def _fetch_detection(db: Session, file_name: str) -> Detection | None:
    statement = (
        select(Detection)
        .where(Detection.file_name == file_name)
        .order_by(Detection.created_at.desc())
    )
    return db.exec(statement).first()


def _cleanup_detection(db: Session, detection: Detection | None) -> None:
    if detection:
        db.delete(detection)
        db.commit()


def test_analyze_anonymous_save_report_false(client: TestClient, db: Session):
    file_name = f"anon-{uuid.uuid4()}.mp4"
    fps = 4
    threshold = 0.65

    status, _ = _post_analyze(
        client,
        file_name=file_name,
        save_report=False,
        fps=fps,
        threshold=threshold,
    )

    assert status == 200
    detection = _fetch_detection(db, file_name)
    assert detection is not None
    assert detection.user_id is None
    assert detection.fps_used == fps
    assert detection.threshold_used == threshold
    _cleanup_detection(db, detection)


def test_analyze_authenticated_save_report_true_links_user(
    client: TestClient, db: Session, normal_user_token_headers: dict[str, str]
):
    file_name = f"user-linked-{uuid.uuid4()}.mp4"
    fps = 5
    threshold = 0.7

    status, _ = _post_analyze(
        client,
        file_name=file_name,
        save_report=True,
        fps=fps,
        threshold=threshold,
        headers=normal_user_token_headers,
    )

    assert status == 200
    detection = _fetch_detection(db, file_name)
    assert detection is not None

    user = db.exec(
        select(User).where(User.email == settings.EMAIL_TEST_USER)
    ).first()
    assert user is not None

    assert detection.user_id == user.id
    assert detection.fps_used == fps
    assert detection.threshold_used == threshold
    _cleanup_detection(db, detection)


def test_analyze_save_report_true_without_auth_returns_401(client: TestClient, db: Session):
    file_name = f"unauth-{uuid.uuid4()}.mp4"
    status, response_json = _post_analyze(
        client,
        file_name=file_name,
        save_report=True,
        fps=3,
        threshold=0.5,
    )

    assert status == 401
    assert "Authentication required" in response_json["detail"]
    detection = _fetch_detection(db, file_name)
    assert detection is None


def test_analyze_authenticated_save_report_false_not_linked(
    client: TestClient, db: Session, normal_user_token_headers: dict[str, str]
):
    file_name = f"user-no-link-{uuid.uuid4()}.mp4"
    status, _ = _post_analyze(
        client,
        file_name=file_name,
        save_report=False,
        fps=6,
        threshold=0.55,
        headers=normal_user_token_headers,
    )

    assert status == 200
    detection = _fetch_detection(db, file_name)
    assert detection is not None
    assert detection.user_id is None
    _cleanup_detection(db, detection)

