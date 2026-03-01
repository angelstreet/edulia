from sqlalchemy import Column, Float, String, Text

from app.db.base import Base, TenantMixin


class Subject(Base, TenantMixin):
    __tablename__ = "subjects"

    code = Column(String(20), nullable=False)
    name = Column(String(255), nullable=False)
    color = Column(String(7), nullable=True)  # hex color for timetable
    description = Column(Text, nullable=True)
    coefficient = Column(Float, default=1.0)
