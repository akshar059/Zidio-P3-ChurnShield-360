"""
Churn Label Creation Module
Implements time-anchored cohort split with observation cutoff and prediction window.
Avoids future lookahead data leakage.
"""

import pandas as pd
import numpy as np
from datetime import timedelta
from .config import PREDICTION_WINDOW_DAYS, DATA_PROCESSED_DIR

def create_time_based_churn_dataset(master_sales: pd.DataFrame, window_days: int = PREDICTION_WINDOW_DAYS) -> tuple[pd.DataFrame, pd.Timestamp, pd.Timestamp]:
    """
    Creates a churn dataset based on:
    - Observation Cutoff: T_max - window_days
    - Cohort: Customers who purchased on or before Observation Cutoff
    - Churn Target: 1 if customer did NOT purchase between Cutoff and T_max, 0 if they purchased
    """
    print("\n" + "=" * 60)
    print("STEP 7: TIME-ANCHORED CHURN LABELING (LEAK-FREE)")
    print("=" * 60)
    
    df = master_sales.copy()
    df["order_purchase_timestamp"] = pd.to_datetime(df["order_purchase_timestamp"])
    
    t_max = df["order_purchase_timestamp"].max()
    t_cutoff = t_max - timedelta(days=window_days)
    
    print(f"Dataset Date Range: {df['order_purchase_timestamp'].min().date()} to {t_max.date()}")
    print(f"Observation Cutoff Date : {t_cutoff.date()}")
    print(f"Prediction Window Duration: {window_days} days ({t_cutoff.date()} to {t_max.date()})")

    # Cohort: all customers who purchased prior to or on cutoff date
    hist_df = df[df["order_purchase_timestamp"] <= t_cutoff]
    cohort_customers = set(hist_df["customer_unique_id"].unique())
    print(f"Cohort Size (Active up to Cutoff): {len(cohort_customers):,} unique customers")

    # Future window purchases
    future_df = df[df["order_purchase_timestamp"] > t_cutoff]
    repurchased_customers = set(future_df["customer_unique_id"].unique())
    
    # Target creation
    churn_labels = []
    for cid in cohort_customers:
        # Churned = 1 if NOT in repurchased_customers
        is_churn = 0 if cid in repurchased_customers else 1
        churn_labels.append({"customer_unique_id": cid, "churn": is_churn})
        
    churn_df = pd.DataFrame(churn_labels)
    churn_rate = churn_df["churn"].mean() * 100.0
    print(f"Target Distribution: {churn_df['churn'].value_counts().to_dict()}")
    print(f"Cohort Churn Rate: {churn_rate:.2f}% (Retained: {100.0 - churn_rate:.2f}%)")

    return churn_df, t_cutoff, t_max
