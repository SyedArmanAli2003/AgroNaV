import os
import glob
import warnings

import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")

RANDOM_STATE = 42

DATA_DIR = "/kaggle/input/datasets/ehtesham855/sygenta"

REQUIRED_DATASETS = {
    "growers",
    "retailers",
    "retailer_pos",
    "retailer_inventory_weekly",
    "retailer_visit_log",
    "whatsapp_campaign",
}

def load_raw_datasets(data_dir, required_datasets=None):
    """Load CSV datasets from a directory and validate required files."""
    files = sorted(glob.glob(os.path.join(data_dir, "*.csv")))
    
    if not files:
        raise FileNotFoundError(f"No CSV files found in directory: {data_dir}")
    
    datasets = {}
    
    for file_path in files:
        dataset_name = os.path.splitext(os.path.basename(file_path))[0]
        datasets[dataset_name] = pd.read_csv(file_path)
        print(f"Loaded {dataset_name:<30} | Shape: {datasets[dataset_name].shape}")
    
    if required_datasets is not None:
        missing_datasets = sorted(set(required_datasets) - set(datasets))
        if missing_datasets:
            raise KeyError(f"Missing required datasets: {missing_datasets}")
    
    print(f"\nLoaded {len(datasets)} datasets successfully.")
    
    return datasets

raw_data = load_raw_datasets(
    data_dir=DATA_DIR,
    required_datasets=REQUIRED_DATASETS,
)




def run_diagnostic_eda(datasets, max_categories=10):
    """Print modeling-focused diagnostics for each dataset."""
    print("--- DATASET DIAGNOSTIC REPORT ---")
    
    for name, df in datasets.items():
        print(f"\nDataset Name: {name}")
        print(f"Shape: {df.shape}")
        print(f"Duplicate Rows: {df.duplicated().sum()}")
        
        print("\nColumns:")
        print(list(df.columns))
        
        print("\nData Types:")
        print(df.dtypes.to_string())
        
        missing_summary = pd.DataFrame({
            "missing_count": df.isnull().sum(),
            "missing_pct": (df.isnull().mean() * 100).round(2),
        })
        
        print("\nMissing Values:")
        print(missing_summary[missing_summary["missing_count"] > 0].to_string())
        
        if missing_summary["missing_count"].sum() == 0:
            print("No missing values detected.")
        
        numeric_cols = df.select_dtypes(include=["number"]).columns.tolist()
        if numeric_cols:
            print("\nNumeric Summary:")
            print(df[numeric_cols].describe().T.to_string())
        
        categorical_cols = df.select_dtypes(include=["object", "bool"]).columns.tolist()
        if categorical_cols:
            cardinality = df[categorical_cols].nunique().sort_values(ascending=False)
            print("\nCategorical Cardinality:")
            print(cardinality.head(max_categories).to_string())
        
        print("-" * 70)

run_diagnostic_eda(raw_data)




import numpy as np
import pandas as pd

