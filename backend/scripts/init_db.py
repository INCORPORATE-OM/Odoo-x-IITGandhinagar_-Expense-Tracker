import os
from sqlmodel import SQLModel
from backend.app import db as db_module, models
from backend.app.models import User, Company
from backend.app.db import get_engine
from passlib.context import CryptContext

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_admin_if_missing(engine):
    with engine.begin() as conn:
        # create tables
        SQLModel.metadata.create_all(bind=engine)

    # create initial company and admin user if not present
    from sqlalchemy.orm import Session
    session = Session(engine)
    admin = session.query(User).filter(User.email == os.getenv('ADMIN_EMAIL', 'admin@example.com')).first()
    if not admin:
        company = Company(name=os.getenv('ADMIN_COMPANY_NAME', 'Default Co'), country=os.getenv('ADMIN_COUNTRY', 'US'), currency=os.getenv('ADMIN_CURRENCY', 'USD'))
        session.add(company)
        session.commit()
        session.refresh(company)
        hashed = pwd_ctx.hash(os.getenv('ADMIN_PASSWORD', 'password'))
        admin = User(email=os.getenv('ADMIN_EMAIL', 'admin@example.com'), full_name='Admin', hashed_password=hashed, role='admin', company_id=company.id)
        session.add(admin)
        session.commit()
        print('Created admin user:', admin.email)
    else:
        print('Admin already exists:', admin.email)


if __name__ == '__main__':
    database_url = os.getenv('DATABASE_URL')
    engine = get_engine(database_url)
    create_admin_if_missing(engine)
