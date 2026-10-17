"""
Model Explainability and SHAP Interpretability Module
Extracts global feature importances, SHAP values summary,
and generates local customer-level churn driver explanations.
"""

import json
import numpy as np
import pandas as pd
import shap
from .config import DATA_OUTPUTS_DIR, RANDOM_STATE

def compute_shap_and_explainability(
    model, preprocessor, X_train_sample: pd.DataFrame, feature_names: list
) -> dict:
    """
    Computes SHAP value distributions and summary statistics for tree models.
    """
    print("\n" + "=" * 60)
    print("STEP 12: MODEL EXPLAINABILITY & SHAP ANALYSIS")
    print("=" * 60)

    try:
        # Transform sample
        X_sample_trans = preprocessor.transform(X_train_sample)
        # Use TreeExplainer for XGBoost or Random Forest
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(X_sample_trans)
        
        # If binary classification returns list of 2 arrays, take index 1 (positive class = churn)
        if isinstance(shap_values, list):
            shap_values = shap_values[1]
        elif len(shap_values.shape) == 3:
            shap_values = shap_values[:, :, 1]

        # Mean absolute SHAP value per feature
        mean_abs_shap = np.mean(np.abs(shap_values), axis=0)
        top_indices = np.argsort(mean_abs_shap)[::-1][:15]

        shap_summary_list = []
        for idx in top_indices:
            feat_name = feature_names[idx] if idx < len(feature_names) else f"feature_{idx}"
            shap_summary_list.append({
                "feature": feat_name,
                "mean_abs_shap": round(float(mean_abs_shap[idx]), 4),
                "impact_direction": "Positive correlation with churn risk" if np.mean(shap_values[:, idx]) > 0 else "Protective against churn"
            })
    except Exception as e:
        print(f"SHAP explanation fallback: {e}")
        # Robust fallback using model feature importances
        if hasattr(model, "feature_importances_"):
            importances = model.feature_importances_
            top_indices = np.argsort(importances)[::-1][:15]
            shap_summary_list = [
                {
                    "feature": feature_names[i] if i < len(feature_names) else f"feature_{i}",
                    "mean_abs_shap": round(float(importances[i]), 4),
                    "impact_direction": "High feature importance"
                }
                for i in top_indices
            ]
        else:
            shap_summary_list = []

    out_file = DATA_OUTPUTS_DIR / "shap_summary.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(shap_summary_list, f, indent=2)
    print(f" -> SHAP explainability summary saved to: {out_file}")

    return shap_summary_list

def generate_local_customer_drivers(customer_row: pd.Series) -> list[dict]:
    """
    Generates human-readable top 5 churn risk drivers for a specific customer.
    """
    drivers = []
    
    # 1. Recency
    rec = customer_row.get("recency_days", 0)
    if rec > 120:
        drivers.append({"factor": "Critical Inactivity", "detail": f"Last purchase was {int(rec)} days ago", "severity": "HIGH"})
    elif rec > 60:
        drivers.append({"factor": "Growing Recency Gap", "detail": f"Last purchase was {int(rec)} days ago", "severity": "MEDIUM"})
    else:
        drivers.append({"factor": "Active Recency", "detail": f"Recent order {int(rec)} days ago", "severity": "POSITIVE"})

    # 2. Spending Trend
    trend = customer_row.get("spending_trend", 0)
    if trend < -0.3:
        drivers.append({"factor": "Sharp Spending Deceleration", "detail": f"Spending declined {abs(trend)*100:.0f}% in recent 30d", "severity": "HIGH"})
    elif trend < 0:
        drivers.append({"factor": "Soft Spending Decline", "detail": f"30d spend decreased by {abs(trend)*100:.0f}%", "severity": "MEDIUM"})
    else:
        drivers.append({"factor": "Positive Spend Velocity", "detail": "Consistent or increasing monthly spend", "severity": "POSITIVE"})

    # 3. Review Score
    rev = customer_row.get("average_review_score", 5)
    if rev <= 2.0:
        drivers.append({"factor": "Severe Customer Dissatisfaction", "detail": f"Average review rating of {rev:.1f}/5.0", "severity": "HIGH"})
    elif rev < 4.0:
        drivers.append({"factor": "Moderate Rating Feedback", "detail": f"Average review score is {rev:.1f}/5.0", "severity": "MEDIUM"})
    else:
        drivers.append({"factor": "Delighted Feedback", "detail": f"High rating of {rev:.1f}/5.0", "severity": "POSITIVE"})

    # 4. Delivery Delay
    delay = customer_row.get("avg_delivery_delay", 0)
    late_ratio = customer_row.get("late_delivery_ratio", 0)
    if late_ratio > 0.3 or delay > 3:
        drivers.append({"factor": "Fulfillment Friction", "detail": f"Experienced delivery delays averaging {delay:.1f} days", "severity": "HIGH"})
    else:
        drivers.append({"factor": "On-Time Logistics", "detail": "Deliveries arrived promptly as estimated", "severity": "POSITIVE"})

    # 5. Order Frequency
    orders = customer_row.get("total_orders", 1)
    if orders == 1:
        drivers.append({"factor": "One-Time Shopper Pattern", "detail": "Customer has made only 1 lifetime order", "severity": "MEDIUM"})
    else:
        drivers.append({"factor": "Established Repeat Habit", "detail": f"Multiple lifetime purchases ({orders} orders)", "severity": "POSITIVE"})

    return drivers
