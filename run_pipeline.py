"""
Main Entrypoint to Execute the Customer Churn & Sales Analytics Pipeline
"""

import sys
from pathlib import Path

# Add project root to path
ROOT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT_DIR))

from src.pipeline_runner import run_full_pipeline

if __name__ == "__main__":
    # If the user passes --sample N, we sample cohort for rapid testing; otherwise run full cohort
    import argparse
    parser = argparse.ArgumentParser(description="Customer Churn & Sales Analytics Pipeline")
    parser.add_argument("--sample", type=int, default=None, help="Optional sample cohort size (e.g. 25000)")
    args = parser.parse_args()

    run_full_pipeline(sample_cohort_size=args.sample)
