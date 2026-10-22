"""
Sales Analytics and Time Series Forecasting Module
Computes sales metrics, category/geographic distributions, MoM growth,
and projects future sales trends using Time Series Forecasting.
"""

import pandas as pd
import json
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from .config import DATA_OUTPUTS_DIR

def run_sales_analytics_and_forecasting(master_sales: pd.DataFrame, forecast_periods: int = 6) -> dict:
    """
    Computes comprehensive sales analytics and generates a 6-month revenue forecast.
    """
    print("\n" + "=" * 60)
    print("STEP 11: SALES ANALYTICS & TIME SERIES FORECASTING")
    print("=" * 60)

    df = master_sales.copy()
    df["order_purchase_timestamp"] = pd.to_datetime(df["order_purchase_timestamp"])

    # High-level KPIs
    total_revenue = float(df["price"].sum())
    total_freight = float(df["freight_value"].sum())
    total_orders = int(df["order_id"].nunique())
    total_customers = int(df["customer_unique_id"].nunique())
    total_units_sold = int(len(df))
    aov = float(total_revenue / max(total_orders, 1))

    print(f"Total Revenue: ${total_revenue:,.2f} | Total Orders: {total_orders:,} | AOV: ${aov:.2f}")

    # Monthly Sales Trend
    df["order_month_period"] = df["order_purchase_timestamp"].dt.to_period("M").dt.to_timestamp()
    monthly_sales = df.groupby("order_month_period").agg(
        revenue=("price", "sum"),
        orders=("order_id", "nunique"),
        customers=("customer_unique_id", "nunique"),
        units=("order_item_id", "count")
    ).reset_index()

    # Filter out initial/tail partial months if any (< 100 orders)
    monthly_sales = monthly_sales[monthly_sales["orders"] > 100].sort_values("order_month_period").reset_index(drop=True)
    
    # Calculate MoM Revenue Growth
    monthly_sales["mom_revenue_growth_pct"] = (
        monthly_sales["revenue"].pct_change() * 100.0
    ).fillna(0.0).round(2)

    monthly_records = []
    for _, row in monthly_sales.iterrows():
        monthly_records.append({
            "month": row["order_month_period"].strftime("%Y-%m"),
            "revenue": round(float(row["revenue"]), 2),
            "orders": int(row["orders"]),
            "customers": int(row["customers"]),
            "units": int(row["units"]),
            "mom_growth_pct": float(row["mom_revenue_growth_pct"])
        })

    # Top Product Categories
    top_categories = df.groupby("product_category").agg(
        revenue=("price", "sum"),
        orders=("order_id", "nunique"),
        units=("order_item_id", "count")
    ).reset_index().sort_values("revenue", ascending=False).head(10)
    top_categories_records = top_categories.round({"revenue": 2}).to_dict(orient="records")

    # Sales by State
    sales_by_state = df.groupby("customer_state").agg(
        revenue=("price", "sum"),
        orders=("order_id", "nunique")
    ).reset_index().sort_values("revenue", ascending=False).head(12)
    sales_by_state_records = sales_by_state.round({"revenue": 2}).to_dict(orient="records")

    # Payment Methods (Translated to English)
    if "payment_type" in df.columns:
        payment_map = {
            "credit_card": "Credit Card",
            "boleto": "Bank Slip",
            "debit_card": "Debit Card",
            "voucher": "Voucher"
        }
        df_pay = df.copy()
        df_pay["payment_display"] = df_pay["payment_type"].map(payment_map).fillna(df_pay["payment_type"])
        payment_breakdown = df_pay.groupby("payment_display").agg(
            total_value=("price", "sum"),
            transactions=("order_id", "nunique")
        ).reset_index().rename(columns={"payment_display": "payment_type"}).sort_values("total_value", ascending=False)
        payment_records = payment_breakdown.round({"total_value": 2}).to_dict(orient="records")
    else:
        payment_records = []

    # Time Series Forecasting using Exponential Smoothing (Holt-Winters)
    ts_series = monthly_sales.set_index("order_month_period")["revenue"]
    try:
        # Fit additive trend
        model_hw = ExponentialSmoothing(
            ts_series, trend="add", seasonal=None, initialization_method="estimated"
        ).fit()
        forecast_values = model_hw.forecast(forecast_periods)
        
        # Build forecast timeline
        last_date = ts_series.index[-1]
        forecast_records = []
        for i, val in enumerate(forecast_values):
            fut_date = last_date + pd.DateOffset(months=i + 1)
            f_val = max(float(val), 0.0)
            forecast_records.append({
                "month": fut_date.strftime("%Y-%m"),
                "forecast_revenue": round(f_val, 2),
                "lower_bound": round(f_val * 0.88, 2),
                "upper_bound": round(f_val * 1.12, 2)
            })
    except Exception as e:
        print(f"Forecasting fallback due to: {e}")
        # Robust linear projection fallback
        last_val = float(ts_series.iloc[-1])
        avg_mom = float(monthly_sales["mom_revenue_growth_pct"].iloc[-6:].mean() / 100.0)
        forecast_records = []
        curr = last_val
        last_date = ts_series.index[-1]
        for i in range(forecast_periods):
            fut_date = last_date + pd.DateOffset(months=i + 1)
            curr = curr * (1.0 + avg_mom)
            forecast_records.append({
                "month": fut_date.strftime("%Y-%m"),
                "forecast_revenue": round(curr, 2),
                "lower_bound": round(curr * 0.85, 2),
                "upper_bound": round(curr * 1.15, 2)
            })

    summary = {
        "kpis": {
            "total_revenue": round(total_revenue, 2),
            "total_freight": round(total_freight, 2),
            "total_orders": total_orders,
            "total_customers": total_customers,
            "units_sold": total_units_sold,
            "average_order_value": round(aov, 2)
        },
        "monthly_trend": monthly_records,
        "top_categories": top_categories_records,
        "sales_by_state": sales_by_state_records,
        "payment_breakdown": payment_records,
        "forecast": forecast_records
    }

    out_file = DATA_OUTPUTS_DIR / "sales_analytics_summary.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    print(f" -> Sales analytics & forecast summary saved to: {out_file}")

    return summary
