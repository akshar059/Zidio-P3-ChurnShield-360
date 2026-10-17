"""
Deep Learning Module (PyTorch)
Implements:
1. Static Customer ANN (Artificial Neural Network with BatchNorm & Dropout)
2. Temporal LSTM (Monthly customer sequence modeling)
3. Hybrid ANN-LSTM Model (Static Profile + Temporal Trajectory Fusion)
"""

import json
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import numpy as np
import pandas as pd
from datetime import timedelta
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, average_precision_score, confusion_matrix, roc_curve, precision_recall_curve
)
from .config import DATA_OUTPUTS_DIR, DL_BATCH_SIZE, DL_EPOCHS, DL_LEARNING_RATE, RANDOM_STATE

# Set seeds
torch.manual_seed(RANDOM_STATE)
np.random.seed(RANDOM_STATE)

# -------------------------------------------------------------
# 1. MODEL ARCHITECTURES
# -------------------------------------------------------------

class CustomerANN(nn.Module):
    """
    Static Customer Profile Deep Neural Network
    """
    def __init__(self, input_dim: int):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Sigmoid()
        )

    def forward(self, x):
        return self.net(x).squeeze(-1)

class CustomerLSTM(nn.Module):
    """
    Temporal Behavior LSTM Network
    """
    def __init__(self, input_dim: int = 6, hidden_dim: int = 64, num_layers: int = 2):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=input_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            dropout=0.2 if num_layers > 1 else 0.0
        )
        self.classifier = nn.Sequential(
            nn.Linear(hidden_dim, 32),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(32, 1),
            nn.Sigmoid()
        )

    def forward(self, seq):
        out, (hn, _) = self.lstm(seq)
        # Use last hidden state
        last_hidden = hn[-1]
        return self.classifier(last_hidden).squeeze(-1)

class HybridANNLSTM(nn.Module):
    """
    Hybrid Deep Fusion Architecture:
    Static Branch (Profile features) + Temporal Branch (LSTM features)
    """
    def __init__(self, static_dim: int, seq_dim: int = 6, hidden_dim: int = 48):
        super().__init__()
        # Static branch
        self.static_net = nn.Sequential(
            nn.Linear(static_dim, 64),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, 32),
            nn.ReLU()
        )
        # Temporal branch
        self.lstm = nn.LSTM(
            input_size=seq_dim,
            hidden_size=hidden_dim,
            num_layers=2,
            batch_first=True,
            dropout=0.2
        )
        self.temporal_net = nn.Sequential(
            nn.Linear(hidden_dim, 32),
            nn.ReLU()
        )
        # Fusion head
        self.fusion = nn.Sequential(
            nn.Linear(32 + 32, 32),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(32, 1),
            nn.Sigmoid()
        )

    def forward(self, static_x, seq_x):
        static_feat = self.static_net(static_x)
        _, (hn, _) = self.lstm(seq_x)
        temporal_feat = self.temporal_net(hn[-1])
        combined = torch.cat([static_feat, temporal_feat], dim=1)
        return self.fusion(combined).squeeze(-1)

# -------------------------------------------------------------
# 2. SEQUENCE BUILDER
# -------------------------------------------------------------

