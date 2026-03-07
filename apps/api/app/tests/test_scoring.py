"""Unit tests for the scoring engine (Feature 2).

Pure unit tests — no HTTP calls, no database, no fixtures required.
Import the scoring function directly:
    from app.modules.activity.scoring import score_attempt

The scoring rules implemented in scoring.py:
  - Single-choice: full points if the submitted choice matches the single correct choice, else 0.
  - Multi-choice:  partial credit formula: points * max(0, (correct_selected - wrong_selected) / total_correct)
  - Open:          always 0 (requires manual teacher grading — flagged for future feature).
  - No answer:     0 points for that question.
  - max_score:     sum of all question.points regardless of type.

The score_attempt signature expected by these tests:
    score_attempt(questions: list[dict], answers: list[dict]) -> tuple[Decimal, Decimal]

where:
    questions  = list of question dicts with keys: id, type, points, choices (each with id, is_correct)
    answers    = list of answer dicts with keys: question_id, choice_ids (list[str]), text (str|None)
"""

from decimal import Decimal
import pytest

from app.modules.activity.scoring import score_attempt


# ---------------------------------------------------------------------------
# Shared question fixtures (pure data, no pytest fixtures needed)
# ---------------------------------------------------------------------------

def _q_single(qid: str = "q1", points: int = 1) -> dict:
    """Single-choice question: choice 'a' is correct."""
    return {
        "id": qid,
        "type": "single",
        "points": points,
        "choices": [
            {"id": "a", "is_correct": True},
            {"id": "b", "is_correct": False},
            {"id": "c", "is_correct": False},
        ],
    }


def _q_multi(qid: str = "q1", points: int = 2) -> dict:
    """Multi-choice question: choices 'a' and 'b' are correct (2 out of 4)."""
    return {
        "id": qid,
        "type": "multi",
        "points": points,
        "choices": [
            {"id": "a", "is_correct": True},
            {"id": "b", "is_correct": True},
            {"id": "c", "is_correct": False},
            {"id": "d", "is_correct": False},
        ],
    }


def _q_open(qid: str = "q1", points: int = 3) -> dict:
    """Open/free-text question — no choices."""
    return {
        "id": qid,
        "type": "open",
        "points": points,
        "choices": [],
    }


def _ans(question_id: str, choice_ids: list[str], text: str | None = None) -> dict:
    return {"question_id": question_id, "choice_ids": choice_ids, "text": text}


# ---------------------------------------------------------------------------
# Single-choice tests
# ---------------------------------------------------------------------------

def test_single_correct_answer_full_points():
    """Correct single-choice answer → score == points, max_score == points."""
    questions = [_q_single("q1", points=1)]
    answers = [_ans("q1", ["a"])]
    score, max_score = score_attempt(questions, answers)
    assert score == Decimal("1")
    assert max_score == Decimal("1")


def test_single_wrong_answer_zero_points():
    """Wrong single-choice answer → score == 0, max_score == points."""
    questions = [_q_single("q1", points=1)]
    answers = [_ans("q1", ["b"])]
    score, max_score = score_attempt(questions, answers)
    assert score == Decimal("0")
    assert max_score == Decimal("1")


def test_weighted_points():
    """Single-choice question worth 5 points: correct answer → score == 5."""
    questions = [_q_single("q1", points=5)]
    answers = [_ans("q1", ["a"])]
    score, max_score = score_attempt(questions, answers)
    assert score == Decimal("5")
    assert max_score == Decimal("5")


# ---------------------------------------------------------------------------
# Multi-choice tests
# ---------------------------------------------------------------------------

def test_multi_all_correct_full_points():
    """Multi-choice: student picks both correct choices → full points.

    Formula: points * max(0, (correct_selected - wrong_selected) / total_correct)
             = 2 * max(0, (2 - 0) / 2) = 2 * 1 = 2
    """
    questions = [_q_multi("q1", points=2)]
    answers = [_ans("q1", ["a", "b"])]  # both correct
    score, max_score = score_attempt(questions, answers)
    assert score == Decimal("2")
    assert max_score == Decimal("2")


def test_multi_partial_credit():
    """Multi-choice: student picks 1 correct out of 2 (no wrong) → partial points.

    Formula: 2 * max(0, (1 - 0) / 2) = 2 * 0.5 = 1
    """
    questions = [_q_multi("q1", points=2)]
    answers = [_ans("q1", ["a"])]  # 1 correct, 0 wrong
    score, max_score = score_attempt(questions, answers)
    assert score == Decimal("1")
    assert max_score == Decimal("2")


def test_multi_penalise_wrong():
    """Multi-choice: 1 correct + 1 wrong → penalty cancels the credit → score == 0.

    Formula: 2 * max(0, (1 - 1) / 2) = 2 * max(0, 0) = 0
    """
    questions = [_q_multi("q1", points=2)]
    answers = [_ans("q1", ["a", "c"])]  # 1 correct (a), 1 wrong (c)
    score, max_score = score_attempt(questions, answers)
    assert score == Decimal("0")
    assert max_score == Decimal("2")


