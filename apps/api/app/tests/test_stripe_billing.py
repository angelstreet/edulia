"""Stripe Billing / Wallet Integration tests — 10 HTTP integration cases.

Tests the wallet and Stripe billing endpoints:
    GET  /api/v1/wallet
    POST /api/v1/wallet/topup
    GET  /api/v1/wallet/transactions
    POST /api/v1/wallet/create-payment-intent
    POST /api/v1/stripe/webhook

Acceptance criteria verified:
  - Wallet returns balance_cents and currency for authenticated users
  - Top-up increases the balance by the requested amount
  - Top-up rejects negative or zero amounts (400)
  - Transactions list is paginated and has the expected fields
  - create-payment-intent is accepted when Stripe is configured (201) or
    gracefully degraded when not configured (503)
  - create-payment-intent rejects zero/invalid amounts (400 or 422)
  - Stripe webhook rejects requests with an invalid signature (400)
  - Wallet endpoints require authentication (401 or 403 without token)
  - Pagination query params are respected (page_size=5 returns ≤ 5 items)

Fixtures (api, teacher, student) come from conftest.py.
"""

import json
import pytest


# ---------------------------------------------------------------------------
# Test 1 — GET /api/v1/wallet returns balance for authenticated user
# ---------------------------------------------------------------------------

def test_get_wallet_returns_balance(api, student):
    """GET /api/v1/wallet → 200 with `balance_cents` (int) and `currency` (str)."""
    r = api.get("/api/v1/wallet", token=student["token"])
    assert r.status_code == 200, (
        f"Expected 200 from GET /api/v1/wallet, got {r.status_code}: {r.text}"
    )
    data = r.json()
    assert "balance_cents" in data, (
        f"Response must contain 'balance_cents', got keys: {list(data.keys())}"
    )
    assert "currency" in data, (
        f"Response must contain 'currency', got keys: {list(data.keys())}"
    )
    assert isinstance(data["balance_cents"], int), (
        f"'balance_cents' must be an integer, got {type(data['balance_cents'])}"
    )
    assert isinstance(data["currency"], str) and len(data["currency"]) > 0, (
        f"'currency' must be a non-empty string, got {data['currency']!r}"
    )


# ---------------------------------------------------------------------------
# Test 2 — POST /api/v1/wallet/topup increases balance by the requested amount
# ---------------------------------------------------------------------------

def test_topup_increases_balance(api, student):
    """POST /api/v1/wallet/topup with amount_cents=1000 → balance increases by 1000."""
    # Capture balance before top-up
    before_r = api.get("/api/v1/wallet", token=student["token"])
    assert before_r.status_code == 200, (
        f"Pre-topup GET /api/v1/wallet failed: {before_r.status_code}: {before_r.text}"
    )
    balance_before = before_r.json()["balance_cents"]

    # Perform top-up
    topup_r = api.post(
        "/api/v1/wallet/topup",
        token=student["token"],
        json={"amount_cents": 1000},
    )
    assert topup_r.status_code in (200, 201), (
        f"Expected 200 or 201 from POST /api/v1/wallet/topup, "
        f"got {topup_r.status_code}: {topup_r.text}"
    )

    # Capture balance after top-up
    after_r = api.get("/api/v1/wallet", token=student["token"])
    assert after_r.status_code == 200, (
        f"Post-topup GET /api/v1/wallet failed: {after_r.status_code}: {after_r.text}"
    )
    balance_after = after_r.json()["balance_cents"]

    assert balance_after == balance_before + 1000, (
        f"Expected balance to increase by 1000: before={balance_before}, "
        f"after={balance_after} (expected {balance_before + 1000})"
    )


# ---------------------------------------------------------------------------
# Test 3 — POST /api/v1/wallet/topup rejects negative amount (400)
# ---------------------------------------------------------------------------

def test_topup_negative_amount_rejected(api, student):
    """POST /api/v1/wallet/topup with amount_cents=-100 → 400 Bad Request."""
    r = api.post(
        "/api/v1/wallet/topup",
        token=student["token"],
        json={"amount_cents": -100},
    )
    assert r.status_code == 400, (
        f"Expected 400 when topping up with a negative amount, "
        f"got {r.status_code}: {r.text}"
    )


# ---------------------------------------------------------------------------
# Test 4 — POST /api/v1/wallet/topup rejects zero amount (400)
# ---------------------------------------------------------------------------

def test_topup_zero_rejected(api, student):
    """POST /api/v1/wallet/topup with amount_cents=0 → 400 Bad Request."""
    r = api.post(
        "/api/v1/wallet/topup",
        token=student["token"],
        json={"amount_cents": 0},
    )
    assert r.status_code == 400, (
        f"Expected 400 when topping up with zero amount, "
        f"got {r.status_code}: {r.text}"
    )


# ---------------------------------------------------------------------------
# Test 5 — GET /api/v1/wallet/transactions returns list with expected fields
# ---------------------------------------------------------------------------

