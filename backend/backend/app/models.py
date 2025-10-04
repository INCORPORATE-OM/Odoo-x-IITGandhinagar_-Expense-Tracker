from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import date

class Company(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    country: str
    currency: str
    users: List["User"] = Relationship(back_populates="company")

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True)
    hashed_password: str
    full_name: Optional[str] = None
    role: str = "employee"  # admin, manager, employee
    company_id: Optional[int] = Field(default=None, foreign_key="company.id")
    company: Optional[Company] = Relationship(back_populates="users")
    reports_to: Optional[int] = None  # manager id

class Expense(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    company_id: Optional[int] = Field(default=None, foreign_key="company.id")
    # original submitted amount and currency
    original_amount: float
    original_currency: str
    # converted to company currency
    company_amount: float | None = None
    company_currency: str | None = None
    category: str
    description: Optional[str] = None
    date: date
    status: str = "pending"  # pending, approved, rejected
    receipt_path: Optional[str] = None


class ApprovalSequence(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="company.id")
    # store sequence as JSON text: list of role names or user ids
    sequence: str  # JSON serialized list


class ExpenseApproval(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    expense_id: int = Field(foreign_key="expense.id")
    approver_id: Optional[int] = Field(default=None, foreign_key="user.id")
    approver_role: Optional[str] = None
    status: str = "pending"  # pending, approved, rejected
    comment: Optional[str] = None
    order: int = 0


class ApprovalRule(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="company.id")
    rule_type: str  # 'percentage', 'specific', 'hybrid'
    # for percentage rules (0-1), e.g., 0.6 for 60%
    threshold: float | None = None
    # for specific approver rules
    specific_approver_id: int | None = None
    specific_role: str | None = None
    # extra config as JSON text for hybrid or future rules
    config: str | None = None
