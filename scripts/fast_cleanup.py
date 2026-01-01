#!/usr/bin/env python3
import requests
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
import sys

API_URL = "http://localhost:8080/api/v3"
API_KEY = "9ad0c551d5fffa8dfe0d3f44189f1d535b399a5c8aa22eaf90cc2ce829f8c2a0"
PROJECT_ID = 6

def get_all_work_packages():
    all_ids = []
    offset = 1
    page_size = 100
    print("🔍 Fetching all work package IDs...")
    while True:
        url = f"{API_URL}/projects/{PROJECT_ID}/work_packages"
        params = {"offset": offset, "pageSize": page_size}
        try:
            response = requests.get(url, auth=("apikey", API_KEY), params=params, timeout=30)
            if response.status_code != 200:
                print(f"❌ Error fetching: {response.status_code}")
                break
            data = response.json()
            elements = data.get("_embedded", {}).get("elements", [])
            if not elements: break
            
            page_ids = [wp["id"] for wp in elements]
            all_ids.extend(page_ids)
            
            total = data.get("total", 0)
            print(f"📥 Progress: {len(all_ids)}/{total}")
            
            if len(all_ids) >= total: break
            offset += page_size
        except Exception as e:
            print(f"❌ Exception: {e}")
            break
    return all_ids

def delete_wp(wp_id):
    url = f"{API_URL}/work_packages/{wp_id}"
    max_retries = 3
    for attempt in range(max_retries):
        try:
            resp = requests.delete(url, auth=("apikey", API_KEY), timeout=30)
            if resp.status_code in [200, 204]:
                return True
            elif resp.status_code == 409: # Conflict
                time.sleep(1)
                continue
            elif resp.status_code == 429: # Too Many Requests
                wait = int(resp.headers.get("Retry-After", 2))
                time.sleep(wait)
                continue
            else:
                return False
        except:
            time.sleep(1)
    return False

def main():
    ids = get_all_work_packages()
    if not ids:
        print("✅ No work packages to delete")
        return
    
    total = len(ids)
    print(f"🗑️ Starting parallel deletion of {total} work packages using 20 workers...")
    
    start_time = time.time()
    deleted = 0
    failed = 0
    
    with ThreadPoolExecutor(max_workers=20) as executor:
        future_to_id = {executor.submit(delete_wp, wp_id): wp_id for wp_id in ids}
        
        for i, future in enumerate(as_completed(future_to_id), 1):
            if future.result():
                deleted += 1
            else:
                failed += 1
            
            if i % 50 == 0 or i == total:
                elapsed = time.time() - start_time
                speed = i / elapsed if elapsed > 0 else 0
                print(f"📊 Progress: {i}/{total} | Deleted: {deleted} | Failed: {failed} | Speed: {speed:.2f} wp/s")

    end_time = time.time()
    print(f"\n✅ Cleanup complete in {end_time - start_time:.2f} seconds")
    print(f"   Total Deleted: {deleted}")
    print(f"   Total Failed: {failed}")

if __name__ == "__main__":
    main()
