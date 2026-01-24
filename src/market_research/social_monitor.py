"""
Social Media Monitor Module
===========================

Tools for monitoring social media platforms for market research.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
import os

# Twitter/X API
try:
    import tweepy
    TWEEPY_AVAILABLE = True
except ImportError:
    TWEEPY_AVAILABLE = False

# Reddit API
try:
    import praw
    PRAW_AVAILABLE = True
except ImportError:
    PRAW_AVAILABLE = False


class SocialMonitor:
    """
    Monitor social media platforms for market research insights.

    Supported platforms:
    - Twitter/X
    - Reddit

    Features:
    - Keyword tracking
    - Hashtag analysis
    - User mentions monitoring
    - Subreddit analysis
    """

    def __init__(self):
        """Initialize social monitor with available API clients."""
        self.twitter_client = None
        self.reddit_client = None

    def setup_twitter(
        self,
        bearer_token: Optional[str] = None,
        consumer_key: Optional[str] = None,
        consumer_secret: Optional[str] = None,
        access_token: Optional[str] = None,
        access_token_secret: Optional[str] = None,
    ):
        """
        Set up Twitter/X API client.

        Args:
            bearer_token: Twitter API bearer token
            consumer_key: Twitter API consumer key
            consumer_secret: Twitter API consumer secret
            access_token: Twitter API access token
            access_token_secret: Twitter API access token secret
        """
        if not TWEEPY_AVAILABLE:
            raise ImportError("tweepy is not installed. Run: pip install tweepy")

        bearer_token = bearer_token or os.getenv("TWITTER_BEARER_TOKEN")

        if bearer_token:
            self.twitter_client = tweepy.Client(bearer_token=bearer_token)
        else:
            consumer_key = consumer_key or os.getenv("TWITTER_CONSUMER_KEY")
            consumer_secret = consumer_secret or os.getenv("TWITTER_CONSUMER_SECRET")
            access_token = access_token or os.getenv("TWITTER_ACCESS_TOKEN")
            access_token_secret = access_token_secret or os.getenv("TWITTER_ACCESS_TOKEN_SECRET")

            self.twitter_client = tweepy.Client(
                consumer_key=consumer_key,
                consumer_secret=consumer_secret,
                access_token=access_token,
                access_token_secret=access_token_secret,
            )

    def setup_reddit(
        self,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        user_agent: str = "MarketResearchBot/1.0",
    ):
        """
        Set up Reddit API client.

        Args:
            client_id: Reddit API client ID
            client_secret: Reddit API client secret
            user_agent: User agent string
        """
        if not PRAW_AVAILABLE:
            raise ImportError("praw is not installed. Run: pip install praw")

        client_id = client_id or os.getenv("REDDIT_CLIENT_ID")
        client_secret = client_secret or os.getenv("REDDIT_CLIENT_SECRET")

        self.reddit_client = praw.Reddit(
            client_id=client_id,
            client_secret=client_secret,
            user_agent=user_agent,
        )

    # Twitter/X Methods
    def search_twitter(
        self,
        query: str,
        max_results: int = 100,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        """
        Search Twitter/X for tweets matching a query.

        Args:
            query: Search query
            max_results: Maximum number of results (10-100)
            start_time: Start time for search
            end_time: End time for search

        Returns:
            List of tweet data dictionaries
        """
        if not self.twitter_client:
            raise RuntimeError("Twitter client not initialized. Call setup_twitter() first.")

        tweets = self.twitter_client.search_recent_tweets(
            query=query,
            max_results=min(max_results, 100),
            start_time=start_time,
            end_time=end_time,
            tweet_fields=["created_at", "public_metrics", "lang", "source"],
            expansions=["author_id"],
            user_fields=["username", "public_metrics"],
        )

        results = []
        if tweets.data:
            users = {u.id: u for u in (tweets.includes.get("users", []) or [])}

            for tweet in tweets.data:
                user = users.get(tweet.author_id)
                results.append({
                    "id": tweet.id,
                    "text": tweet.text,
                    "created_at": tweet.created_at.isoformat() if tweet.created_at else None,
                    "metrics": tweet.public_metrics,
                    "lang": tweet.lang,
                    "author": {
                        "id": tweet.author_id,
                        "username": user.username if user else None,
                        "followers": user.public_metrics.get("followers_count") if user else None,
                    },
                })

        return results

    def get_twitter_user(self, username: str) -> Dict[str, Any]:
        """
        Get Twitter/X user information.

        Args:
            username: Twitter username (without @)

        Returns:
            User data dictionary
        """
        if not self.twitter_client:
            raise RuntimeError("Twitter client not initialized.")

        user = self.twitter_client.get_user(
            username=username,
            user_fields=["description", "public_metrics", "created_at", "location"],
        )

        if user.data:
            return {
                "id": user.data.id,
                "username": user.data.username,
                "description": user.data.description,
                "location": user.data.location,
                "created_at": user.data.created_at.isoformat() if user.data.created_at else None,
                "metrics": user.data.public_metrics,
            }
        return {}

    # Reddit Methods
    def search_reddit(
        self,
        query: str,
        subreddit: Optional[str] = None,
        sort: str = "relevance",
        time_filter: str = "all",
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """
        Search Reddit for posts matching a query.

        Args:
            query: Search query
            subreddit: Limit to specific subreddit
            sort: Sort method ('relevance', 'hot', 'top', 'new', 'comments')
            time_filter: Time filter ('all', 'day', 'week', 'month', 'year')
            limit: Maximum number of results

        Returns:
            List of post data dictionaries
        """
        if not self.reddit_client:
            raise RuntimeError("Reddit client not initialized. Call setup_reddit() first.")

        if subreddit:
            search = self.reddit_client.subreddit(subreddit).search(
                query, sort=sort, time_filter=time_filter, limit=limit
            )
        else:
            search = self.reddit_client.subreddit("all").search(
                query, sort=sort, time_filter=time_filter, limit=limit
            )

        results = []
        for post in search:
            results.append({
                "id": post.id,
                "title": post.title,
                "selftext": post.selftext[:500] if post.selftext else None,
                "subreddit": post.subreddit.display_name,
                "score": post.score,
                "upvote_ratio": post.upvote_ratio,
                "num_comments": post.num_comments,
                "created_utc": datetime.fromtimestamp(post.created_utc).isoformat(),
                "url": post.url,
                "permalink": f"https://reddit.com{post.permalink}",
            })

        return results

    def analyze_subreddit(
        self,
        subreddit_name: str,
        post_limit: int = 100,
    ) -> Dict[str, Any]:
        """
        Analyze a subreddit for market research.

        Args:
            subreddit_name: Name of subreddit
            post_limit: Number of posts to analyze

        Returns:
            Subreddit analysis data
        """
        if not self.reddit_client:
            raise RuntimeError("Reddit client not initialized.")

        subreddit = self.reddit_client.subreddit(subreddit_name)

        # Get subreddit info
        info = {
            "name": subreddit.display_name,
            "title": subreddit.title,
            "description": subreddit.public_description,
            "subscribers": subreddit.subscribers,
            "created_utc": datetime.fromtimestamp(subreddit.created_utc).isoformat(),
        }

        # Analyze top posts
        top_posts = []
        for post in subreddit.hot(limit=post_limit):
            top_posts.append({
                "title": post.title,
                "score": post.score,
                "num_comments": post.num_comments,
                "upvote_ratio": post.upvote_ratio,
            })

        # Calculate statistics
        if top_posts:
            avg_score = sum(p["score"] for p in top_posts) / len(top_posts)
            avg_comments = sum(p["num_comments"] for p in top_posts) / len(top_posts)
        else:
            avg_score = 0
            avg_comments = 0

        return {
            "info": info,
            "statistics": {
                "avg_score": avg_score,
                "avg_comments": avg_comments,
                "posts_analyzed": len(top_posts),
            },
            "top_posts": top_posts[:10],
        }

    def get_subreddit_comments(
        self,
        subreddit_name: str,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """
        Get recent comments from a subreddit.

        Args:
            subreddit_name: Name of subreddit
            limit: Number of comments

        Returns:
            List of comment data
        """
        if not self.reddit_client:
            raise RuntimeError("Reddit client not initialized.")

        subreddit = self.reddit_client.subreddit(subreddit_name)
        comments = []

        for comment in subreddit.comments(limit=limit):
            comments.append({
                "id": comment.id,
                "body": comment.body[:500],
                "score": comment.score,
                "created_utc": datetime.fromtimestamp(comment.created_utc).isoformat(),
                "post_title": comment.submission.title,
            })

        return comments
