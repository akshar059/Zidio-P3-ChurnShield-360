"""
Root Script to Launch the Customer Churn & Sales Analytics Web Application
"""

import os
import sys
import uvicorn
from pathlib import Path

# Add project root to path
ROOT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT_DIR))

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    print("=" * 60)
    print(f"Starting Customer Churn & Sales Dashboard Server on {host}:{port}...")
    print(f"Local URL: http://{host}:{port}")
    print(f"API Documentation: http://{host}:{port}/docs")
    print("=" * 60)
    uvicorn.run("src.server:app", host=host, port=port, reload=False)
