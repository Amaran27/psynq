#!/usr/bin/env python3
"""
Master script to generate all detailed work items.
Run this to create the complete work breakdown.
"""
import os
import sys

# Add scripts directory to path
sys.path.insert(0, 'd:/Project/psitrix/psynq/scripts')

print("="*70)
print("PSITRIX PSYNQ - Detailed Work Items Generator")
print("Generating implementation-level work breakdown")
print("NO MOCKS, NO STUBS - Real implementation specs only")
print("="*70)

# Import and run each part
from generate_detailed_workitems import generate_phases, OUTPUT_FILE

# Part 1: Generate Phases (also creates the file)
phases = generate_phases()

# Part 2: Infrastructure & Platform
from generate_detailed_part2 import generate_infrastructure
generate_infrastructure()

# Part 3: Backend Core Services
from generate_detailed_part3 import generate_backend_core
generate_backend_core()

# Part 4: Telephony & Asterisk
from generate_detailed_part4 import generate_telephony
generate_telephony()

# Part 5: Dialer & Campaign
from generate_detailed_part5 import generate_dialer
generate_dialer()

# Count total items
import csv
with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    items = list(reader)

print("\n" + "="*70)
print("GENERATION COMPLETE")
print("="*70)
print(f"Output file: {OUTPUT_FILE}")
print(f"Total work items: {len(items)}")

# Count by type
from collections import Counter
type_counts = Counter(item['Type'] for item in items)
print("\nBy Type:")
for t, count in sorted(type_counts.items()):
    print(f"  {t}: {count}")

print("\n" + "="*70)
print("NOTE: This is a partial generation.")
print("Additional parts needed for complete coverage:")
print("  - Part 6: Frontend Applications (React components)")
print("  - Part 7: Admin & Configuration UI")
print("  - Part 8: Analytics & Reporting")
print("  - Part 9: AI & Conversational Intelligence")
print("  - Part 10: Omnichannel Engagement")
print("  - Part 11: Workforce Engagement Management")
print("  - Part 12: Integrations & APIs")
print("  - Part 13: Security & Compliance")
print("  - Part 14: Operations & DevOps")
print("="*70)
