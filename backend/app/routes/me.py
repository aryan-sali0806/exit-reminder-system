from typing import List

from fastapi import APIRouter, Depends

from backend.app.auth import generate_device_key, get_current_user
from backend.app.database import get_db
from backend.app.models import (
    DeviceKeyResponse,
    EventResponse,
    UnregisteredResponse,
    UserResponse,
)

router = APIRouter(prefix="/me", tags=["me"])


@router.get("", response_model=UserResponse)
async def get_me(user=Depends(get_current_user)):
    return UserResponse(id=str(user["_id"]), email=user["email"], device_key=user["device_key"])


@router.get("/latest")
async def get_latest(user=Depends(get_current_user), db=Depends(get_db)):
    uid = str(user["_id"])
    event = await db.events.find_one({"user_id": uid}, sort=[("ts", -1)])
    if not event:
        return {"alert": False, "speech": "", "missing": [], "required": [], "event_id": None}
    return {
        "event_id": str(event["_id"]),
        "alert": event["alert"],
        "speech": event["speech"],
        "missing": event["missing_names"],
        "required": event["required_names"],
        "ts": event["ts"].isoformat(),
    }


@router.get("/history", response_model=List[EventResponse])
async def get_history(user=Depends(get_current_user), db=Depends(get_db)):
    uid = str(user["_id"])
    events = await db.events.find({"user_id": uid}, sort=[("ts", -1)]).limit(50).to_list(None)
    return [
        EventResponse(
            id=str(e["_id"]),
            ts=e["ts"],
            required=e["required_names"],
            missing=e["missing_names"],
            alert=e["alert"],
            speech=e["speech"],
        )
        for e in events
    ]


@router.get("/unregistered", response_model=UnregisteredResponse)
async def get_unregistered(user=Depends(get_current_user), db=Depends(get_db)):
    fresh = await db.users.find_one({"_id": user["_id"]})
    return UnregisteredResponse(epcs=fresh.get("unregistered_epcs_seen", []))


@router.post("/device-key/regenerate", response_model=DeviceKeyResponse)
async def regenerate_device_key(user=Depends(get_current_user), db=Depends(get_db)):
    new_key = generate_device_key()
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"device_key": new_key}})
    return DeviceKeyResponse(device_key=new_key)
