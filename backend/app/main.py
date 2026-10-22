from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app import database
from backend.app.routes import auth, device, lists, me, tags


@asynccontextmanager
async def lifespan(app: FastAPI):
    await database.connect()
    yield
    await database.disconnect()


app = FastAPI(title="Smart Exit Reminder", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to your Expo / domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(tags.router)
app.include_router(lists.router)
app.include_router(device.router)
app.include_router(me.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