def test_transactions_list_paginated(api, student):
    """GET /api/v1/wallet/transactions → list where every item has amount_cents, type, created_at."""
    r = api.get("/api/v1/wallet/transactions", token=student["token"])
    assert r.status_code == 200, (
        f"Expected 200 from GET /api/v1/wallet/transactions, "
        f"got {r.status_code}: {r.text}"
    )
    body = r.json()

    # Accept either a plain list or a paginated envelope {"items": [...], ...}
    if isinstance(body, list):
        transactions = body
    elif isinstance(body, dict):
        transactions = body.get("items") or body.get("results") or body.get("data") or []
    else:
        pytest.fail(f"Unexpected response shape from /wallet/transactions: {body!r}")

    for tx in transactions:
        assert "amount_cents" in tx, (
            f"Transaction missing 'amount_cents': {tx}"
        )
        assert "type" in tx, (
            f"Transaction missing 'type': {tx}"
        )
        assert "created_at" in tx, (
            f"Transaction missing 'created_at': {tx}"
        )


# ---------------------------------------------------------------------------
# Test 6 — POST /api/v1/wallet/create-payment-intent: 201 or 503
# ---------------------------------------------------------------------------

def test_create_payment_intent_no_stripe_key(api, student):
    """POST /api/v1/wallet/create-payment-intent with amount_cents=500.

    Accepts 201 (Stripe configured and intent created) or 503 (STRIPE_SECRET_KEY
    not set — graceful degradation expected).  Any other status is a failure.
    """
    r = api.post(
        "/api/v1/wallet/create-payment-intent",
        token=student["token"],
        json={"amount_cents": 500},
    )
    assert r.status_code in (201, 503), (
        f"Expected 201 (Stripe configured) or 503 (Stripe not configured), "
        f"got {r.status_code}: {r.text}"
    )
    if r.status_code == 201:
        data = r.json()
        assert "client_secret" in data or "payment_intent_id" in data, (
            f"201 response must contain client_secret or payment_intent_id, "
            f"got keys: {list(data.keys())}"
        )


# ---------------------------------------------------------------------------
# Test 7 — POST /api/v1/wallet/create-payment-intent rejects zero amount
# ---------------------------------------------------------------------------

def test_create_payment_intent_zero_rejected(api, student):
    """POST /api/v1/wallet/create-payment-intent with amount_cents=0 → 400 or 422."""
    r = api.post(
        "/api/v1/wallet/create-payment-intent",
        token=student["token"],
        json={"amount_cents": 0},
    )
    assert r.status_code in (400, 422), (
        f"Expected 400 or 422 for zero amount on create-payment-intent, "
        f"got {r.status_code}: {r.text}"
    )


# ---------------------------------------------------------------------------
# Test 8 — POST /api/v1/stripe/webhook rejects invalid signature (400)
# ---------------------------------------------------------------------------

def test_stripe_webhook_invalid_signature(api):
    """POST /api/v1/stripe/webhook with a fake payload and no valid Stripe signature → 400.

    Stripe signature validation must reject any request whose
    Stripe-Signature header is missing or does not match the webhook secret.
    """
    fake_payload = json.dumps({
        "id": "evt_test_fake",
        "type": "payment_intent.succeeded",
        "data": {"object": {"id": "pi_fake", "amount": 1000}},
    })
    # Send with a clearly invalid signature header
    r = api.post(
        "/api/v1/stripe/webhook",
        data=fake_payload,
        headers={
            "Content-Type": "application/json",
            "Stripe-Signature": "t=0,v1=invalidsignature",
        },
    )
    assert r.status_code == 400, (
        f"Expected 400 for webhook with invalid Stripe-Signature, "
        f"got {r.status_code}: {r.text}"
    )


# ---------------------------------------------------------------------------
# Test 9 — GET /api/v1/wallet without auth → 401 or 403
# ---------------------------------------------------------------------------

def test_wallet_no_auth(api):
    """GET /api/v1/wallet without an Authorization token → 401 or 403."""
    r = api.get("/api/v1/wallet")  # no token kwarg → no Authorization header
    assert r.status_code in (401, 403), (
        f"Expected 401 or 403 for unauthenticated GET /api/v1/wallet, "
        f"got {r.status_code}: {r.text}"
    )


# ---------------------------------------------------------------------------
# Test 10 — GET /api/v1/wallet/transactions?page=1&page_size=5 returns ≤ 5 items
# ---------------------------------------------------------------------------

def test_transactions_pagination(api, student):
    """GET /api/v1/wallet/transactions?page=1&page_size=5 → at most 5 items returned."""
    r = api.get(
        "/api/v1/wallet/transactions",
        token=student["token"],
        params={"page": 1, "page_size": 5},
    )
    assert r.status_code == 200, (
        f"Expected 200 from paginated /wallet/transactions, "
        f"got {r.status_code}: {r.text}"
    )
    body = r.json()

    # Accept either a plain list or a paginated envelope
    if isinstance(body, list):
        transactions = body
    elif isinstance(body, dict):
        transactions = body.get("items") or body.get("results") or body.get("data") or []
    else:
        pytest.fail(f"Unexpected response shape from paginated /wallet/transactions: {body!r}")

    assert len(transactions) <= 5, (
        f"page_size=5 should return at most 5 transactions, got {len(transactions)}"
    )
