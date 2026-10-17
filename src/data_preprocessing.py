"""
Data Preprocessing Module
Handles deduplication, missing value imputation, date conversion,
outlier capping, and category translation.
"""

import pandas as pd
import numpy as np
from .config import ORDER_DATE_COLS

def preprocess_datasets(datasets: dict) -> dict:
    """
    Cleans and standardizes raw datasets.
    """
    print("\n" + "=" * 60)
    print("STEP 3: DATA PREPROCESSING & STANDARDIZATION")
    print("=" * 60)
    
    # 1. Deduplication
    for name, df in datasets.items():
        init_rows = len(df)
        df.drop_duplicates(inplace=True)
        dropped = init_rows - len(df)
        if dropped > 0:
            print(f"[{name}] Removed {dropped:,} duplicate rows.")

    # 2. Date parsing in orders
    orders = datasets["orders"]
    for col in ORDER_DATE_COLS:
        if col in orders.columns:
            orders[col] = pd.to_datetime(orders[col], errors="coerce")
            
    # Extract temporal components
    orders["purchase_year"] = orders["order_purchase_timestamp"].dt.year
    orders["purchase_month"] = orders["order_purchase_timestamp"].dt.month
    orders["purchase_quarter"] = orders["order_purchase_timestamp"].dt.quarter
    orders["purchase_day"] = orders["order_purchase_timestamp"].dt.day
    orders["purchase_day_of_week"] = orders["order_purchase_timestamp"].dt.dayofweek
    orders["purchase_hour"] = orders["order_purchase_timestamp"].dt.hour
    orders["is_weekend"] = orders["purchase_day_of_week"].isin([5, 6]).astype(int)
    
    # Compute delivery durations (days)
    orders["actual_delivery_days"] = (
        orders["order_delivered_customer_date"] - orders["order_purchase_timestamp"]
    ).dt.total_seconds() / 86400.0
    
    orders["estimated_delivery_days"] = (
        orders["order_estimated_delivery_date"] - orders["order_purchase_timestamp"]
    ).dt.total_seconds() / 86400.0
    
    # Delivery delay: positive if delivered after estimated date
    orders["delivery_delay_days"] = (
        orders["order_delivered_customer_date"] - orders["order_estimated_delivery_date"]
    ).dt.total_seconds() / 86400.0
    orders["is_delayed"] = (orders["delivery_delay_days"] > 0).astype(int)

    # Impute missing delivery metrics with median
    median_del = orders["actual_delivery_days"].median()
    orders["actual_delivery_days"] = orders["actual_delivery_days"].fillna(median_del)
    orders["delivery_delay_days"] = orders["delivery_delay_days"].fillna(0.0)

    # 3. Product translation and cleaning
    products = datasets["products"]
    translations = datasets["category_translation"]
    
    products = products.merge(translations, on="product_category_name", how="left")
    products["product_category"] = products["product_category_name_english"].fillna(
        products["product_category_name"]
    ).fillna("other")
    
    # Numerical dimensions imputation
    dim_cols = [
        "product_name_lenght", "product_description_lenght",
        "product_photos_qty", "product_weight_g",
        "product_length_cm", "product_height_cm", "product_width_cm"
    ]
    for col in dim_cols:
        if col in products.columns:
            products[col] = products[col].fillna(products[col].median())
    datasets["products"] = products

    # 4. Reviews processing
    reviews = datasets["reviews"]
    reviews["review_score"] = reviews["review_score"].fillna(reviews["review_score"].median())
    reviews["has_review_comment"] = reviews["review_comment_message"].notnull().astype(int)
    reviews["is_positive_review"] = (reviews["review_score"] >= 4).astype(int)
    reviews["is_negative_review"] = (reviews["review_score"] <= 2).astype(int)

    # 5. Payments processing
    payments = datasets["payments"]
    payments["payment_value"] = payments["payment_value"].fillna(0.0)
    payments["payment_installments"] = payments["payment_installments"].fillna(1)
    payments["payment_type"] = payments["payment_type"].fillna("not_defined")

    # 6. Order items outlier capping (Winsorization at 1% and 99%)
    order_items = datasets["order_items"]
    for col in ["price", "freight_value"]:
        if col in order_items.columns:
            q_low = order_items[col].quantile(0.005)
            q_high = order_items[col].quantile(0.995)
            order_items[f"{col}_capped"] = order_items[col].clip(lower=q_low, upper=q_high)

    print(" -> Preprocessing completed successfully.")
    return datasets