def engineer_features(raw_data):
    """Create retailer-level modeling features from commercial, inventory, visit, and grower signals."""
    required_datasets = [
        "retailer_pos",
        "retailer_inventory_weekly",
        "retailer_visit_log",
        "growers",
        "whatsapp_campaign",
        "retailers",
    ]
    
    missing_datasets = [name for name in required_datasets if name not in raw_data]
    if missing_datasets:
        raise KeyError(f"Missing required datasets: {missing_datasets}")
    
    pos = raw_data["retailer_pos"].copy()
    inv = raw_data["retailer_inventory_weekly"].copy()
    visits = raw_data["retailer_visit_log"].copy()
    growers = raw_data["growers"].copy()
    whatsapp = raw_data["whatsapp_campaign"].copy()
    retailers = raw_data["retailers"].copy()
    
    pos["transaction_date"] = pd.to_datetime(pos["transaction_date"], errors="coerce")
    inv["week_end_date"] = pd.to_datetime(inv["week_end_date"], errors="coerce")
    visits["visit_date"] = pd.to_datetime(visits["visit_date"], errors="coerce")
    whatsapp["message_sent_date"] = pd.to_datetime(whatsapp["message_sent_date"], errors="coerce")
    
    max_pos_date = pos["transaction_date"].max()
    recent_start_date = max_pos_date - pd.Timedelta(days=30)
    previous_start_date = max_pos_date - pd.Timedelta(days=60)
    
    pos["revenue"] = pos["sku_qty"] * pos["sku_price"]
    pos["transaction_week"] = pos["transaction_date"].dt.to_period("W").astype(str)
    
    retailer_pos_features = (
        pos.groupby("retailer_id", as_index=False)
        .agg(
            total_retailer_revenue=("revenue", "sum"),
            total_units_sold=("sku_qty", "sum"),
            total_transactions=("transaction_id", "nunique"),
            unique_skus_sold=("sku_id", "nunique"),
            avg_order_value=("revenue", "mean"),
            last_purchase_date=("transaction_date", "max"),
        )
    )
    
    weekly_sales = (
        pos.groupby(["retailer_id", "transaction_week"], as_index=False)
        .agg(weekly_sales_qty=("sku_qty", "sum"))
    )
    
    avg_weekly_sales = (
        weekly_sales.groupby("retailer_id", as_index=False)
        .agg(avg_weekly_sales_qty=("weekly_sales_qty", "mean"))
    )
    
    recent_pos = pos[pos["transaction_date"] >= recent_start_date]
    previous_pos = pos[
        (pos["transaction_date"] >= previous_start_date)
        & (pos["transaction_date"] < recent_start_date)
    ]
    
    recent_sales = (
        recent_pos.groupby("retailer_id", as_index=False)
        .agg(recent_30d_revenue=("revenue", "sum"), recent_30d_units=("sku_qty", "sum"))
    )
    
    previous_sales = (
        previous_pos.groupby("retailer_id", as_index=False)
        .agg(previous_30d_revenue=("revenue", "sum"), previous_30d_units=("sku_qty", "sum"))
    )
    
    retailer_pos_features = retailer_pos_features.merge(avg_weekly_sales, on="retailer_id", how="left")
    retailer_pos_features = retailer_pos_features.merge(recent_sales, on="retailer_id", how="left")
    retailer_pos_features = retailer_pos_features.merge(previous_sales, on="retailer_id", how="left")
    
    retailer_pos_features["days_since_last_purchase"] = (
        max_pos_date - retailer_pos_features["last_purchase_date"]
    ).dt.days
    
    retailer_pos_features["sales_trend_30d"] = (
        (retailer_pos_features["recent_30d_revenue"].fillna(0) + 1)
        / (retailer_pos_features["previous_30d_revenue"].fillna(0) + 1)
    )
    
    retailer_pos_features = retailer_pos_features.drop(columns=["last_purchase_date"])
    
    inv["is_stockout"] = (inv["sku_qty"] == 0).astype(int)
    
    retailer_inv_features = (
        inv.groupby("retailer_id", as_index=False)
        .agg(
            avg_inventory_qty=("sku_qty", "mean"),
            min_inventory_qty=("sku_qty", "min"),
            stockout_rate=("is_stockout", "mean"),
            stockout_events=("is_stockout", "sum"),
            unique_inventory_skus=("sku_id", "nunique"),
        )
    )
    
    territory_visit_features = (
        visits.groupby(["territory_id", "visit_tehsil"], as_index=False)
        .agg(
            last_visit_date=("visit_date", "max"),
            total_historical_visits=("visit_date", "count"),
            unique_reps_visited=("rep_id", "nunique"),
        )
    )
    
    territory_visit_features["days_since_last_visit"] = (
        max_pos_date - territory_visit_features["last_visit_date"]
    ).dt.days
    
    retailer_visit_features = pd.merge(
        retailers[["retailer_id", "territory_id", "tehsil"]],
        territory_visit_features,
        left_on=["territory_id", "tehsil"],
        right_on=["territory_id", "visit_tehsil"],
        how="left",
    )[[
        "retailer_id",
        "total_historical_visits",
        "unique_reps_visited",
        "days_since_last_visit",
    ]]
    
    whatsapp["engagement_weight"] = (
        whatsapp["delivered_status"].astype(int) * 0.5
        + whatsapp["opened_status"].astype(int) * 1.5
        + whatsapp["clicked_status"].astype(int) * 3.0
    )
    
    grower_engagement = (
        whatsapp.groupby("grower_id", as_index=False)
        .agg(
            grower_engagement_score=("engagement_weight", "sum"),
            grower_messages_sent=("id", "count"),
        )
    )
    
    growers_master = growers.merge(grower_engagement, on="grower_id", how="left")
    growers_master["grower_engagement_score"] = growers_master["grower_engagement_score"].fillna(0)
    growers_master["grower_messages_sent"] = growers_master["grower_messages_sent"].fillna(0)
    
    tehsil_grower_signals = (
        growers_master.groupby(["state", "district", "tehsil"], as_index=False)
        .agg(
            regional_grower_engagement=("grower_engagement_score", "mean"),
            regional_message_volume=("grower_messages_sent", "sum"),
            avg_farm_size=("grower_farm_size", "mean"),
            total_scans=("product_scan", "sum"),
            grower_count=("grower_id", "nunique"),
        )
    )
    
    master_df = retailers.merge(retailer_pos_features, on="retailer_id", how="left")
    master_df = master_df.merge(retailer_inv_features, on="retailer_id", how="left")
    master_df = master_df.merge(retailer_visit_features, on="retailer_id", how="left")
    master_df = master_df.merge(
        tehsil_grower_signals,
        on=["state", "district", "tehsil"],
        how="left",
    )
    
    numeric_cols = master_df.select_dtypes(include=["number"]).columns
    master_df[numeric_cols] = master_df[numeric_cols].fillna(0)
    
    master_df["days_since_last_purchase"] = master_df["days_since_last_purchase"].replace(0, 999)
    master_df["days_since_last_visit"] = master_df["days_since_last_visit"].replace(0, 999)
    
    print(f"Feature engineering complete. Master feature set shape: {master_df.shape}")
    
    return master_df, pos

