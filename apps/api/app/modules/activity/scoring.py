from decimal import Decimal


def score_attempt(questions: list[dict], answers: list[dict]) -> tuple[Decimal, Decimal]:
    """
    Returns (score, max_score). Runs server-side only.

    questions: list of question dicts from Activity.questions JSONB
    answers: list of answer dicts [{question_id, choice_ids, text}]

    Scoring rules:
    - Build answer map: {question_id: answer}
    - For each question:
        - max_score += question['points'] (default 1)
        - If type == 'open': skip (0 points, needs manual grading)
        - If type == 'single':
            correct_ids = [c['id'] for c in q['choices'] if c['is_correct']]
            given = answer.get('choice_ids', [])
            if len(given) == 1 and given[0] == correct_ids[0]: score += points
        - If type == 'multi':
            correct_ids = set(c['id'] for c in q['choices'] if c['is_correct'])
            given = set(answer.get('choice_ids', []))
            # partial: points * (correct_selected - incorrect_selected) / total_correct
            # floor at 0 (no negative)
            correct_selected = len(given & correct_ids)
            incorrect_selected = len(given - correct_ids)
            total_correct = len(correct_ids)
            if total_correct > 0:
                raw = (correct_selected - incorrect_selected) / total_correct
                score += Decimal(str(max(0, raw))) * points
    """
    # Build answer map keyed by question_id
    answer_map: dict[str, dict] = {a["question_id"]: a for a in answers}

    total_score = Decimal("0")
    total_max = Decimal("0")

    for q in questions:
        q_id = q.get("id", "")
        points = Decimal(str(q.get("points", 1)))
        q_type = q.get("type", "single")
        total_max += points

        if q_type == "open":
            # Open questions require manual grading — 0 auto points
            continue

        answer = answer_map.get(q_id, {})

        if q_type == "single":
            correct_ids = [c["id"] for c in q.get("choices", []) if c.get("is_correct")]
            given = answer.get("choice_ids", [])
            if correct_ids and len(given) == 1 and given[0] == correct_ids[0]:
                total_score += points

        elif q_type == "multi":
            correct_ids = {c["id"] for c in q.get("choices", []) if c.get("is_correct")}
            given = set(answer.get("choice_ids", []))
            total_correct = len(correct_ids)
            if total_correct > 0:
                correct_selected = len(given & correct_ids)
                incorrect_selected = len(given - correct_ids)
                raw = (correct_selected - incorrect_selected) / total_correct
                total_score += Decimal(str(max(0, raw))) * points

    return total_score, total_max
