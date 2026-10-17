import os
from pathlib import Path

# Base Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATASET_DIR = BASE_DIR / "dataset"
DATA_PROCESSED_DIR = BASE_DIR / "data" / "processed"
DATA_OUTPUTS_DIR = BASE_DIR / "data" / "outputs"
PUBLIC_DIR = BASE_DIR / "public"

# Ensure directories exist
DATA_PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
DATA_OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

# Dataset file names
DATA_FILES = {
    "customers": "olist_customers_dataset.csv",
    "orders": "olist_orders_dataset.csv",
    "order_items": "olist_order_items_dataset.csv",
    "payments": "olist_order_payments_dataset.csv",
    "reviews": "olist_order_reviews_dataset.csv",
    "products": "olist_products_dataset.csv",
    "sellers": "olist_sellers_dataset.csv",
    "geolocation": "olist_geolocation_dataset.csv",
    "category_translation": "product_category_name_translation.csv"
}

# Date Columns in Orders
ORDER_DATE_COLS = [
    "order_purchase_timestamp",
    "order_approved_at",
    "order_delivered_carrier_date",
    "order_delivered_customer_date",
    "order_estimated_delivery_date"
]

# Churn Target Setup
# In e-commerce datasets without subscription churn, a time-based window approach is best practice:
# We designate an observation cutoff date (e.g. 90 or 120 days before the latest date in the dataset).
# Customers who purchased during the history period are evaluated:
# churn = 1 if they made 0 purchases in the prediction window (next 90-180 days), else 0.
PREDICTION_WINDOW_DAYS = 90
OBSERVATION_MONTHS_SEQUENCE = 6  # Timesteps for LSTM / monthly sequences

# Risk Scoring Tiers (Probability based)
RISK_TIERS = {
    "LOW": (0.0, 0.30),
    "MEDIUM": (0.30, 0.60),
    "HIGH": (0.60, 0.80),
    "CRITICAL": (0.80, 1.00)
}

# Segmentation K-Means settings
KMEANS_N_CLUSTERS = 5
RANDOM_STATE = 42

# Deep Learning settings
DL_BATCH_SIZE = 128
DL_EPOCHS = 15
DL_LEARNING_RATE = 0.001