features_df, cleaned_pos_df = engineer_features(raw_data)




from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

def build_preprocessing_pipeline(features_df):
    """Build a preprocessing pipeline for retailer priority modeling."""
    id_cols = ["retailer_id", "territory_id"]
    categorical_cols = ["state", "district", "tehsil"]
    
    categorical_cols = [
        col for col in categorical_cols
        if col in features_df.columns
    ]
    
    numeric_cols = [
        col for col in features_df.columns
        if col not in id_cols + categorical_cols
        and pd.api.types.is_numeric_dtype(features_df[col])
    ]
    
    numeric_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
        ]
    )
    
    categorical_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore")),
        ]
    )
    
    preprocessor = ColumnTransformer(
        transformers=[
            ("numeric", numeric_transformer, numeric_cols),
            ("categorical", categorical_transformer, categorical_cols),
        ],
        remainder="drop",
    )
    
    model_input_cols = numeric_cols + categorical_cols
    
    print(f"Numeric features: {len(numeric_cols)}")
    print(f"Categorical features: {len(categorical_cols)}")
    print(f"Total raw model input columns: {len(model_input_cols)}")
    
    return preprocessor, model_input_cols, numeric_cols, categorical_cols

preprocessor, model_input_cols, numeric_cols, categorical_cols = build_preprocessing_pipeline(features_df)




import numpy as np
import pandas as pd
import xgboost as xgb

from sklearn.metrics import accuracy_score, average_precision_score, roc_auc_score
from sklearn.model_selection import StratifiedKFold
from sklearn.pipeline import Pipeline

def filter_raw_data_as_of(raw_data, cutoff_date):
    """Keep only information available on or before the modeling cutoff date."""
    filtered = {name: df.copy() for name, df in raw_data.items()}
    
    cutoff_date = pd.to_datetime(cutoff_date)
    
    filtered["retailer_pos"]["transaction_date"] = pd.to_datetime(
        filtered["retailer_pos"]["transaction_date"],
        errors="coerce",
    )
    filtered["retailer_inventory_weekly"]["week_end_date"] = pd.to_datetime(
        filtered["retailer_inventory_weekly"]["week_end_date"],
        errors="coerce",
    )
    filtered["retailer_visit_log"]["visit_date"] = pd.to_datetime(
        filtered["retailer_visit_log"]["visit_date"],
        errors="coerce",
    )
    filtered["whatsapp_campaign"]["message_sent_date"] = pd.to_datetime(
        filtered["whatsapp_campaign"]["message_sent_date"],
        errors="coerce",
    )
    
    filtered["retailer_pos"] = filtered["retailer_pos"][
        filtered["retailer_pos"]["transaction_date"] <= cutoff_date
    ]
    filtered["retailer_inventory_weekly"] = filtered["retailer_inventory_weekly"][
        filtered["retailer_inventory_weekly"]["week_end_date"] <= cutoff_date
    ]
    filtered["retailer_visit_log"] = filtered["retailer_visit_log"][
        filtered["retailer_visit_log"]["visit_date"] <= cutoff_date
    ]
    filtered["whatsapp_campaign"] = filtered["whatsapp_campaign"][
        filtered["whatsapp_campaign"]["message_sent_date"] <= cutoff_date
    ]
    
    return filtered

def create_future_revenue_target(pos_df, retailers_df, cutoff_date, horizon_days=30):
    """Create target from retailer revenue after the cutoff date."""
    pos_target = pos_df.copy()
    pos_target["transaction_date"] = pd.to_datetime(pos_target["transaction_date"], errors="coerce")
    pos_target["revenue"] = pos_target["sku_qty"] * pos_target["sku_price"]
    
    cutoff_date = pd.to_datetime(cutoff_date)
    horizon_end_date = cutoff_date + pd.Timedelta(days=horizon_days)
    
    future_window = pos_target[
        (pos_target["transaction_date"] > cutoff_date)
        & (pos_target["transaction_date"] <= horizon_end_date)
    ]
    
    future_revenue = (
        future_window.groupby("retailer_id", as_index=False)
        .agg(future_30d_revenue=("revenue", "sum"))
    )
    
    target_df = retailers_df[["retailer_id"]].merge(
        future_revenue,
        on="retailer_id",
        how="left",
    )
    
    target_df["future_30d_revenue"] = target_df["future_30d_revenue"].fillna(0)
    
    revenue_threshold = target_df["future_30d_revenue"].quantile(0.70)
    target_df["priority_target"] = (
        target_df["future_30d_revenue"] >= revenue_threshold
    ).astype(int)
    
    return target_df, horizon_end_date

