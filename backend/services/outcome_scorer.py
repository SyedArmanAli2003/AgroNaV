# What it does: calculates outcome score 0-100 from visit result
# Input: result string, order_value int, rejection_reason string
# Output: int between 0 and 100
# Called by: routers/visits.py

def calculate_outcome_score(result, order_value=0,
                            rejection_reason=None):
    score = 0
    if result in ["sale", "order"]: score += 30
    if result == "sale":            score += 50
    if order_value > 0:
        score += min(int(order_value / 1000), 20)
    if rejection_reason == "wrong_timing":   score -= 20
    if rejection_reason == "not_interested": score -= 25
    return max(0, min(score, 100))
