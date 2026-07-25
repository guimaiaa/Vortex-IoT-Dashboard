from datetime import datetime, timezone

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models import Device, Measurement, Settings
from app.schemas import MeasurementIn

SETTINGS_ROW_ID = 1
DEFAULT_TEMP_HIGH_THRESHOLD = 30.0
DEFAULT_TEMP_LOW_THRESHOLD = 10.0


def upsert_device(db: Session, device_id: str, seen_at: datetime) -> Device:
    device = db.get(Device, device_id)
    if device is None:
        device = Device(id=device_id, first_seen=seen_at, last_seen=seen_at)
        db.add(device)
    else:
        device.last_seen = seen_at
    return device


def create_measurement(db: Session, payload: MeasurementIn) -> Measurement:
    seen_at = datetime.now(timezone.utc)
    upsert_device(db, payload.device, seen_at)
    measurement = Measurement(
        device_id=payload.device,
        temperature=payload.temperature,
        humidity=payload.humidity,
        luminosity=payload.luminosity,
        timestamp=payload.timestamp,
        received_at=seen_at,
    )
    db.add(measurement)
    db.commit()
    db.refresh(measurement)
    return measurement


def list_measurements(
    db: Session,
    device_id: str | None = None,
    since: datetime | None = None,
    until: datetime | None = None,
    limit: int = 100,
) -> list[Measurement]:
    # Order by received_at (server clock, always UTC, always monotonic) rather than the
    # device-supplied timestamp - a device's own clock can be wrong or change timezone/epoch
    # between firmware updates, which would otherwise make "latest" pick a stale row forever.
    # since/until filter on `timestamp` though (the device-local wall-clock reading) - that's
    # what a date/time picker in the dashboard naturally represents.
    stmt = select(Measurement).order_by(Measurement.received_at.desc()).limit(limit)
    if device_id:
        stmt = stmt.where(Measurement.device_id == device_id)
    if since:
        stmt = stmt.where(Measurement.timestamp >= since)
    if until:
        stmt = stmt.where(Measurement.timestamp <= until)
    return list(db.execute(stmt).scalars())


def delete_old_measurements(db: Session, cutoff: datetime) -> int:
    # received_at (server clock, always UTC) rather than the device-supplied timestamp -
    # same reasoning as list_measurements, a device's own clock isn't trustworthy enough
    # to decide what gets deleted.
    result = db.execute(delete(Measurement).where(Measurement.received_at < cutoff))
    db.commit()
    return result.rowcount


def get_latest_measurement(db: Session, device_id: str) -> Measurement | None:
    stmt = (
        select(Measurement)
        .where(Measurement.device_id == device_id)
        .order_by(Measurement.received_at.desc())
        .limit(1)
    )
    return db.execute(stmt).scalars().first()


def list_devices(db: Session) -> list[Device]:
    return list(db.execute(select(Device).order_by(Device.id)).scalars())


def get_device(db: Session, device_id: str) -> Device | None:
    return db.get(Device, device_id)


def get_settings(db: Session) -> Settings:
    settings = db.get(Settings, SETTINGS_ROW_ID)
    if settings is None:
        settings = Settings(
            id=SETTINGS_ROW_ID,
            temp_high_threshold=DEFAULT_TEMP_HIGH_THRESHOLD,
            temp_low_threshold=DEFAULT_TEMP_LOW_THRESHOLD,
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def update_settings(db: Session, temp_high: float, temp_low: float) -> Settings:
    settings = get_settings(db)
    settings.temp_high_threshold = temp_high
    settings.temp_low_threshold = temp_low
    db.commit()
    db.refresh(settings)
    return settings
