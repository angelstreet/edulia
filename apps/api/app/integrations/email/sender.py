import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import settings

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, html_body: str) -> bool:
    """Send transactional email via SMTP (Brevo/Sendinblue or any SMTP provider)."""
    smtp_host = getattr(settings, "SMTP_HOST", None)
    smtp_port = getattr(settings, "SMTP_PORT", 587)
    smtp_user = getattr(settings, "SMTP_USER", None)
    smtp_password = getattr(settings, "SMTP_PASSWORD", None)
    smtp_from = getattr(settings, "SMTP_FROM", "noreply@edulia.app")

    if not smtp_host:
        logger.warning("SMTP not configured, email not sent to %s: %s", to, subject)
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = smtp_from
    msg["To"] = to
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            if smtp_user and smtp_password:
                server.login(smtp_user, smtp_password)
            server.sendmail(smtp_from, [to], msg.as_string())
        logger.info("Email sent to %s: %s", to, subject)
        return True
    except Exception:
        logger.exception("Failed to send email to %s", to)
        return False


def send_password_reset_email(to: str, reset_token: str, base_url: str = "http://localhost:5173") -> bool:
    html = f"""
    <h2>Password Reset</h2>
    <p>Click the link below to reset your password:</p>
    <p><a href="{base_url}/reset-password?token={reset_token}">Reset Password</a></p>
    <p>This link expires in 1 hour.</p>
    """
    return send_email(to, "Password Reset - Edulia", html)


def send_invite_email(to: str, invite_token: str, tenant_name: str, base_url: str = "http://localhost:5173") -> bool:
    html = f"""
    <h2>You've been invited to {tenant_name}</h2>
    <p>Click the link below to set your password and activate your account:</p>
    <p><a href="{base_url}/invite/accept?token={invite_token}">Accept Invitation</a></p>
    """
    return send_email(to, f"Invitation to {tenant_name} - Edulia", html)
