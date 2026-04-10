from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy import select

from api.models.user import User
from api.services.auth import hash_password
from api.services.deps import DB, SuperAdminUser

router = APIRouter()


class UserCreate(BaseModel):
    email: EmailStr
    name: str
    role: str
    tenant_id: str | None = None
    password: str


@router.get("")
async def list_users(db: DB, user: SuperAdminUser):
    result = await db.execute(select(User).order_by(User.email))
    return [_user_out(u) for u in result.scalars().all()]


@router.post("", status_code=201)
async def create_user(body: UserCreate, db: DB, user: SuperAdminUser):
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    from uuid import UUID
    new_user = User(
        email=body.email,
        name=body.name,
        role=body.role,
        tenant_id=UUID(body.tenant_id) if body.tenant_id else None,
        password_hash=hash_password(body.password),
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return _user_out(new_user)


def _user_out(u: User) -> dict:
    return {
        "id": str(u.id),
        "email": u.email,
        "name": u.name,
        "role": u.role,
        "tenant_id": str(u.tenant_id) if u.tenant_id else None,
        "is_active": u.is_active,
        "created_at": u.created_at.isoformat(),
        "last_login": u.last_login.isoformat() if u.last_login else None,
    }
