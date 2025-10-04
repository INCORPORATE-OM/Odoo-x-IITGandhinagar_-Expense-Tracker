from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from .. import models, db
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import os

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.getenv("SECRET_KEY", "devsecret")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

class SignupIn(BaseModel):
    email: str
    password: str
    full_name: str
    company_name: str
    country: str

class Token(BaseModel):
    access_token: str
    token_type: str


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

@router.post("/signup", response_model=Token)
async def signup(payload: SignupIn):
    # create company and admin user, auto-detect currency for country
    from ..services.currency import detect_currency_for_country
    currency = await detect_currency_for_country(payload.country) or "USD"
    company = models.Company(name=payload.company_name, country=payload.country, currency=currency)

    from ..db import engine
    with db.Session(engine) as session:
        session.add(company)
        session.commit()
        session.refresh(company)
        user = models.User(email=payload.email, hashed_password=get_password_hash(payload.password), full_name=payload.full_name, role="admin", company_id=company.id)
        session.add(user)
        session.commit()
        session.refresh(user)

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"sub": str(user.id), "exp": datetime.utcnow() + access_token_expires}
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return {"access_token": encoded_jwt, "token_type": "bearer"}

@router.post("/login", response_model=Token)
def login(payload: SignupIn):
    from ..db import engine
    with db.Session(engine) as session:
        user = session.query(models.User).filter(models.User.email == payload.email).first()
        if not user or not verify_password(payload.password, user.hashed_password):
            raise HTTPException(status_code=400, detail="Invalid credentials")

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"sub": str(user.id), "exp": datetime.utcnow() + access_token_expires}
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return {"access_token": encoded_jwt, "token_type": "bearer"}
