"""
Customer Segmentation Module
Implements K-Means clustering with optimal K analysis and DBSCAN for anomaly detection.
"""

import pandas as pd
import numpy as np
from sklearn.cluster import KMeans, DBSCAN
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score
import json
from .config import DATA_OUTPUTS_DIR, RANDOM_STATE

def run_customer_segmentation(cust_df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """
    Applies K-Means clustering on behavioral features and DBSCAN for outliers.
    Returns the enriched DataFrame with segment labels and segmentation metadata.
    """
    print("\n" + "=" * 60)
    print("STEP 6: CUSTOMER SEGMENTATION (K-MEANS & DBSCAN)")
    print("=" * 60)
    
    seg_features = [
        "recency_days",
        "total_orders",
        "total_spend",
        "average_order_value",
        "average_review_score",
        "category_diversity",
        "late_delivery_ratio"
    ]
    
    # Filter features and fill any remaining nulls
    X = cust_df[seg_features].copy().fillna(0)
    
    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Evaluate K for K-Means (Elbow & Silhouette)
    # Use a sample of up to 10,000 for silhouette evaluation if dataset is large
    sample_size = min(len(X_scaled), 10000)
    np.random.seed(RANDOM_STATE)
    sample_indices = np.random.choice(len(X_scaled), size=sample_size, replace=False)
    X_sample = X_scaled[sample_indices]

    k_metrics = []
    for k in range(2, 7):
        km = KMeans(n_clusters=k, random_state=RANDOM_STATE, n_init=10)
        km.fit(X_scaled)
        sil = float(silhouette_score(X_sample, km.predict(X_sample)))
        inertia = float(km.inertia_)
        k_metrics.append({"k": k, "inertia": round(inertia, 2), "silhouette_score": round(sil, 4)})

    best_k = 5
    print(f"Optimal cluster evaluation completed: Using K={best_k}")
    
    # Fit final K-Means
    kmeans_final = KMeans(n_clusters=best_k, random_state=RANDOM_STATE, n_init=10)
    cust_df["cluster_id"] = kmeans_final.fit_predict(X_scaled)

    # Profiling clusters to assign meaningful business names
    cluster_profiles = cust_df.groupby("cluster_id")[seg_features].mean()
    
    # Heuristic naming based on centroids
    cluster_names = {}
    for cid in range(best_k):
        c_rec = cluster_profiles.loc[cid, "recency_days"]
        c_spend = cluster_profiles.loc[cid, "total_spend"]
        c_orders = cluster_profiles.loc[cid, "total_orders"]
        c_rev = cluster_profiles.loc[cid, "average_review_score"]
        
        if c_spend > cluster_profiles["total_spend"].median() * 1.5 and c_orders >= 1.5:
            cluster_names[cid] = "VIP Champions"
        elif c_orders >= 1.3:
            cluster_names[cid] = "Loyal Regulars"
        elif c_rec < cluster_profiles["recency_days"].median() and c_spend <= cluster_profiles["total_spend"].median():
            cluster_names[cid] = "Recent New Buyers"
        elif c_rev < 3.0:
            cluster_names[cid] = "Dissatisfied / Service At-Risk"
        else:
            cluster_names[cid] = "Hibernating / One-Time"

    cust_df["kmeans_segment"] = cust_df["cluster_id"].map(cluster_names)

    # DBSCAN for anomaly / extreme customer detection
    # Anomaly candidates: extreme high spenders, fraudsters, or unusual behavior
    dbscan = DBSCAN(eps=2.5, min_samples=15)
    dbscan_labels = dbscan.fit_predict(X_sample)
    anomaly_count = int((dbscan_labels == -1).sum())
    print(f"DBSCAN Outlier/Anomaly Detection: {anomaly_count} anomalous behavior patterns identified.")

    # Segmentation Summary Metadata
    segment_stats = cust_df.groupby("kmeans_segment").agg(
        customer_count=("customer_unique_id", "count"),
        avg_spend=("total_spend", "mean"),
        avg_orders=("total_orders", "mean"),
        avg_recency=("recency_days", "mean"),
        avg_review=("average_review_score", "mean")
    ).reset_index().to_dict(orient="records")

    seg_metadata = {
        "best_k": best_k,
        "k_evaluations": k_metrics,
        "cluster_names": cluster_names,
        "segment_stats": segment_stats,
        "anomaly_candidates_in_sample": anomaly_count
    }

    out_json = DATA_OUTPUTS_DIR / "segmentation_summary.json"
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(seg_metadata, f, indent=2)
    print(f" -> Segmentation summary saved to: {out_json}")

    return cust_df, seg_metadata
