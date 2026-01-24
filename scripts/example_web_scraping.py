#!/usr/bin/env python3
"""
Example: Web Scraping Script
============================

This script demonstrates how to use the DataCollector
for market research web scraping tasks.

Usage:
    python scripts/example_web_scraping.py
"""

import sys
sys.path.insert(0, "src")

from market_research import DataCollector
import json


def main():
    """Run web scraping example."""
    print("=" * 60)
    print("Market Research - Web Scraping Example")
    print("=" * 60)

    collector = DataCollector(timeout=30)

    # Example 1: Extract structured data from a page
    print("\n1. Extracting Structured Data")
    print("-" * 40)

    url = "https://example.com"
    print(f"URL: {url}")

    data = collector.extract_structured_data(url)
    if data:
        print(f"Title: {data.get('title', 'N/A')}")
        print(f"Description: {data.get('description', 'N/A')[:100]}...")
        print(f"OG Tags: {json.dumps(data.get('og_tags', {}), indent=2)}")

    # Example 2: Extract all links from a page
    print("\n2. Extracting Links")
    print("-" * 40)

    links = collector.extract_links(url, internal_only=True)
    print(f"Found {len(links)} internal links")
    for link in links[:5]:
        print(f"  - {link}")

    # Example 3: Extract text content
    print("\n3. Extracting Text Content")
    print("-" * 40)

    text = collector.extract_text(url)
    print(f"Extracted {len(text)} characters")
    print(f"Preview: {text[:200]}...")

    # Example 4: Fetch API data
    print("\n4. Fetching API Data")
    print("-" * 40)

    api_url = "https://jsonplaceholder.typicode.com/posts/1"
    print(f"API URL: {api_url}")

    api_data = collector.fetch_api(api_url)
    if api_data:
        print(f"Response: {json.dumps(api_data, indent=2)[:200]}...")

    # Example 5: Custom CSS selector extraction
    print("\n5. CSS Selector Extraction")
    print("-" * 40)

    print("Example: Extract all headings from a page")
    print("  collector.extract_text(url, selector='h1, h2, h3')")

    print("\n" + "=" * 60)
    print("Web scraping examples complete!")
    print("=" * 60)
    print("\nNote: Always respect robots.txt and rate limits when scraping.")


if __name__ == "__main__":
    main()
