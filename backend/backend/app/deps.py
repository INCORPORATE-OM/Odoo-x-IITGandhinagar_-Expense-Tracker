from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
import os
from typing import Optional
from . import models, db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
SECRET_KEY = os.getenv("SECRET_KEY", "devsecret")

def get_current_user(token: str = Depends(oauth2_scheme)) -> models.User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_id = int(payload.get("sub"))
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication")
    from .db import engine
    with db.Session(engine) as session:
        user = session.get(models.User, user_id)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user

def require_role(role: str):
    def _inner(user: models.User = Depends(get_current_user)):
        if user.role != role and user.role != 'admin':
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return _inner
