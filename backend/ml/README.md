# AgroNav — ML Team Guide

## Your folder: `backend/ml/`

You work **ONLY** in this folder.
Do **NOT** touch anything outside `ml/`.

---

## How your code connects to the app

The app calls your functions from:
- `services/scoring.py` → calls `ml/ranking.py`
- `services/anomaly.py` → calls `ml/outliers.py`

If your functions return `None` or raise an error,
the app automatically uses fallback logic.
So build at your own pace — **the app always runs**.

---

## `ranking.py` — what you must build

**Input:** list of outlet dicts (see schema below)
**Output:** same list, each dict now has `"score"` (int 0-100)

Your model should use these features:
- `has_pest_alert` (0 or 1)
- `stock_days_remaining` (int)
- `days_since_last_visit` (int, calculate from `last_visit_date`)
- `sales_spike` (0 or 1)
- `crop_stage` (string or None)

Train on `visit_logs` table outcomes:
- `outcome = "sale"` or `"order"` → label **1**
- `outcome = "none"` → label **0**

**Suggested model:** XGBoost or RandomForestClassifier (scikit-learn)
Add SHAP for explainability — convert shap values to English reasons.

---

## `pipeline.py` — training pipeline

Run this file to retrain the model on new `visit_logs` data:

```bash
python ml/pipeline.py
```

- Save trained model as `ml/model.pkl` using joblib
- `ranking.py` loads `model.pkl` on startup

---

## `outliers.py` — what you must build

**Input:** dict with territory sales data
**Output:** list of alert dicts `[{type, message, severity}]`

Detect:
1. **Sales velocity spike** (this week vs 4-week rolling mean + 2*std)
2. **Sudden drop** in a retailer's orders
3. Any other anomaly you detect in the dataset

---

## Outlet dict format your functions receive:

```json
{
  "id": 1,
  "name": "Raju Agro Stores",
  "type": "retailer",
  "district": "Nalgonda",
  "stock_days_remaining": 2,
  "has_pest_alert": 1,
  "sales_spike": 0,
  "last_visit_date": "2026-05-04",
  "crop_stage": null
}
```

---

## Alert dict format your functions must return:

```json
{
  "type": "sales_spike",
  "outlet_id": 3,
  "message": "Lakshmi Farm Supplies — sales up 40% vs average",
  "severity": "medium"
}
```

---

## Quick start

1. Read this README fully
2. Look at `services/scoring.py` and `services/anomaly.py` to see how your code is called
3. Start with `ranking.py` — implement `score_outlets()`
4. Then build `pipeline.py` to train a real model
5. Finally implement `outliers.py` — `detect_anomalies()`
6. Test by running the app: `uvicorn main:app --reload`
