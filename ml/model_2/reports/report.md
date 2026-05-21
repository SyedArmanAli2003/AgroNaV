# Retailer Priority Modeling Report

## 1. Project Objective

The goal of this project is to build a retailer prioritization system for field sales teams.

The pipeline identifies which retailers should be prioritized for visits and recommends a focus SKU for each retailer. The output is designed to support field agents with structured next-best-action payloads.

The final system combines:

- A supervised XGBoost ranking model for retailer priority scoring
- An Isolation Forest anomaly model for localized retailer-SKU demand spike detection
- Rule-based business logic for priority tiering, focus SKU selection, and next-best-action generation

## 2. Data Sources Used

| Dataset | Purpose |
|---|---|
| `retailers` | Retailer master data with geography and territory mapping |
| `retailer_pos` | Retailer transaction history and SKU sales |
| `retailer_inventory_weekly` | Weekly inventory and stockout signals |
| `retailer_visit_log` | Field visit history by territory and tehsil |
| `growers` | Grower demographics and farm activity |
| `whatsapp_campaign` | Digital engagement signals from grower campaigns |

## 3. Feature Engineering Summary

The final feature store is created at the retailer level.

### 3.1 Sales Features

- `total_retailer_revenue`
- `total_units_sold`
- `total_transactions`
- `unique_skus_sold`
- `avg_order_value`
- `avg_weekly_sales_qty`
- `recent_30d_revenue`
- `recent_30d_units`
- `previous_30d_revenue`
- `previous_30d_units`
- `days_since_last_purchase`
- `sales_trend_30d`

These features capture retailer purchasing strength, sales velocity, and recent momentum.

### 3.2 Inventory Features

- `avg_inventory_qty`
- `min_inventory_qty`
- `stockout_rate`
- `stockout_events`
- `unique_inventory_skus`

These features capture stock availability and possible replenishment opportunities.

### 3.3 Visit Features

- `total_historical_visits`
- `unique_reps_visited`
- `days_since_last_visit`

Important note: the visit log does not contain `retailer_id`, so visit signals are mapped at the `territory_id + tehsil` level. This is a limitation of the available data.

### 3.4 Grower And Market Features

- `regional_grower_engagement`
- `regional_message_volume`
- `avg_farm_size`
- `total_scans`
- `grower_count`

These features capture local grower demand and digital engagement around the retailer's geography.

## 4. Model 1: Retailer Priority Ranking Model

### 4.1 Model Type

The main ranking model is an XGBoost Classifier wrapped inside a scikit-learn `Pipeline` with preprocessing.

Pipeline structure:

```text
Raw retailer features
        ↓
ColumnTransformer
        ↓
Numeric imputation
        ↓
Categorical one-hot encoding
        ↓
XGBoost Classifier
        ↓
Priority probability
```

### 4.2 Target Definition

The final model uses a leakage-safe future-looking target.

The target is defined as:

```text
priority_target = 1 if retailer revenue in the next 30 days is in the top 30%
priority_target = 0 otherwise
```

The cutoff date used was:

```text
Modeling cutoff date: 2026-02-27
Future target window end: 2026-03-29
```

Only data available on or before the cutoff date is used for features. Revenue after the cutoff date is used only for target creation.

## 5. Preprocessing

Numeric columns are imputed using median imputation:

```python
SimpleImputer(strategy="median")
```

Geographic categorical columns are one-hot encoded:

- `state`
- `district`
- `tehsil`

```python
OneHotEncoder(handle_unknown="ignore")
```

This is better than label encoding because geography categories do not have natural numeric order.

## 6. Model Training Setup

The final XGBoost parameters are:

```python
xgb_params = {
    "n_estimators": 250,
    "max_depth": 4,
    "learning_rate": 0.04,
    "subsample": 0.85,
    "colsample_bytree": 0.85,
    "min_child_weight": 5,
    "reg_lambda": 2.0,
    "objective": "binary:logistic",
    "eval_metric": "logloss",
    "random_state": 42,
}
```

Cross-validation method:

```text
5-fold Stratified Cross-Validation
```

