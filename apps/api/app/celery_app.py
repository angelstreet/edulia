from celery import Celery
from app.config import settings

celery_app = Celery(
    "edulia",
    broker=settings.CELERY_BROKER_URL,
    include=["app.tasks.billing"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Europe/Paris",
    enable_utc=True,
    beat_schedule={
        "charge-subscriptions-daily": {
            "task": "app.tasks.billing.charge_subscriptions",
            "schedule": 86400,  # every 24h
        },
        "low-balance-alert-daily": {
            "task": "app.tasks.billing.send_low_balance_alerts",
            "schedule": 86400,
        },
    },
)
