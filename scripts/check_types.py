import requests
import os

OPENPROJECT_URL = 'http://localhost:8080'
API_KEY = '9ad0c551d5fffa8dfe0d3f44189f1d535b399a5c8aa22eaf90cc2ce829f8c2a0'

def list_types():
    url = f"{OPENPROJECT_URL}/api/v3/types"
    response = requests.get(url, auth=("apikey", API_KEY))
    if response.status_code == 200:
        types = response.json()["_embedded"]["elements"]
        print("Work Package Types:")
        for t in types:
            print(f"ID: {t['id']}, Name: {t['name']}")
    else:
        print(f"Error: {response.status_code} - {response.text}")

if __name__ == "__main__":
    list_types()
