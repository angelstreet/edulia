"""add hub tables (platforms, courses, certificates, portfolios)

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-03-02
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, ARRAY

revision = "d4e5f6a7b8c9"
down_revision = "c3d4e5f6a7b8"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "learning_platforms",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False, unique=True),
        sa.Column("slug", sa.String(100), nullable=False, unique=True),
        sa.Column("url", sa.Text, nullable=False),
        sa.Column("logo_url", sa.Text, nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("is_free", sa.Boolean, default=False),
        sa.Column("has_certificates", sa.Boolean, default=False),
        sa.Column("languages", ARRAY(sa.Text), default=list),
        sa.Column("categories", ARRAY(sa.Text), default=list),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "courses",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("platform_id", UUID(as_uuid=True), sa.ForeignKey("learning_platforms.id"), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("url", sa.Text, nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("difficulty", sa.String(20), default="beginner"),
        sa.Column("format", sa.String(20), default="video"),
        sa.Column("language", sa.String(10), default="en"),
        sa.Column("duration_hours", sa.Float, nullable=True),
        sa.Column("is_free", sa.Boolean, default=True),
        sa.Column("has_certificate", sa.Boolean, default=False),
        sa.Column("tags", ARRAY(sa.Text), default=list),
        sa.Column("category", sa.String(30), default="professional"),
        sa.Column("image_url", sa.Text, nullable=True),
        sa.Column("provider_course_id", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "certificates",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("issuer", sa.String(255), nullable=False),
        sa.Column("issued_date", sa.Date, nullable=True),
        sa.Column("expiry_date", sa.Date, nullable=True),
        sa.Column("credential_id", sa.String(255), nullable=True),
        sa.Column("verification_url", sa.Text, nullable=True),
        sa.Column("file_id", UUID(as_uuid=True), sa.ForeignKey("files.id"), nullable=True),
        sa.Column("course_id", UUID(as_uuid=True), sa.ForeignKey("courses.id"), nullable=True),
        sa.Column("skills", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "portfolios",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, unique=True),
        sa.Column("slug", sa.String(100), nullable=False, unique=True),
        sa.Column("headline", sa.String(255), nullable=True),
        sa.Column("bio", sa.Text, nullable=True),
        sa.Column("is_public", sa.Boolean, default=True),
        sa.Column("linkedin_url", sa.Text, nullable=True),
        sa.Column("website_url", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )


def downgrade():
    op.drop_table("portfolios")
    op.drop_table("certificates")
    op.drop_table("courses")
    op.drop_table("learning_platforms")
