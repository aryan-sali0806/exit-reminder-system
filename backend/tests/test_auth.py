import pytest
import pytest_asyncio

pytestmark = pytest.mark.asyncio


async def test_signup_creates_user(client, db):
    res = await client.post("/auth/signup", json={"email": "u@x.com", "password": "pass1234"})
    assert res.status_code == 201
    assert "access_token" in res.json()
    user = await db.users.find_one({"email": "u@x.com"})
    assert user is not None
    assert "password_hash" in user
    assert user["password_hash"] != "pass1234"  # bcrypt hashed
    assert len(user["device_key"]) == 32


async def test_signup_duplicate_email(client):
    body = {"email": "u@x.com", "password": "pass1234"}
    await client.post("/auth/signup", json=body)
    res = await client.post("/auth/signup", json=body)
    assert res.status_code == 409


async def test_login_success(client):
    await client.post("/auth/signup", json={"email": "u@x.com", "password": "pass1234"})
    res = await client.post("/auth/login", json={"email": "u@x.com", "password": "pass1234"})
    assert res.status_code == 200
    assert "access_token" in res.json()


async def test_login_wrong_password(client):
    await client.post("/auth/signup", json={"email": "u@x.com", "password": "pass1234"})
    res = await client.post("/auth/login", json={"email": "u@x.com", "password": "wrong"})
    assert res.status_code == 401


async def test_me_returns_profile(client):
    r = await client.post("/auth/signup", json={"email": "u@x.com", "password": "pass1234"})
    token = r.json()["access_token"]
    res = await client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "u@x.com"
    assert len(data["device_key"]) == 32


async def test_protected_route_no_token(client):
    res = await client.get("/me")
    assert res.status_code in (401, 403)  # HTTPBearer returns 401 or 403 when header absent