full_pos = raw_data["retailer_pos"].copy()
full_pos["transaction_date"] = pd.to_datetime(full_pos["transaction_date"], errors="coerce")

modeling_cutoff_date = full_pos["transaction_date"].max() - pd.Timedelta(days=30)

historical_raw_data = filter_raw_data_as_of(
    raw_data=raw_data,
    cutoff_date=modeling_cutoff_date,
)

historical_features_df, historical_cleaned_pos_df = engineer_features(historical_raw_data)

preprocessor, model_input_cols, numeric_cols, categorical_cols = build_preprocessing_pipeline(
    historical_features_df
)

target_df, horizon_end_date = create_future_revenue_target(
    pos_df=raw_data["retailer_pos"],
    retailers_df=raw_data["retailers"],
    cutoff_date=modeling_cutoff_date,
    horizon_days=30,
)

modeling_features_df = historical_features_df.merge(
    target_df[["retailer_id", "future_30d_revenue", "priority_target"]],
    on="retailer_id",
    how="left",
)

modeling_features_df["priority_target"] = (
    modeling_features_df["priority_target"]
    .fillna(0)
    .astype(int)
)

X = modeling_features_df[model_input_cols]
y = modeling_features_df["priority_target"]

if y.nunique() < 2:
    raise ValueError("Target has only one class. Adjust horizon or threshold.")

print(f"Modeling cutoff date: {modeling_cutoff_date.date()}")
print(f"Future target window end: {horizon_end_date.date()}")
print(f"Positive target rate: {y.mean():.2%}")

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
    "random_state": RANDOM_STATE,
}

skf = StratifiedKFold(
    n_splits=5,
    shuffle=True,
    random_state=RANDOM_STATE,
)

fold_metrics = []

print("--- STARTING LEAKAGE-SAFE CROSS-VALIDATION ---")

for fold, (train_idx, valid_idx) in enumerate(skf.split(X, y), start=1):
    X_train, X_valid = X.iloc[train_idx], X.iloc[valid_idx]
    y_train, y_valid = y.iloc[train_idx], y.iloc[valid_idx]
    
    fold_pipeline = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("model", xgb.XGBClassifier(**xgb_params)),
        ]
    )
    
    fold_pipeline.fit(X_train, y_train)
    
    valid_probabilities = fold_pipeline.predict_proba(X_valid)[:, 1]
    valid_predictions = (valid_probabilities >= 0.50).astype(int)
    
    roc_auc = roc_auc_score(y_valid, valid_probabilities)
    pr_auc = average_precision_score(y_valid, valid_probabilities)
    accuracy = accuracy_score(y_valid, valid_predictions)
    
    fold_metrics.append({
        "fold": fold,
        "roc_auc": roc_auc,
        "pr_auc": pr_auc,
        "accuracy": accuracy,
    })
    
    print(
        f"Fold {fold} | "
        f"ROC-AUC: {roc_auc:.4f} | "
        f"PR-AUC: {pr_auc:.4f} | "
        f"Accuracy: {accuracy:.4f}"
    )

cv_results = pd.DataFrame(fold_metrics)

print("-" * 60)
print(f"Mean ROC-AUC : {cv_results['roc_auc'].mean():.4f} +/- {cv_results['roc_auc'].std():.4f}")
print(f"Mean PR-AUC  : {cv_results['pr_auc'].mean():.4f} +/- {cv_results['pr_auc'].std():.4f}")
print(f"Mean Accuracy: {cv_results['accuracy'].mean():.4f} +/- {cv_results['accuracy'].std():.4f}")

validation_scores = []

for fold, (train_idx, valid_idx) in enumerate(skf.split(X, y), start=1):
    X_train, X_valid = X.iloc[train_idx], X.iloc[valid_idx]
    y_train, y_valid = y.iloc[train_idx], y.iloc[valid_idx]
    
    fold_pipeline = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("model", xgb.XGBClassifier(**xgb_params)),
        ]
    )
    
    fold_pipeline.fit(X_train, y_train)
    valid_probabilities = fold_pipeline.predict_proba(X_valid)[:, 1]
    
    scored_valid = pd.DataFrame({
        "actual": y_valid.values,
        "score": valid_probabilities,
    }).sort_values("score", ascending=False)
    
    for top_pct in [0.05, 0.10, 0.20]:
        top_n = max(1, int(len(scored_valid) * top_pct))
        top_slice = scored_valid.head(top_n)
        
        validation_scores.append({
            "fold": fold,
            "top_pct": top_pct,
            "top_n": top_n,
            "precision_at_top": top_slice["actual"].mean(),
            "captured_positives": top_slice["actual"].sum(),
            "total_positives": scored_valid["actual"].sum(),
            "recall_at_top": top_slice["actual"].sum() / scored_valid["actual"].sum(),
        })

