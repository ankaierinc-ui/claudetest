"""
Market Research Skills Package
==============================

A comprehensive toolkit for market research tasks including:
- Data collection and web scraping
- Trend analysis
- Social media monitoring
- Competitor analysis
- Sentiment analysis
"""

__version__ = "0.1.0"
__author__ = "Market Research Team"

from .data_collector import DataCollector
from .trend_analyzer import TrendAnalyzer
from .social_monitor import SocialMonitor
from .sentiment import SentimentAnalyzer

__all__ = [
    "DataCollector",
    "TrendAnalyzer",
    "SocialMonitor",
    "SentimentAnalyzer",
]
