# SHAP Top-10 (Phase 2 Stage C)

Deployed model: **catboost** (single; dominant base = `catboost`).
CatBoost top-3 ↔ Phase 1 importance top-5 overlap: ['days_since_last_sale_terr', 'sku_qty_pre_visit', 'terr_prod_conv_rate'] (3/3).
LR top-3 ↔ Phase 1 importance top-5 overlap: ['days_since_last_sale_terr', 'terr_prod_conv_rate'] (2/3). LR explains via signed linear coefficients on a scaled/one-hot-encoded feature space, so its top features differ structurally from tree-importance rankings.

## CatBoost (TreeExplainer)

|   rank | feature                        |   mean_abs_shap |   mean_signed_shap |
|-------:|:-------------------------------|----------------:|-------------------:|
|      1 | terr_prod_conv_rate            |          0.6391 |             0.0338 |
|      2 | days_since_last_sale_terr      |          0.3501 |             0.0547 |
|      3 | sku_qty_pre_visit              |          0.2751 |            -0.1800 |
|      4 | sales_velocity                 |          0.1496 |            -0.0006 |
|      5 | rolling_avg_weekly_sales       |          0.1369 |             0.0242 |
|      6 | days_since_product_last_pushed |          0.1057 |            -0.0082 |
|      7 | rep_id                         |          0.0827 |             0.0016 |
|      8 | stock_to_velocity_weeks        |          0.0580 |             0.0018 |
|      9 | stock_change_wow               |          0.0560 |             0.0123 |
|     10 | week_of_season                 |          0.0425 |            -0.0364 |

## LogReg (LinearExplainer)

|   rank | feature                        |   mean_abs_shap |   mean_signed_shap |
|-------:|:-------------------------------|----------------:|-------------------:|
|      1 | terr_prod_conv_rate            |          0.2490 |             0.0918 |
|      2 | stock_to_velocity_weeks        |          0.1284 |             0.0522 |
|      3 | days_since_last_sale_terr      |          0.1181 |             0.0385 |
|      4 | sales_velocity                 |          0.1108 |             0.0077 |
|      5 | sku_qty_pre_visit              |          0.0772 |            -0.0410 |
|      6 | week_of_season                 |          0.0420 |            -0.0420 |
|      7 | product_sold_last_14d          |          0.0306 |             0.0082 |
|      8 | rep_product_diversity          |          0.0125 |            -0.0123 |
|      9 | days_since_product_last_pushed |          0.0117 |            -0.0061 |
|     10 | stock_change_wow               |          0.0104 |             0.0054 |

## Figures

- `reports/figures/shap_top10_bar_catboost.png`
- `reports/figures/shap_top10_bar_logreg.png`
- `reports/figures/shap_beeswarm_catboost.png`
- `reports/figures/shap_beeswarm_logreg.png`
- `reports/figures/shap_waterfall_{1,2,3}.png`  (from dominant model = `catboost`)
