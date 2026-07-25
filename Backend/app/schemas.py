from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MeasurementIn(BaseModel):
    device: str
    temperature: float
    humidity: float
    luminosity: float
    timestamp: datetime


class MeasurementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    device_id: str
    temperature: float
    humidity: float
    luminosity: float
    timestamp: datetime
    received_at: datetime


class DeviceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    first_seen: datetime
    last_seen: datetime
    online: bool
    latest: MeasurementOut | None = None
