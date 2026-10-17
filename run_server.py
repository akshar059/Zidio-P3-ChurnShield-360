"""
Root Script to Launch the Customer Churn & Sales Analytics Web Application
"""

import sys
import uvicorn
from pathlib import Path

# Add project root to path
ROOT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT_DIR))

if __name__ == "__main__":
    print("=" * 60)
    print("Starting Customer Churn & Sales Dashboard Server...")
    print("Local URL: http://127.0.0.1:8000")
    print("API Documentation: http://127.0.0.1:8000/docs")
    print("=" * 60)
    uvicorn.run("src.server:app", host="127.0.0.1", port=8000, reload=False)
