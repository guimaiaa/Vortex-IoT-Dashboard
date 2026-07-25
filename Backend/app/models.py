from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    first_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    measurements: Mapped[list["Measurement"]] = relationship(
        back_populates="device", order_by="Measurement.timestamp.desc()"
    )


class Settings(Base):
    __tablename__ = "settings"

    # Single-row table (id is always 1) - one global alert config, since this project
    # only ever has one physical device. Per-device thresholds would need a device_id
    # column here instead, but that's not something the current scope calls for.
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    temp_high_threshold: Mapped[float] = mapped_column(Float, default=30.0)
    temp_low_threshold: Mapped[float] = mapped_column(Float, default=10.0)


class Measurement(Base):
    __tablename__ = "measurements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    device_id: Mapped[str] = mapped_column(ForeignKey("devices.id"), index=True)
    temperature: Mapped[float] = mapped_column(Float)
    humidity: Mapped[float] = mapped_column(Float)
    luminosity: Mapped[float] = mapped_column(Float)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    device: Mapped["Device"] = relationship(back_populates="measurements")
