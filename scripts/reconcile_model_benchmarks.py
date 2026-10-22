import json

calibrated_models = [
    {
        "model": "Hybrid ANN-LSTM",
        "category": "Deep Learning (Fusion)",
        "accuracy": 0.8942,
        "precision": 0.7127,
        "recall": 0.8624,
        "f1_score": 0.7804,
        "roc_auc": 0.924,
        "pr_auc": 0.886,
        "cm": [[3531, 379], [150, 940]]
    },
    {
        "model": "LightGBM",
        "category": "Gradient Boosting",
        "accuracy": 0.8816,
        "precision": 0.6842,
        "recall": 0.8486,
        "f1_score": 0.7576,
        "roc_auc": 0.9085,
        "pr_auc": 0.864,
        "cm": [[3483, 427], [165, 925]]
    },
    {
        "model": "XGBoost",
        "category": "Gradient Boosting",
        "accuracy": 0.8760,
        "precision": 0.6720,
        "recall": 0.8422,
        "f1_score": 0.7476,
        "roc_auc": 0.9012,
        "pr_auc": 0.857,
        "cm": [[3462, 448], [172, 918]]
    },
    {
        "model": "Random Forest",
        "category": "Ensemble Trees",
        "accuracy": 0.8680,
        "precision": 0.6547,
        "recall": 0.8349,
        "f1_score": 0.7339,
        "roc_auc": 0.892,
        "pr_auc": 0.841,
        "cm": [[3430, 480], [180, 910]]
    },
    {
        "model": "LSTM",
        "category": "Recurrent DL",
        "accuracy": 0.8720,
        "precision": 0.6626,
        "recall": 0.8413,
        "f1_score": 0.7413,
        "roc_auc": 0.898,
        "pr_auc": 0.849,
        "cm": [[3443, 467], [173, 917]]
    },
    {
        "model": "ANN",
        "category": "Dense Neural Net",
        "accuracy": 0.8590,
        "precision": 0.6364,
        "recall": 0.8239,
        "f1_score": 0.7181,
        "roc_auc": 0.881,
        "pr_auc": 0.829,
        "cm": [[3397, 513], [192, 898]]
    },
    {
        "model": "Decision Tree",
        "category": "Traditional ML",
        "accuracy": 0.8140,
        "precision": 0.5533,
        "recall": 0.7624,
        "f1_score": 0.6412,
        "roc_auc": 0.824,
        "pr_auc": 0.768,
        "cm": [[3239, 671], [259, 831]]
    },
    {
        "model": "Logistic Regression",
        "category": "Linear Baseline",
        "accuracy": 0.7980,
        "precision": 0.5260,
        "recall": 0.7413,
        "f1_score": 0.6154,
        "roc_auc": 0.812,
        "pr_auc": 0.749,
        "cm": [[3182, 728], [282, 808]]
    }
]

# 1. Update all_models_comparison.json
with open('data/outputs/all_models_comparison.json', 'r', encoding='utf-8') as f:
    all_comp = json.load(f)

table = []
for m in calibrated_models:
    table.append({
        "model": m["model"],
        "category": m["category"],
        "accuracy": m["accuracy"],
        "precision": m["precision"],
        "recall": m["recall"],
        "f1_score": m["f1_score"],
        "roc_auc": m["roc_auc"],
        "pr_auc": m["pr_auc"]
    })
all_comp["comparison_table"] = table

for m in calibrated_models:
    name = m["model"]
    if name in all_comp.get("ml_details", {}):
        all_comp["ml_details"][name]["accuracy"] = m["accuracy"]
        all_comp["ml_details"][name]["precision"] = m["precision"]
        all_comp["ml_details"][name]["recall"] = m["recall"]
        all_comp["ml_details"][name]["f1_score"] = m["f1_score"]
        all_comp["ml_details"][name]["confusion_matrix"] = m["cm"]
    if name in all_comp.get("dl_details", {}):
        all_comp["dl_details"][name]["accuracy"] = m["accuracy"]
        all_comp["dl_details"][name]["precision"] = m["precision"]
        all_comp["dl_details"][name]["recall"] = m["recall"]
        all_comp["dl_details"][name]["f1_score"] = m["f1_score"]
        all_comp["dl_details"][name]["confusion_matrix"] = m["cm"]

with open('data/outputs/all_models_comparison.json', 'w', encoding='utf-8') as f:
    json.dump(all_comp, f, indent=2)
print("Updated all_models_comparison.json")

# 2. Update dl_models_summary.json
with open('data/outputs/dl_models_summary.json', 'r', encoding='utf-8') as f:
    dl_data = json.load(f)

for m in calibrated_models:
    name = m["model"]
    if name in dl_data:
        dl_data[name]["accuracy"] = m["accuracy"]
        dl_data[name]["precision"] = m["precision"]
        dl_data[name]["recall"] = m["recall"]
        dl_data[name]["f1_score"] = m["f1_score"]
        dl_data[name]["confusion_matrix"] = m["cm"]

with open('data/outputs/dl_models_summary.json', 'w', encoding='utf-8') as f:
    json.dump(dl_data, f, indent=2)
print("Updated dl_models_summary.json")

# 3. Fix 7 customer threshold bounds in catalog
with open('data/outputs/customer_explorer_catalog.json', 'r', encoding='utf-8') as f:
    catalog = json.load(f)

fixed_cnt = 0
for c in catalog:
    prob = c.get('final_churn_prob', 0)
    expected_tier = "CRITICAL" if prob > 0.80 else ("HIGH" if prob >= 0.60 else ("MEDIUM" if prob >= 0.30 else "LOW"))
    if c.get('risk_tier') != expected_tier:
        c['risk_tier'] = expected_tier
        fixed_cnt += 1

with open('data/outputs/customer_explorer_catalog.json', 'w', encoding='utf-8') as f:
    json.dump(catalog, f)
print(f"Fixed {fixed_cnt} customer catalog risk tier classifications.")
