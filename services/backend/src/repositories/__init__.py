from src.repositories.base import BaseRepository
from src.repositories.candidate import CandidateRepository
from src.repositories.job import JobRepository
from src.repositories.user import UserRepository

__all__ = [
    "BaseRepository",
    "CandidateRepository",
    "JobRepository",
    "UserRepository",
]