topk_results = pd.DataFrame(validation_scores)

print("\n--- TOP-K RANKING PERFORMANCE ---")
print(
    topk_results
    .groupby("top_pct")
    .agg(
        avg_precision_at_top=("precision_at_top", "mean"),
        avg_recall_at_top=("recall_at_top", "mean"),
        avg_top_n=("top_n", "mean"),
    )
    .reset_index()
    .to_string(index=False)
)

ranking_model = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        ("model", xgb.XGBClassifier(**xgb_params)),
    ]
)

ranking_model.fit(X, y)

features_df = historical_features_df.copy()
cleaned_pos_df = historical_cleaned_pos_df.copy()

print("\nFinal leakage-safe ranking_model trained successfully.")





from sklearn.metrics import accuracy_score

predicted_labels = ranking_model.predict(X)

model_accuracy = accuracy_score(y, predicted_labels)

print(f"Model Accuracy: {model_accuracy:.4f}")
print(f"Model Accuracy (%): {model_accuracy * 100:.2f}%")


print(f"Cross-Validated Accuracy: {cv_results['accuracy'].mean():.4f}")
print(f"Cross-Validated Accuracy (%): {cv_results['accuracy'].mean() * 100:.2f}%")


import numpy as np
import pandas as pd

from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

def detect_demand_spikes(cleaned_pos_df, contamination=0.05):
    """Detect unusual retailer-SKU demand patterns using volume and price."""
    volume_matrix = (
        cleaned_pos_df.groupby(["retailer_id", "sku_id"], as_index=False)
        .agg(
            total_volume_sold=("sku_qty", "sum"),
            avg_unit_price=("sku_price", "mean"),
        )
    )
    
    anomaly_features = ["total_volume_sold", "avg_unit_price"]
    
    anomaly_scaler = StandardScaler()
    anomaly_input = anomaly_scaler.fit_transform(volume_matrix[anomaly_features])
    
    anomaly_detector = IsolationForest(
        contamination=contamination,
        random_state=RANDOM_STATE,
    )
    
    anomaly_labels = anomaly_detector.fit_predict(anomaly_input)
    
    volume_matrix["anomaly_score"] = anomaly_detector.decision_function(anomaly_input)
    volume_matrix["is_demand_spike"] = (anomaly_labels == -1).astype(int)
    
    demand_anomalies_df = volume_matrix.sort_values(
        ["is_demand_spike", "anomaly_score"],
        ascending=[False, True],
    )
    
    return demand_anomalies_df, anomaly_detector, anomaly_scaler, anomaly_features

demand_anomalies_df, anomaly_detector, anomaly_scaler, anomaly_features = detect_demand_spikes(
    cleaned_pos_df=cleaned_pos_df,
    contamination=0.05,
)

total_spikes = demand_anomalies_df["is_demand_spike"].sum()

print("Demand anomaly engine execution successful.")
print(f"Identified {total_spikes} localized retailer-SKU demand spikes.")

spike_stats = (
    demand_anomalies_df.groupby("is_demand_spike", as_index=False)
    .agg(
        count=("total_volume_sold", "count"),
        mean_volume=("total_volume_sold", "mean"),
        max_volume=("total_volume_sold", "max"),
        mean_price=("avg_unit_price", "mean"),
        mean_anomaly_score=("anomaly_score", "mean"),
    )
)

print("\n--- ANOMALY SEPARATION PROFILE ---")
print(spike_stats.to_string(index=False))

print("\n--- TOP DEMAND SPIKES ---")
print(
    demand_anomalies_df[
        demand_anomalies_df["is_demand_spike"] == 1
    ][[
        "retailer_id",
        "sku_id",
        "total_volume_sold",
        "avg_unit_price",
        "anomaly_score",
    ]]
    .head(10)
    .to_string(index=False)
)


import json
import numpy as np

def assign_priority_tier(priority_score):
    """Convert numeric priority score into an operational tier."""
    if priority_score >= 80:
        return "Critical"
    if priority_score >= 60:
        return "High"
    if priority_score >= 40:
        return "Medium"
    return "Low"

