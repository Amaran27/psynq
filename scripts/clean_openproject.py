#!/usr/bin/env python3
"""
Clean all work packages from OpenProject project 3 using parallel threads
"""
import requests
import time
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

API_URL = "http://localhost:8080/api/v3"
API_KEY = "9ad0c551d5fffa8dfe0d3f44189f1d535b399a5c8aa22eaf90cc2ce829f8c2a0"
PROJECT_ID = 6

def get_all_work_packages():
    """Fetch all work package IDs from project"""
    all_ids = []
    offset = 1
    page_size = 100
    
    while True:
        try:
            url = f"{API_URL}/projects/{PROJECT_ID}/work_packages"
            params = {
                "offset": offset,
                "pageSize": page_size
            }
            response = requests.get(url, auth=("apikey", API_KEY), params=params, timeout=30)
            
            if response.status_code != 200:
                print(f"❌ Failed to fetch work packages: {response.status_code}")
                break
            
            data = response.json()
            elements = data.get("_embedded", {}).get("elements", [])
            
            if not elements:
                break
            
            ids = [wp["id"] for wp in elements]
            all_ids.extend(ids)
            
            print(f"📥 Fetched page {offset//page_size + 1}: {len(ids)} work packages")
            
            # Check if more pages exist
            total = data.get("total", 0)
            if len(all_ids) >= total:
                break
                
            offset += page_size
            
        except Exception as e:
            print(f"❌ Error fetching work packages: {e}")
            break
    
    return all_ids

def delete_work_package(wp_id):
    """Delete a single work package"""
    try:
        url = f"{API_URL}/work_packages/{wp_id}"
        response = requests.delete(url, auth=("apikey", API_KEY), timeout=30)
        
        if response.status_code in [200, 204]:
            return True
        else:
            # print(f"⚠️  Failed to delete work package {wp_id}: {response.status_code}")
            return False
    except Exception as e:
        # print(f"❌ Error deleting work package {wp_id}: {e}")
        return False

def main():
    print("🔍 Fetching all work packages...")
    work_package_ids = get_all_work_packages()
    
    if not work_package_ids:
        print("✅ No work packages to delete")
        return
    
    print(f"\n📊 Found {len(work_package_ids)} work packages to delete")
    print("⏳ Starting parallel deletion...\n")
    
    deleted = 0
    failed = 0
    
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(delete_work_package, wp_id): wp_id for wp_id in work_package_ids}
        
        for i, future in enumerate(as_completed(futures), 1):
            if future.result():
                deleted += 1
            else:
                failed += 1
            
            if i % 50 == 0 or i == len(work_package_ids):
                print(f"📊 Progress: {i}/{len(work_package_ids)} ({deleted} deleted, {failed} failed)")
    
    print(f"\n🎉 Cleanup complete!")
    print(f"   ✅ Deleted: {deleted}")
    if failed > 0:
        print(f"   ❌ Failed: {failed}")

if __name__ == "__main__":
    main()