## 7. Model Evaluation Results

### 7.1 Classification Metrics

Final leakage-safe cross-validation results:

| Metric | Mean Score | Std Dev |
|---|---:|---:|
| ROC-AUC | 0.6927 | 0.0221 |
| PR-AUC | 0.4732 | 0.0251 |
| Accuracy | 0.7115 | 0.0103 |

Positive class rate:

```text
30.00%
```

### 7.2 Interpretation

Accuracy is around `71.15%`, but this should not be the only metric used.

Because the positive class rate is `30%`, a simple model that predicts all retailers as non-priority would already achieve around `70%` accuracy.

Therefore, ROC-AUC, PR-AUC, and top-k ranking performance are more useful for this business problem.

The model's ROC-AUC of `0.6927` indicates that it has moderate ability to separate high-priority retailers from lower-priority retailers.

The PR-AUC of `0.4732` is better than the baseline positive rate of `0.30`, showing that the model is useful for prioritization.

## 8. Top-K Ranking Performance

Since the business use case is field visit prioritization, top-k metrics are especially important.

| Top Percentage | Avg Precision At Top | Avg Recall At Top | Avg Top N |
|---:|---:|---:|---:|
| 5% | 0.5450 | 0.0908 | 40 |
| 10% | 0.5350 | 0.1783 | 80 |
| 20% | 0.5138 | 0.3425 | 160 |

The baseline positive rate is `30%`, so random retailer selection would produce approximately `30%` precision.

The model achieves:

```text
Top 5% precision: 54.5%
Top 10% precision: 53.5%
Top 20% precision: 51.38%
```

Recommended operating range:

```text
Top 10% of retailers
```

This provides a useful balance between precision and coverage.

## 9. Model 2: Demand Spike Detection Model

### 9.1 Model Type

The demand spike model uses Isolation Forest, an unsupervised anomaly detection model.

### 9.2 Purpose

The model identifies unusual retailer-SKU demand patterns.

It helps answer:

```text
Which SKU should the field agent focus on for a given retailer?
```

### 9.3 Input Features

| Feature | Description |
|---|---|
| `total_volume_sold` | Total historical units sold for retailer-SKU pair |
| `avg_unit_price` | Average SKU selling price for retailer-SKU pair |

Before training, these features are scaled using `StandardScaler`.

### 9.4 Model Configuration

```python
IsolationForest(
    contamination=0.05,
    random_state=42
)
```

The contamination value of `0.05` means the model flags approximately 5% of retailer-SKU pairs as anomalous.

### 9.5 Output Columns

The demand anomaly output includes:

- `retailer_id`
- `sku_id`
- `total_volume_sold`
- `avg_unit_price`
- `anomaly_score`
- `is_demand_spike`

Where:

```text
is_demand_spike = 1 means the retailer-SKU pair is anomalous
is_demand_spike = 0 means normal
```

## 10. Focus SKU Selection Logic

The final payload does not rely only on anomaly detection.

The focus SKU is selected using fallback logic:

1. If the retailer has a detected demand spike, use the strongest anomalous SKU.
2. If not, use the retailer's top-selling SKU.
3. If the retailer has no sales history, use the top-selling SKU in the same tehsil.
4. If tehsil-level sales are unavailable, use the network-wide top-selling SKU.
5. If no SKU data exists, return `"N/A"`.

This improved the output because earlier payloads returned `focus_sku: "N/A"` for all top retailers.

## 11. Final Recommendation Payload

Example API-style payload:

```json
{
  "retailer_id": "RTL_03973",
  "tehsil": "Hisar_T146",
  "priority_score": 82,
  "priority_tier": "Critical",
  "priority_probability": 0.8156,
  "justification_triggers": [
    "Retailer has not been visited for 37 days.",
    "Top-selling SKU for this retailer."
  ],
  "next_best_action": {
    "recommended_strategy": "Schedule Recovery Visit With SKU Replenishment Pitch",
    "focus_sku": "SY_AXI_50EC"
  }
}
```

### Payload Fields

