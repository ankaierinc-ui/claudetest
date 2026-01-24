#!/usr/bin/env python3
"""
Example: Social Media Monitoring Script
=======================================

This script demonstrates how to use the SocialMonitor
for market research social media analysis.

Usage:
    python scripts/example_social_media.py

Note: Requires API credentials to be set as environment variables:
    - Twitter: TWITTER_BEARER_TOKEN
    - Reddit: REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET
"""

import sys
import os
sys.path.insert(0, "src")

from market_research import SocialMonitor


def demo_twitter(monitor: SocialMonitor):
    """Demonstrate Twitter monitoring features."""
    print("\n" + "=" * 50)
    print("Twitter/X Monitoring Demo")
    print("=" * 50)

    # Check for credentials
    if not os.getenv("TWITTER_BEARER_TOKEN"):
        print("\nTwitter API not configured.")
        print("To use Twitter features, set TWITTER_BEARER_TOKEN environment variable.")
        print("\nExample usage (when configured):")
        print("""
    monitor.setup_twitter()

    # Search for tweets
    tweets = monitor.search_twitter(
        query="artificial intelligence",
        max_results=10
    )

    for tweet in tweets:
        print(f"@{tweet['author']['username']}: {tweet['text'][:100]}...")
        print(f"  Likes: {tweet['metrics']['like_count']}")
        print(f"  Retweets: {tweet['metrics']['retweet_count']}")

    # Get user info
    user = monitor.get_twitter_user("openai")
    print(f"Followers: {user['metrics']['followers_count']}")
        """)
        return

    try:
        monitor.setup_twitter()

        # Search tweets
        print("\nSearching for AI-related tweets...")
        tweets = monitor.search_twitter(
            query="artificial intelligence -is:retweet lang:en",
            max_results=10
        )

        print(f"Found {len(tweets)} tweets:\n")
        for tweet in tweets[:5]:
            print(f"@{tweet['author']['username']}:")
            print(f"  {tweet['text'][:100]}...")
            print(f"  Likes: {tweet['metrics']['like_count']}, "
                  f"Retweets: {tweet['metrics']['retweet_count']}")
            print()

    except Exception as e:
        print(f"Twitter API error: {e}")


def demo_reddit(monitor: SocialMonitor):
    """Demonstrate Reddit monitoring features."""
    print("\n" + "=" * 50)
    print("Reddit Monitoring Demo")
    print("=" * 50)

    # Check for credentials
    if not os.getenv("REDDIT_CLIENT_ID"):
        print("\nReddit API not configured.")
        print("To use Reddit features, set environment variables:")
        print("  - REDDIT_CLIENT_ID")
        print("  - REDDIT_CLIENT_SECRET")
        print("\nExample usage (when configured):")
        print("""
    monitor.setup_reddit()

    # Search Reddit
    posts = monitor.search_reddit(
        query="market research tools",
        subreddit="marketing",
        sort="top",
        time_filter="month",
        limit=10
    )

    for post in posts:
        print(f"r/{post['subreddit']}: {post['title']}")
        print(f"  Score: {post['score']}, Comments: {post['num_comments']}")

    # Analyze subreddit
    analysis = monitor.analyze_subreddit("entrepreneur", post_limit=50)
    print(f"Subscribers: {analysis['info']['subscribers']}")
    print(f"Avg post score: {analysis['statistics']['avg_score']:.1f}")
        """)
        return

    try:
        monitor.setup_reddit()

        # Search Reddit
        print("\nSearching Reddit for market research posts...")
        posts = monitor.search_reddit(
            query="market research",
            sort="relevance",
            time_filter="month",
            limit=10
        )

        print(f"Found {len(posts)} posts:\n")
        for post in posts[:5]:
            print(f"r/{post['subreddit']}: {post['title'][:60]}...")
            print(f"  Score: {post['score']}, Comments: {post['num_comments']}")
            print(f"  URL: {post['permalink']}")
            print()

        # Analyze a subreddit
        print("\nAnalyzing r/marketing...")
        analysis = monitor.analyze_subreddit("marketing", post_limit=25)

        print(f"Subreddit: r/{analysis['info']['name']}")
        print(f"Subscribers: {analysis['info']['subscribers']:,}")
        print(f"Average post score: {analysis['statistics']['avg_score']:.1f}")
        print(f"Average comments: {analysis['statistics']['avg_comments']:.1f}")

        print("\nTop posts:")
        for post in analysis['top_posts'][:3]:
            print(f"  - {post['title'][:50]}... (score: {post['score']})")

    except Exception as e:
        print(f"Reddit API error: {e}")


def main():
    """Run social media monitoring example."""
    print("=" * 60)
    print("Market Research - Social Media Monitoring Example")
    print("=" * 60)

    monitor = SocialMonitor()

    demo_twitter(monitor)
    demo_reddit(monitor)

    print("\n" + "=" * 60)
    print("Social media monitoring demo complete!")
    print("=" * 60)
    print("\nTo use these features, configure your API credentials:")
    print("  Twitter: https://developer.twitter.com/")
    print("  Reddit: https://www.reddit.com/prefs/apps")


if __name__ == "__main__":
    main()
