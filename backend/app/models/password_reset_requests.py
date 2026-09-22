from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, Index

from app.core.database import Base


class PasswordResetRequest(Base):
    __tablename__ = "password_reset_requests"
    __table_args__ = (
        Index("ix_password_reset_requests_email_created", "email_hash", "created_at"),
        Index("ix_password_reset_requests_ip_created", "ip_address", "created_at"),
    )

    id_request = Column(Integer, primary_key=True)
    email_hash = Column(String(64), nullable=False)
    ip_address = Column(String(64), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
