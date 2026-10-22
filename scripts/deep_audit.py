import json
import math
import sys
import re
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from fastapi.testclient import TestClient

def run_deep_audit():
    issues = []
    warnings = []
    passed = []

    print("=" * 70)
    print("STARTING DEEP CONSISTENCY & INTEGRITY AUDIT")
    print("=" * 70)

    # ---------------------------------------------------------
    # 1. REVENUE AT RISK & TIERS AUDIT
    # ---------------------------------------------------------
    with open('data/outputs/revenue_at_risk_summary.json', 'r', encoding='utf-8') as f:
        risk = json.load(f)

    tot_rev_risk = risk['total_revenue_at_risk']
    tiers = risk['tier_revenue_risk']
    tier_sum = sum(tiers.values())
    if round(tier_sum, 2) != round(tot_rev_risk, 2):
        issues.append(f"Revenue at Risk mismatch: total={tot_rev_risk} but tier sum={tier_sum}")
    else:
        passed.append(f"Revenue at Risk perfectly matches tier sum: ${tot_rev_risk:,.2f}")

    tot_cust = risk['total_customers']
    tier_counts = risk['tier_distribution']
    tier_count_sum = sum(tier_counts.values())
    if tier_count_sum != tot_cust:
        issues.append(f"Total customers {tot_cust} != tier counts sum {tier_count_sum}")
    else:
        passed.append(f"Customer counts match tier distribution sum: {tot_cust:,}")

    # Check state sorting in by_state
    states = risk.get('by_state', [])
    state_sorted = True
    for i in range(len(states) - 1):
        if states[i]['total_revenue_at_risk'] < states[i+1]['total_revenue_at_risk']:
            state_sorted = False
            issues.append(f"State risk not sorted descending: {states[i]['customer_state']} (${states[i]['total_revenue_at_risk']}) before {states[i+1]['customer_state']} (${states[i+1]['total_revenue_at_risk']})")
            break
    if state_sorted:
        passed.append("States in revenue_at_risk_summary.json are strictly sorted descending")

    # ---------------------------------------------------------
    # 2. MODELS & BENCHMARKS & CONFUSION MATRIX AUDIT
    # ---------------------------------------------------------
    with open('data/outputs/all_models_comparison.json', 'r', encoding='utf-8') as f:
        all_models = json.load(f)

    comp_table = {m['model']: m for m in all_models['comparison_table']}
    ml_details = all_models.get('ml_details', {})
    dl_details = all_models.get('dl_details', {})
    combined_details = {**ml_details, **dl_details}

    for model_name, row in comp_table.items():
        key = model_name
        detail = combined_details.get(key)
        if not detail:
            # Try alternate names
            if key == "ANN": detail = combined_details.get("PyTorch ANN")
            elif key == "LSTM": detail = combined_details.get("PyTorch LSTM")
        if not detail:
            warnings.append(f"Model {model_name} in comparison table has no entry in ml_details/dl_details")
            continue

        cm = detail.get('confusion_matrix')
        if not cm or len(cm) != 2 or len(cm[0]) != 2 or len(cm[1]) != 2:
            issues.append(f"Model {model_name} has invalid confusion matrix: {cm}")
            continue

        tn, fp = cm[0]
        fn, tp = cm[1]
        cm_total = tn + fp + fn + tp
        if cm_total != 5000:
            warnings.append(f"Model {model_name} CM total is {cm_total}, expected 5000")

        acc = (tn + tp) / cm_total
        prec = tp / (tp + fp) if (tp + fp) > 0 else 0
        rec = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1 = 2 * (prec * rec) / (prec + rec) if (prec + rec) > 0 else 0

        # Check alignment with row values
        row_acc = row['accuracy']
        row_prec = row['precision']
        row_rec = row['recall']
        row_f1 = row['f1_score']

        if abs(acc - row_acc) > 0.02:
            issues.append(f"Model {model_name} CM accuracy {acc:.4f} diverges from table {row_acc:.4f}")
        else:
            passed.append(f"Model {model_name} CM accuracy ({acc:.4f}) matches table ({row_acc:.4f})")

        if abs(prec - row_prec) > 0.02:
            issues.append(f"Model {model_name} CM precision {prec:.4f} diverges from table {row_prec:.4f}")
        if abs(rec - row_rec) > 0.02:
            issues.append(f"Model {model_name} CM recall {rec:.4f} diverges from table {row_rec:.4f}")

    # Check ROC curves shape
    for mname, mdetail in combined_details.items():
        roc = mdetail.get('roc_curve', [])
        if roc:
            if roc[0]['fpr'] != 0.0 or roc[0]['tpr'] != 0.0:
                issues.append(f"Model {mname} ROC does not start at (0, 0)")
            if roc[-1]['fpr'] != 1.0 or roc[-1]['tpr'] != 1.0:
                issues.append(f"Model {mname} ROC does not end at (1, 1)")
            # Check concavity / non-decreasing
            decreasing_tpr = [i for i in range(len(roc)-1) if roc[i+1]['tpr'] < roc[i]['tpr']]
            if decreasing_tpr:
                issues.append(f"Model {mname} ROC has non-monotonic TPR at indices {decreasing_tpr}")
            else:
                passed.append(f"Model {mname} ROC is monotonic from (0,0) to (1,1)")

        pr = mdetail.get('pr_curve', [])
        if pr:
            # Check recall is ascending
            recalls = [p['recall'] for p in pr]
            rec_ascending = all(recalls[i] <= recalls[i+1] for i in range(len(recalls)-1))
            if not rec_ascending:
                issues.append(f"Model {mname} PR curve recall is not strictly ascending (backwards axis risk)")
            else:
                passed.append(f"Model {mname} PR curve recall is sorted ascending (0.0 -> 1.0)")

    # ---------------------------------------------------------
    # 3. BACKEND API ENDPOINTS INTEGRATION AUDIT
    # ---------------------------------------------------------
    from src.server import app
    client = TestClient(app)

    endpoints = [
        ('/api/overview', ['kpis', 'tier_distribution', 'tier_revenue_risk']),
        ('/api/executive-insights', ['kpis', 'insights']),
        ('/api/cohort-retention', ['cohort_matrix', 'segment_retention_curves']),
        ('/api/calibration-curve', ['brier_score', 'calibration_bins']),
        ('/api/sales', ['kpis', 'monthly_trend']),
        ('/api/customers', ['segment_stats']),
        ('/api/churn', ['overall_churn_rate_pct', 'tier_distribution']),
        ('/api/models', ['champion_model', 'comparison_table', 'ml_details', 'dl_details']),
        ('/api/logistics', ['kpis', 'monthly_fulfillment']),
        ('/api/sellers-products', ['top_sellers', 'category_performance']),
        ('/api/campaigns', ['vip_concierge']),
        ('/api/customers-catalog?limit=10', ['total', 'tier_counts', 'records']),
    ]

    for url, req_keys in endpoints:
        resp = client.get(url)
        if resp.status_code != 200:
            issues.append(f"Endpoint {url} returned status {resp.status_code}")
        else:
            j = resp.json()
            missing = [k for k in req_keys if k not in j]
            if missing:
                issues.append(f"Endpoint {url} missing required keys: {missing}")
            else:
                passed.append(f"Endpoint {url} OK (Status 200, valid structure)")

    # Test predict churn endpoint
    pred_resp = client.post('/api/predict-churn', json={
        "recency_days": 45.0,
        "total_orders": 2,
        "total_spend": 250.0,
        "average_review_score": 4.5,
        "avg_delivery_delay": 0.0,
        "spending_trend": 0.1,
        "predicted_clv": 350.0
    })
    if pred_resp.status_code != 200:
        issues.append(f"Predict churn endpoint returned {pred_resp.status_code}")
    else:
        pj = pred_resp.json()
        if "churn_probability" not in pj or "revenue_at_risk" not in pj:
            issues.append(f"Predict churn missing keys: {pj}")
        else:
            passed.append(f"Predict churn endpoint OK: prob={pj['churn_percentage']}%, rev_at_risk=${pj['revenue_at_risk']}")

    # ---------------------------------------------------------
    # 4. CUSTOMER CATALOG INTEGRITY SCAN
    # ---------------------------------------------------------
    print("Scanning 25,000 customer records in catalog...")
    with open('data/outputs/customer_explorer_catalog.json', 'r', encoding='utf-8') as f:
        catalog = json.load(f)

    if len(catalog) != 25000:
        issues.append(f"Catalog length is {len(catalog)}, expected 25000")
    else:
        passed.append("Catalog contains exactly 25,000 customer records")

    threshold_mismatches = 0
    vip_count = 0
    vip_high_critical = 0
    negative_values = 0

    for c in catalog:
        prob = c.get('final_churn_prob', 0)
        tier = c.get('risk_tier', '')
        # Verify strict standard bounds:
        # <= 0.30 LOW, 0.30 - 0.60 MEDIUM, 0.60 - 0.80 HIGH, > 0.80 CRITICAL
        expected_tier = "CRITICAL" if prob > 0.80 else ("HIGH" if prob >= 0.60 else ("MEDIUM" if prob >= 0.30 else "LOW"))
        if tier != expected_tier:
            threshold_mismatches += 1

        if c.get('is_top_1pct'):
            vip_count += 1
            if tier in ['HIGH', 'CRITICAL']:
                vip_high_critical += 1

        if c.get('revenue_at_risk', 0) < 0 or c.get('total_spend', 0) < 0:
            negative_values += 1

    if threshold_mismatches > 0:
        issues.append(f"Found {threshold_mismatches} customer records where risk_tier does not match probability threshold!")
    else:
        passed.append("All 25,000 customer records strictly adhere to risk tier thresholds")

    if vip_count != 251:
        issues.append(f"Total VIP count is {vip_count}, expected 251")
    else:
        passed.append(f"Total VIP count is exactly 251 ({vip_high_critical} in High/Critical risk)")

    if negative_values > 0:
        issues.append(f"Found {negative_values} records with negative spend or revenue at risk")

    # ---------------------------------------------------------
    # 5. CODEBASE TEXT SEARCH FOR STALE / CONTRADICTORY STRINGS
    # ---------------------------------------------------------
    stale_patterns = [
        (r'0\.0046', 'Stale Brier score 0.0046'),
        (r'94\.2%', 'Stale AUC 94.2% (should be 92.4%)'),
        (r'87\.5%', 'Stale Recall 87.5% (should be 86.2%)'),
        (r'1,379,776', 'Stale tier sum 1,379,776 (should be 1,157,360)'),
        (r'\$1\.25M', 'Stale category revenue 1.25M (should be 1.26M)'),
        (r'38\.6% churn rate vs 20\.2%', 'Stale delivery churn text 38.6% vs 20.2%'),
        (r'342\s+(?:Top|VIP)', 'Stale VIP count 342'),
        (r'\[\[14,\s*10\],\s*\[48,\s*4928\]\]', 'Stale Random Forest matrix [[14, 10], [48, 4928]]'),
        (r'\[\[21,\s*3\],\s*\[16,\s*4960\]\]', 'Stale Hybrid matrix [[21, 3], [16, 4960]]'),
    ]

    files_to_check = [
        'public/index.html',
        'public/js/app.js',
        'public/js/charts.js',
        'public/js/dashboard-data.js',
        'src/server.py'
    ]

    for fpath in files_to_check:
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()
        for pat, desc in stale_patterns:
            matches = list(re.finditer(pat, content))
            if matches:
                issues.append(f"{desc} found in {fpath} ({len(matches)} occurrences)")
            else:
                passed.append(f"No {desc} in {fpath}")

    # ---------------------------------------------------------
    # SUMMARY REPORT
    # ---------------------------------------------------------
    print("\n" + "=" * 70)
    print(f"AUDIT RESULTS: {len(passed)} PASSED, {len(warnings)} WARNINGS, {len(issues)} ISSUES")
    print("=" * 70)

    if passed:
        print(f"\n[+] PASSED CHECKS ({len(passed)}):")
        for p in passed:
            print(f"  [OK] {p}")

    if warnings:
        print(f"\n[!] WARNINGS ({len(warnings)}):")
        for w in warnings:
            print(f"  [WARN] {w}")

    if issues:
        print(f"\n[X] ISSUES FOUND ({len(issues)}):")
        for iss in issues:
            print(f"  [FAIL] {iss}")
    else:
        print("\nALL CONTRADICTIONS OR IRREGULARITIES RESOLVED!")

run_deep_audit()
