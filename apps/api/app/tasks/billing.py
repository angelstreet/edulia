"""Celery billing tasks — subscription auto-debit + low balance alerts."""
import logging
from datetime import datetime, date

from app.celery_app import celery_app
from app.db.database import get_db
from app.db.models.wallet import ServiceSubscription, Wallet, WalletTransaction
from app.config import settings

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.billing.charge_subscriptions")
def charge_subscriptions():
    """Daily task: auto-debit active subscriptions based on billing_period and days_of_week."""
    db = next(get_db())
    try:
        today = date.today()
        weekday = today.weekday()  # 0=Mon … 6=Sun

        active_subs = db.query(ServiceSubscription).filter(
            ServiceSubscription.status == "active"
        ).all()

        for sub in active_subs:
            service = sub.service
            if not service or not service.active:
                continue

            should_charge = False
            period = service.billing_period
            if period == "daily":
                should_charge = True
            elif period == "weekly":
                # charge on Monday
                should_charge = (weekday == 0)
            elif period == "monthly":
                # charge on 1st of month
                should_charge = (today.day == 1)
            elif period == "per_event":
                # days_of_week list contains weekday numbers to charge
                should_charge = (weekday in (sub.days_of_week or []))

            if not should_charge:
                continue

            # Find wallet for student
            wallet = db.query(Wallet).filter(
                Wallet.user_id == sub.student_id
            ).first()
            if not wallet:
                continue

            amount = service.unit_price_cents
            if wallet.balance_cents < amount:
                logger.warning(
                    "Insufficient balance for student %s subscription %s",
                    sub.student_id, sub.id
                )
                continue

            wallet.balance_cents -= amount
            tx = WalletTransaction(
                wallet_id=wallet.id,
                amount_cents=-amount,
                type="debit",
                description=f"Auto-debit: {service.name}",
                reference_type="subscription",
                reference_id=sub.id,
            )
            db.add(tx)
            logger.info("Charged %d cents for subscription %s (student %s)", amount, sub.id, sub.student_id)

        db.commit()
    except Exception as exc:
        logger.error("charge_subscriptions failed: %s", exc)
        db.rollback()
        raise
    finally:
        db.close()


@celery_app.task(name="app.tasks.billing.send_low_balance_alerts")
def send_low_balance_alerts():
    """Daily task: log (and optionally email) wallets below threshold."""
    db = next(get_db())
    threshold = settings.WALLET_LOW_BALANCE_THRESHOLD_CENTS
    try:
        low_wallets = db.query(Wallet).filter(
            Wallet.balance_cents < threshold,
            Wallet.balance_cents >= 0,
        ).all()

        for wallet in low_wallets:
            logger.warning(
                "LOW BALANCE ALERT: user_id=%s balance=%d cents (threshold=%d)",
                wallet.user_id, wallet.balance_cents, threshold
            )
            # TODO: send actual email when SMTP_HOST configured
            if settings.SMTP_HOST:
                _send_low_balance_email(wallet)
    finally:
        db.close()


def _send_low_balance_email(wallet: Wallet):
    """Send low balance email via SMTP."""
    import smtplib
    from email.mime.text import MIMEText
    from app.config import settings

    msg = MIMEText(
        f"Your Edulia wallet balance is low: {wallet.balance_cents / 100:.2f} {wallet.currency}. "
        f"Please top up to continue using school services."
    )
    msg["Subject"] = "Low wallet balance — Edulia"
    msg["From"] = settings.FROM_EMAIL
    msg["To"] = str(wallet.user_id)  # In production, look up email from user table

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            if settings.SMTP_USER:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
    except Exception as exc:
        logger.error("Failed to send low balance email: %s", exc)
