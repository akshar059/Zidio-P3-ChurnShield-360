# Customer Churn Prediction & Sales Analytics Intelligence Platform

An end-to-end Machine Learning, Deep Learning, and Sales Intelligence system built with **Python (Core Backend & ML/DL)** and modern **Vanilla HTML5, CSS3, and JavaScript (Frontend Web Application)**.

---

## 🏛️ Project Architecture

```text
RAW MULTI-CSV DATA
        ↓
1. DATA INGESTION & QUALITY VALIDATION (Schema checks, Missingness, Referential Integrity)
        ↓
2. DATA PREPROCESSING (Winsorization, Deduplication, Imputation, Datetime parsing)
        ↓
3. ETL & INTEGRATION (Customers ↔ Orders ↔ Items ↔ Payments ↔ Reviews ↔ Products)
        ↓
4. CUSTOMER 360 & RFM FEATURE ENGINEERING (RFM scores, Customer Health Score 0-100, CLV)
        ↓
5. CUSTOMER SEGMENTATION (K-Means K=5 + DBSCAN Anomaly Detection)
        ↓
6. LEAK-FREE TIME-ANCHORED CHURN LABELING (Observation Cutoff vs 90d Prediction Window)
        ↓
7. TRADITIONAL MACHINE LEARNING SUITE
        ├── Logistic Regression (Baseline)
        ├── Decision Tree
        ├── Random Forest (Champion)
        ├── XGBoost
        └── LightGBM
        ↓
8. DEEP LEARNING (PyTorch)
        ├── Static Customer Profile ANN (BatchNorm, Dropout, Sigmoid)
        ├── Monthly Temporal Sequence LSTM (Behavioral Trajectory)
        └── Hybrid ANN-LSTM Architecture (Static + Temporal Fusion)
        ↓
9. MODEL BENCHMARK & SHAP EXPLAINABILITY
        ↓
10. CUSTOMER RISK SCORING & PORTFOLIO REVENUE AT RISK ENGINE
        ↓
11. SALES ANALYTICS & HOLT-WINTERS TIME SERIES FORECASTING
        ↓
12. INTERACTIVE EXECUTIVE WEB DASHBOARD & SIMULATOR
```

---

## 🚀 Key Highlights & Accomplishments

1. **Multi-Source Ingestion & Automated Quality Auditing**:
   - Ingests all 9 CSV files (`customers`, `orders`, `order_items`, `payments`, `reviews`, `products`, `sellers`, `geolocation`, `category_translation`).
   - Audits referential integrity (checking orphan foreign keys across orders, customers, and order items).
   - Generates and exports `data/outputs/data_quality_report.json`.

2. **Customer 360 & Behavioral Feature Engineering**:
   - RFM quintiles (1-5) and RFM segmentation (`Champions`, `Loyal`, `At Risk`, `Hibernating`).
   - Customer Health Score (composite 0-100 index based on recency, review ratings, logistics delivery delay, and spending velocity).
   - Historical & Predicted Customer Lifetime Value (CLV).
   - Multi-window spending acceleration/deceleration (`spend_30d` vs `spend_prev_30d`).

3. **Customer Segmentation**:
   - **K-Means Clustering** ($K=5$) with Elbow and Silhouette scoring.
   - **DBSCAN Anomaly Detection** identifying extreme spenders and fraud/logistics edge cases.

4. **Leak-Free Time-Anchored Churn Target**:
   - Computes an observation cutoff date ($T_{max} - 90 \text{ days}$).
   - Evaluates whether customers in the historical cohort made repurchases in the future prediction window.

5. **8-Model Comparative Benchmark Suite**:
   - **Logistic Regression**: Interpretable linear baseline with balanced class weights.
   - **Decision Tree**: Nonlinear decision rule baseline.
   - **Random Forest**: High-performance bagging ensemble (selected as Champion).
   - **XGBoost**: Gradient boosting classifier with scale_pos_weight.
   - **LightGBM**: Fast leaf-wise gradient boosted trees.
   - **PyTorch ANN**: Multi-layer perceptron with Batch Normalization, ReLU, and Dropout on customer profile features.
   - **PyTorch LSTM**: 2-layer recurrent network modeling 6-month monthly behavioral sequences (`orders`, `spend`, `items`, `aov`, `reviews`, `delay`).
   - **PyTorch Hybrid ANN-LSTM**: Dual-branch architecture combining static profile features and temporal sequence features into a joint classification head.

6. **Model Explainability & SHAP**:
   - Global SHAP values identifying top drivers of customer attrition.
   - Local customer-level driver generator flagging specific risk factors (e.g., `Critical Inactivity`, `Logistics Friction`, `Negative Spend Velocity`).

7. **Risk Scoring & Revenue at Risk Engine**:
   - Risk tiers: `LOW` (0-30%), `MEDIUM` (30-60%), `HIGH` (60-80%), `CRITICAL` (80-100%).
   - Total Portfolio Revenue at Risk calculation: $\text{CLV} \times \text{Churn Probability}$.
   - Prescriptive Next-Best-Action retention recommendation engine.

8. **Sales Analytics & Holt-Winters Time Series Forecasting**:
   - Historical monthly sales and MoM growth rates.
   - 6-month future revenue projections with confidence intervals.
   - Top 10 categories, sales by state, and payment method share.

9. **Interactive Web Application (Vanilla HTML/CSS/JS + FastAPI)**:
   - Modern glassmorphic dark theme.
   - 7 Interactive views:
     - **Executive Overview**: Key metrics, portfolio risk gauge, revenue at risk.
     - **Sales & Forecasting**: Revenue trend & Holt-Winters forecast charts.
     - **Customer 360 & Segments**: K-Means centroid profiles and DBSCAN anomalies.
     - **Churn & Revenue Risk**: Churn rates by segment and geographic exposure.
     - **ML Benchmark Studio**: 8-model comparison table, ROC curves, SHAP chart.
     - **Customer Risk Explorer**: Real-time customer search & inspection modal.
     - **What-If Churn Simulator**: Interactive sliders with real-time probability recalculation.

---

## 🛠️ How to Run the Project

### 1. Execute the ML / Deep Learning Pipeline
```bash
python run_pipeline.py
```
*(Optional: run `python run_pipeline.py --sample 25000` for rapid evaluation)*

### 2. Launch the Web Server & Dashboard
```bash
python run_server.py
```
Open your browser at: **`http://127.0.0.1:8000`**  
API Documentation (Swagger UI): **`http://127.0.0.1:8000/docs`**
