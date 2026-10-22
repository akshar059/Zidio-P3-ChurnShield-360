"""
Risk Scoring, Revenue at Risk, and Retention Recommendation Engine
Computes:
- Individual Customer Risk Tiers (Low, Medium, High, Critical)
- Revenue at Risk (CLV * Churn Probability)
- Rule + ML Retention Recommendation & Next-Best-Action
"""

import pandas as pd
import numpy as np
import json
from .config import RISK_TIERS, DATA_OUTPUTS_DIR

def compute_risk_scoring_and_revenue_at_risk(
    cust_df: pd.DataFrame, churn_probs: np.ndarray, model_name: str = "Hybrid ANN-LSTM"
) -> tuple[pd.DataFrame, dict]:
    """
    Enriches customer dataset with churn probabilities, risk tiers, revenue at risk,
    and personalized next-best retention actions.
    """
    print("\n" + "=" * 60)
    print("STEP 10: RISK SCORING & REVENUE AT RISK ENGINE")
    print("=" * 60)

    df = cust_df.copy()
    df["churn_probability"] = np.round(churn_probs, 4)
    
    # Risk Tier assignment using configured RISK_TIERS
    def assign_risk_tier(prob):
        for tier, (low, high) in RISK_TIERS.items():
            if low <= prob <= high:
                return tier
        return "CRITICAL"

    df["risk_tier"] = df["churn_probability"].apply(assign_risk_tier)

    # Revenue at Risk = Predicted CLV * Churn Probability
    df["revenue_at_risk"] = (df["predicted_clv"] * df["churn_probability"]).round(2)

    # Next-Best-Action & Retention Recommendation Engine
    def determine_recommendation(row):
        prob = row["churn_probability"]
        clv = row["predicted_clv"]
        rev = row["average_review_score"]
        late = row["late_delivery_ratio"]
        tot_orders = row["total_orders"]
        
        if prob >= 0.70 and clv >= 300:
            return {
                "action": "VIP Concierge Retention",
                "channel": "Direct Call / Dedicated Account Manager",
                "offer": "25% Exclusive Loyalty Credit + Free Express Shipping",
                "urgency": "Immediate (Within 24h)"
            }
        elif rev <= 2.5:
            return {
                "action": "Service Recovery Outreach",
                "channel": "Customer Support Escalation Email",
                "offer": "Formal Apology + $25 Store Credit Voucher",
                "urgency": "High (Within 48h)"
            }
        elif late >= 0.5:
            return {
                "action": "Logistics Apology Nudge",
                "channel": "Automated SMS / Email",
                "offer": "Free Priority Shipping on Next 3 Orders",
                "urgency": "Medium"
            }
        elif tot_orders == 1 and prob >= 0.50:
            return {
                "action": "Second-Purchase Accelerator",
                "channel": "Personalized Email Campaign",
                "offer": "15% Off Favorite Category Re-order",
                "urgency": "Medium"
            }
        elif prob >= 0.60:
            return {
                "action": "Win-Back Re-engagement",
                "channel": "Marketing Automation Email",
                "offer": "Limited-Time 20% Discount Code",
                "urgency": "Medium"
            }
        elif clv >= 400:
            return {
                "action": "Loyalty Appreciation",
                "channel": "VIP Newsletter",
                "offer": "Early Access to New Category Drops",
                "urgency": "Low / Routine"
            }
        else:
            return {
                "action": "Standard Engagement",
                "channel": "Periodic Product Recommendations",
                "offer": "Personalized Product Discovery",
                "urgency": "Standard"
            }

    recs = [determine_recommendation(row) for _, row in df.iterrows()]
    df["recommended_action"] = [r["action"] for r in recs]
    df["recommendation_offer"] = [r["offer"] for r in recs]
    df["recommendation_channel"] = [r["channel"] for r in recs]
    df["recommendation_urgency"] = [r["urgency"] for r in recs]

    # Multi-Horizon Early-Warning Churn (30-day, 60-day, 90-day)
    rec_factor = (df["recency_days"] / 90.0).clip(0.0, 1.0)
    df["churn_prob_30d"] = (df["churn_probability"] * (0.35 + 0.60 * rec_factor)).clip(0.05, 0.99).round(4)
    df["churn_prob_60d"] = (df["churn_probability"] * (0.65 + 0.32 * rec_factor)).clip(0.08, 0.99).round(4)
    df["churn_prob_90d"] = df["churn_probability"]

    # Risk Velocity & Trajectory
    df["risk_velocity"] = (
        -df["spending_trend"] * 22.0 +
        (df["recency_days"] / 90.0) * 12.0 -
        (df["total_orders"] > 1).astype(float) * 6.0
    ).clip(-35.0, 48.0).round(1)

    def assign_trajectory(vel):
        if vel >= 18.0:
            return "🚨 Rapidly Deteriorating"
        elif vel >= 5.0:
            return "↑ Increasing Risk"
        elif vel <= -5.0:
            return "↓ Improving"
        else:
            return "→ Stable"

    df["risk_trajectory"] = df["risk_velocity"].apply(assign_trajectory)

    # Retention ROI Optimization
    def compute_individual_retention_economics(row):
        prob = row["churn_probability"]
        clv = row["predicted_clv"]
        rev = row.get("average_review_score", 4.0)
        orders = row.get("total_orders", 1)
        rec = row.get("recency_days", 60)

        if prob >= 0.70 and clv >= 300:
            cost = 35.0
            base_save = 0.65
        elif rev <= 2.5:
            cost = 25.0
            base_save = 0.58
        elif prob >= 0.60:
            cost = 15.0
            base_save = 0.50
        else:
            cost = 8.0
            base_save = 0.45

        save_prob = base_save
        if rev >= 4.0:
            save_prob += 0.08
        if orders > 1:
            save_prob += 0.05
        if rec > 180:
            save_prob -= 0.12
        save_prob = float(np.clip(save_prob, 0.25, 0.85))

        rev_at_risk = row["revenue_at_risk"]
        exp_retention_val = round((rev_at_risk * save_prob) - cost, 2)
        roi_pct = round((exp_retention_val / max(cost, 1.0)) * 100.0, 1)

        return cost, round(save_prob, 2), exp_retention_val, roi_pct

    econ_results = [compute_individual_retention_economics(row) for _, row in df.iterrows()]
    df["retention_campaign_cost"] = [e[0] for e in econ_results]
    df["expected_save_prob"] = [e[1] for e in econ_results]
    df["expected_retention_value"] = [e[2] for e in econ_results]
    df["individual_retention_roi"] = [e[3] for e in econ_results]

    # Counterfactual Explanations
    def generate_counterfactual(row):
        prob = row["churn_probability"]
        rec = row["recency_days"]
        rev = row.get("average_review_score", 4.0)
        orders = row.get("total_orders", 1)
        delay = row.get("avg_delivery_delay", 0.0)

        if delay > 2.0:
            target_prob = max(0.12, round(prob - 0.28, 2))
            return f"If delivery delay is reduced to ≤1 day and logistics apology voucher ($15) is sent, predicted churn drops from {int(prob*100)}% to {int(target_prob*100)}%."
        elif rev <= 2.5:
            target_prob = max(0.15, round(prob - 0.32, 2))
            return f"If customer service escalates outreach and post-resolution CSAT reaches 4.5+, predicted churn falls from {int(prob*100)}% to {int(target_prob*100)}%."
        elif orders == 1:
            target_prob = max(0.18, round(prob - 0.36, 2))
            return f"If 2nd-purchase accelerator coupon (15% off) triggers repeat order within 30 days, predicted churn drops from {int(prob*100)}% to {int(target_prob*100)}%."
        else:
            target_prob = max(0.10, round(prob - 0.24, 2))
            return f"If monthly order frequency is restored to 2 orders/month via VIP loyalty credit, predicted churn drops from {int(prob*100)}% to {int(target_prob*100)}%."

    df["counterfactual_explanation"] = [generate_counterfactual(row) for _, row in df.iterrows()]

    # Portfolio Aggregations
    total_rev_at_risk = float(df["revenue_at_risk"].sum())
    total_expected_clv = float(df["predicted_clv"].sum())
    overall_churn_rate = float(df["churn_probability"].mean() * 100.0)
    total_expected_retention_val = float(df["expected_retention_value"].sum())
    total_retention_campaign_cost = float(df["retention_campaign_cost"].sum())
    portfolio_roi_pct = round((total_expected_retention_val / max(total_retention_campaign_cost, 1.0)) * 100.0, 1)

    tier_counts = df["risk_tier"].value_counts().to_dict()
    tier_rev_risk = df.groupby("risk_tier")["revenue_at_risk"].sum().round(2).to_dict()
    trajectory_counts = df["risk_trajectory"].value_counts().to_dict()

    risk_by_segment = df.groupby("kmeans_segment").agg(
        customers=("customer_unique_id", "count"),
        avg_churn_prob=("churn_probability", "mean"),
        total_revenue_at_risk=("revenue_at_risk", "sum"),
        expected_retention_val=("expected_retention_value", "sum")
    ).reset_index().to_dict(orient="records")

    risk_by_state = df.groupby("customer_state").agg(
        customers=("customer_unique_id", "count"),
        avg_churn_prob=("churn_probability", "mean"),
        total_revenue_at_risk=("revenue_at_risk", "sum")
    ).reset_index().sort_values(by="total_revenue_at_risk", ascending=False).head(15).to_dict(orient="records")

    portfolio_summary = {
        "model_used": model_name,
        "total_customers": len(df),
        "overall_churn_rate_pct": round(overall_churn_rate, 2),
        "total_portfolio_clv": round(total_expected_clv, 2),
        "total_revenue_at_risk": round(total_rev_at_risk, 2),
        "revenue_at_risk_pct_of_clv": round((total_rev_at_risk / max(total_expected_clv, 1.0)) * 100.0, 2),
        "total_expected_retention_value": round(total_expected_retention_val, 2),
        "portfolio_retention_roi_pct": portfolio_roi_pct,
        "tier_distribution": tier_counts,
        "tier_revenue_risk": tier_rev_risk,
        "trajectory_distribution": trajectory_counts,
        "risk_by_segment": risk_by_segment,
        "risk_by_state": risk_by_state
    }

    out_file = DATA_OUTPUTS_DIR / "revenue_at_risk_summary.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(portfolio_summary, f, indent=2)
    print(f" -> Portfolio Risk & Revenue at Risk summary saved to: {out_file}")
    print(f" -> Total Portfolio Revenue at Risk: ${total_rev_at_risk:,.2f}")
    print(f" -> Expected Retention Value: ${total_expected_retention_val:,.2f} (ROI: {portfolio_roi_pct}%)")

    return df, portfolio_summary
