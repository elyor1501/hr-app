from enum import Enum


class CandidateStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"


class JobStatus(str, Enum):
    DRAFT = "draft"
    OPEN = "open"
    PAUSED = "paused"
    CLOSED = "closed"
    FILLED = "filled"


class JobType(str, Enum):
    FULL_TIME = "full_time"
    PART_TIME = "part_time"
    CONTRACT = "contract"
    INTERNSHIP = "internship"
    TEMPORARY = "temporary"


class ExperienceLevel(str, Enum):
    ENTRY = "entry"
    JUNIOR = "junior"
    MID = "mid"
    SENIOR = "senior"
    LEAD = "lead"
    EXECUTIVE = "executive"


class UserRole(str, Enum):
    ADMIN = "admin"
    RECRUITER = "recruiter"