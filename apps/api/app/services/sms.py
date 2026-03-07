"""SMS sending via Twilio. No-op when TWILIO_ACCOUNT_SID is not configured."""
import logging

logger = logging.getLogger(__name__)


def send_sms(to: str, body: str) -> bool:
    """Send SMS. Returns True on success, False if SMS disabled or failed."""
    from app.config import settings
    if not settings.SMS_ENABLED or not settings.TWILIO_ACCOUNT_SID:
        logger.debug("SMS disabled or not configured — skipping: %s", body[:50])
        return False
    try:
        from twilio.rest import Client
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        client.messages.create(body=body, from_=settings.TWILIO_FROM_NUMBER, to=to)
        return True
    except Exception as exc:
        logger.error("SMS send failed to %s: %s", to, exc)
        return False
