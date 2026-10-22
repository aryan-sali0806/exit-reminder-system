from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from backend.app import config

client: AsyncIOMotorClient = None
db: AsyncIOMotorDatabase = None


async def connect():
    global client, db
    client = AsyncIOMotorClient(config.MONGO_URI)
    db = client[config.MONGO_DB]
    await db.users.create_index("email", unique=True)
    await db.users.create_index("device_key", unique=True)
    await db.tags.create_index([("user_id", 1), ("epc", 1)], unique=True)
    await db.events.create_index([("user_id", 1), ("ts", -1)])


async def disconnect():
    if client:
        client.close()


def get_db() -> AsyncIOMotorDatabase:
    return db
