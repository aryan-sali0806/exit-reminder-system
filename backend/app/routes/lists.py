from datetime import datetime, timezone
from typing import List

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pymongo import ReturnDocument

from backend.app.auth import get_current_user
from backend.app.database import get_db
from backend.app.models import (
    AddTagToListRequest,
    CreateListRequest,
    ListResponse,
    TagResponse,
    UpdateListRequest,
)

router = APIRouter(prefix="/lists", tags=["lists"])


async def _enrich(doc: dict, db) -> ListResponse:
    """Attach full tag objects to a list document."""
    tag_ids = doc.get("tag_ids", [])
    tags = []
    if tag_ids:
        oids = [ObjectId(tid) for tid in tag_ids]
        tag_docs = await db.tags.find({"_id": {"$in": oids}}).to_list(None)
        id_to_doc = {str(t["_id"]): t for t in tag_docs}
        tags = [
            TagResponse(id=tid, epc=id_to_doc[tid]["epc"], name=id_to_doc[tid]["name"])
            for tid in tag_ids if tid in id_to_doc
        ]
    return ListResponse(
        id=str(doc["_id"]),
        name=doc["name"],
        active=doc["active"],
        tag_ids=tag_ids,
        tags=tags,
        schedule=doc.get("schedule"),
    )


@router.get("", response_model=List[ListResponse])
async def list_lists(user=Depends(get_current_user), db=Depends(get_db)):
    uid = str(user["_id"])
    docs = await db.lists.find({"user_id": uid}).to_list(None)
    return [await _enrich(d, db) for d in docs]


@router.post("", response_model=ListResponse, status_code=201)
async def create_list(req: CreateListRequest, user=Depends(get_current_user), db=Depends(get_db)):
    uid = str(user["_id"])
    now = datetime.now(timezone.utc)
    result = await db.lists.insert_one({
        "user_id": uid,
        "name": req.name,
        "active": False,
        "tag_ids": [],
        "schedule": None,
        "created_at": now,
        "updated_at": now,
    })
    doc = await db.lists.find_one({"_id": result.inserted_id})
    return await _enrich(doc, db)


@router.patch("/{list_id}", response_model=ListResponse)
async def update_list(
    list_id: str, req: UpdateListRequest,
    user=Depends(get_current_user), db=Depends(get_db),
):
    uid = str(user["_id"])
    updates: dict = {"updated_at": datetime.now(timezone.utc)}
    if req.name is not None:
        updates["name"] = req.name
    if req.active is not None:
        updates["active"] = req.active
    doc = await db.lists.find_one_and_update(
        {"_id": ObjectId(list_id), "user_id": uid},
        {"$set": updates},
        return_document=ReturnDocument.AFTER,
    )
    if not doc:
        raise HTTPException(404, "List not found")
    return await _enrich(doc, db)


@router.delete("/{list_id}", status_code=204)
async def delete_list(list_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    uid = str(user["_id"])
    result = await db.lists.delete_one({"_id": ObjectId(list_id), "user_id": uid})
    if result.deleted_count == 0:
        raise HTTPException(404, "List not found")


@router.post("/{list_id}/tags", response_model=ListResponse)
async def add_tag_to_list(
    list_id: str, req: AddTagToListRequest,
    user=Depends(get_current_user), db=Depends(get_db),
):
    uid = str(user["_id"])
    if not await db.tags.find_one({"_id": ObjectId(req.tag_id), "user_id": uid}):
        raise HTTPException(404, "Tag not found")
    doc = await db.lists.find_one_and_update(
        {"_id": ObjectId(list_id), "user_id": uid},
        {"$addToSet": {"tag_ids": req.tag_id}, "$set": {"updated_at": datetime.now(timezone.utc)}},
        return_document=ReturnDocument.AFTER,
    )
    if not doc:
        raise HTTPException(404, "List not found")
    return await _enrich(doc, db)


@router.delete("/{list_id}/tags/{tag_id}", response_model=ListResponse)
async def remove_tag_from_list(
    list_id: str, tag_id: str,
    user=Depends(get_current_user), db=Depends(get_db),
):
    uid = str(user["_id"])
    doc = await db.lists.find_one_and_update(
        {"_id": ObjectId(list_id), "user_id": uid},
        {"$pull": {"tag_ids": tag_id}, "$set": {"updated_at": datetime.now(timezone.utc)}},
        return_document=ReturnDocument.AFTER,
    )
    if not doc:
        raise HTTPException(404, "List not found")
    return await _enrich(doc, db)
