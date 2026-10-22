"""
Data Ingestion and Quality Validation Module
Handles multi-CSV ingestion, schema validation, referential integrity, and data quality reporting.
"""

import json
import pandas as pd
from pathlib import Path
from .config import DATASET_DIR, DATA_FILES, DATA_OUTPUTS_DIR

def load_raw_datasets(dataset_dir: Path = DATASET_DIR) -> dict:
    """
    Automated multi-CSV detection and ingestion.
    Returns a dictionary of raw DataFrames.
    """
    datasets = {}
    print("=" * 60)
    print("STEP 1: INGESTING RAW MULTI-CSV DATASETS")
    print("=" * 60)
    
    for key, filename in DATA_FILES.items():
        file_path = dataset_dir / filename
        if not file_path.exists():
            raise FileNotFoundError(f"Missing required dataset file: {file_path}")
        
        print(f"Loading '{key}' from {filename}...")
        # Use low_memory=False to prevent mixed-type warnings on large CSVs
        df = pd.read_csv(file_path, low_memory=False)
        datasets[key] = df
        print(f" -> {key}: {df.shape[0]:,} rows x {df.shape[1]} columns")
        
    return datasets

def validate_and_report_quality(datasets: dict) -> dict:
    """
    Performs data understanding, schema check, missingness, duplicates,
    primary/foreign key validation, and returns a detailed quality report.
    """
    print("\n" + "=" * 60)
    print("STEP 2: DATA QUALITY & REFERENTIAL INTEGRITY AUDIT")
    print("=" * 60)
    
    quality_report = {
        "summary": {},
        "tables": {},
        "referential_integrity": {},
        "issues_detected": []
    }
    
    total_records = 0
    total_missing_cells = 0
    
    for name, df in datasets.items():
        n_rows, n_cols = df.shape
        total_records += n_rows
        n_dups = int(df.duplicated().sum())
        missing_by_col = df.isnull().sum().to_dict()
        missing_pct_by_col = (df.isnull().sum() / len(df) * 100).round(2).to_dict()
        total_missing = int(df.isnull().sum().sum())
        total_missing_cells += total_missing
        
        col_types = {col: str(dtype) for col, dtype in df.dtypes.items()}
        
        quality_report["tables"][name] = {
            "rows": n_rows,
            "columns": n_cols,
            "column_list": list(df.columns),
            "duplicates": n_dups,
            "total_missing_cells": total_missing,
            "missing_pct_by_col": missing_pct_by_col,
            "column_types": col_types
        }
        
        if n_dups > 0:
            quality_report["issues_detected"].append(f"Table '{name}' has {n_dups} duplicate rows.")
            
        high_missing = [c for c, p in missing_pct_by_col.items() if p > 30.0]
        if high_missing:
            quality_report["issues_detected"].append(f"Table '{name}' columns with >30% missing: {high_missing}")
            
        print(f"[{name.upper()}] Rows: {n_rows:,} | Cols: {n_cols} | Duplicates: {n_dups} | Missing Cells: {total_missing:,}")

    # Referential Integrity Checks
    # 1. Orders -> Customers
    cust_ids = set(datasets["customers"]["customer_id"].unique())
    order_cust_ids = set(datasets["orders"]["customer_id"].unique())
    orphan_orders_cust = len(order_cust_ids - cust_ids)
    
    # 2. Order Items -> Orders
    order_ids = set(datasets["orders"]["order_id"].unique())
    item_order_ids = set(datasets["order_items"]["order_id"].unique())
    orphan_items_order = len(item_order_ids - order_ids)
    
    # 3. Order Items -> Products
    prod_ids = set(datasets["products"]["product_id"].unique())
    item_prod_ids = set(datasets["order_items"]["product_id"].unique())
    orphan_items_prod = len(item_prod_ids - prod_ids)
    
    # 4. Payments -> Orders
    pay_order_ids = set(datasets["payments"]["order_id"].unique())
    orphan_pay_order = len(pay_order_ids - order_ids)
    
    quality_report["referential_integrity"] = {
        "orphan_orders_without_customer": orphan_orders_cust,
        "orphan_order_items_without_order": orphan_items_order,
        "orphan_items_without_product": orphan_items_prod,
        "orphan_payments_without_order": orphan_pay_order
    }
    
    print("\nReferential Integrity Checks:")
    print(f" -> Orphan orders without valid customer: {orphan_orders_cust}")
    print(f" -> Orphan order items without valid order: {orphan_items_order}")
    print(f" -> Orphan items without valid product: {orphan_items_prod}")
    print(f" -> Orphan payments without valid order: {orphan_pay_order}")

    quality_report["summary"] = {
        "total_tables": len(datasets),
        "total_records": total_records,
        "total_missing_cells": total_missing_cells,
        "integrity_ok": (orphan_orders_cust == 0 and orphan_items_order == 0)
    }

    # Save report
    report_path = DATA_OUTPUTS_DIR / "data_quality_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(quality_report, f, indent=2)
    print(f"\nData quality audit report saved to: {report_path}")
    
    return quality_report

if __name__ == "__main__":
    raw_data = load_raw_datasets()
    report = validate_and_report_quality(raw_data)