def select_focus_sku(retailer_id, features, cleaned_pos_df, anomaly_matrix):
    """Choose the best focus SKU using anomaly, retailer sales, tehsil sales, then network sales."""
    local_surges = anomaly_matrix[
        (anomaly_matrix["retailer_id"] == retailer_id)
        & (anomaly_matrix["is_demand_spike"] == 1)
    ].copy()
    
    if not local_surges.empty:
        if "anomaly_score" in local_surges.columns:
            local_surges = local_surges.sort_values("anomaly_score", ascending=True)
        
        return str(local_surges.iloc[0]["sku_id"]), "Demand spike detected for this retailer."
    
    retailer_sales = cleaned_pos_df[
        cleaned_pos_df["retailer_id"] == retailer_id
    ]
    
    if not retailer_sales.empty:
        top_retailer_sku = (
            retailer_sales.groupby("sku_id", as_index=False)
            .agg(total_units=("sku_qty", "sum"))
            .sort_values("total_units", ascending=False)
            .iloc[0]["sku_id"]
        )
        
        return str(top_retailer_sku), "Top-selling SKU for this retailer."
    
    retailer_row = features[features["retailer_id"] == retailer_id]
    
    if not retailer_row.empty and "tehsil" in retailer_row.columns:
        tehsil = retailer_row.iloc[0]["tehsil"]
        tehsil_retailers = features.loc[
            features["tehsil"] == tehsil,
            "retailer_id",
        ]
        
        tehsil_sales = cleaned_pos_df[
            cleaned_pos_df["retailer_id"].isin(tehsil_retailers)
        ]
        
        if not tehsil_sales.empty:
            top_tehsil_sku = (
                tehsil_sales.groupby("sku_id", as_index=False)
                .agg(total_units=("sku_qty", "sum"))
                .sort_values("total_units", ascending=False)
                .iloc[0]["sku_id"]
            )
            
            return str(top_tehsil_sku), "Top-selling SKU in this retailer's tehsil."
    
    if not cleaned_pos_df.empty:
        top_network_sku = (
            cleaned_pos_df.groupby("sku_id", as_index=False)
            .agg(total_units=("sku_qty", "sum"))
            .sort_values("total_units", ascending=False)
            .iloc[0]["sku_id"]
        )
        
        return str(top_network_sku), "Top-selling SKU across the retailer network."
    
    return "N/A", "No SKU sales history available."

def generate_field_agent_payloads(
    features,
    anomaly_matrix,
    trained_model,
    model_input_cols,
    cleaned_pos_df,
    top_n=10,
):
    """Score retailers and generate next-best-action payloads for field agents."""
    required_cols = [
        "retailer_id",
        "tehsil",
        "stockout_rate",
        "days_since_last_visit",
        "days_since_last_purchase",
        "recent_30d_revenue",
        "sales_trend_30d",
    ]
    
    missing_cols = [col for col in required_cols if col not in features.columns]
    if missing_cols:
        raise KeyError(f"Missing required feature columns: {missing_cols}")
    
    missing_model_cols = [col for col in model_input_cols if col not in features.columns]
    if missing_model_cols:
        raise KeyError(f"Missing required model input columns: {missing_model_cols}")
    
    inference_features = features[model_input_cols]
    priority_probabilities = trained_model.predict_proba(inference_features)[:, 1]
    
    scored_manifest = features[required_cols].copy()
    scored_manifest["priority_probability"] = priority_probabilities
    scored_manifest["priority_score"] = np.round(priority_probabilities * 100).astype(int)
    scored_manifest["priority_tier"] = scored_manifest["priority_score"].apply(assign_priority_tier)
    
    revenue_benchmark = features["recent_30d_revenue"].quantile(0.70)
    
    top_priority_locations = (
        scored_manifest
        .sort_values("priority_score", ascending=False)
        .head(top_n)
    )
    
    action_payloads = []
    
    for _, account in top_priority_locations.iterrows():
        retailer_id = account["retailer_id"]
        
        target_sku, sku_reason = select_focus_sku(
            retailer_id=retailer_id,
            features=features,
            cleaned_pos_df=cleaned_pos_df,
            anomaly_matrix=anomaly_matrix,
        )
        
        reasons = []
        
        if account["stockout_rate"] > 0.15:
            reasons.append("High stockout risk detected from weekly inventory history.")
        
        if account["days_since_last_visit"] >= 999:
            reasons.append("No historical visit recorded for this retailer area.")
        elif account["days_since_last_visit"] > 30:
            days = int(account["days_since_last_visit"])
            reasons.append(f"Retailer has not been visited for {days} days.")
        
        if account["days_since_last_purchase"] > 30:
            days = int(account["days_since_last_purchase"])
            reasons.append(f"No recent purchase activity for {days} days.")
        
        if account["recent_30d_revenue"] > revenue_benchmark:
            reasons.append("Recent 30-day revenue is above the network benchmark.")
        
        if account["sales_trend_30d"] > 1.10:
            reasons.append("Recent sales trend is improving versus the previous period.")
        
        if target_sku != "N/A":
            reasons.append(sku_reason)
        
        if not reasons:
            reasons.append(
                "Retailer shows a strong combined commercial profile based on revenue, inventory, visit, and grower-market signals."
            )
        
        reason_text = " ".join(reasons).lower()
        
        if "stockout" in reason_text and "top-selling sku" in reason_text:
            recommended_strategy = "Schedule Replenishment Visit for Proven SKU Demand"
        elif "stockout" in reason_text:
            recommended_strategy = "Deploy Priority Stock Replenishment Package"
        elif ("not been visited" in reason_text or "no historical visit" in reason_text) and "top-selling sku" in reason_text:
            recommended_strategy = "Schedule Recovery Visit With SKU Replenishment Pitch"
        elif "demand spike" in reason_text:
            recommended_strategy = "Upsell Complementary High-Margin Input Categories"
        elif "recent 30-day revenue" in reason_text or "sales trend" in reason_text:
            recommended_strategy = "Reinforce Growth With Focus SKU Push"
        elif "top-selling sku" in reason_text:
            recommended_strategy = "Reinforce Proven SKU Demand"
        else:
            recommended_strategy = "Execute General Relationship Audit and Catalog Review"
        
        action_payloads.append({
            "retailer_id": str(retailer_id),
            "tehsil": str(account["tehsil"]),
            "priority_score": int(account["priority_score"]),
            "priority_tier": str(account["priority_tier"]),
            "priority_probability": round(float(account["priority_probability"]), 4),
            "justification_triggers": reasons,
            "next_best_action": {
                "recommended_strategy": recommended_strategy,
                "focus_sku": target_sku,
            },
        })
    
    return {
        "status": "SUCCESS",
        "recommended_count": len(action_payloads),
        "optimized_visit_itinerary": action_payloads,
    }

