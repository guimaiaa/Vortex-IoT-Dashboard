from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

PAYLOAD = {
    "device": "VTX001",
    "temperature": 26.3,
    "humidity": 61,
    "luminosity": 420,
    "timestamp": "2026-07-06T10:00:00",
}


def test_post_measurement_creates_device_and_reading():
    resp = client.post("/measurements", json=PAYLOAD)
    assert resp.status_code == 201
    body = resp.json()
    assert body["device_id"] == "VTX001"
    assert body["temperature"] == 26.3


def test_get_measurements_returns_posted_reading():
    client.post("/measurements", json=PAYLOAD)
    resp = client.get("/measurements", params={"device_id": "VTX001"})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    assert data[0]["device_id"] == "VTX001"


def test_get_devices_includes_created_device_online():
    client.post("/measurements", json=PAYLOAD)
    resp = client.get("/devices")
    assert resp.status_code == 200
    devices = resp.json()
    device = next(d for d in devices if d["id"] == "VTX001")
    assert device["online"] is True
    assert device["latest"] is not None


def test_get_single_device():
    client.post("/measurements", json=PAYLOAD)
    resp = client.get("/devices/VTX001")
    assert resp.status_code == 200
    assert resp.json()["id"] == "VTX001"


def test_get_unknown_device_returns_404():
    resp = client.get("/devices/DOES_NOT_EXIST")
    assert resp.status_code == 404


def test_invalid_payload_rejected():
    bad_payload = {"device": "VTX001", "temperature": "hot"}
    resp = client.post("/measurements", json=bad_payload)
    assert resp.status_code == 422


def test_websocket_receives_broadcast_on_new_measurement():
    with client.websocket_connect("/ws") as ws:
        client.post("/measurements", json=PAYLOAD)
        message = ws.receive_json()
        assert message["type"] == "measurement"
        assert message["data"]["device_id"] == "VTX001"
