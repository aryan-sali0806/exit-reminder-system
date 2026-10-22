from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    email: str
    device_key: str


class CreateTagRequest(BaseModel):
    epc: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=64)


class UpdateTagRequest(BaseModel):
    name: str = Field(min_length=1, max_length=64)


class TagResponse(BaseModel):
    id: str
    epc: str
    name: str


class CreateListRequest(BaseModel):
    name: str = Field(min_length=1, max_length=64)


class UpdateListRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=64)
    active: Optional[bool] = None


class AddTagToListRequest(BaseModel):
    tag_id: str


class ListResponse(BaseModel):
    id: str
    name: str
    active: bool
    tag_ids: List[str]
    tags: Optional[List[TagResponse]] = None
    schedule: Optional[dict] = None  # reserved for future schedule-based activation


class ScanRequest(BaseModel):
    device_key: str
    scanned_epcs: List[str]


class ScanResponse(BaseModel):
    required: List[str]
    scanned: List[str]
    missing: List[str]
    alert: bool
    speech: str
    event_id: str


class EventResponse(BaseModel):
    id: str
    ts: datetime
    required: List[str]
    missing: List[str]
    alert: bool
    speech: str


class UnregisteredResponse(BaseModel):
    epcs: List[str]


class DeviceKeyResponse(BaseModel):
    device_key: str
