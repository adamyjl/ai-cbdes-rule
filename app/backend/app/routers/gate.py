from fastapi import APIRouter

from backend.app.schemas import GateCancelResponse, GateJobResponse, GateStartRequest, GateStartResponse
from backend.app.services.gate_jobs import registry
from backend.app.services.gate_service import GateService


router = APIRouter(prefix='/gate', tags=['gate'])
service = GateService()


@router.post('/start', response_model=GateStartResponse)
def start(req: GateStartRequest):
    try:
        job = registry.create(
            work_dir=req.work_dir,
            compile_command=req.compile_command,
            static_command=req.static_command,
            enable_unit=bool(req.enable_unit),
            enable_coverage=bool(req.enable_coverage),
            requirement_prompt=req.requirement_prompt,
            generated_result=req.generated_result,
        )
        service.start(job)
        return GateStartResponse(ok=True, job_id=job.job_id)
    except Exception as e:
        msg = str(e) or type(e).__name__
        return GateStartResponse(ok=False, error=msg)


@router.get('/jobs/{job_id}', response_model=GateJobResponse)
def job(job_id: str):
    j = registry.get(job_id)
    if not j:
        return GateJobResponse(ok=False, job_id=job_id, stage='not_found', done=True, error='not_found')
    d = j.to_dict()
    return GateJobResponse(
        ok=True,
        job_id=str(d.get('job_id')),
        stage=str(d.get('stage')),
        statuses=d.get('statuses') or [],
        log_lines=d.get('log_lines') or [],
        error=d.get('error'),
        done=bool(d.get('done')),
    )


@router.post('/jobs/{job_id}/cancel', response_model=GateCancelResponse)
def cancel(job_id: str):
    ok = registry.cancel(job_id)
    return GateCancelResponse(ok=bool(ok))

