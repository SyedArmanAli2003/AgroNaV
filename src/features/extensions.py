"""Leak-safe FE-extension features. All vectorized; no iterrows.

Three features lift CatBoost AUC 0.7618 -> 0.7820 in the prior manual run.
"""

import numpy as np
import pandas as pd

from ..config import GLOBAL_POS_RATE


_STOCK_TO_VELOCITY_CAP = 500.0
_VELOCITY_FLOOR = 0.1
_NO_PRIOR_SALE_SENTINEL = 999


def add_stock_to_velocity_weeks(df: pd.DataFrame) -> pd.DataFrame:
    """Weeks of inventory remaining at current sell rate (urgency signal).

    sku_qty_pre_visit / (sales_velocity * 7) clipped at lower 0.1 to avoid
    div-by-zero blow-up, capped at 500 to keep tails sane.
    """
    df = df.copy()
    denom = (df["sales_velocity"] * 7).clip(lower=_VELOCITY_FLOOR)
    df["stock_to_velocity_weeks"] = (df["sku_qty_pre_visit"] / denom).clip(
        upper=_STOCK_TO_VELOCITY_CAP
    )
    return df


def add_days_since_last_sale_terr(
    df: pd.DataFrame,
    retailer_pos: pd.DataFrame,
    retailers: pd.DataFrame,
) -> pd.DataFrame:
    """Days since last POS sale of (territory, product) before visit_date.

    Bridge POS -> retailers to attach territory_id, then merge_asof backward
    against (territory_id, product, visit_date). allow_exact_matches=False
    enforces strict pre-visit-only. Sentinel 999 if no prior sale.
    """
    df = df.copy()

    pos = retailer_pos[["retailer_id", "sku_name", "transaction_date"]].copy()
    pos["transaction_date"] = pd.to_datetime(pos["transaction_date"])
    pos = pos.rename(columns={"sku_name": "product_recommended"})

    bridged = pos.merge(
        retailers[["retailer_id", "territory_id"]], on="retailer_id", how="inner"
    )
    last_sale = (
        bridged.groupby(["territory_id", "product_recommended", "transaction_date"])
        .size()
        .reset_index(name="_n")
        .drop(columns="_n")
        .sort_values("transaction_date")
        .reset_index(drop=True)
    )

    left = (
        df[["territory_id", "product_recommended", "visit_date"]]
        .reset_index()
        .rename(columns={"index": "_row_id"})
    )
    left["visit_date"] = pd.to_datetime(left["visit_date"])
    left_s = left.sort_values("visit_date").reset_index(drop=True)

    merged = pd.merge_asof(
        left_s,
        last_sale,
        left_on="visit_date",
        right_on="transaction_date",
        by=["territory_id", "product_recommended"],
        direction="backward",
        allow_exact_matches=False,
    )
    merged["days_since_last_sale_terr"] = (
        (merged["visit_date"] - merged["transaction_date"]).dt.days
    )
    merged["days_since_last_sale_terr"] = (
        merged["days_since_last_sale_terr"].fillna(_NO_PRIOR_SALE_SENTINEL).astype(int)
    )

    out = merged.set_index("_row_id")["days_since_last_sale_terr"].sort_index()
    df["days_since_last_sale_terr"] = out.values
    return df


def add_terr_prod_conv_rate(df: pd.DataFrame) -> pd.DataFrame:
    """Expanding mean of sale_within_7d per (territory_id, product_recommended).

    Sorted by visit_date with row-index tiebreak for determinism; shift(1)
    so only strictly-prior observations contribute. NaN (first occurrence in
    a group) filled with GLOBAL_POS_RATE.
    """
    df = df.copy()
    df = df.reset_index().rename(columns={"index": "_row_id"})

    s = df.sort_values(
        ["territory_id", "product_recommended", "visit_date", "_row_id"],
        kind="stable",
    )
    grouped = s.groupby(["territory_id", "product_recommended"])["sale_within_7d"]
    conv = grouped.apply(lambda x: x.shift(1).expanding().mean())
    conv = conv.reset_index(level=[0, 1], drop=True)
    s["terr_prod_conv_rate"] = conv.fillna(GLOBAL_POS_RATE)

    df = df.merge(s[["_row_id", "terr_prod_conv_rate"]], on="_row_id", how="left")
    df = df.drop(columns="_row_id")
    return df