def test_multi_all_wrong_zero():
    """Multi-choice: student picks only wrong choices → score == 0 (not negative).

    Formula: 2 * max(0, (0 - 2) / 2) = 2 * max(0, -1) = 0
    """
    questions = [_q_multi("q1", points=2)]
    answers = [_ans("q1", ["c", "d"])]  # both wrong
    score, max_score = score_attempt(questions, answers)
    assert score == Decimal("0")
    assert max_score == Decimal("2")


# ---------------------------------------------------------------------------
# Open-question tests
# ---------------------------------------------------------------------------

def test_open_question_scores_zero():
    """Open question: text answer → auto-score == 0, max_score == question points."""
    questions = [_q_open("q1", points=3)]
    answers = [_ans("q1", [], text="Water evaporates then precipitates.")]
    score, max_score = score_attempt(questions, answers)
    assert score == Decimal("0")
    assert max_score == Decimal("3")


def test_open_question_empty_text_scores_zero():
    """Open question with empty text answer → still scores 0."""
    questions = [_q_open("q1", points=5)]
    answers = [_ans("q1", [], text="")]
    score, max_score = score_attempt(questions, answers)
    assert score == Decimal("0")
    assert max_score == Decimal("5")


# ---------------------------------------------------------------------------
# Missing / no-answer tests
# ---------------------------------------------------------------------------

def test_no_answer_for_question_scores_zero():
    """Question in activity with no matching answer in the submission → 0 points."""
    questions = [_q_single("q1", points=1)]
    answers = []  # student answered nothing
    score, max_score = score_attempt(questions, answers)
    assert score == Decimal("0")
    assert max_score == Decimal("1")


def test_extra_answer_for_unknown_question_ignored():
    """Answer referencing a question_id not in the activity is silently ignored."""
    questions = [_q_single("q1", points=1)]
    answers = [
        _ans("q1", ["a"]),          # correct
        _ans("q_ghost", ["x"]),     # unknown question, should be ignored
    ]
    score, max_score = score_attempt(questions, answers)
    assert score == Decimal("1")
    assert max_score == Decimal("1")


# ---------------------------------------------------------------------------
# max_score accumulation
# ---------------------------------------------------------------------------

def test_max_score_sums_all_questions():
    """max_score must equal the sum of all question points regardless of question type."""
    questions = [
        _q_single("q1", points=1),
        _q_multi("q2",  points=2),
        _q_open("q3",   points=3),
    ]
    answers = []  # no answers needed to verify max_score
    _, max_score = score_attempt(questions, answers)
    assert max_score == Decimal("6")


def test_max_score_multi_single_questions():
    """max_score with three single questions of different weights."""
    questions = [
        _q_single("q1", points=1),
        _q_single("q2", points=2),
        _q_single("q3", points=3),
    ]
    answers = []
    _, max_score = score_attempt(questions, answers)
    assert max_score == Decimal("6")


# ---------------------------------------------------------------------------
# Aggregate scoring
# ---------------------------------------------------------------------------

def test_score_sum_across_multiple_questions():
    """Score accumulates correctly across multiple questions of mixed types."""
    questions = [
        _q_single("q1", points=1),  # will be answered correctly → 1 pt
        _q_single("q2", points=2),  # will be answered wrongly → 0 pts
        _q_multi("q3",  points=4),  # both correct selected → 4 pts
        _q_open("q4",   points=3),  # open → 0 pts
    ]
    answers = [
        _ans("q1", ["a"]),       # correct
        _ans("q2", ["b"]),       # wrong (correct is 'a')
        _ans("q3", ["a", "b"]),  # both correct
        _ans("q4", [], text="Any text"),
    ]
    score, max_score = score_attempt(questions, answers)
    # Expected: 1 + 0 + 4 + 0 = 5
    assert score == Decimal("5")
    assert max_score == Decimal("10")


def test_all_correct_single_questions():
    """Three single-choice questions all answered correctly → score == max_score."""
    questions = [
        _q_single("q1", points=1),
        _q_single("q2", points=2),
        _q_single("q3", points=3),
    ]
    answers = [
        _ans("q1", ["a"]),
        _ans("q2", ["a"]),
        _ans("q3", ["a"]),
    ]
    score, max_score = score_attempt(questions, answers)
    assert score == max_score
    assert score == Decimal("6")


def test_score_is_not_negative():
    """Score is always >= 0, even with heavy penalty from multi-choice wrong answers."""
    questions = [_q_multi("q1", points=2)]
    # Pick all 4 choices: 2 correct, 2 wrong → net = max(0, (2 - 2) / 2) = 0
    answers = [_ans("q1", ["a", "b", "c", "d"])]
    score, _ = score_attempt(questions, answers)
    assert score >= Decimal("0")


# ---------------------------------------------------------------------------
# Return type assertion
# ---------------------------------------------------------------------------

def test_returns_decimals():
    """score_attempt must return a tuple of two Decimal values."""
    questions = [_q_single("q1", points=1)]
    answers = [_ans("q1", ["a"])]
    score, max_score = score_attempt(questions, answers)
    assert isinstance(score, Decimal), f"score must be Decimal, got {type(score)}"
    assert isinstance(max_score, Decimal), f"max_score must be Decimal, got {type(max_score)}"
