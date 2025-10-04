from fastapi import FastAPI
from . import db, models
from .routers import auth, expenses
from .routers import admin
from .routers import approvals
from .routers import ocr
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Expense Manager API")

# Allow local frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"]) 
app.include_router(expenses.router, prefix="/expenses", tags=["expenses"]) 
app.include_router(admin.router, prefix="/admin", tags=["admin"]) 
app.include_router(approvals.router, prefix="/approvals", tags=["approvals"]) 
app.include_router(ocr.router, prefix="/ocr", tags=["ocr"]) 

@app.on_event("startup")
def on_startup():
    db.init_db()
