#!/usr/bin/env python3
"""
Google Trends Search Volume Fetcher

Queries Google Trends for "{company} interview" and "{company} {role} interview"
to determine search volume for prioritizing content generation.

Usage:
    python fetch_trends.py                          # Full run (all companies, all roles)
    python fetch_trends.py --companies 3 --roles 2  # Limited test run
    python fetch_trends.py --resume                 # Resume from last progress

Output: data/search_volume.json (relative to repo root)
"""

import argparse
import json
import os
import random
import sys
import time
from datetime import datetime
from pathlib import Path

from pytrends.request import TrendReq

# Paths relative to script location
SCRIPT_DIR = Path(__file__).parent
REPO_ROOT = SCRIPT_DIR.parent.parent
DATA_DIR = REPO_ROOT / "data"
COMPANIES_FILE = SCRIPT_DIR / "companies.json"
ROLES_FILE = SCRIPT_DIR / "roles.json"
PROGRESS_FILE = SCRIPT_DIR / "progress.json"
OUTPUT_FILE = DATA_DIR / "search_volume.json"

# Rate limiting settings
MIN_DELAY = 10  # seconds
MAX_DELAY = 30  # seconds


def load_companies(limit: int | None = None) -> list[dict]:
    """Load companies from companies.json, optionally limiting count."""
    with open(COMPANIES_FILE) as f:
        data = json.load(f)

    companies = []
    for category in data["categories"]:
        for company in category["companies"]:
            companies.append({
                **company,
                "category": category["name"]
            })

    if limit:
        companies = companies[:limit]

    return companies


def load_roles(limit: int | None = None) -> list[dict]:
    """Load roles from roles.json, optionally limiting count."""
    with open(ROLES_FILE) as f:
        data = json.load(f)

    roles = data["roles"]
    if limit:
        roles = roles[:limit]

    return roles


def load_progress() -> dict:
    """Load progress from previous run if exists."""
    if PROGRESS_FILE.exists():
        with open(PROGRESS_FILE) as f:
            return json.load(f)
    return {"processed_companies": [], "results": {}}


def save_progress(progress: dict):
    """Save current progress to file."""
    with open(PROGRESS_FILE, "w") as f:
        json.dump(progress, f, indent=2)


def save_output(results: dict, status: str):
    """Save final output to data/search_volume.json."""
    # Ensure data directory exists
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    # Build company list with volumes
    companies = []
    for slug, data in results.items():
        companies.append({
            "name": data["name"],
            "slug": slug,
            "category": data["category"],
            "interview_volume": data["interview_volume"],
            "roles": data.get("roles", [])
        })

    # Sort by interview volume descending for priority list
    sorted_companies = sorted(companies, key=lambda x: x["interview_volume"], reverse=True)

    # Build priority list (company-role combinations)
    priority_list = []
    for company in sorted_companies:
        # Add company-level priority
        priority_list.append({
            "company": company["slug"],
            "role": None,
            "score": company["interview_volume"]
        })
        # Add role-specific priorities
        for role in company.get("roles", []):
            priority_list.append({
                "company": company["slug"],
                "role": role["slug"],
                "score": role["volume"]
            })

    # Sort priority list by score
    priority_list = sorted(priority_list, key=lambda x: x["score"], reverse=True)

    output = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "geography": "US",
        "status": status,
        "companies": sorted_companies,
        "priority_list": priority_list
    }

    with open(OUTPUT_FILE, "w") as f:
        json.dump(output, f, indent=2)

    print(f"Output saved to {OUTPUT_FILE}")


def fetch_interest(pytrends: TrendReq, keyword: str) -> int:
    """
    Fetch interest over time for a keyword.
    Returns average interest value (0-100 scale).
    """
    try:
        pytrends.build_payload([keyword], timeframe="today 12-m", geo="US")
        data = pytrends.interest_over_time()

        if data.empty:
            return 0

        # Return average interest, excluding isPartial column
        if keyword in data.columns:
            return int(data[keyword].mean())
        return 0

    except Exception as e:
        error_str = str(e).lower()
        # Check for rate limiting / blocking
        if "429" in error_str or "too many" in error_str or "blocked" in error_str:
            raise BlockedError(str(e))
        # Other errors return 0 but don't stop execution
        print(f"  Warning: Error fetching '{keyword}': {e}")
        return 0


