#!/usr/bin/env python3
"""
Example: Trend Analysis Script
==============================

This script demonstrates how to use the TrendAnalyzer
for market research trend analysis.

Usage:
    python scripts/example_trend_analysis.py
"""

import sys
sys.path.insert(0, "src")

from market_research import TrendAnalyzer
import pandas as pd


def main():
    """Run trend analysis example."""
    print("=" * 60)
    print("Market Research - Trend Analysis Example")
    print("=" * 60)

    try:
        analyzer = TrendAnalyzer()
    except ImportError as e:
        print(f"\nError: {e}")
        print("Please install dependencies: pip install -r requirements.txt")
        return

    # Example 1: Compare interest over time
    print("\n1. Comparing Search Interest Over Time")
    print("-" * 40)

    keywords = ["artificial intelligence", "machine learning", "deep learning"]
    print(f"Keywords: {keywords}")

    try:
        interest_df = analyzer.get_interest_over_time(
            keywords=keywords,
            timeframe="today 12-m",
            geo="US"
        )

        if not interest_df.empty:
            print("\nMonthly average interest:")
            monthly = interest_df.resample("M").mean()
            print(monthly.tail())
        else:
            print("No data available")

    except Exception as e:
        print(f"Error: {e}")

    # Example 2: Regional Interest
    print("\n2. Interest by Region")
    print("-" * 40)

    try:
        regional_df = analyzer.get_interest_by_region(
            keywords=["electric vehicles"],
            resolution="COUNTRY"
        )

        if not regional_df.empty:
            print("\nTop 10 countries by interest:")
            print(regional_df.nlargest(10, "electric vehicles"))

    except Exception as e:
        print(f"Error: {e}")

    # Example 3: Related Queries
    print("\n3. Related Queries")
    print("-" * 40)

    try:
        related = analyzer.get_related_queries(["sustainable fashion"])

        for keyword, data in related.items():
            print(f"\nKeyword: {keyword}")
            if data and "rising" in data and data["rising"] is not None:
                print("Rising queries:")
                print(data["rising"].head())

    except Exception as e:
        print(f"Error: {e}")

    # Example 4: Trending Searches
    print("\n4. Current Trending Searches (US)")
    print("-" * 40)

    try:
        trending = analyzer.get_trending_searches(country="united_states")
        print(trending.head(10))

    except Exception as e:
        print(f"Error: {e}")

    # Example 5: Seasonality Detection
    print("\n5. Seasonality Analysis")
    print("-" * 40)

    try:
        seasonality = analyzer.detect_seasonality(
            keyword="winter jacket",
            years=3
        )

        if "error" not in seasonality:
            print(f"Peak month: {seasonality['peak_month']}")
            print(f"Low month: {seasonality['low_month']}")
            print(f"Seasonality strength: {seasonality['seasonality_strength']:.2f}")

    except Exception as e:
        print(f"Error: {e}")

    print("\n" + "=" * 60)
    print("Trend analysis complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
