"""
Traditional Machine Learning Models Module
Trains, tunes, and evaluates:
1. Logistic Regression (Baseline)
2. Decision Tree
3. Random Forest
4. XGBoost
5. LightGBM
"""

import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, average_precision_score, confusion_matrix, roc_curve, precision_recall_curve
)
import xgboost as xgb
import lightgbm as lgb

from .config import DATA_OUTPUTS_DIR, RANDOM_STATE

def build_feature_preprocessor(numeric_features: list, categorical_features: list) -> ColumnTransformer:
    """
    Creates a scikit-learn ColumnTransformer for numerical scaling and categorical encoding.
    """
    num_pipeline = Pipeline([
        ("scaler", StandardScaler())
    ])
    
    cat_pipeline = Pipeline([
        ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False))
    ])
    
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", num_pipeline, numeric_features),
            ("cat", cat_pipeline, categorical_features)
        ],
        remainder="drop"
    )
    return preprocessor

def evaluate_classifier(model, X_test, y_test, model_name: str) -> dict:
    """
    Computes comprehensive evaluation metrics, ROC, PR curves, and confusion matrix.
    """
    y_pred = model.predict(X_test)
    if hasattr(model, "predict_proba"):
        y_prob = model.predict_proba(X_test)[:, 1]
    else:
        y_prob = y_pred

    acc = float(accuracy_score(y_test, y_pred))
    prec = float(precision_score(y_test, y_pred, zero_division=0))
    rec = float(recall_score(y_test, y_pred, zero_division=0))
    f1 = float(f1_score(y_test, y_pred, zero_division=0))
    roc_auc = float(roc_auc_score(y_test, y_prob))
    pr_auc = float(average_precision_score(y_test, y_prob))
    cm = confusion_matrix(y_test, y_pred).tolist()

    fpr, tpr, _ = roc_curve(y_test, y_prob)
    # Downsample curve points for fast, lightweight JSON transfer
    step = max(1, len(fpr) // 50)
    roc_pts = [{"fpr": round(float(f), 4), "tpr": round(float(t), 4)} for f, t in zip(fpr[::step], tpr[::step])]

    prec_pts, rec_pts, _ = precision_recall_curve(y_test, y_prob)
    pr_step = max(1, len(rec_pts) // 50)
    pr_curve_pts = [{"recall": round(float(r), 4), "precision": round(float(p), 4)} for r, p in zip(rec_pts[::pr_step], prec_pts[::pr_step])]

    metrics = {
        "model_name": model_name,
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
        "roc_auc": round(roc_auc, 4),
        "pr_auc": round(pr_auc, 4),
        "confusion_matrix": cm,
        "roc_curve": roc_pts,
        "pr_curve": pr_curve_pts
    }
    print(f"[{model_name}] ACC: {acc:.4f} | PREC: {prec:.4f} | REC: {rec:.4f} | F1: {f1:.4f} | ROC-AUC: {roc_auc:.4f} | PR-AUC: {pr_auc:.4f}")
    return metrics, y_prob

def train_and_evaluate_traditional_models(
    X_train: pd.DataFrame, X_test: pd.DataFrame,
    y_train: pd.Series, y_test: pd.Series,
    numeric_features: list, categorical_features: list
) -> tuple[dict, dict, ColumnTransformer]:
    """
    Fits and compares Logistic Regression, Decision Tree, Random Forest, XGBoost, LightGBM.
    """
    print("\n" + "=" * 60)
    print("STEP 8: TRADITIONAL MACHINE LEARNING SUITE")
    print("=" * 60)

    preprocessor = build_feature_preprocessor(numeric_features, categorical_features)
    print("Fitting feature preprocessor...")
    X_train_trans = preprocessor.fit_transform(X_train)
    X_test_trans = preprocessor.transform(X_test)

    # Class weight calculation for imbalance
    pos_count = int(y_train.sum())
    neg_count = len(y_train) - pos_count
    scale_pos = neg_count / max(pos_count, 1)

    models = {
        "Logistic Regression": LogisticRegression(
            class_weight="balanced", max_iter=1000, random_state=RANDOM_STATE
        ),
        "Decision Tree": DecisionTreeClassifier(
            class_weight="balanced", max_depth=6, min_samples_leaf=30, random_state=RANDOM_STATE
        ),
        "Random Forest": RandomForestClassifier(
            n_estimators=100, max_depth=8, class_weight="balanced", n_jobs=-1, random_state=RANDOM_STATE
        ),
        "XGBoost": xgb.XGBClassifier(
            n_estimators=120, max_depth=5, learning_rate=0.08, scale_pos_weight=scale_pos,
            random_state=RANDOM_STATE, eval_metric="logloss"
        ),
        "LightGBM": lgb.LGBMClassifier(
            n_estimators=120, max_depth=5, learning_rate=0.08, class_weight="balanced",
            random_state=RANDOM_STATE, verbose=-1
        )
    }

    results = {}
    test_probs = {}
    fitted_models = {}

    for name, clf in models.items():
        print(f"\nTraining {name}...")
        clf.fit(X_train_trans, y_train)
        metrics, probs = evaluate_classifier(clf, X_test_trans, y_test, name)
        results[name] = metrics
        test_probs[name] = probs
        fitted_models[name] = clf

    # Extract Feature Importances from Random Forest & XGBoost
    cat_encoder = preprocessor.named_transformers_["cat"].named_steps["encoder"]
    encoded_cat_cols = list(cat_encoder.get_feature_names_out(categorical_features))
    all_feature_names = numeric_features + encoded_cat_cols

    rf_clf = fitted_models["Random Forest"]
    rf_importances = rf_clf.feature_importances_
    
    top_rf_indices = np.argsort(rf_importances)[::-1][:15]
    top_features = [
        {"feature": all_feature_names[i], "importance": round(float(rf_importances[i]), 4)}
        for i in top_rf_indices
    ]

    # Save model artifacts & metrics
    joblib.dump(fitted_models["XGBoost"], DATA_OUTPUTS_DIR / "xgboost_model.joblib")
    joblib.dump(preprocessor, DATA_OUTPUTS_DIR / "preprocessor.joblib")

    ml_summary = {
        "metrics": results,
        "top_features": top_features,
        "feature_names": all_feature_names
    }

    out_file = DATA_OUTPUTS_DIR / "ml_models_summary.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(ml_summary, f, indent=2)
    print(f"\nTraditional ML model results saved to: {out_file}")

    return results, fitted_models, preprocessor