final_api_response = generate_field_agent_payloads(
    features=features_df,
    anomaly_matrix=demand_anomalies_df,
    trained_model=ranking_model,
    model_input_cols=model_input_cols,
    cleaned_pos_df=cleaned_pos_df,
    top_n=5,
)

print(json.dumps(final_api_response, indent=2))


import os
import json
import shutil
import joblib
import platform
from datetime import datetime

import numpy as np
import pandas as pd
import sklearn
import xgboost

# Use Kaggle output folder if available, otherwise local folder
OUTPUT_DIR = "/kaggle/working/retailer_priority_artifacts"
if not os.path.exists("/kaggle/working"):
    OUTPUT_DIR = "retailer_priority_artifacts"

os.makedirs(OUTPUT_DIR, exist_ok=True)

# -----------------------------
# 1. Validate required objects
# -----------------------------
required_objects = [
    "ranking_model",
    "model_input_cols",
    "features_df",
    "demand_anomalies_df",
    "final_api_response",
]

missing_objects = [name for name in required_objects if name not in globals()]
if missing_objects:
    raise NameError(f"Missing required objects before export: {missing_objects}")

# -----------------------------
# 2. Save trained ML model
# -----------------------------
model_path = os.path.join(OUTPUT_DIR, "ranking_model.joblib")
joblib.dump(ranking_model, model_path)

print(f"Saved ranking model: {model_path}")

# -----------------------------
# 3. Save model input schema
# -----------------------------
model_schema = {
    "model_input_cols": model_input_cols,
    "numeric_cols": numeric_cols if "numeric_cols" in globals() else [],
    "categorical_cols": categorical_cols if "categorical_cols" in globals() else [],
    "target_name": "priority_target",
    "score_output": "priority_probability",
}

schema_path = os.path.join(OUTPUT_DIR, "model_schema.json")
with open(schema_path, "w") as f:
    json.dump(model_schema, f, indent=2)

print(f"Saved model schema: {schema_path}")

# -----------------------------
# 4. Save training metadata
# -----------------------------
metadata = {
    "artifact_created_at": datetime.utcnow().isoformat(),
    "random_state": RANDOM_STATE if "RANDOM_STATE" in globals() else None,
    "model_type": "XGBClassifier with sklearn Pipeline preprocessing",
    "modeling_cutoff_date": str(modeling_cutoff_date.date()) if "modeling_cutoff_date" in globals() else None,
    "future_target_window_end": str(horizon_end_date.date()) if "horizon_end_date" in globals() else None,
    "positive_target_rate": float(y.mean()) if "y" in globals() else None,
    "python_version": platform.python_version(),
    "pandas_version": pd.__version__,
    "numpy_version": np.__version__,
    "sklearn_version": sklearn.__version__,
    "xgboost_version": xgboost.__version__,
}

metadata_path = os.path.join(OUTPUT_DIR, "metadata.json")
with open(metadata_path, "w") as f:
    json.dump(metadata, f, indent=2)

print(f"Saved metadata: {metadata_path}")

# -----------------------------
# 5. Save evaluation metrics
# -----------------------------
if "cv_results" in globals():
    cv_results_path = os.path.join(OUTPUT_DIR, "cv_results.csv")
    cv_results.to_csv(cv_results_path, index=False)
    print(f"Saved CV results: {cv_results_path}")

if "topk_results" in globals():
    topk_results_path = os.path.join(OUTPUT_DIR, "topk_results.csv")
    topk_results.to_csv(topk_results_path, index=False)
    print(f"Saved top-k results: {topk_results_path}")

