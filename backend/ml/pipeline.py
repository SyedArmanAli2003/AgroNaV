# ─────────────────────────────────────────────────────
# AI/ML TEAM — TRAINING PIPELINE
# Run this file to train and save the model:
#   python ml/pipeline.py
#
# WHAT THIS DOES:
# 1. Load visit_logs from agronav.db
# 2. Join with outlets to get features
# 3. Train XGBoost or RandomForest classifier
# 4. Save model to ml/model.pkl
# 5. Print accuracy metrics
#
# The app loads ml/model.pkl automatically on startup.
# Retrain anytime — just run this file again.
# ─────────────────────────────────────────────────────


def train():
    """Train ML model on visit_logs data.

    # What it does: Trains a classifier on historical visit outcomes
    # Input: visit_logs + outlets from agronav.db
    # Output: Saved model at ml/model.pkl
    # Called by: Run directly: python ml/pipeline.py
    """
    # TODO: implement training pipeline
    pass


if __name__ == "__main__":
    train()
