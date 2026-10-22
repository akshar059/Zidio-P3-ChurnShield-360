"""
Customer 360 Feature Engineering Module
Computes RFM, purchase behavior, payment, delivery, satisfaction,
spending trends, customer health score, and CLV metrics.
"""

import pandas as pd
from datetime import timedelta
from .config import DATA_PROCESSED_DIR

def calculate_rfm_scores(df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes quintile-based R, F, M scores (1-5) and assigns RFM segments.
    """
    # Recency: lower is better (5 = most recent, 1 = least recent)
    df["R_score"] = pd.qcut(df["recency_days"].rank(method="first"), q=5, labels=[5, 4, 3, 2, 1]).astype(int)
    
    # Frequency: higher is better. Since many customers have 1 order, rank with first method
    df["F_score"] = pd.qcut(df["total_orders"].rank(method="first"), q=5, labels=[1, 2, 3, 4, 5]).astype(int)
    
    # Monetary: higher is better
    df["M_score"] = pd.qcut(df["total_spend"].rank(method="first"), q=5, labels=[1, 2, 3, 4, 5]).astype(int)
    
    df["RFM_score"] = df["R_score"].astype(str) + df["F_score"].astype(str) + df["M_score"].astype(str)
    
    def assign_segment(row):
        r, f, m = row["R_score"], row["F_score"], row["M_score"]
        if r >= 4 and f >= 4:
            return "Champions"
        elif r >= 3 and f >= 3:
            return "Loyal Customers"
        elif r >= 4 and f <= 2:
            return "New Promising"
        elif r == 3 and f <= 2:
            return "Need Attention"
        elif r <= 2 and f >= 3:
            return "At Risk"
        elif r <= 2 and f <= 2 and m >= 3:
            return "Cannot Lose Them"
        else:
            return "Hibernating / Lost"

    df["RFM_segment"] = df.apply(assign_segment, axis=1)
    return df

def calculate_customer_health_score(df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes a composite Customer Health Score from 0 to 100 based on:
    - Recency (lower recency -> higher score)
    - Review Score (higher review -> higher score)
    - Late delivery ratio (lower late ratio -> higher score)
    - Spending momentum / frequency
    """
    # Normalized components (0 to 1)
    # Recency component: invert so recent purchases score near 1
    max_rec = df["recency_days"].max() if df["recency_days"].max() > 0 else 1
    rec_norm = 1.0 - (df["recency_days"].clip(0, max_rec) / max_rec)
    
    # Review score component (1-5 scaled to 0-1)
    rev_norm = (df["average_review_score"].clip(1, 5) - 1.0) / 4.0
    
    # Delivery experience component (1 - late delivery ratio)
    del_norm = 1.0 - df["late_delivery_ratio"].clip(0, 1)
    
    # Order frequency component (capped at 5 orders for scaling)
    freq_norm = (df["total_orders"].clip(1, 5) - 1.0) / 4.0
    
    # Spending trend component (-1 to +1 scaled to 0 to 1)
    trend_norm = (df["spending_trend"].clip(-1.0, 1.0) + 1.0) / 2.0
    
    # Composite formula
    health = (
        rec_norm * 35.0 +
        rev_norm * 25.0 +
        del_norm * 15.0 +
        freq_norm * 15.0 +
        trend_norm * 10.0
    ).round(1)
    
    df["customer_health_score"] = health.clip(0, 100)
    
    def assign_health_category(val):
        if val <= 30:
            return "Critical"
        elif val <= 50:
            return "Poor"
        elif val <= 70:
            return "Average"
        elif val <= 85:
            return "Healthy"
        else:
            return "Excellent"
            
    df["health_category"] = df["customer_health_score"].apply(assign_health_category)
    return df

def build_customer_features(master_sales: pd.DataFrame, cutoff_date: pd.Timestamp = None) -> pd.DataFrame:
    """
    Transforms transaction-level master_sales into a Customer 360 feature dataset.
    If cutoff_date is provided, only purchases before cutoff_date are used.
    """
    print("\n" + "=" * 60)
    print("STEP 5: CUSTOMER 360 FEATURE ENGINEERING")
    print("=" * 60)
    
    df = master_sales.copy()
    df["order_purchase_timestamp"] = pd.to_datetime(df["order_purchase_timestamp"])
    
    if cutoff_date is not None:
        df = df[df["order_purchase_timestamp"] <= cutoff_date]
        ref_date = cutoff_date
    else:
        ref_date = df["order_purchase_timestamp"].max()

    print(f"Computing customer features up to reference date: {ref_date}")

    # Aggregations per customer_unique_id
    records = []
    grouped = df.groupby("customer_unique_id")
    
    print("Aggregating customer purchase profiles...")
    # Fast vectorized aggregations where possible
    cust_base = grouped.agg(
        customer_city=("customer_city", "first"),
        customer_state=("customer_state", "first"),
        first_purchase_date=("order_purchase_timestamp", "min"),
        last_purchase_date=("order_purchase_timestamp", "max"),
        total_items=("order_item_id", "count"),
        total_orders=("order_id", "nunique"),
        total_spend=("price", "sum"),
        total_freight=("freight_value", "sum"),
        avg_product_price=("price", "mean"),
        unique_products=("product_id", "nunique"),
        unique_categories=("product_category", "nunique"),
        favorite_category=("product_category", lambda x: x.mode()[0] if not x.empty else "other"),
        avg_review_score=("review_score", "mean"),
        positive_reviews=("is_positive_review", "sum"),
        negative_reviews=("is_negative_review", "sum"),
        avg_delivery_days=("actual_delivery_days", "mean"),
        max_delivery_days=("actual_delivery_days", "max"),
        avg_delivery_delay=("delivery_delay_days", "mean"),
        late_orders=("is_delayed", "sum"),
        credit_card_orders=("has_credit_card", "sum"),
        boleto_orders=("has_boleto", "sum"),
        voucher_orders=("has_voucher", "sum"),
        avg_installments=("avg_installments", "mean")
    ).reset_index()

    # Derived Metrics
    cust_base["recency_days"] = (ref_date - cust_base["last_purchase_date"]).dt.total_seconds() / 86400.0
    cust_base["customer_lifetime_days"] = (
        cust_base["last_purchase_date"] - cust_base["first_purchase_date"]
    ).dt.total_seconds() / 86400.0
    
    cust_base["average_order_value"] = cust_base["total_spend"] / cust_base["total_orders"].clip(lower=1)
    cust_base["repeat_purchase_rate"] = (cust_base["total_orders"] > 1).astype(int)
    cust_base["category_diversity"] = (
        cust_base["unique_categories"] / cust_base["total_items"].clip(lower=1)
    ).round(3)

    # Ratios
    cust_base["credit_card_ratio"] = (cust_base["credit_card_orders"] / cust_base["total_orders"]).round(3)
    cust_base["voucher_ratio"] = (cust_base["voucher_orders"] / cust_base["total_orders"]).round(3)
    cust_base["boleto_ratio"] = (cust_base["boleto_orders"] / cust_base["total_orders"]).round(3)
    
    cust_base["late_delivery_ratio"] = (cust_base["late_orders"] / cust_base["total_orders"]).round(3)
    cust_base["positive_review_ratio"] = (cust_base["positive_reviews"] / cust_base["total_orders"]).round(3)
    cust_base["negative_review_ratio"] = (cust_base["negative_reviews"] / cust_base["total_orders"]).round(3)
    cust_base["average_review_score"] = cust_base["avg_review_score"].round(2)

    # Multi-window spend and behavioral deterioration
    d30 = ref_date - timedelta(days=30)
    d60 = ref_date - timedelta(days=60)
    d90 = ref_date - timedelta(days=90)
    d180 = ref_date - timedelta(days=180)

    # Spend in windows
    spend_30 = df[df["order_purchase_timestamp"] >= d30].groupby("customer_unique_id")["price"].sum().rename("spend_30d")
    spend_60_30 = df[(df["order_purchase_timestamp"] >= d60) & (df["order_purchase_timestamp"] < d30)].groupby("customer_unique_id")["price"].sum().rename("spend_prev_30d")
    spend_90 = df[df["order_purchase_timestamp"] >= d90].groupby("customer_unique_id")["price"].sum().rename("spend_90d")
    spend_180 = df[df["order_purchase_timestamp"] >= d180].groupby("customer_unique_id")["price"].sum().rename("spend_180d")

    orders_30 = df[df["order_purchase_timestamp"] >= d30].groupby("customer_unique_id")["order_id"].nunique().rename("orders_30d")
    orders_90 = df[df["order_purchase_timestamp"] >= d90].groupby("customer_unique_id")["order_id"].nunique().rename("orders_90d")

    cust_base = cust_base.merge(spend_30, on="customer_unique_id", how="left").fillna({"spend_30d": 0.0})
    cust_base = cust_base.merge(spend_prev_30d:=spend_60_30, on="customer_unique_id", how="left").fillna({"spend_prev_30d": 0.0})
    cust_base = cust_base.merge(spend_90, on="customer_unique_id", how="left").fillna({"spend_90d": 0.0})
    cust_base = cust_base.merge(spend_180, on="customer_unique_id", how="left").fillna({"spend_180d": 0.0})
    cust_base = cust_base.merge(orders_30, on="customer_unique_id", how="left").fillna({"orders_30d": 0})
    cust_base = cust_base.merge(orders_90, on="customer_unique_id", how="left").fillna({"orders_90d": 0})

    # Spending trend (-1 = 100% decline, 0 = stable/none, +1 = 100% growth)
    def calc_trend(row):
        cur = row["spend_30d"]
        prev = row["spend_prev_30d"]
        if cur == 0 and prev == 0:
            return -0.2  # slight decay for inactivity
        if prev == 0:
            return 1.0
        return round((cur - prev) / (prev + 1.0), 3)

    cust_base["spending_trend"] = cust_base.apply(calc_trend, axis=1)

    # Historical & Projected CLV
    # CLV = AOV * Frequency * estimated margin / churn benchmark
    cust_base["historical_clv"] = cust_base["total_spend"]
    cust_base["predicted_clv"] = (
        cust_base["average_order_value"] * (cust_base["total_orders"].clip(1, 4)) * 1.5
    ).round(2)

    # Compute RFM Scores and Segments
    cust_base = calculate_rfm_scores(cust_base)

    # Compute Health Score
    cust_base = calculate_customer_health_score(cust_base)

    out_file = DATA_PROCESSED_DIR / "customer_features.csv"
    cust_base.to_csv(out_file, index=False)
    print(f" -> Customer 360 Feature set created: {cust_base.shape[0]:,} customers x {cust_base.shape[1]} features")
    print(f" -> Saved to: {out_file}")

    return cust_base
