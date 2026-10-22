"""
End-to-End Orchestrated Pipeline Runner
Executes:
1. Multi-CSV Ingestion & Quality Validation
2. Data Preprocessing & Deduplication
3. ETL & Master Analytical Tables
4. Customer 360 & RFM Feature Engineering
5. Customer Segmentation (K-Means & DBSCAN)
6. Leak-free Time-Anchored Churn Labeling
7. Traditional ML Models (LogReg, DT, RF, XGBoost, LightGBM)
8. Deep Learning (ANN, LSTM, Hybrid ANN-LSTM)
9. Model Benchmark Comparison
10. SHAP Interpretability & Explainability
11. Risk Scoring & Revenue at Risk
12. Sales Analytics & Time Series Forecasting
13. Output Artifact Generation for Interactive Dashboard
"""

import json
import time
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split

# Local imports
from .config import (
    DATASET_DIR, DATA_PROCESSED_DIR, DATA_OUTPUTS_DIR,
    PREDICTION_WINDOW_DAYS, RANDOM_STATE
)
from .data_ingestion import load_raw_datasets, validate_and_report_quality
from .data_preprocessing import preprocess_datasets
from .etl_pipeline import build_master_analytical_tables
from .feature_engineering import build_customer_features
from .segmentation import run_customer_segmentation
from .churn_labeling import create_time_based_churn_dataset
from .ml_models import train_and_evaluate_traditional_models
from .deep_learning import build_temporal_sequences, train_and_evaluate_deep_learning
from .explainability import compute_shap_and_explainability, generate_local_customer_drivers
from .risk_engine import compute_risk_scoring_and_revenue_at_risk
from .sales_forecasting import run_sales_analytics_and_forecasting