def build_temporal_sequences(
    master_sales: pd.DataFrame, customer_ids: list, cutoff_date: pd.Timestamp, n_months: int = 6
) -> np.ndarray:
    """
    Generates (N, n_months, 6) tensor representing monthly behavioral trajectory:
    Features: [monthly_orders, monthly_spend, monthly_items, monthly_aov, monthly_review, monthly_delay]
    """
    df = master_sales[master_sales["order_purchase_timestamp"] <= cutoff_date].copy()
    df["order_purchase_timestamp"] = pd.to_datetime(df["order_purchase_timestamp"])
    
    # Bucket orders into months relative to cutoff (0 = oldest month in window, n_months-1 = closest month to cutoff)
    sequences = np.zeros((len(customer_ids), n_months, 6), dtype=np.float32)
    id_map = {cid: idx for idx, cid in enumerate(customer_ids)}

    # Define month boundaries
    month_starts = [cutoff_date - timedelta(days=30 * (n_months - i)) for i in range(n_months + 1)]
    
    for m in range(n_months):
        m_start = month_starts[m]
        m_end = month_starts[m + 1]
        m_df = df[(df["order_purchase_timestamp"] >= m_start) & (df["order_purchase_timestamp"] < m_end)]
        
        if not m_df.empty:
            m_agg = m_df.groupby("customer_unique_id").agg(
                orders=("order_id", "nunique"),
                spend=("price", "sum"),
                items=("order_item_id", "count"),
                review=("review_score", "mean"),
                delay=("delivery_delay_days", "mean")
            ).reset_index()
            
            for _, row in m_agg.iterrows():
                cid = row["customer_unique_id"]
                if cid in id_map:
                    c_idx = id_map[cid]
                    orders = float(row["orders"])
                    spend = float(row["spend"])
                    items = float(row["items"])
                    aov = spend / max(orders, 1.0)
                    review = float(row["review"])
                    delay = float(row["delay"])
                    sequences[c_idx, m, :] = [
                        orders,
                        np.log1p(spend),
                        items,
                        np.log1p(aov),
                        review / 5.0,
                        np.clip(delay / 10.0, -1.0, 2.0)
                    ]
                    
    return sequences

# -------------------------------------------------------------
# 3. DATASET WRAPPERS
# -------------------------------------------------------------

class ChurnDataset(Dataset):
    def __init__(self, static_x, seq_x, labels):
        self.static_x = torch.tensor(static_x, dtype=torch.float32)
        self.seq_x = torch.tensor(seq_x, dtype=torch.float32)
        self.labels = torch.tensor(labels, dtype=torch.float32)

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, idx):
        return self.static_x[idx], self.seq_x[idx], self.labels[idx]

# -------------------------------------------------------------
# 4. TRAINING & EVALUATION
# -------------------------------------------------------------

def evaluate_torch_model(model, dataloader, model_name: str, model_type: str = "ann") -> dict:
    """
    Evaluates PyTorch model on DataLoader and returns standard evaluation metrics.
    """
    model.eval()
    all_preds = []
    all_targets = []
    
    with torch.no_grad():
        for static_x, seq_x, y in dataloader:
            if model_type == "ann":
                out = model(static_x)
            elif model_type == "lstm":
                out = model(seq_x)
            else:  # hybrid
                out = model(static_x, seq_x)
                
            all_preds.extend(out.cpu().numpy().tolist())
            all_targets.extend(y.cpu().numpy().tolist())

    y_prob = np.array(all_preds)
    y_test = np.array(all_targets)
    y_pred = (y_prob >= 0.5).astype(int)

    acc = float(accuracy_score(y_test, y_pred))
    prec = float(precision_score(y_test, y_pred, zero_division=0))
    rec = float(recall_score(y_test, y_pred, zero_division=0))
    f1 = float(f1_score(y_test, y_pred, zero_division=0))
    roc_auc = float(roc_auc_score(y_test, y_prob))
    pr_auc = float(average_precision_score(y_test, y_prob))
    cm = confusion_matrix(y_test, y_pred).tolist()

    fpr, tpr, _ = roc_curve(y_test, y_prob)
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

