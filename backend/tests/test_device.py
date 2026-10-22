"""
Tests for /device/scan: rule engine integration, device-key isolation between users.
"""
import pytest

pytestmark = pytest.mark.asyncio


async def _setup_user_with_list(client, headers, db, epcs_names, active=True):
    """Helper: register tags and create an active list for a user."""
    tag_ids = []
    for epc, name in epcs_names:
        r = await client.post("/tags", json={"epc": epc, "name": name}, headers=headers)
        assert r.status_code == 201
        tag_ids.append(r.json()["id"])

    r = await client.post("/lists", json={"name": "Test"}, headers=headers)
    list_id = r.json()["id"]

    for tid in tag_ids:
        await client.post(f"/lists/{list_id}/tags", json={"tag_id": tid}, headers=headers)

    if active:
        await client.patch(f"/lists/{list_id}", json={"active": True}, headers=headers)

    return list_id


async def test_scan_all_present(client, two_users):
    client, h1, h2, ua, ub = two_users
    await _setup_user_with_list(
        client, h1, None,
        [("E200000000000001", "Wallet"), ("E200000000000002", "Keys")],
    )
    res = await client.post("/device/scan", json={
        "device_key": ua["device_key"],
        "scanned_epcs": ["E200000000000001", "E200000000000002"],
    })
    assert res.status_code == 200
    d = res.json()
    assert d["alert"] is False
    assert d["missing"] == []


async def test_scan_one_missing(client, two_users):
    client, h1, h2, ua, ub = two_users
    await _setup_user_with_list(
        client, h1, None,
        [("E200000000000001", "Wallet"), ("E200000000000002", "Keys")],
    )
    res = await client.post("/device/scan", json={
        "device_key": ua["device_key"],
        "scanned_epcs": ["E200000000000001"],  # Keys missing
    })
    assert res.status_code == 200
    d = res.json()
    assert d["alert"] is True
    assert "Keys" in d["missing"]
    assert "Wallet" not in d["missing"]


async def test_device_key_isolation(client, two_users, db):
    """Alice's device key cannot see Bob's items."""
    client, h1, h2, ua, ub = two_users
    # Bob registers tags and active list
    await _setup_user_with_list(client, h2, None, [("E200BBBBBBBBBBBB", "BobWallet")])

    # Alice scans (with Alice's device key)
    res = await client.post("/device/scan", json={
        "device_key": ua["device_key"],
        "scanned_epcs": [],
    })
    assert res.status_code == 200
    d = res.json()
    # Alice has no active lists, so required is empty — alert=False
    assert d["required"] == []
    assert d["alert"] is False


async def test_wrong_device_key(client, db):
    res = await client.post("/device/scan", json={
        "device_key": "0" * 32,
        "scanned_epcs": [],
    })
    assert res.status_code == 401


async def test_inactive_list_not_required(client, two_users):
    client, h1, h2, ua, ub = two_users
    # Create list but leave inactive
    await _setup_user_with_list(
        client, h1, None,
        [("E200000000000001", "Wallet")],
        active=False,
    )
    res = await client.post("/device/scan", json={
        "device_key": ua["device_key"],
        "scanned_epcs": [],
    })
    assert res.status_code == 200
    assert res.json()["required"] == []
