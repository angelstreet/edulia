import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import relationship

from app.db.base import Base, TenantMixin


class User(Base, TenantMixin):
    __tablename__ = "users"

    email = Column(String(255), nullable=False)
    password_hash = Column(Text, nullable=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    display_name = Column(String(200), nullable=True)
    avatar_url = Column(Text, nullable=True)
    phone = Column(String(50), nullable=True)
    date_of_birth = Column(DateTime, nullable=True)
    gender = Column(String(20), nullable=True)  # male | female | other | undisclosed
    address = Column(JSONB, default=dict)
    metadata_ = Column("metadata", JSONB, default=dict)
    status = Column(String(20), default="active")  # active | inactive | suspended | invited
    last_login_at = Column(DateTime, nullable=True)
    reset_token = Column(String(255), nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)
    invite_token = Column(String(255), nullable=True)

    user_roles = relationship("UserRole", back_populates="user")
    relationships_from = relationship(
        "Relationship", foreign_keys="Relationship.from_user_id", back_populates="from_user"
    )
    relationships_to = relationship(
        "Relationship", foreign_keys="Relationship.to_user_id", back_populates="to_user"
    )

    __table_args__ = (
        # Unique email per tenant
        {"comment": "Users table - email unique per tenant enforced at app level"},
    )


class Role(Base, TenantMixin):
    __tablename__ = "roles"

    code = Column(String(50), nullable=False)
    display_name = Column(String(100), nullable=False)
    is_system = Column(Boolean, default=False)
    permissions = Column(ARRAY(Text), default=list)

    user_roles = relationship("UserRole", back_populates="role")


class UserRole(Base):
    __tablename__ = "user_roles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    role_id = Column(UUID(as_uuid=True), ForeignKey("roles.id"), nullable=False)
    scope_type = Column(String(20), default="tenant")  # tenant | campus | group | course
    scope_id = Column(UUID(as_uuid=True), nullable=True)
    granted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    revoked_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="user_roles")
    role = relationship("Role", back_populates="user_roles")


class Relationship(Base, TenantMixin):
    __tablename__ = "relationships"

    from_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    to_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    type = Column(String(30), nullable=False)  # guardian | manager | tutor | mentor | emergency_contact
    is_primary = Column(Boolean, default=False)
    metadata_ = Column("metadata", JSONB, default=dict)

    from_user = relationship("User", foreign_keys=[from_user_id], back_populates="relationships_from")
    to_user = relationship("User", foreign_keys=[to_user_id], back_populates="relationships_to")
