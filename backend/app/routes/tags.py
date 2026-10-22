from datetime import datetime, timezone
from typing import List

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pymongo import ReturnDocument

from backend.app.auth import get_current_user
from backend.app.database import get_db
from backend.app.models import CreateTagRequest, TagResponse, UpdateTagRequest

router = APIRouter(prefix="/tags", tags=["tags"])


def _out(doc: dict) -> TagResponse:
    return TagResponse(id=str(doc["_id"]), epc=doc["epc"], name=doc["name"])


@router.get("", response_model=List[TagResponse])
async def list_tags(user=Depends(get_current_user), db=Depends(get_db)):
    uid = str(user["_id"])
    docs = await db.tags.find({"user_id": uid}).to_list(None)
    return [_out(d) for d in docs]


@router.post("", response_model=TagResponse, status_code=201)
async def create_tag(req: CreateTagRequest, user=Depends(get_current_user), db=Depends(get_db)):
    uid = str(user["_id"])
    if await db.tags.find_one({"user_id": uid, "epc": req.epc}):
        raise HTTPException(409, "EPC already registered")
    result = await db.tags.insert_one({
        "user_id": uid,
        "epc": req.epc,
        "name": req.name,
        "created_at": datetime.now(timezone.utc),
    })
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$pull": {"unregistered_epcs_seen": req.epc}},
    )
    doc = await db.tags.find_one({"_id": result.inserted_id})
    return _out(doc)


@router.patch("/{tag_id}", response_model=TagResponse)
async def update_tag(
    tag_id: str, req: UpdateTagRequest,
    user=Depends(get_current_user), db=Depends(get_db),
):
    uid = str(user["_id"])
    doc = await db.tags.find_one_and_update(
        {"_id": ObjectId(tag_id), "user_id": uid},
        {"$set": {"name": req.name}},
        return_document=ReturnDocument.AFTER,
    )
    if not doc:
        raise HTTPException(404, "Tag not found")
    return _out(doc)


@router.delete("/{tag_id}", status_code=204)
async def delete_tag(tag_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    uid = str(user["_id"])
    await db.lists.update_many({"user_id": uid}, {"$pull": {"tag_ids": tag_id}})
    result = await db.tags.delete_one({"_id": ObjectId(tag_id), "user_id": uid})
    if result.deleted_count == 0:
        raise HTTPException(404, "Tag not found")
