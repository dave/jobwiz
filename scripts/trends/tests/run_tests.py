#!/usr/bin/env python3
"""
Run unit tests without pytest dependency.
"""

import json
import sys
from datetime import datetime
from pathlib import Path

# Paths
SCRIPT_DIR = Path(__file__).parent.parent
REPO_ROOT = SCRIPT_DIR.parent.parent
COMPANIES_FILE = SCRIPT_DIR / "companies.json"
ROLES_FILE = SCRIPT_DIR / "roles.json"
OUTPUT_FILE = REPO_ROOT / "data" / "search_volume.json"
FETCH_SCRIPT = SCRIPT_DIR / "fetch_trends.py"

passed = 0
failed = 0


def test(name, condition, message=""):
    global passed, failed
    if condition:
        print(f"  ✓ {name}")
        passed += 1
    else:
        print(f"  ✗ {name}: {message}")
        failed += 1


print("\n=== Input File Tests ===")

# Test companies.json
with open(COMPANIES_FILE) as f:
    companies_data = json.load(f)

test("companies.json is valid JSON", True)
test("companies.json has categories", "categories" in companies_data)
test("companies.json has >= 5 categories", len(companies_data["categories"]) >= 5)

total_companies = sum(len(c["companies"]) for c in companies_data["categories"])
test(f"companies.json has >= 100 companies ({total_companies})", total_companies >= 100)

# Check company slugs
all_slugs_valid = True
for category in companies_data["categories"]:
    for company in category["companies"]:
        slug = company["slug"]
        if slug != slug.lower() or " " in slug:
            all_slugs_valid = False
            break
test("all company slugs lowercase, no spaces", all_slugs_valid)

# Check for duplicate slugs
slugs = [c["slug"] for cat in companies_data["categories"] for c in cat["companies"]]
test("no duplicate company slugs", len(slugs) == len(set(slugs)))

# Test roles.json
with open(ROLES_FILE) as f:
    roles_data = json.load(f)

test("roles.json is valid JSON", True)
test("roles.json has roles", "roles" in roles_data)
test(f"roles.json has >= 8 roles ({len(roles_data['roles'])})", len(roles_data["roles"]) >= 8)

# Check role slugs
all_role_slugs_valid = True
for role in roles_data["roles"]:
    slug = role["slug"]
    if slug != slug.lower() or " " in slug:
        all_role_slugs_valid = False
        break
test("all role slugs lowercase, no spaces", all_role_slugs_valid)

# Check for duplicate role slugs
role_slugs = [r["slug"] for r in roles_data["roles"]]
test("no duplicate role slugs", len(role_slugs) == len(set(role_slugs)))


print("\n=== Script Validation Tests ===")

# Check fetch_trends.py syntax
import ast
with open(FETCH_SCRIPT) as f:
    try:
        ast.parse(f.read())
        test("fetch_trends.py syntax valid", True)
    except SyntaxError as e:
        test("fetch_trends.py syntax valid", False, str(e))

# Check for required constants/features in script
with open(FETCH_SCRIPT) as f:
    content = f.read()

test("MIN_DELAY defined", "MIN_DELAY" in content)
test("MAX_DELAY defined", "MAX_DELAY" in content)
test("rate limiting delay (10-30s)", "10" in content and "30" in content)
test("progress file support", "progress.json" in content or "PROGRESS_FILE" in content)
test("resume flag support", "--resume" in content)
test("blocked status handling", "blocked" in content.lower())
test("exit code 2 for blocked", "sys.exit(2)" in content)


print("\n=== Output File Tests ===")

if OUTPUT_FILE.exists():
    with open(OUTPUT_FILE) as f:
        output_data = json.load(f)

    test("output JSON is valid", True)
    test("output has generated_at", "generated_at" in output_data)
    test("output has geography", "geography" in output_data)
    test("output has status", "status" in output_data)
    test("output has companies", "companies" in output_data)
    test("output has priority_list", "priority_list" in output_data)
    test("geography is US", output_data.get("geography") == "US")
    test("status is valid", output_data.get("status") in ["complete", "partial", "blocked"])

    # Check companies have required fields
    companies_valid = all(
        "name" in c and "slug" in c and "interview_volume" in c
        for c in output_data.get("companies", [])
    )
    test("companies have required fields", companies_valid)

    # Check volumes are numeric
    volumes_numeric = all(
        isinstance(c.get("interview_volume"), (int, float))
        for c in output_data.get("companies", [])
    )
    test("interview_volume is numeric", volumes_numeric)

    # Check priority list is sorted
    scores = [p["score"] for p in output_data.get("priority_list", [])]
    test("priority_list is sorted descending", scores == sorted(scores, reverse=True))

    # Check generated_at is ISO format
    try:
        timestamp = output_data["generated_at"].rstrip("Z")
        datetime.fromisoformat(timestamp)
        test("generated_at is ISO format", True)
    except:
        test("generated_at is ISO format", False)
else:
    print("  (output file not yet created - skipping)")


print(f"\n{'='*40}")
print(f"Results: {passed} passed, {failed} failed")

if failed > 0:
    sys.exit(1)
else:
    print("\n✓ All tests passed!")
    sys.exit(0)
