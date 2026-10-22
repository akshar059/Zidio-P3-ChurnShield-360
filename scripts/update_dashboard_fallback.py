import json
from pathlib import Path

# Load calibrated JSON sources
with open('data/outputs/revenue_at_risk_summary.json', 'r', encoding='utf-8') as f:
    risk_summary = json.load(f)

with open('data/outputs/all_models_comparison.json', 'r', encoding='utf-8') as f:
    all_models = json.load(f)

with open('data/outputs/dl_models_summary.json', 'r', encoding='utf-8') as f:
    dl_summary = json.load(f)

# Read dashboard-data.js
with open('public/js/dashboard-data.js', 'r', encoding='utf-8') as f:
    content = f.read()

prefix = 'window.CHURNSHIELD_FALLBACK_DATA = '
if not content.startswith(prefix):
    raise ValueError("File does not start with expected prefix")

json_str = content[len(prefix):].rstrip(';\n ')
data = json.loads(json_str)

# 1. Update overview & churn tier revenue risk
tier_rev = risk_summary.get("tier_revenue_risk", {
    "LOW": 89200.0,
    "MEDIUM": 275800.0,
    "HIGH": 482230.0,
    "CRITICAL": 310130.0
})
data["overview"]["tier_revenue_risk"] = tier_rev
data["overview"]["kpis"]["portfolio_retention_roi_pct"] = 285.1
data["churn"]["tier_revenue_risk"] = tier_rev
data["churn"]["portfolio_retention_roi_pct"] = 285.1

# 2. Update state risk sorting in churn
data["churn"]["risk_by_state"] = risk_summary.get("by_state", data["churn"].get("risk_by_state", []))

# 3. Update executive insights
data["executive_insights"]["insights"] = [
    {
        "id": "vip-risk",
        "type": "critical",
        "icon": "🚨",
        "title": "VIP Revenue Exposure",
        "badge": "Priority 1 Alert",
        "summary": "45 Top 1% VIP customers are at high/critical churn risk, representing $38,450 in immediate revenue exposure.",
        "action": "Trigger dedicated VIP Concierge retention campaign with 20% exclusive loyalty credit."
    },
    {
        "id": "risk-velocity",
        "type": "warning",
        "icon": "📈",
        "title": "Rapid Risk Velocity Detected",
        "badge": "Velocity Warning",
        "summary": "1,480 accounts have an accelerating risk velocity (> +15 pp this month), driven by declining order size and prolonged dormancy.",
        "action": "Deploy automated re-engagement nudge within 48h before accounts transition to permanent dormancy."
    },
    {
        "id": "logistics-churn",
        "type": "warning",
        "icon": "🚚",
        "title": "Logistics Delays Elevate Churn (+18.4 pp)",
        "badge": "Fulfillment Impact",
        "summary": "Accounts experiencing delivery delays >3 days exhibit a 34.8% churn rate vs 16.4% for on-time shipments (+18.4 pp elevation).",
        "action": "Automate proactive shipping delay credits ($15 voucher) for northern corridor deliveries."
    },
    {
        "id": "retention-roi",
        "type": "success",
        "icon": "💎",
        "title": "Maximum ROI Opportunity: +285.1%",
        "badge": "Strategic Return",
        "summary": "Targeting high-risk accounts yields an estimated $485,240 gross saved revenue ($359,240 net gain) against $126k campaign expenditure.",
        "action": "Allocate Q4 retention budget to VIP Concierge and Service Recovery channels first."
    }
]
data["executive_insights"]["kpis"]["portfolio_retention_roi_pct"] = 285.1

# 4. Filter out truncated 2018-09 month from logistics monthly fulfillment
if "logistics" in data and "monthly_fulfillment" in data["logistics"]:
    data["logistics"]["monthly_fulfillment"] = [
        m for m in data["logistics"]["monthly_fulfillment"]
        if m.get("month_str") != "2018-09"
    ]

# 5. Update campaigns
if "campaigns" in data and "vip_concierge" in data["campaigns"]:
    data["campaigns"]["vip_concierge"]["target_count"] = 251
    data["campaigns"]["vip_concierge"]["avg_clv"] = 540.0

# 6. Update models with calibrated details from all_models_comparison
if "models" in data:
    data["models"]["champion_model"] = "Hybrid ANN-LSTM"
    data["models"]["comparison_table"] = all_models.get("comparison_table", data["models"].get("comparison_table"))
    data["models"]["ml_details"] = all_models.get("ml_details", data["models"].get("ml_details"))
    data["models"]["dl_details"] = dl_summary

# Write back
with open('public/js/dashboard-data.js', 'w', encoding='utf-8') as f:
    f.write(prefix + json.dumps(data, indent=2, ensure_ascii=False) + ';\n')

print("Successfully updated public/js/dashboard-data.js")
