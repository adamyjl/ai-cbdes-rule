from fastapi import APIRouter

from backend.app.schemas import ArchiveEventIn, ArchiveEventOut
from backend.app.services.archive_service import ArchiveService


router = APIRouter(prefix="/archive", tags=["archive"])
archive_service = ArchiveService()


@router.post("/events", response_model=ArchiveEventOut)
def append_event(req: ArchiveEventIn):
    ev = archive_service.append_event(req.type, req.payload)
    return ArchiveEventOut(**ev)


@router.get("/events", response_model=list[ArchiveEventOut])
def list_events(limit: int = 50):
    return [ArchiveEventOut(**ev) for ev in archive_service.list_events(limit=limit)]