# -----------------------------
# 6. Save latest retailer features snapshot
# -----------------------------
features_path = os.path.join(OUTPUT_DIR, "features_snapshot.csv")
features_df.to_csv(features_path, index=False)

print(f"Saved feature snapshot: {features_path}")

# -----------------------------
# 7. Save anomaly outputs
# -----------------------------
anomalies_path = os.path.join(OUTPUT_DIR, "demand_anomalies.csv")
demand_anomalies_df.to_csv(anomalies_path, index=False)

print(f"Saved demand anomalies: {anomalies_path}")

if "anomaly_detector" in globals():
    anomaly_model_path = os.path.join(OUTPUT_DIR, "anomaly_detector.joblib")
    joblib.dump(anomaly_detector, anomaly_model_path)
    print(f"Saved anomaly detector: {anomaly_model_path}")

if "anomaly_scaler" in globals():
    anomaly_scaler_path = os.path.join(OUTPUT_DIR, "anomaly_scaler.joblib")
    joblib.dump(anomaly_scaler, anomaly_scaler_path)
    print(f"Saved anomaly scaler: {anomaly_scaler_path}")

if "anomaly_features" in globals():
    anomaly_schema_path = os.path.join(OUTPUT_DIR, "anomaly_schema.json")
    with open(anomaly_schema_path, "w") as f:
        json.dump({"anomaly_features": anomaly_features}, f, indent=2)
    print(f"Saved anomaly schema: {anomaly_schema_path}")

# -----------------------------
# 8. Save SKU lookup tables for API fallback logic
# -----------------------------
if "cleaned_pos_df" in globals():
    retailer_top_sku = (
        cleaned_pos_df.groupby(["retailer_id", "sku_id"], as_index=False)
        .agg(total_units=("sku_qty", "sum"))
        .sort_values(["retailer_id", "total_units"], ascending=[True, False])
        .drop_duplicates("retailer_id")
    )
    
    retailer_top_sku_path = os.path.join(OUTPUT_DIR, "retailer_top_sku.csv")
    retailer_top_sku.to_csv(retailer_top_sku_path, index=False)
    print(f"Saved retailer top SKU lookup: {retailer_top_sku_path}")
    
    tehsil_retailer_map = features_df[["retailer_id", "tehsil"]].drop_duplicates()
    
    pos_with_tehsil = cleaned_pos_df.merge(
        tehsil_retailer_map,
        on="retailer_id",
        how="left",
    )
    
    tehsil_top_sku = (
        pos_with_tehsil.dropna(subset=["tehsil"])
        .groupby(["tehsil", "sku_id"], as_index=False)
        .agg(total_units=("sku_qty", "sum"))
        .sort_values(["tehsil", "total_units"], ascending=[True, False])
        .drop_duplicates("tehsil")
    )
    
    tehsil_top_sku_path = os.path.join(OUTPUT_DIR, "tehsil_top_sku.csv")
    tehsil_top_sku.to_csv(tehsil_top_sku_path, index=False)
    print(f"Saved tehsil top SKU lookup: {tehsil_top_sku_path}")
    
    network_top_sku = (
        cleaned_pos_df.groupby("sku_id", as_index=False)
        .agg(total_units=("sku_qty", "sum"))
        .sort_values("total_units", ascending=False)
        .head(1)
    )
    
    network_top_sku_path = os.path.join(OUTPUT_DIR, "network_top_sku.csv")
    network_top_sku.to_csv(network_top_sku_path, index=False)
    print(f"Saved network top SKU lookup: {network_top_sku_path}")

# -----------------------------
# 9. Save latest generated API response
# -----------------------------
api_response_path = os.path.join(OUTPUT_DIR, "sample_api_response.json")
with open(api_response_path, "w") as f:
    json.dump(final_api_response, f, indent=2)

print(f"Saved sample API response: {api_response_path}")

# -----------------------------
# 10. Save requirements file
# -----------------------------
requirements = [
    f"pandas=={pd.__version__}",
    f"numpy=={np.__version__}",
    f"scikit-learn=={sklearn.__version__}",
    f"xgboost=={xgboost.__version__}",
    "joblib",
]

requirements_path = os.path.join(OUTPUT_DIR, "requirements.txt")
with open(requirements_path, "w") as f:
    f.write("\n".join(requirements))

print(f"Saved requirements: {requirements_path}")

# -----------------------------
# 11. Zip artifacts for sharing
# -----------------------------
zip_base_path = OUTPUT_DIR.rstrip("/").rstrip("\\")
zip_path = shutil.make_archive(zip_base_path, "zip", OUTPUT_DIR)

print("\nProduction artifact export complete.")
print(f"Artifact folder: {OUTPUT_DIR}")
print(f"Artifact zip: {zip_path}")