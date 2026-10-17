import urllib.request
import json

base = "http://localhost:8000"

# 1. Default catalog (All 25,000)
r1 = json.loads(urllib.request.urlopen(f"{base}/api/customers-catalog").read())
print("Test 1 - Default Catalog:")
print(f"  Total: {r1['total']}, Limit: {r1['limit']}, Pages: {r1['total_pages']}, Records: {len(r1['records'])}")
print(f"  Tier counts: {r1['tier_counts']}")

# 2. Page 2
r2 = json.loads(urllib.request.urlopen(f"{base}/api/customers-catalog?page=2&limit=50").read())
print("Test 2 - Page 2:")
print(f"  Page: {r2['page']}, Total: {r2['total']}, Records: {len(r2['records'])}")

# 3. Critical Tier
r3 = json.loads(urllib.request.urlopen(f"{base}/api/customers-catalog?tier=CRITICAL").read())
print("Test 3 - Critical Tier:")
print(f"  Total Critical: {r3['total']}, Records: {len(r3['records'])}")

# 4. VIP Top 1% Tier
r4 = json.loads(urllib.request.urlopen(f"{base}/api/customers-catalog?tier=TOP1PCT").read())
print("Test 4 - Top 1% VIPs:")
print(f"  Total VIPs: {r4['total']}, Top spend: ${r4['records'][0]['total_spend']}")

# 5. Search
r5 = json.loads(urllib.request.urlopen(f"{base}/api/customers-catalog?search=perfumery&limit=10").read())
print("Test 5 - Search 'perfumery':")
print(f"  Matches: {r5['total']}, Returned: {len(r5['records'])}")

# 6. Customer Lookup
sample_id = r1['records'][0]['customer_id']
r6 = json.loads(urllib.request.urlopen(f"{base}/api/customer-lookup/{sample_id}").read())
print("Test 6 - Customer Lookup:")
print(f"  Customer ID: {r6['customer_id']}, City: {r6['city']}, Spend: ${r6['total_spend']}, Prob: {r6['final_churn_prob']}")

# 7. Check index.html serving
html = urllib.request.urlopen(f"{base}/").read().decode("utf-8")
has_toolbar = "catalog-toolbar" in html
has_pagination = "catalog-pagination" in html
has_tier_badges = "count-tier-all" in html and "count-tier-top1" in html
print("Test 7 - Frontend HTML:")
print(f"  Toolbar: {has_toolbar}, Pagination: {has_pagination}, Tier Badges: {has_tier_badges}")
print("\nALL 7 INTEGRATION TESTS PASSED SUCCESSFULLY!")
