from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends

from backend.app.auth import generate_device_key, get_current_user
from backend.app.database import get_db
from backend.app.models import (
    DeviceKeyResponse,
    EventResponse,
    UnregisteredResponse,
    UserResponse,
    AnalyticsResponse,
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


@router.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(user=Depends(get_current_user), db=Depends(get_db)):
    uid = str(user["_id"])

    total_scans = await db.events.count_documents({"user_id": uid})
    total_alerts = await db.events.count_documents({"user_id": uid, "alert": True})

    pipeline = [
        {"$match": {"user_id": uid, "alert": True}},
        {"$unwind": "$missing_names"},
        {"$group": {"_id": "$missing_names", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$project": {"_id": 0, "name": "$_id", "count": 1}},
    ]
    items = await db.events.aggregate(pipeline).to_list(None)

    # Last 7 days: count exits and alerts per calendar day
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=6)
    daily_pipeline = [
        {"$match": {"user_id": uid, "ts": {"$gte": seven_days_ago}}},
        {
            "$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$ts"}},
                "exits": {"$sum": 1},
                "alerts": {"$sum": {"$cond": ["$alert", 1, 0]}},
            }
        },
        {"$sort": {"_id": 1}},
    ]
    daily_raw = await db.events.aggregate(daily_pipeline).to_list(None)
    daily_map = {d["_id"]: d for d in daily_raw}
    today = datetime.now(timezone.utc).date()
    daily = [
        {
            "date": (today - timedelta(days=i)).isoformat(),
            "exits": daily_map.get((today - timedelta(days=i)).isoformat(), {}).get("exits", 0),
            "alerts": daily_map.get((today - timedelta(days=i)).isoformat(), {}).get("alerts", 0),
        }
        for i in range(6, -1, -1)
    ]

    return AnalyticsResponse(total_scans=total_scans, total_alerts=total_alerts, items=items, daily=daily)


@router.post("/device-key/regenerate", response_model=DeviceKeyResponse)
async def regenerate_device_key(user=Depends(get_current_user), db=Depends(get_db)):
    new_key = generate_device_key()
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"device_key": new_key}})
    return DeviceKeyResponse(device_key=new_key)