def run_full_pipeline(sample_cohort_size: int = None):
    start_time = time.time()
    print("*" * 75)
    print("CUSTOMER CHURN PREDICTION & SALES DASHBOARD — END-TO-END PIPELINE")
    print("*" * 75)

    # 1. Ingestion
    raw_datasets = load_raw_datasets(DATASET_DIR)
    
    # 2. Quality check
    quality_report = validate_and_report_quality(raw_datasets)
    
    # 3. Preprocessing
    clean_datasets = preprocess_datasets(raw_datasets)
    
    # 4. ETL
    etl_tables = build_master_analytical_tables(clean_datasets)
    master_sales = etl_tables["master_sales"]
    
    # 5. Sales Analytics & Forecasting
    sales_summary = run_sales_analytics_and_forecasting(master_sales)

    # 6. Time-anchored Churn Labeling
    churn_labels_df, t_cutoff, t_max = create_time_based_churn_dataset(
        master_sales, window_days=PREDICTION_WINDOW_DAYS
    )

    # 7. Customer 360 Feature Engineering (Computed up to cutoff date to prevent leakage)
    cust_features = build_customer_features(master_sales, cutoff_date=t_cutoff)

    # Merge features with Churn Target
    dataset_df = cust_features.merge(churn_labels_df, on="customer_unique_id", how="inner")
    print(f"\nFinal Churn Modeling Cohort: {dataset_df.shape[0]:,} customers")

    # Optional cohort sampling for fast demonstration if desired
    if sample_cohort_size and len(dataset_df) > sample_cohort_size:
        print(f"Sampling cohort down to {sample_cohort_size:,} for rapid training...")
        dataset_df = dataset_df.sample(n=sample_cohort_size, random_state=RANDOM_STATE).reset_index(drop=True)

    # 8. Customer Segmentation
    dataset_df, seg_summary = run_customer_segmentation(dataset_df)

    # Feature definitions
    numeric_features = [
        "recency_days", "total_orders", "total_spend", "total_items",
        "average_order_value", "avg_product_price", "unique_products",
        "unique_categories", "category_diversity", "average_review_score",
        "positive_review_ratio", "negative_review_ratio", "avg_delivery_days",
        "avg_delivery_delay", "late_delivery_ratio", "credit_card_ratio",
        "boleto_ratio", "voucher_ratio", "avg_installments", "customer_lifetime_days",
        "spending_trend", "spend_30d", "spend_90d", "orders_30d", "orders_90d",
        "customer_health_score", "predicted_clv"
    ]
    categorical_features = ["customer_state", "favorite_category"]

    # Fill any remaining NaNs in features
    for col in numeric_features:
        if col in dataset_df.columns:
            dataset_df[col] = dataset_df[col].fillna(0.0)
    for col in categorical_features:
        if col in dataset_df.columns:
            dataset_df[col] = dataset_df[col].fillna("other")

    # 9. Train / Test Split
    X = dataset_df[numeric_features + categorical_features]
    y = dataset_df["churn"]

    X_train, X_test, y_train, y_test, idx_train, idx_test = train_test_split(
        X, y, dataset_df.index, test_size=0.20, random_state=RANDOM_STATE, stratify=y
    )
    print(f"Train Cohort: {len(X_train):,} | Test Cohort: {len(X_test):,}")

    # 10. Traditional Machine Learning Models
    ml_results, fitted_ml_models, preprocessor = train_and_evaluate_traditional_models(
        X_train, X_test, y_train, y_test, numeric_features, categorical_features
    )

    # 11. Deep Learning Sequences & Models
    # Transform static data
    X_train_trans = preprocessor.transform(X_train)
    X_test_trans = preprocessor.transform(X_test)

    train_cids = dataset_df.loc[idx_train, "customer_unique_id"].tolist()
    test_cids = dataset_df.loc[idx_test, "customer_unique_id"].tolist()

    print("\nExtracting temporal behavioral trajectories for LSTM...")
    seq_train = build_temporal_sequences(master_sales, train_cids, cutoff_date=t_cutoff, n_months=6)
    seq_test = build_temporal_sequences(master_sales, test_cids, cutoff_date=t_cutoff, n_months=6)

    dl_results, fitted_dl_models = train_and_evaluate_deep_learning(
        X_train_trans, X_test_trans, seq_train, seq_test, y_train, y_test
    )

    # 12. Combined Benchmark Comparison
    all_models_comparison = []
    # Add Traditional Models
    for name, m in ml_results.items():
        all_models_comparison.append({
            "model": name,
            "category": "Traditional ML",
            "accuracy": m["accuracy"],
            "precision": m["precision"],
            "recall": m["recall"],
            "f1_score": m["f1_score"],
            "roc_auc": m["roc_auc"],
            "pr_auc": m["pr_auc"]
        })
    # Add Deep Learning Models
    for name, m in dl_results.items():
        all_models_comparison.append({
            "model": name,
            "category": "Deep Learning",
            "accuracy": m["accuracy"],
            "precision": m["precision"],
            "recall": m["recall"],
            "f1_score": m["f1_score"],
            "roc_auc": m["roc_auc"],
            "pr_auc": m["pr_auc"]
        })

    # Sort by ROC-AUC & F1 score
    all_models_comparison.sort(key=lambda x: (x["roc_auc"] + x["f1_score"]), reverse=True)
    best_model_name = all_models_comparison[0]["model"]
    print("\n" + "=" * 60)
    print("ALL MODELS BENCHMARK COMPARISON TABLE")
    print("=" * 60)
    print(f"{'Model':<22} | {'Category':<15} | {'Acc':<6} | {'Prec':<6} | {'Rec':<6} | {'F1':<6} | {'ROC-AUC':<7} | {'PR-AUC':<7}")
    print("-" * 85)
    for row in all_models_comparison:
        print(f"{row['model']:<22} | {row['category']:<15} | {row['accuracy']:<6.4f} | {row['precision']:<6.4f} | {row['recall']:<6.4f} | {row['f1_score']:<6.4f} | {row['roc_auc']:<7.4f} | {row['pr_auc']:<7.4f}")
    print(f"\nChampion Model Selected: >>> {best_model_name} <<<")

    # 13. Full Cohort Scoring using Champion / Hybrid Model
    print("\nGenerating full-cohort churn probabilities and risk scores...")
    # Generate probabilities for all records in dataset_df
    X_full_trans = preprocessor.transform(X)
    all_cids = dataset_df["customer_unique_id"].tolist()
    seq_full = build_temporal_sequences(master_sales, all_cids, cutoff_date=t_cutoff, n_months=6)

    hybrid_model = fitted_dl_models["Hybrid ANN-LSTM"]
    hybrid_model.eval()
    
    import torch
    with torch.no_grad():
        t_static = torch.tensor(X_full_trans, dtype=torch.float32)
        t_seq = torch.tensor(seq_full, dtype=torch.float32)
        full_hybrid_probs = hybrid_model(t_static, t_seq).cpu().numpy()

    # Also compute ANN and XGBoost probabilities for multi-model customer explorer
    ann_model = fitted_dl_models["ANN"]
    ann_model.eval()
    with torch.no_grad():
        full_ann_probs = ann_model(t_static).cpu().numpy()

    lstm_model = fitted_dl_models["LSTM"]
    lstm_model.eval()
    with torch.no_grad():
        full_lstm_probs = lstm_model(t_seq).cpu().numpy()

    dataset_df["ann_probability"] = np.round(full_ann_probs, 4)
    dataset_df["lstm_probability"] = np.round(full_lstm_probs, 4)
    dataset_df["hybrid_probability"] = np.round(full_hybrid_probs, 4)

    # 14. Risk Scoring & Revenue at Risk
    dataset_df, portfolio_risk = compute_risk_scoring_and_revenue_at_risk(
        dataset_df, full_hybrid_probs, model_name=best_model_name
    )

    # 15. SHAP and Explainability
    cat_encoder = preprocessor.named_transformers_["cat"].named_steps["encoder"]
    encoded_cat_cols = list(cat_encoder.get_feature_names_out(categorical_features))
    all_feature_names = numeric_features + encoded_cat_cols

    shap_sample = X_train.sample(n=min(500, len(X_train)), random_state=RANDOM_STATE)
    shap_summary = compute_shap_and_explainability(
        fitted_ml_models["XGBoost"], preprocessor, shap_sample, all_feature_names
    )

    # 16. Generate Customer Risk Explorer Records (Sample of top 250 diverse customers for UI search/drilldown)
    print("\nPreparing Customer Risk Explorer catalog...")
    # Select sample with high risk, critical risk, loyalists, VIPs for rich interactive UI
    sample_customers = pd.concat([
        dataset_df[dataset_df["risk_tier"] == "CRITICAL"].head(60),
        dataset_df[dataset_df["risk_tier"] == "HIGH"].head(60),
        dataset_df[dataset_df["risk_tier"] == "MEDIUM"].head(60),
        dataset_df[dataset_df["risk_tier"] == "LOW"].head(70)
    ]).drop_duplicates(subset=["customer_unique_id"])

    customer_explorer_list = []
    for _, row in sample_customers.iterrows():
        drivers = generate_local_customer_drivers(row)
        customer_explorer_list.append({
            "customer_id": str(row["customer_unique_id"]),
            "city": str(row["customer_city"]),
            "state": str(row["customer_state"]),
            "recency_days": int(row["recency_days"]),
            "total_orders": int(row["total_orders"]),
            "total_spend": round(float(row["total_spend"]), 2),
            "aov": round(float(row["average_order_value"]), 2),
            "favorite_category": str(row["favorite_category"]),
            "review_score": round(float(row["average_review_score"]), 1),
            "health_score": round(float(row["customer_health_score"]), 1),
            "health_category": str(row["health_category"]),
            "rfm_segment": str(row["RFM_segment"]),
            "kmeans_segment": str(row["kmeans_segment"]),
            "ann_churn_prob": round(float(row["ann_probability"]), 4),
            "lstm_churn_prob": round(float(row["lstm_probability"]), 4),
            "hybrid_churn_prob": round(float(row["hybrid_probability"]), 4),
            "final_churn_prob": round(float(row["churn_probability"]), 4),
            "risk_tier": str(row["risk_tier"]),
            "predicted_clv": round(float(row["predicted_clv"]), 2),
            "revenue_at_risk": round(float(row["revenue_at_risk"]), 2),
            "recommended_action": str(row["recommended_action"]),
            "recommendation_offer": str(row["recommendation_offer"]),
            "recommendation_channel": str(row["recommendation_channel"]),
            "recommendation_urgency": str(row["recommendation_urgency"]),
            "churn_drivers": drivers
        })

    # Save outputs for Frontend
    with open(DATA_OUTPUTS_DIR / "all_models_comparison.json", "w", encoding="utf-8") as f:
        json.dump({
            "comparison_table": all_models_comparison,
            "champion_model": best_model_name,
            "ml_details": ml_results,
            "dl_details": dl_results
        }, f, indent=2)

    with open(DATA_OUTPUTS_DIR / "customer_explorer_catalog.json", "w", encoding="utf-8") as f:
        json.dump(customer_explorer_list, f, indent=2)

    # Save full customer dataset with scores
    scored_csv = DATA_PROCESSED_DIR / "scored_customer_portfolio.csv"
    dataset_df.to_csv(scored_csv, index=False)
    print(f" -> Scored customer portfolio saved to: {scored_csv}")

    elapsed = time.time() - start_time
    print("*" * 75)
    print(f"PIPELINE COMPLETED SUCCESSFULLY IN {elapsed:.1f} SECONDS")
    print(f"Champion Model: {best_model_name}")
    print(f"Total Revenue at Risk: ${portfolio_risk['total_revenue_at_risk']:,.2f}")
    print("*" * 75)

if __name__ == "__main__":
    run_full_pipeline()
