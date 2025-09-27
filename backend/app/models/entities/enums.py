from enum import Enum

class DetectionStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class MediaType(str, Enum):
    IMAGE = "image"
    VIDEO = "video"

class DetectionResult(str, Enum):
    REAL = "real"
    FAKE = "fake"
    UNCERTAIN = "uncertain"