class BlockedError(Exception):
    """Raised when Google blocks the request."""
    pass


def rate_limit_delay():
    """Sleep for random delay between requests."""
    delay = random.uniform(MIN_DELAY, MAX_DELAY)
    print(f"  Rate limiting: waiting {delay:.1f}s...")
    time.sleep(delay)


def main():
    parser = argparse.ArgumentParser(description="Fetch Google Trends data for interview searches")
    parser.add_argument("--companies", type=int, help="Limit number of companies to process")
    parser.add_argument("--roles", type=int, help="Limit number of roles to process")
    parser.add_argument("--resume", action="store_true", help="Resume from previous progress")
    args = parser.parse_args()

    # Load input data
    companies = load_companies(args.companies)
    roles = load_roles(args.roles)

    print(f"Loaded {len(companies)} companies and {len(roles)} roles")

    # Load progress if resuming
    if args.resume:
        progress = load_progress()
        print(f"Resuming from previous run ({len(progress['processed_companies'])} companies already processed)")
    else:
        progress = {"processed_companies": [], "results": {}}

    # Initialize pytrends
    pytrends = TrendReq(hl="en-US", tz=360)

    blocked = False
    status = "complete"

    try:
        for i, company in enumerate(companies):
            slug = company["slug"]

            # Skip if already processed
            if slug in progress["processed_companies"]:
                print(f"Skipping {company['name']} (already processed)")
                continue

            print(f"\n[{i+1}/{len(companies)}] Processing {company['name']}...")

            # Fetch company-level interview volume
            keyword = f"{company['name']} interview"
            print(f"  Fetching: '{keyword}'")

            try:
                interview_volume = fetch_interest(pytrends, keyword)
            except BlockedError as e:
                print(f"\nBlocked by Google: {e}")
                print("Run again later with --resume to continue.")
                blocked = True
                status = "blocked"
                break

            rate_limit_delay()

            # Fetch role-specific volumes
            role_data = []
            for role in roles:
                role_keyword = f"{company['name']} {role['name']} interview"
                print(f"  Fetching: '{role_keyword}'")

                try:
                    role_volume = fetch_interest(pytrends, role_keyword)
                except BlockedError as e:
                    print(f"\nBlocked by Google: {e}")
                    print("Run again later with --resume to continue.")
                    blocked = True
                    status = "blocked"
                    break

                role_data.append({
                    "name": role["name"],
                    "slug": role["slug"],
                    "volume": role_volume
                })

                rate_limit_delay()

            if blocked:
                break

            # Save company result
            progress["results"][slug] = {
                "name": company["name"],
                "category": company["category"],
                "interview_volume": interview_volume,
                "roles": role_data
            }
            progress["processed_companies"].append(slug)

            # Save progress after each company
            save_progress(progress)
            print(f"  Done: interview_volume={interview_volume}")

        # Determine final status
        if not blocked:
            if len(progress["processed_companies"]) == len(companies):
                status = "complete"
            else:
                status = "partial"

    except KeyboardInterrupt:
        print("\n\nInterrupted by user. Saving progress...")
        status = "partial"

    # Save output even if partial
    if progress["results"]:
        save_output(progress["results"], status)

    # Print summary
    print(f"\n{'='*50}")
    print(f"Status: {status}")
    print(f"Companies processed: {len(progress['processed_companies'])}/{len(companies)}")
    if progress["results"]:
        total_volume = sum(r["interview_volume"] for r in progress["results"].values())
        print(f"Total interview volume: {total_volume}")

    # Exit with appropriate code
    if blocked:
        sys.exit(2)  # Exit code 2 for blocked
    elif status == "partial":
        sys.exit(1)  # Exit code 1 for partial
    else:
        sys.exit(0)  # Exit code 0 for complete


if __name__ == "__main__":
    main()
