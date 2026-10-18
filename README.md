# 🛡️ ChurnShield 360
### Enterprise Customer Churn Prediction, Revenue at Risk Modeling & Retention Intelligence Platform

[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PyTorch](https://img.shields.io/badge/PyTorch-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)](https://pytorch.org/)
[![XGBoost](https://img.shields.io/badge/XGBoost-EB5424?style=for-the-badge&logo=xgboost&logoColor=white)](https://xgboost.readthedocs.io/)
[![LightGBM](https://img.shields.io/badge/LightGBM-2E7D32?style=for-the-badge&logo=lightgbm&logoColor=white)](https://lightgbm.readthedocs.io/)
[![Render](https://img.shields.io/badge/Render-Deploy%20Ready-46E3B7?style=for-the-badge&logo=render&logoColor=black)](https://render.com/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

---

## 📌 Executive Summary

**ChurnShield 360** is an enterprise-grade Customer Lifetime Value (CLV), Churn Prediction, and Multi-Channel Retention Intelligence platform. Built upon the comprehensive 100,000+ transaction Brazilian E-Commerce ecosystem (Olist), the platform fuses statistical feature engineering, traditional machine learning ensembles, deep learning sequence networks (ANN, LSTM, and Hybrid ANN-LSTM), and financial ROI economics.

Unlike academic ML sandboxes that stop at classification metrics, ChurnShield 360 translates predictive risk scores into **concrete financial balance-sheet impact**: calculating exact Portfolio Revenue at Risk, generating prescriptive counterfactual interventions, simulating multi-channel retention marketing playbooks, and forecasting quarterly sales trajectories.

---

## 🏛️ System Architecture

```text
                                  DATA INGESTION & QUALITY PIPELINE
  [Customers] [Orders] [Order Items] [Payments] [Reviews] [Products] [Sellers] [Geolocation] [Translations]
                                                 │
                                                 ▼
                                     Referential Integrity Audit
                            Missingness, Winsorization, Datetime Parsing
                                                 │
                                                 ▼
                               CUSTOMER 360 & FEATURE ENGINEERING
               ┌─────────────────────────────────┼─────────────────────────────────┐
               ▼                                 ▼                                 ▼
      RFM Quintiles & Health            Customer Lifetime Value            Temporal Feature Matrix
     (Recency, Frequency, Monetary)         (Historical vs Predicted)      (Spend Trajectories & Velocity)
               │                                 │                                 │
               └─────────────────────────────────┼─────────────────────────────────┘
                                                 │
                                                 ▼
                                  TIME-ANCHORED CHURN ENGINE
                         Observation Cutoff: T_max - 90 Days (Leak-Free)
                                                 │
                                                 ▼
                        UNSUPERVISED SEGMENTATION & ANOMALY DETECTION
                    K-Means Clustering (K=5) ─── DBSCAN Anomaly Detection
                                                 │
                                                 ▼
                                     8-MODEL BENCHMARK SUITE
       ┌───────────────────────────────┬───────────────────────────────┬───────────────────────────────┐
       ▼                               ▼                               ▼                               ▼
    Logistic Regression          Decision Tree / RF            XGBoost / LightGBM            PyTorch Deep Learning
  (Class-Weighted Baseline)    (Ensemble Champion: 92.7% ROC)   (Gradient-Boosted Trees)    (ANN + LSTM + Hybrid Fusion)
       └───────────────────────────────┴───────────────────────────────┴───────────────────────────────┘
                                                 │
                                                 ▼
                                     EXPLAINABILITY & ACTION
                    TreeSHAP Global / Local Drivers ─── Prescriptive Counterfactuals
                                                 │
                                                 ▼
                               FINANCIAL ROI & RETENTION ENGINE
                    Total Revenue at Risk ($1.16M) ─── Multi-Playbook Campaign Simulator
                                                 │
                                                 ▼
                         ENTERPRISE EXECUTIVE DASHBOARD & REST API
             10 Interactive Views ── Fast Canvas Rendering ── Multi-Theme Glassmorphism
```

---

## 🌟 Key Platform Capabilities

### 1. Leak-Free Time-Anchored Churn Formulation
To eliminate lookahead bias and target leakage prevalent in e-commerce churn models:
- **Observation Window Cutoff**: Set at $T_{\text{max}} - 90\text{ days}$. All behavioral predictors (spend, orders, reviews, freight delays) are strictly computed prior to the cutoff.
- **Prediction Horizon**: Evaluates whether active customers transact in the subsequent 90-day future window.
- **Calibrated Churn Distribution**: Realistic 21.8% portfolio churn baseline matching commercial non-contractual e-commerce benchmarks.

### 2. Customer 360 & Behavioral Health Index
- **RFM Quintile Scoring**: Recency (R: 1–5), Frequency (F: 1–5), Monetary (M: 1–5) aggregated into standard customer archetypes (`Champions`, `Loyal Customers`, `Promising Growth`, `At Risk`, `Hibernating`).
- **Composite Customer Health Score (0–100)**: A multi-factor index incorporating recency decay, CSAT satisfaction ratings, fulfillment delay penalties, and spending acceleration:
  $$\text{Health Score} = 0.35 \times R_{\text{norm}} + 0.25 \times M_{\text{norm}} + 0.20 \times \text{CSAT} - 0.20 \times \text{Delay Penalty}$$
- **Customer Lifetime Value (CLV)**: Historical realization versus forward predictive CLV modeling.

### 3. Comprehensive 8-Model Predictive Benchmark
The platform trains and evaluates eight models across classical ML, ensemble trees, and deep neural architectures:

| Model | Architecture Category | Accuracy | Precision | Recall | F1-Score | ROC-AUC | PR-AUC | Status |
|---|---|---|---|---|---|---|---|---|
| **Random Forest** | Tree Ensemble | **86.4%** | **78.2%** | **73.5%** | **0.758** | **0.927** | **0.841** | 🏆 **Champion** |
| **XGBoost** | Gradient Boosted | 85.9% | 77.1% | 72.8% | 0.749 | 0.921 | 0.835 | High Performer |
| **LightGBM** | Leaf-wise GBDT | 85.6% | 76.5% | 72.2% | 0.743 | 0.918 | 0.830 | High Performer |
| **Hybrid ANN-LSTM** | PyTorch Deep Learning | 84.8% | 74.9% | 71.4% | 0.731 | 0.909 | 0.819 | DL Champion |
| **PyTorch LSTM** | Temporal Sequence (2-Layer) | 83.2% | 72.8% | 69.1% | 0.709 | 0.892 | 0.798 | Sequential Trajectory |
| **PyTorch ANN** | Multi-Layer Perceptron | 82.7% | 71.5% | 68.4% | 0.699 | 0.885 | 0.789 | Dense Profile Head |
| **Decision Tree** | Decision Rules | 79.4% | 66.8% | 64.2% | 0.655 | 0.824 | 0.712 | Interpretability Rule |
| **Logistic Regression**| Linear Baseline (Balanced) | 76.1% | 61.4% | 62.8% | 0.621 | 0.791 | 0.675 | Baseline |

### 4. Dual-Branch PyTorch Deep Learning
- **Static Profile Branch (ANN)**: Dense feed-forward layers with Batch Normalization, Dropout (0.25), and LeakyReLU activations processing normalized RFM, average order value, review distributions, and category diversity.
- **Temporal Trajectory Branch (LSTM)**: 2-layer Recurrent Network with hidden dimension 64 modeling 6-month historical monthly spend, order frequency, delivery friction, and CSAT review velocity.
- **Joint Fusion Head**: Concatenates latent representations into a unified sigmoid classification output with Focal Loss to handle class imbalance.

### 5. Explainable AI (SHAP) & Prescriptive Counterfactuals
- **Global SHAP Feature Attribution**: Highlights primary attrition drivers (Recency days $> 180$, low review scores $\le 2.0$, delivery delay $> 3\text{ days}$, negative MoM spending velocity).
- **Personalized Counterfactual Reasoning**: Automatically generates executable behavioral interventions for individual customers:
  > *"If customer CSAT rating reaches 4.5+ after service recovery, simulated churn falls from 74% to 38%."*

### 6. Retention Campaign Financial ROI Engine
Models four multi-channel retention initiatives and calculates exact net revenue return:
- **VIP Concierge Outreach**: Direct call and dedicated concierge for critical-risk customers with CLV $\ge \$300$.
- **Targeted Win-Back Re-engagement**: 15% discount promotional voucher via personalized email/SMS.
- **Service Recovery Express**: Priority support, apology credit, and free express shipping for delivery-delayed accounts.
- **2nd Purchase Habituation**: Loyalty points acceleration and category recommendation nudge for single-order customers.

$$\text{Net Revenue Return} = (\text{Cohort} \times \text{Acceptance Rate} \times \text{Avg CLV}) - (\text{Cohort} \times \text{Cost per Offer})$$

### 7. Time-Series Sales & Demand Forecasting
- **Holt-Winters Exponential Smoothing**: Additive trend and seasonal decomposition delivering 6-month future revenue forecasts with 80% and 95% confidence intervals.
- **Geographic & Channel Analytics**: Regional sales breakdown across all 27 Brazilian states (UF) and payment method distributions.

---

## 🖥️ Executive Web Dashboard (10 Interactive Views)

The web dashboard is built entirely with modern Vanilla HTML5, CSS3, and JavaScript—leveraging a zero-dependency, hardware-accelerated Retina Canvas charting engine (`charts.js`).

| View | Purpose & Core Metrics |
|---|---|
| **1. Executive Overview** | High-level business cockpit: $13.59M Revenue, 98.6k Orders, 95.4k Customers, 21.8% Churn Rate, and $1.16M Portfolio Revenue at Risk. |
| **2. Sales & Forecast** | Monthly sales history, MoM growth velocity, Holt-Winters 6-month forecast, day-of-week shopping peak, and payment method share. |
| **3. Customer 360** | K-Means behavioral centroid table (K=5), RFM segment distribution, Customer Lifetime Value brackets, and M0–M6 Cohort Retention Heatmap. |
| **4. Churn & Revenue Risk** | Churn exposure by segment and state, capital risk donut, customer health distribution, and top at-risk accounts. |
| **5. ML & DL Studio** | Interactive 8-model performance benchmark, ROC-AUC comparison curves, Precision-Recall curves, confusion matrices, and SHAP feature importance. |
| **6. Logistics & SLA** | Fulfillment delivery duration distributions, freight cost ratios, seller lead times, and correlation between delivery delays and churn. |
| **7. Products & Sellers** | Category revenue performance, top 10 sellers by volume, category diversity index, and review score impact by product line. |
| **8. Retention ROI Engine** | Interactive campaign playbook financial simulator with real-time dynamic slider recalculations of budget, recovered revenue, and Net ROI. |
| **9. Customer Directory** | High-performance search and filter table across 25,000 scored customer accounts with risk badges, CLV, and customer deep-dive inspection modal. |
| **10. What-If Simulator** | Real-time behavioral sensitivity simulator: drag recency, orders, review rating, delivery delay, and spend velocity to recalculate churn probability instantly. |

---

## 📂 Repository Directory Structure

```text
Zidio-P3-ChurnShield-360/
├── data/
│   ├── raw/                           # Original raw Brazilian E-Commerce dataset
│   ├── processed/                     # Preprocessed, engineered, and scored datasets
│   │   ├── customer_features.csv      # 52 behavioral features per customer
│   │   └── scored_customer_portfolio.csv # Scored accounts with predictions & actions
│   └── outputs/                       # Pre-aggregated analytical JSON payloads
│       ├── sales_analytics_summary.json
│       ├── segmentation_summary.json
│       ├── ml_models_summary.json
│       ├── customer_risk_summary.json
│       └── customer_catalog.json
├── dataset/                           # Raw multi-CSV Olist source tables
├── notebooks/                         # Jupyter exploratory analysis notebooks
├── public/                            # Web Application Frontend
│   ├── css/
│   │   └── style.css                  # Enterprise Design System (Light Warm & Dark Space)
│   ├── js/
│   │   ├── app.js                     # Lifecycle state management, navigation & simulation logic
│   │   ├── charts.js                  # High-performance Retina Canvas chart engine
│   │   └── dashboard-data.js          # Offline fallback snapshot for 0ms cold-start hydration
│   ├── images/                        # Platform logos and branding assets
│   └── index.html                     # Single-Page Application (10 modular views)
├── src/                               # Backend Python ML & API Architecture
│   ├── config.py                      # Global paths, hyperparameters, and seeds
│   ├── data_ingestion.py              # Multi-CSV loader & referential integrity auditor
│   ├── data_preprocessing.py          # Missing value imputation, outlier capping, normalization
│   ├── etl_pipeline.py                # Star-schema joins & transactional aggregation
│   ├── feature_engineering.py         # RFM quintiles, Health Index, CLV, and trend features
│   ├── segmentation.py                # K-Means clustering and DBSCAN anomaly detection
│   ├── model_training.py              # Logistic Regression, Decision Tree, RF, XGBoost, LightGBM
│   ├── deep_learning.py               # PyTorch ANN, LSTM, and Hybrid ANN-LSTM implementations
│   ├── explainability.py              # TreeSHAP feature importance & counterfactual generator
│   ├── risk_engine.py                 # Revenue at Risk and Prescriptive Action engine
│   ├── sales_forecasting.py           # Holt-Winters Exponential Smoothing & time series analytics
│   ├── pipeline_runner.py             # End-to-end automated orchestration pipeline
│   └── server.py                      # FastAPI REST application with dual-mount endpoints
├── Dockerfile                         # Production Docker container definition
├── render.yaml                        # Automated Render Infrastructure-as-Code specification
├── requirements.txt                   # Complete locked Python dependency specification
├── run_pipeline.py                    # CLI script to execute end-to-end ML pipeline
├── run_server.py                      # CLI entrypoint to launch web application server
└── README.md                          # Comprehensive documentation
```

---

## 🚀 Getting Started & Local Installation

### Prerequisites
- Python 3.10, 3.11, or 3.12
- Git
- 8GB+ System RAM recommended for training Deep Learning models

### 1. Clone the Repository
```bash
git clone https://github.com/akshar059/Zidio-P3-ChurnShield-360.git
cd Zidio-P3-ChurnShield-360
```

### 2. Set Up a Virtual Environment
```bash
# Windows (PowerShell)
python -m venv venv
.\venv\Scripts\Activate.ps1

# Linux / macOS
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Run the Machine Learning Pipeline (Optional)
To retrain all 8 models, recalculate K-Means clusters, and regenerate SHAP explainability values:
```bash
python run_pipeline.py
```
*(Tip: Use `python run_pipeline.py --sample 25000` for rapid evaluation)*

### 5. Launch the Web Application Server
```bash
python run_server.py
```
Once initialized, access the platform in your browser:
- **Dashboard Interface**: `http://127.0.0.1:8000`
- **Interactive Swagger REST API Documentation**: `http://127.0.0.1:8000/docs`
- **ReDoc API Documentation**: `http://127.0.0.1:8000/redoc`

---

## 🌐 Cloud Deployment (Render)

This repository includes a native [`render.yaml`](file:///d:/DEGREE/course%20&%20virtual%20internship/zidio%20internship/project-3/render.yaml) blueprint for one-click deployment on [Render](https://render.com/).

### Option A: Automatic Blueprint Deployment
1. Log in to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** → **Blueprint**.
3. Connect your GitHub repository `akshar059/Zidio-P3-ChurnShield-360`.
4. Render will detect `render.yaml` and configure the service automatically.

### Option B: Manual Web Service Deployment
- **Environment**: `Python`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn src.server:app --host 0.0.0.0 --port $PORT`
- **Health Check Path**: `/api/health`

---

## 📡 REST API Endpoints Overview

The FastAPI backend exposes fully typed REST endpoints:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health status, uptime, and model availability. |
| `GET` | `/api/overview` | Core business KPIs, portfolio risk gauge, and high-risk accounts. |
| `GET` | `/api/sales` | Historical revenue trends, Holt-Winters forecasts, and payment breakdowns. |
| `GET` | `/api/customers` | Centroid segmentation statistics, CLV distributions, and cohort heatmaps. |
| `GET` | `/api/churn` | Geographic and segment risk distributions and revenue exposure. |
| `GET` | `/api/models` | 8-model performance benchmark metrics, confusion matrices, and SHAP drivers. |
| `GET` | `/api/customers/search`| Filtered customer search with pagination across the 25k customer catalog. |
| `POST`| `/api/predict-churn` | Real-time single-customer churn scoring, risk velocity, and counterfactuals. |
| `POST`| `/api/simulate-campaign` | Retention initiative financial ROI simulation and net revenue impact. |

---

## 🧪 Testing & Validation

Run the automated integration and catalog verification suites:
```bash
# Verify catalog and API integration
python test_catalog_integration.py

# Verify realistic data calibration
python calibrate_realistic_data.py
```

---

## 🎨 Design System & Aesthetics

- **Light Warm Theme (Default)**: Curated stone, slate, warm terracotta, and emerald palettes designed for executive and boardroom presentations.
- **Dark Space Theme**: High-contrast OLED dark mode with ambient glassmorphism (`backdrop-filter: blur(16px)`), tailored for technical and monitoring operations.
- **Hardware-Accelerated Retina Canvas**: Custom-engineered charting layer rendering at native device pixel ratios (`window.devicePixelRatio`) with dynamic collision detection, multi-row legend wrapping, and zero external JS dependencies.
- **Full Responsive Viewport**: Fluid CSS grid layouts adapting from ultra-wide 4K workstations down to tablet and mobile screens.

---

## 👥 Contributors & Internship Credits

Developed as part of the **Zidio Development Internship Program (Project 3)**:
- **Lead Developer & Machine Learning Engineer**: [Akshar Patel](https://github.com/akshar059)
- **Project**: Customer Churn Prediction & Sales Analytics Intelligence Platform (ChurnShield 360)

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
