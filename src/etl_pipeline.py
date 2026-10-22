"""
ETL & Integration Pipeline
Joins Customers, Orders, Order Items, Payments, Reviews, Products, and Sellers
into unified analytical datasets.
"""

from .config import DATA_PROCESSED_DIR

def build_master_analytical_tables(datasets: dict) -> dict:
    """
    Executes ETL joins and creates:
    1. master_sales_df (transaction-level dataset)
    2. customer_orders_df (order-level dataset linked to customer_unique_id)
    """
    print("\n" + "=" * 60)
    print("STEP 4: ETL & DATA INTEGRATION")
    print("=" * 60)
    
    customers = datasets["customers"]
    orders = datasets["orders"]
    order_items = datasets["order_items"]
    payments = datasets["payments"]
    reviews = datasets["reviews"]
    products = datasets["products"]
    sellers = datasets["sellers"]
    
    # Aggregate Payments per order
    print("Aggregating order-level payment features...")
    pay_agg = payments.groupby("order_id").agg(
        total_payment_value=("payment_value", "sum"),
        payment_type=("payment_type", lambda x: x.mode()[0] if not x.empty else "other"),
        avg_installments=("payment_installments", "mean"),
        max_installments=("payment_installments", "max"),
        payment_methods_count=("payment_type", "nunique"),
        has_credit_card=("payment_type", lambda x: int("credit_card" in x.values)),
        has_boleto=("payment_type", lambda x: int("boleto" in x.values)),
        has_voucher=("payment_type", lambda x: int("voucher" in x.values))
    ).reset_index()

    # Aggregate Reviews per order
    print("Aggregating order-level review features...")
    rev_agg = reviews.groupby("order_id").agg(
        review_score=("review_score", "mean"),
        is_positive_review=("is_positive_review", "max"),
        is_negative_review=("is_negative_review", "max"),
        has_review_comment=("has_review_comment", "max")
    ).reset_index()

    # Merge Orders + Customers
    print("Joining Orders with Customers...")
    orders_cust = orders.merge(
        customers[["customer_id", "customer_unique_id", "customer_city", "customer_state"]],
        on="customer_id",
        how="inner"
    )

    # Merge with Payments & Reviews
    orders_cust = orders_cust.merge(pay_agg, on="order_id", how="left")
    orders_cust = orders_cust.merge(rev_agg, on="order_id", how="left")
    
    # Fill defaults for orders without explicit reviews/payments
    orders_cust["total_payment_value"] = orders_cust["total_payment_value"].fillna(0.0)
    orders_cust["review_score"] = orders_cust["review_score"].fillna(orders_cust["review_score"].median())
    orders_cust["avg_installments"] = orders_cust["avg_installments"].fillna(1.0)
    orders_cust["has_credit_card"] = orders_cust["has_credit_card"].fillna(0).astype(int)
    orders_cust["has_boleto"] = orders_cust["has_boleto"].fillna(0).astype(int)
    orders_cust["has_voucher"] = orders_cust["has_voucher"].fillna(0).astype(int)

    # Prepare Items + Products + Sellers
    print("Joining Order Items with Products and Sellers...")
    items_prod = order_items.merge(
        products[["product_id", "product_category", "product_weight_g", "product_photos_qty"]],
        on="product_id",
        how="left"
    ).merge(
        sellers[["seller_id", "seller_city", "seller_state"]],
        on="seller_id",
        how="left"
    )

    # Full Master Sales Table (Line Item grain)
    print("Building unified Master Sales Transaction Table...")
    master_sales = items_prod.merge(
        orders_cust,
        on="order_id",
        how="inner"
    )

    # Save to disk for fast caching
    sales_file = DATA_PROCESSED_DIR / "master_sales.csv"
    master_sales.to_csv(sales_file, index=False)
    print(f" -> Master Sales dataset created: {master_sales.shape[0]:,} rows x {master_sales.shape[1]} cols")
    print(f" -> Saved to: {sales_file}")

    return {
        "master_sales": master_sales,
        "orders_cust": orders_cust
    }
