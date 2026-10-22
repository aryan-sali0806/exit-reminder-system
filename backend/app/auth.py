import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
from bson import ObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

from backend.app import config
from backend.app.database import get_db

bearer_scheme = HTTPBearer()


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def generate_device_key() -> str:
    return secrets.token_hex(16)  # 32 hex chars


def create_token(user_id: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(days=config.JWT_EXPIRE_DAYS)
    return jwt.encode({"sub": user_id, "exp": exp}, config.JWT_SECRET, algorithm="HS256")


async def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db=Depends(get_db),
):
    exc = HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    try:
        payload = jwt.decode(creds.credentials, config.JWT_SECRET, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        if not user_id:
            raise exc
    except JWTError:
        raise exc

    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise exc
    return user
