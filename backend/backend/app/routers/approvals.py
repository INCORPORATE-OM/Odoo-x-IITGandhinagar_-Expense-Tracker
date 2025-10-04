from fastapi import APIRouter, Depends, HTTPException
from ..deps import get_current_user, require_role
from .. import db, models
from pydantic import BaseModel
import json

router = APIRouter()

class ApproveIn(BaseModel):
    expense_id: int
    approve: bool
    comment: str | None = None

@router.post('/approve')
def approve(payload: ApproveIn, user=Depends(get_current_user)):
    from ..db import engine
    with db.Session(engine) as session:
        expense = session.get(models.Expense, payload.expense_id)
        if not expense:
            raise HTTPException(status_code=404, detail='Expense not found')
        # find the next pending approval for this user
        ap = session.query(models.ExpenseApproval).filter(models.ExpenseApproval.expense_id == expense.id, models.ExpenseApproval.status == 'pending').order_by(models.ExpenseApproval.order).first()
        if not ap:
            raise HTTPException(status_code=400, detail='No pending approvals')
        # check if user is allowed
        if ap.approver_id and ap.approver_id != user.id and user.role != 'admin':
            raise HTTPException(status_code=403, detail='Not the assigned approver')
        # accept or reject
        ap.status = 'approved' if payload.approve else 'rejected'
        ap.comment = payload.comment
        session.add(ap)
        session.commit()
        session.refresh(ap)

        # evaluate overall approval using company rules (if any)
        approvals = session.query(models.ExpenseApproval).filter(models.ExpenseApproval.expense_id == expense.id).all()
        approved = sum(1 for a in approvals if a.status == 'approved')
        total = len(approvals)

        # load company rules
        rules = session.query(models.ApprovalRule).filter(models.ApprovalRule.company_id == expense.company_id).all() if hasattr(expense, 'company_id') else []

        # helper flags
        any_rejected = any(a.status == 'rejected' for a in approvals)
        auto_approved = False

        # evaluate specific approver rule first: if specific approver approved, auto-approve
        for r in rules:
            if r.rule_type == 'specific':
                # check if specific approver approved
                if any(a.approver_id == r.specific_approver_id and a.status == 'approved' for a in approvals):
                    auto_approved = True
                    break

        # evaluate percentage rules
        if not auto_approved and any(r.rule_type == 'percentage' for r in rules):
            for r in rules:
                if r.rule_type == 'percentage' and r.threshold and total > 0:
                    if (approved / total) >= r.threshold:
                        auto_approved = True
                        break

        # hybrid: if any hybrid rule exists, it may define threshold or specific approver; handle as OR
        if not auto_approved and any(r.rule_type == 'hybrid' for r in rules):
            for r in rules:
                if r.rule_type != 'hybrid':
                    continue
                # if specific approver specified and approved
                if r.specific_approver_id and any(a.approver_id == r.specific_approver_id and a.status == 'approved' for a in approvals):
                    auto_approved = True
                    break
                # or threshold
                if r.threshold and total > 0 and (approved / total) >= r.threshold:
                    auto_approved = True
                    break

        if any_rejected:
            expense.status = 'rejected'
        elif auto_approved:
            expense.status = 'approved'
        else:
            expense.status = 'pending'
        session.add(expense)
        session.commit()
        session.refresh(expense)
        return {'expense_status': expense.status}

@router.get('/queue')
def queue(user=Depends(get_current_user)):
    from ..db import engine
    with db.Session(engine) as session:
        rows = session.query(models.ExpenseApproval).filter(
            ((models.ExpenseApproval.approver_id == user.id) | (models.ExpenseApproval.approver_role == user.role)),
            models.ExpenseApproval.status == 'pending'
        ).all()
        return rows
