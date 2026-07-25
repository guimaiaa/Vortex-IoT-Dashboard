import asyncio
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app import crud
from app.database import Base, SessionLocal, engine, get_db
from app.schemas import DeviceOut, MeasurementIn, MeasurementOut
from app.ws_manager import manager

OFFLINE_THRESHOLD_SECONDS = int(os.getenv("OFFLINE_THRESHOLD_SECONDS", "30"))
STATUS_BROADCAST_INTERVAL_SECONDS = int(os.getenv("STATUS_BROADCAST_INTERVAL_SECONDS", "5"))

Base.metadata.create_all(bind=engine)


def is_online(last_seen: datetime) -> bool:
    if last_seen.tzinfo is None:
        last_seen = last_seen.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - last_seen).total_seconds() <= OFFLINE_THRESHOLD_SECONDS


def serialize_device(db: Session, device) -> dict:
    latest = crud.get_latest_measurement(db, device.id)
    out = DeviceOut(
        id=device.id,
        first_seen=device.first_seen,
        last_seen=device.last_seen,
        online=is_online(device.last_seen),
        latest=MeasurementOut.model_validate(latest) if latest else None,
    )
    return out.model_dump()


async def status_broadcast_loop() -> None:
    while True:
        await asyncio.sleep(STATUS_BROADCAST_INTERVAL_SECONDS)
        db = SessionLocal()
        try:
            devices = [serialize_device(db, d) for d in crud.list_devices(db)]
        finally:
            db.close()
        await manager.broadcast({"type": "status", "devices": devices})


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(status_broadcast_loop())
    yield
    task.cancel()


app = FastAPI(title="Vortex IoT Platform", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/measurements", response_model=MeasurementOut, status_code=201)
async def post_measurement(payload: MeasurementIn, db: Session = Depends(get_db)):
    measurement = crud.create_measurement(db, payload)
    device = crud.get_device(db, payload.device)
    await manager.broadcast(
        {
            "type": "measurement",
            "data": MeasurementOut.model_validate(measurement).model_dump(mode="json"),
            "device": serialize_device(db, device),
        }
    )
    return measurement


@app.get("/measurements", response_model=list[MeasurementOut])
def get_measurements(
    device_id: str | None = None,
    since: datetime | None = None,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    return crud.list_measurements(db, device_id=device_id, since=since, limit=limit)


@app.get("/devices", response_model=list[DeviceOut])
def get_devices(db: Session = Depends(get_db)):
    return [serialize_device(db, d) for d in crud.list_devices(db)]


@app.get("/devices/{device_id}", response_model=DeviceOut)
def get_device(device_id: str, db: Session = Depends(get_db)):
    device = crud.get_device(db, device_id)
    if device is None:
        raise HTTPException(status_code=404, detail="Device not found")
    return serialize_device(db, device)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
