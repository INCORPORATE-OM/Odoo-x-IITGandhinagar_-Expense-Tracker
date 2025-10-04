from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from .. import models, db
from ..deps import get_current_user, require_role

router = APIRouter()

class CreateUserIn(BaseModel):
    email: str
    password: str
    full_name: str | None = None
    role: str = 'employee'
    manager_id: int | None = None

@router.post('/users')
def create_user(payload: CreateUserIn, current=Depends(require_role('admin'))):
    from ..db import engine
    from ..routers.auth import get_password_hash
    with db.Session(engine) as session:
        existing = session.query(models.User).filter(models.User.email == payload.email).first()
        if existing:
            raise HTTPException(status_code=400, detail='User exists')
        user = models.User(email=payload.email, hashed_password=get_password_hash(payload.password), full_name=payload.full_name, role=payload.role, company_id=current.company_id, reports_to=payload.manager_id)
        session.add(user)
        session.commit()
        session.refresh(user)
        return {'id': user.id, 'email': user.email}

@router.get('/users')
def list_users(current=Depends(require_role('admin'))):
    from ..db import engine
    with db.Session(engine) as session:
        rows = session.query(models.User).filter(models.User.company_id == current.company_id).all()
        return rows

@router.patch('/users/{user_id}/role')
def change_role(user_id: int, payload: dict, current=Depends(require_role('admin'))):
    new_role = payload.get('role')
    if new_role not in ('admin', 'manager', 'employee'):
        raise HTTPException(status_code=400, detail='Invalid role')
    from ..db import engine
    with db.Session(engine) as session:
        user = session.get(models.User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail='User not found')
        user.role = new_role
        session.add(user)
        session.commit()
        session.refresh(user)
        return {'id': user.id, 'role': user.role}

@router.patch('/users/{user_id}/manager')
def set_manager(user_id: int, payload: dict, current=Depends(require_role('admin'))):
    manager_id = payload.get('manager_id')
    from ..db import engine
    with db.Session(engine) as session:
        user = session.get(models.User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail='User not found')
        user.reports_to = manager_id
        session.add(user)
        session.commit()
        session.refresh(user)
        return {'id': user.id, 'manager_id': user.reports_to}


    # Approval sequence endpoints
    @router.post('/approval-sequence')
    def set_approval_sequence(payload: dict, current=Depends(require_role('admin'))):
        # payload: { sequence: ["manager","finance", 12] }
        seq = payload.get('sequence')
        if not isinstance(seq, list):
            raise HTTPException(status_code=400, detail='sequence must be a list')
        import json
        from ..db import engine
        existing = None
        with db.Session(engine) as session:
            existing = session.query(models.ApprovalSequence).filter(models.ApprovalSequence.company_id == current.company_id).first()
            if existing:
                existing.sequence = json.dumps(seq)
                session.add(existing)
                session.commit()
                session.refresh(existing)
                return {'id': existing.id, 'sequence': seq}
            new = models.ApprovalSequence(company_id=current.company_id, sequence=json.dumps(seq))
            session.add(new)
            session.commit()
            session.refresh(new)
            return {'id': new.id, 'sequence': seq}


    @router.get('/approval-sequence')
    def get_approval_sequence(current=Depends(require_role('admin'))):
        from ..db import engine
        with db.Session(engine) as session:
            seq = session.query(models.ApprovalSequence).filter(models.ApprovalSequence.company_id == current.company_id).first()
            if not seq:
                return {'sequence': None}
            import json
            return {'sequence': json.loads(seq.sequence)}


    # Approval rules endpoints
    @router.post('/approval-rules')
    def create_rule(payload: dict, current=Depends(require_role('admin'))):
        # payload: { rule_type: 'percentage', threshold: 0.6 } or {rule_type:'specific', specific_approver_id: 5}
        from ..db import engine
        rtype = payload.get('rule_type')
        if rtype not in ('percentage', 'specific', 'hybrid'):
            raise HTTPException(status_code=400, detail='invalid rule_type')
        with db.Session(engine) as session:
            rule = models.ApprovalRule(company_id=current.company_id, rule_type=rtype, threshold=payload.get('threshold'), specific_approver_id=payload.get('specific_approver_id'), specific_role=payload.get('specific_role'), config=payload.get('config'))
            session.add(rule)
            session.commit()
            session.refresh(rule)
            return {'id': rule.id}


    @router.get('/approval-rules')
    def list_rules(current=Depends(require_role('admin'))):
        from ..db import engine
        with db.Session(engine) as session:
            rows = session.query(models.ApprovalRule).filter(models.ApprovalRule.company_id == current.company_id).all()
            return rows
