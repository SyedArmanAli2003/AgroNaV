"""Per-family preprocessors. Built per-family because LR/NB/KNN need
log1p+scale+impute, tree models do not, and CatBoost handles cats natively
and bypasses the ColumnTransformer entirely.
"""

from typing import Literal, Optional

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import (
    FunctionTransformer,
    OneHotEncoder,
    OrdinalEncoder,
    StandardScaler,
)

from ..config import (
    BOOL_COLS,
    CAT_HIGHCARD,
    CAT_LOWCARD,
    COLLINEAR_DROP_FOR_LR,
    FE_EXT_COLS,
    NUM_COLS,
    SENTINEL_NEG1,
    SKEWED_LOG1P,
)


def _resolve_lr_nb_knn_groups(drop_collinear: bool) -> dict:
    sentinel_and_skewed = sorted(set(SENTINEL_NEG1) & set(SKEWED_LOG1P))
    sentinel_only = sorted(set(SENTINEL_NEG1) - set(SKEWED_LOG1P))
    skewed_only = sorted(set(SKEWED_LOG1P) - set(SENTINEL_NEG1))

    remaining_num = [
        c for c in NUM_COLS if c not in set(SENTINEL_NEG1) | set(SKEWED_LOG1P)
    ]
    remaining_num_with_ext = remaining_num + list(FE_EXT_COLS)

    if drop_collinear:
        skewed_only = [c for c in skewed_only if c != COLLINEAR_DROP_FOR_LR]
        remaining_num_with_ext = [
            c for c in remaining_num_with_ext if c != COLLINEAR_DROP_FOR_LR
        ]

    return {
        "sentinel_and_skewed": sentinel_and_skewed,
        "sentinel_only": sentinel_only,
        "skewed_only": skewed_only,
        "remaining_num": remaining_num_with_ext,
    }


def _make_lr_nb_knn_preprocessor(drop_collinear: bool) -> ColumnTransformer:
    g = _resolve_lr_nb_knn_groups(drop_collinear=drop_collinear)

    sentinel_skew_log1p = Pipeline(
        steps=[
            ("impute", SimpleImputer(missing_values=-1, strategy="median", add_indicator=True)),
            ("log1p", FunctionTransformer(np.log1p, feature_names_out="one-to-one")),
            ("scale", StandardScaler()),
        ]
    )
    sentinel_only_scale = Pipeline(
        steps=[
            ("impute", SimpleImputer(missing_values=-1, strategy="median", add_indicator=True)),
            ("scale", StandardScaler()),
        ]
    )
    skew_only = Pipeline(
        steps=[
            ("log1p", FunctionTransformer(np.log1p, feature_names_out="one-to-one")),
            ("scale", StandardScaler()),
        ]
    )

    transformers = []
    if g["sentinel_and_skewed"]:
        transformers.append(("sentinel_skew", sentinel_skew_log1p, g["sentinel_and_skewed"]))
    if g["sentinel_only"]:
        transformers.append(("sentinel_only", sentinel_only_scale, g["sentinel_only"]))
    if g["skewed_only"]:
        transformers.append(("skew_only", skew_only, g["skewed_only"]))
    if g["remaining_num"]:
        transformers.append(("num_scale", StandardScaler(), g["remaining_num"]))
    if BOOL_COLS:
        transformers.append(("bool_pass", "passthrough", list(BOOL_COLS)))
    transformers.append(
        (
            "cat_ohe",
            OneHotEncoder(handle_unknown="ignore", sparse_output=False),
            list(CAT_LOWCARD),
        )
    )

    ct = ColumnTransformer(transformers=transformers, remainder="drop", verbose_feature_names_out=False)
    ct.set_output(transform="pandas")
    return ct


def _make_lgbm_xgb_preprocessor() -> tuple[ColumnTransformer, list[str]]:
    cat_cols = list(CAT_LOWCARD) + list(CAT_HIGHCARD)
    num_pass = list(NUM_COLS) + list(BOOL_COLS) + list(FE_EXT_COLS)

    transformers = [
        ("num_pass", "passthrough", num_pass),
        (
            "cat_ord",
            OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1, dtype=np.int32),
            cat_cols,
        ),
    ]
    ct = ColumnTransformer(transformers=transformers, remainder="drop", verbose_feature_names_out=False)
    ct.set_output(transform="pandas")
    return ct, cat_cols


def make_preprocessor(
    family: Literal["lr_nb_knn", "lgbm_xgb", "catboost"],
    drop_collinear: bool = True,
) -> tuple[Optional[ColumnTransformer], Optional[list[str]]]:
    """Return (preprocessor, cat_cols).

    - lr_nb_knn  -> (ColumnTransformer, None). drop_collinear removes
                    rolling_avg_weekly_sales (r=0.978 with sales_velocity).
                    Default True; NB/KNN both also benefit from dropping
                    a near-duplicate column.
    - lgbm_xgb   -> (ColumnTransformer, cat_col_names). Caller passes
                    cat_col_names to LightGBM via fit kwarg, and to a
                    cast-to-category wrapper for XGBoost.
    - catboost   -> (None, cat_col_names). Caller bypasses the
                    ColumnTransformer entirely.
    """
    if family == "lr_nb_knn":
        return _make_lr_nb_knn_preprocessor(drop_collinear=drop_collinear), None
    if family == "lgbm_xgb":
        return _make_lgbm_xgb_preprocessor()
    if family == "catboost":
        return None, list(CAT_LOWCARD) + list(CAT_HIGHCARD)
    raise ValueError(f"unknown family: {family}")


def cast_cols_to_category(X: pd.DataFrame, cat_cols: list[str]) -> pd.DataFrame:
    """Cast specified columns to pandas Categorical. Used in front of
    XGBClassifier(enable_categorical=True), which needs `category` dtype,
    not the int32 produced by OrdinalEncoder.
    """
    return X.astype({c: "category" for c in cat_cols if c in X.columns})
