"""Tests for unregistered EPC capture and /me/unregistered."""
import pytest

pytestmark = pytest.mark.asyncio


async def test_unregistered_epc_captured(auth_client, db):
    ac, headers = auth_client
    user = await db.users.find_one({"email": "test@example.com"})

    res = await ac.post("/device/scan", json={
        "device_key": user["device_key"],
        "scanned_epcs": ["DEADBEEF00000001"],  # not registered
    })
    assert res.status_code == 200

    res2 = await ac.get("/me/unregistered", headers=headers)
    assert res2.status_code == 200
    assert "DEADBEEF00000001" in res2.json()["epcs"]


async def test_registering_tag_removes_from_unregistered(auth_client, db):
    ac, headers = auth_client
    user = await db.users.find_one({"email": "test@example.com"})

    # First: scan with unknown EPC
    await ac.post("/device/scan", json={
        "device_key": user["device_key"],
        "scanned_epcs": ["DEADBEEF00000002"],
    })

    # Register the tag
    r = await ac.post("/tags", json={"epc": "DEADBEEF00000002", "name": "My Card"}, headers=headers)
    assert r.status_code == 201

    # Now unregistered list should be empty
    res = await ac.get("/me/unregistered", headers=headers)
    assert "DEADBEEF00000002" not in res.json()["epcs"]


async def test_no_duplicate_unregistered(auth_client, db):
    ac, headers = auth_client
    user = await db.users.find_one({"email": "test@example.com"})

    # Scan twice with same unknown EPC
    for _ in range(2):
        await ac.post("/device/scan", json={
            "device_key": user["device_key"],
            "scanned_epcs": ["DEADBEEF00000003"],
        })

    res = await ac.get("/me/unregistered", headers=headers)
    epcs = res.json()["epcs"]
    assert epcs.count("DEADBEEF00000003") == 1
