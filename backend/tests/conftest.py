"""
Shared pytest fixtures.
Uses a thin async wrapper around mongomock (sync) so no real MongoDB is needed.
mongomock 4.x dropped motor_asyncio; this wrapper replaces it.
"""
import pytest
import pytest_asyncio
import mongomock
from bson import ObjectId
from httpx import ASGITransport, AsyncClient
from pymongo import ReturnDocument

from backend.app import database
from backend.app.main import app


# ── Async wrapper around mongomock ────────────────────────────────

class _AsyncCursor:
    def __init__(self, docs: list):
        self._docs = docs

    def limit(self, n: int):
        self._docs = self._docs[:n]
        return self

    async def to_list(self, length):
        return self._docs


class _AsyncCollection:
    def __init__(self, coll):
        self._c = coll

    async def find_one(self, filter=None, sort=None):
        if sort:
            docs = list(self._c.find(filter or {}))
            for key, direction in reversed(sort):
                docs.sort(key=lambda x: (x.get(key) is None, x.get(key)), reverse=(direction == -1))
            return docs[0] if docs else None
        return self._c.find_one(filter or {})

    def find(self, filter=None, sort=None):
        docs = list(self._c.find(filter or {}))
        if sort:
            for key, direction in reversed(sort):
                docs.sort(key=lambda x: (x.get(key) is None, x.get(key)), reverse=(direction == -1))
        return _AsyncCursor(docs)

    async def insert_one(self, doc):
        return self._c.insert_one(doc)

    async def update_one(self, filter, update, upsert=False):
        return self._c.update_one(filter, update, upsert=upsert)

    async def update_many(self, filter, update):
        return self._c.update_many(filter, update)

    async def delete_one(self, filter):
        return self._c.delete_one(filter)

    async def find_one_and_update(self, filter, update, return_document=None):
        new = (return_document == ReturnDocument.AFTER)
        return self._c.find_one_and_update(filter, update, return_document=new)

    async def create_index(self, keys, **kwargs):
        return self._c.create_index(keys, **kwargs)


class _AsyncMockDB:
    def __init__(self):
        self._db = mongomock.MongoClient()["test"]

    def __getattr__(self, name: str):
        return _AsyncCollection(self._db[name])


# ── Fixtures ──────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def db():
    mock_db = _AsyncMockDB()
    database.db = mock_db
    yield mock_db
    database.db = None


@pytest_asyncio.fixture
async def client(db):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def auth_client(client):
    """Returns (client, auth_headers) for a signed-up user."""
    res = await client.post("/auth/signup", json={"email": "test@example.com", "password": "password123"})
    assert res.status_code == 201
    token = res.json()["access_token"]
    return client, {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def two_users(client, db):
    """Two separate users. Returns (client, headers_a, headers_b, user_a_doc, user_b_doc)."""
    r1 = await client.post("/auth/signup", json={"email": "alice@x.com", "password": "password123"})
    r2 = await client.post("/auth/signup", json={"email": "bob@x.com", "password": "password123"})
    h1 = {"Authorization": f"Bearer {r1.json()['access_token']}"}
    h2 = {"Authorization": f"Bearer {r2.json()['access_token']}"}
    ua = db._db.users.find_one({"email": "alice@x.com"})
    ub = db._db.users.find_one({"email": "bob@x.com"})
    return client, h1, h2, ua, ub
