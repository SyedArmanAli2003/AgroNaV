# What it does: TreeSHAP explainer for CatBoost — produces plain-language reasons
# Input: Single-row 28-col DataFrame
# Output: List of 3 human-readable reason strings
# Called by: routers/recommendations.py

import shap
import numpy as np
from .inference import get_model
import pandas as pd

_explainer = None


def get_explainer():
    """Singleton pattern: create TreeExplainer once, reuse."""
    global _explainer
    if _explainer is None:
        _explainer = shap.TreeExplainer(get_model())
        print("[shap] TreeExplainer initialized")
    return _explainer


def get_top3_reasons(features_df: pd.DataFrame) -> list:
    """
    Returns top 3 plain-language reasons for the first row of features_df.
    Template mappings sourced from reports/shap_top10.md.
    """
    explainer = get_explainer()
    shap_values = explainer.shap_values(features_df)

    # shap_values may be (n_rows, n_features) for binary classifier
    if isinstance(shap_values, list):
        # For multi-output, take class 1
        row_shap = shap_values[1][0] if len(shap_values) > 1 else shap_values[0][0]
    elif shap_values.ndim == 2:
        row_shap = shap_values[0]
    else:
        row_shap = shap_values

    feature_names = features_df.columns.tolist()
    feature_values = features_df.iloc[0].to_dict()

    # Sort by absolute SHAP value descending, take top 3
    top_indices = sorted(range(len(row_shap)),
                         key=lambda i: abs(row_shap[i]),
                         reverse=True)[:3]

    return [_template(feature_names[i], feature_values.get(feature_names[i]),
                      row_shap[i]) for i in top_indices]


def _template(feature: str, value, shap_val: float) -> str:
    """
    Plain-language reason templates from reports/shap_top10.md.
    Maps feature name + value + SHAP direction to human-readable text.
    """
    pos = shap_val > 0

    if feature == "is_out_of_stock" and value == 1:
        return "Shop is currently out of stock"

    if feature == "days_since_last_visit":
        return (f"No visit in {int(value)} days"
                if pos else f"Recently visited ({int(value)} days ago)")

    if feature == "stock_to_velocity_weeks":
        w = round(float(value), 1)
        return (f"Critically low stock — only {w} weeks remaining"
                if pos else f"Stock well-stocked ({w} weeks)")

    if feature == "terr_prod_conv_rate":
        return ("High conversion rate for this product in territory"
                if pos else "Low conversion rate in territory")

    if feature == "days_since_last_sale_terr":
        return (f"No territory sale in {int(value)} days — prime opportunity"
                if pos else "Territory sales active recently")

    if feature == "is_critical_period" and value == 1:
        return "Critical crop season — peak demand window"

    if feature == "is_harvest_approaching" and value == 1:
        return "Harvest approaching — crop protection urgency"

    if feature == "is_first_visit_for_product" and value == 1:
        return "First time pitching this product here — introduction opportunity"

    if feature == "sales_velocity":
        return ("Strong sales momentum in this territory"
                if pos else "Sales velocity has dropped — needs attention")

    if feature == "visit_count_last_30days":
        return ("Outlet under-visited this month"
                if pos else "Outlet recently over-visited")

    if feature == "product_sold_last_14d" and value == 1:
        return "Product sold here in last 2 weeks — reorder window"

    if feature == "sku_qty_pre_visit":
        return ("Low inventory levels detected"
                if pos else "Current stock levels are healthy")

    if feature == "rolling_avg_weekly_sales":
        return ("Above-average weekly sales trend"
                if pos else "Below-average weekly sales trend")

    if feature == "days_since_product_last_pushed":
        return (f"Product not pushed in {int(value)} days"
                if pos else "Product recently promoted here")

    if feature == "stock_change_wow":
        return ("Inventory declining week-over-week"
                if pos else "Inventory stable or increasing")

    if feature == "week_of_season":
        return ("Critical period in the crop season"
                if pos else "Off-peak season window")

    return f"{feature.replace('_', ' ').title()} signal active"