| Field | Meaning |
|---|---|
| `retailer_id` | Unique retailer identifier |
| `tehsil` | Retailer location |
| `priority_score` | Probability scaled from 0 to 100 |
| `priority_tier` | Operational priority label |
| `priority_probability` | Raw model probability |
| `justification_triggers` | Explainable business reasons |
| `recommended_strategy` | Rule-based next-best action |
| `focus_sku` | Recommended SKU for the field visit |

## 12. Priority Tier Logic

| Score Range | Tier |
|---:|---|
| 80-100 | Critical |
| 60-79 | High |
| 40-59 | Medium |
| 0-39 | Low |

This makes the model easier for sales teams to interpret.

## 13. Production Artifacts Saved

| Artifact | Purpose |
|---|---|
| `ranking_model.joblib` | Trained XGBoost pipeline |
| `model_schema.json` | Model input columns and schema |
| `metadata.json` | Training metadata and package versions |
| `cv_results.csv` | Cross-validation metrics |
| `topk_results.csv` | Top-k ranking evaluation |
| `features_snapshot.csv` | Latest retailer feature snapshot |
| `demand_anomalies.csv` | Retailer-SKU anomaly output |
| `anomaly_detector.joblib` | Trained Isolation Forest model |
| `anomaly_scaler.joblib` | Scaler used for anomaly features |
| `anomaly_schema.json` | Anomaly model feature list |
| `retailer_top_sku.csv` | Retailer-level SKU fallback lookup |
| `tehsil_top_sku.csv` | Tehsil-level SKU fallback lookup |
| `network_top_sku.csv` | Network-level SKU fallback lookup |
| `sample_api_response.json` | Example API output |
| `requirements.txt` | Python package requirements |

## 14. Strengths Of The Final Pipeline

- It avoids target leakage.
- It uses a future-looking revenue target.
- It evaluates ranking quality, not only classification accuracy.
- It uses one-hot encoding for categorical geography.
- It includes SKU recommendation fallback logic.
- It saves production-ready model artifacts.
- It separates ML scoring from possible future LLM enrichment.

## 15. Limitations

### 15.1 Visit Data Limitation

The visit log does not include `retailer_id`.

As a result, visit features are estimated at:

```text
territory_id + tehsil
```

rather than exact retailer level.

### 15.2 Moderate Model Performance

The model is useful for ranking but not perfect.

Current ROC-AUC:

```text
0.6927
```

This suggests moderate predictive power.

### 15.3 Proxy Target

The current target is based on future 30-day revenue. This is reasonable, but the best production target would depend on the real business objective, such as:

- successful visit conversion
- future replenishment need
- stockout risk
- revenue uplift after rep action
- campaign response
- SKU adoption

### 15.4 Rule-Based Recommendation Text

The `recommended_strategy` is currently rule-based. This is reliable, but sometimes generic.

A future backend LLM enrichment layer could generate more personalized field-agent messages using the structured ML output.

## 16. Recommended Production Architecture

Recommended architecture:

```text
Raw data
  ↓
Feature engineering job
  ↓
Ranking model
  ↓
Demand spike model
  ↓
Base recommendation JSON
  ↓
Optional backend LLM enrichment
  ↓
Final API response
```

The ML pipeline should remain deterministic.

The LLM should only enrich wording, talking points, and rep-facing messaging. It should not invent facts or change the priority score.

## 17. Recommended Next Steps

1. Build a FastAPI endpoint using the saved artifacts.
2. Add batch scoring support for all retailers.
3. Add single-retailer scoring support.
4. Add model monitoring for priority score drift.
5. Track actual rep outcomes to build a stronger future target.
6. Add LLM enrichment as a separate backend service.
7. Store model artifacts with version numbers.
8. Add automated tests for schema validation and scoring consistency.

## 18. Final Assessment

The final notebook has evolved from an exploratory ML demo into a production-ready prototype.

The model is not perfect, but it is now realistic, leakage-safe, and operationally useful. The strongest use case is ranking retailers for field visit prioritization, especially selecting the top 5-10% of retailers for action.

The current model should be treated as a decision-support system, not a fully automated decision-maker.
