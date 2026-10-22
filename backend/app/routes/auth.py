from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from backend.app.auth import (
    create_token,
    generate_device_key,
    get_current_user,
    hash_password,
    verify_password,
)
from backend.app.database import get_db
from backend.app.models import (
    LoginRequest,
    SignupRequest,
    TokenResponse,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse, status_code=201)
async def signup(req: SignupRequest, db=Depends(get_db)):
    if await db.users.find_one({"email": req.email}):
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Email already registered")
    now = datetime.now(timezone.utc)
    result = await db.users.insert_one({
        "email": req.email,
        "password_hash": hash_password(req.password),
        "device_key": generate_device_key(),
        "unregistered_epcs_seen": [],
        "created_at": now,
        "updated_at": now,
    })
    return TokenResponse(access_token=create_token(str(result.inserted_id)))


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db=Depends(get_db)):
    user = await db.users.find_one({"email": req.email})
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return TokenResponse(access_token=create_token(str(user["_id"])))


@router.get("/me", response_model=UserResponse)
async def get_me(user=Depends(get_current_user)):
    return UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        device_key=user["device_key"],
    )
