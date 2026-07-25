from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator, model_validator


def _assume_utc(value: datetime) -> datetime:
    # SQLite doesn't preserve tzinfo through SQLAlchemy's DateTime(timezone=True) -
    # values read back from the DB come back naive, even though crud.py always writes
    # them via datetime.now(timezone.utc). Without this, the JSON we send out has no
    # offset/"Z" suffix, so the frontend's `new Date(...)` parses it as local time
    # instead of UTC, throwing every "time since" calculation off by the local UTC offset.
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


class MeasurementIn(BaseModel):
    device: str
    temperature: float
    humidity: float
    luminosity: float
    timestamp: datetime
    # Not persisted to the DB - only used to flag manual (button-triggered) updates
    # to WebSocket subscribers in real time.
    trigger: Literal["interval", "boot", "button"] = "interval"


class MeasurementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    device_id: str
    temperature: float
    humidity: float
    luminosity: float
    timestamp: datetime
    received_at: datetime

    _normalize_received_at = field_validator("received_at")(_assume_utc)


class DeviceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    first_seen: datetime
    last_seen: datetime
    online: bool
    latest: MeasurementOut | None = None

    _normalize_first_seen = field_validator("first_seen")(_assume_utc)
    _normalize_last_seen = field_validator("last_seen")(_assume_utc)


class SettingsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    temp_high_threshold: float
    temp_low_threshold: float


class SettingsIn(BaseModel):
    temp_high_threshold: float
    temp_low_threshold: float

    @model_validator(mode="after")
    def check_low_below_high(self):
        if self.temp_low_threshold >= self.temp_high_threshold:
            raise ValueError("temp_low_threshold must be less than temp_high_threshold")
        return self