def train_and_evaluate_deep_learning(
    X_train_static, X_test_static,
    seq_train, seq_test,
    y_train, y_test
) -> tuple[dict, dict]:
    """
    Trains and benchmarks ANN, LSTM, and Hybrid ANN-LSTM architectures.
    """
    print("\n" + "=" * 60)
    print("STEP 9: DEEP LEARNING SUITE (ANN, LSTM, HYBRID)")
    print("=" * 60)

    train_ds = ChurnDataset(X_train_static, seq_train, y_train.values)
    test_ds = ChurnDataset(X_test_static, seq_test, y_test.values)

    train_loader = DataLoader(train_ds, batch_size=DL_BATCH_SIZE, shuffle=True)
    test_loader = DataLoader(test_ds, batch_size=DL_BATCH_SIZE, shuffle=False)

    # Class weight calculation
    pos_count = float(y_train.sum())
    neg_count = float(len(y_train) - pos_count)
    pos_weight = torch.tensor([neg_count / max(pos_count, 1.0)])
    criterion = nn.BCELoss()

    static_dim = X_train_static.shape[1]
    results = {}
    models_dict = {}

    # --- 1. Train Customer ANN ---
    print("\n[Deep Learning] Training Static Customer ANN...")
    ann = CustomerANN(input_dim=static_dim)
    optimizer = optim.Adam(ann.parameters(), lr=DL_LEARNING_RATE, weight_decay=1e-4)

    for epoch in range(1, DL_EPOCHS + 1):
        ann.train()
        total_loss = 0.0
        for static_x, _, y in train_loader:
            optimizer.zero_grad()
            out = ann(static_x)
            loss = criterion(out, y)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
        if epoch % 5 == 0 or epoch == DL_EPOCHS:
            print(f" -> ANN Epoch {epoch}/{DL_EPOCHS} | Train Loss: {total_loss / len(train_loader):.4f}")

    ann_metrics, ann_probs = evaluate_torch_model(ann, test_loader, "ANN", "ann")
    results["ANN"] = ann_metrics
    models_dict["ANN"] = ann

    # --- 2. Train Temporal LSTM ---
    print("\n[Deep Learning] Training Temporal Customer LSTM...")
    lstm = CustomerLSTM(input_dim=6, hidden_dim=64, num_layers=2)
    optimizer = optim.Adam(lstm.parameters(), lr=DL_LEARNING_RATE, weight_decay=1e-4)

    for epoch in range(1, DL_EPOCHS + 1):
        lstm.train()
        total_loss = 0.0
        for _, seq_x, y in train_loader:
            optimizer.zero_grad()
            out = lstm(seq_x)
            loss = criterion(out, y)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
        if epoch % 5 == 0 or epoch == DL_EPOCHS:
            print(f" -> LSTM Epoch {epoch}/{DL_EPOCHS} | Train Loss: {total_loss / len(train_loader):.4f}")

    lstm_metrics, lstm_probs = evaluate_torch_model(lstm, test_loader, "LSTM", "lstm")
    results["LSTM"] = lstm_metrics
    models_dict["LSTM"] = lstm

    # --- 3. Train Hybrid ANN + LSTM ---
    print("\n[Deep Learning] Training Hybrid ANN + LSTM Architecture...")
    hybrid = HybridANNLSTM(static_dim=static_dim, seq_dim=6, hidden_dim=48)
    optimizer = optim.Adam(hybrid.parameters(), lr=DL_LEARNING_RATE, weight_decay=1e-4)

    for epoch in range(1, DL_EPOCHS + 1):
        hybrid.train()
        total_loss = 0.0
        for static_x, seq_x, y in train_loader:
            optimizer.zero_grad()
            out = hybrid(static_x, seq_x)
            loss = criterion(out, y)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
        if epoch % 5 == 0 or epoch == DL_EPOCHS:
            print(f" -> Hybrid Epoch {epoch}/{DL_EPOCHS} | Train Loss: {total_loss / len(train_loader):.4f}")

    hybrid_metrics, hybrid_probs = evaluate_torch_model(hybrid, test_loader, "Hybrid ANN-LSTM", "hybrid")
    results["Hybrid ANN-LSTM"] = hybrid_metrics
    models_dict["Hybrid ANN-LSTM"] = hybrid

    # Save deep learning weights
    torch.save(ann.state_dict(), DATA_OUTPUTS_DIR / "ann_weights.pth")
    torch.save(lstm.state_dict(), DATA_OUTPUTS_DIR / "lstm_weights.pth")
    torch.save(hybrid.state_dict(), DATA_OUTPUTS_DIR / "hybrid_weights.pth")

    dl_summary_file = DATA_OUTPUTS_DIR / "dl_models_summary.json"
    with open(dl_summary_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"\nDeep Learning results saved to: {dl_summary_file}")

    return results, models_dict
