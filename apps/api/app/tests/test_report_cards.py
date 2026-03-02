"""Tests for report card PDF generation."""
import pytest


def test_generate_report_card_pdf(client, student_token, student_user_id):
    """Student can download own report card."""
    r = client.get(f"/api/v1/report-cards/students/{student_user_id}/pdf",
                   headers={"Authorization": f"Bearer {student_token}"})
    assert r.status_code == 200
    assert r.headers.get("content-type") == "application/pdf"
    assert len(r.content) > 100  # Non-empty PDF


def test_report_card_unauthenticated(client):
    """Unauthenticated request fails."""
    r = client.get("/api/v1/report-cards/students/fake-id/pdf")
    assert r.status_code in (401, 403, 422)
