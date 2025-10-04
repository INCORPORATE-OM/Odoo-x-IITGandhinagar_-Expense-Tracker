from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from pydantic import BaseModel
from .. import models, db
from fastapi.security import OAuth2PasswordBearer
from datetime import date
import os
import json

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

class ExpenseIn(BaseModel):
    amount: float
    currency: str
    category: str
    description: str | None = None
    date: date

@router.post("/")
async def submit_expense(payload: ExpenseIn, receipt: UploadFile | None = None, token: str = Depends(oauth2_scheme)):
    # For now, decode token simply to get user id; proper dependency will be added later
    from jose import jwt
    SECRET_KEY = os.getenv("SECRET_KEY", "devsecret")
    data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])  # in real code handle exceptions
    user_id = int(data["sub"])

    # save receipt
    receipt_path = None
    if receipt:
        os.makedirs("uploads", exist_ok=True)
        path = os.path.join("uploads", receipt.filename)
        with open(path, "wb") as f:
            f.write(await receipt.read())
        receipt_path = path

    # persist expense with original values and attempt conversion to company currency
    from ..db import engine
    from ..services.currency import convert_amount
    with db.Session(engine) as session:
        # find user's company currency
        user = session.get(models.User, user_id)
        company_currency = None
        if user and user.company_id:
            comp = session.get(models.Company, user.company_id)
            if comp:
                company_currency = comp.currency

        company_amount = None
        if company_currency:
            conv = None
            try:
                import asyncio
                conv = asyncio.run(convert_amount(payload.amount, payload.currency, company_currency))
            except Exception:
                conv = None
            company_amount = conv

        expense = models.Expense(
            user_id=user_id,
            company_id=user.company_id,
            original_amount=payload.amount,
            original_currency=payload.currency,
            company_amount=company_amount,
            company_currency=company_currency,
            category=payload.category,
            description=payload.description,
            date=payload.date,
            receipt_path=receipt_path,
        )
        session.add(expense)
        session.commit()
        session.refresh(expense)
        # create approval records
        seq = session.query(models.ApprovalSequence).filter(models.ApprovalSequence.company_id == user.company_id).first()
        approvals_to_create = []
        if seq:
            try:
                seq_list = json.loads(seq.sequence)
            except Exception:
                seq_list = []
            order = 0
            for item in seq_list:
                # item can be role string like 'manager' or user id
                if isinstance(item, int):
                    approvals_to_create.append(models.ExpenseApproval(expense_id=expense.id, approver_id=item, approver_role=None, order=order))
                else:
                    approvals_to_create.append(models.ExpenseApproval(expense_id=expense.id, approver_id=None, approver_role=item, order=order))
                order += 1
        else:
            # fallback: assign to user's manager if present
            if user.reports_to:
                approvals_to_create.append(models.ExpenseApproval(expense_id=expense.id, approver_id=user.reports_to, order=0))
        for a in approvals_to_create:
            session.add(a)
        session.commit()
    return {"id": expense.id, "status": expense.status}

@router.get("/me")
def my_expenses(token: str = Depends(oauth2_scheme)):
    from jose import jwt
    SECRET_KEY = os.getenv("SECRET_KEY", "devsecret")
    data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])  # handle errors later
    user_id = int(data["sub"])

    from ..db import engine
    with db.Session(engine) as session:
        rows = session.query(models.Expense).filter(models.Expense.user_id == user_id).all()
        return rows
