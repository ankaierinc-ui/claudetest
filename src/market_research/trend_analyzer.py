"""
Trend Analyzer Module
=====================

Tools for analyzing market trends using Google Trends and other sources.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import pandas as pd

try:
    from pytrends.request import TrendReq
    PYTRENDS_AVAILABLE = True
except ImportError:
    PYTRENDS_AVAILABLE = False


class TrendAnalyzer:
    """
    Analyze market trends using Google Trends and other data sources.

    Features:
    - Interest over time analysis
    - Regional interest comparison
    - Related queries discovery
    - Rising trends detection
    """

    def __init__(self, language: str = "en-US", timezone: int = 360):
        """
        Initialize the trend analyzer.

        Args:
            language: Language code for Google Trends
            timezone: Timezone offset in minutes
        """
        if not PYTRENDS_AVAILABLE:
            raise ImportError(
                "pytrends is not installed. "
                "Run: pip install pytrends"
            )

        self.pytrends = TrendReq(hl=language, tz=timezone)

    def get_interest_over_time(
        self,
        keywords: List[str],
        timeframe: str = "today 12-m",
        geo: str = "",
    ) -> pd.DataFrame:
        """
        Get interest over time for keywords.

        Args:
            keywords: List of keywords to analyze (max 5)
            timeframe: Time range (e.g., 'today 12-m', 'today 3-m', '2023-01-01 2023-12-31')
            geo: Geographic location code (e.g., 'US', 'CN', '')

        Returns:
            DataFrame with interest data
        """
        self.pytrends.build_payload(
            kw_list=keywords[:5],
            timeframe=timeframe,
            geo=geo,
        )
        return self.pytrends.interest_over_time()

    def get_interest_by_region(
        self,
        keywords: List[str],
        resolution: str = "COUNTRY",
        timeframe: str = "today 12-m",
    ) -> pd.DataFrame:
        """
        Get interest by geographic region.

        Args:
            keywords: List of keywords
            resolution: Geographic resolution ('COUNTRY', 'REGION', 'CITY', 'DMA')
            timeframe: Time range

        Returns:
            DataFrame with regional interest data
        """
        self.pytrends.build_payload(
            kw_list=keywords[:5],
            timeframe=timeframe,
        )
        return self.pytrends.interest_by_region(resolution=resolution)

    def get_related_queries(self, keywords: List[str]) -> Dict[str, pd.DataFrame]:
        """
        Get related queries for keywords.

        Args:
            keywords: List of keywords

        Returns:
            Dictionary with 'top' and 'rising' DataFrames for each keyword
        """
        self.pytrends.build_payload(kw_list=keywords[:5])
        return self.pytrends.related_queries()

    def get_related_topics(self, keywords: List[str]) -> Dict[str, pd.DataFrame]:
        """
        Get related topics for keywords.

        Args:
            keywords: List of keywords

        Returns:
            Dictionary with related topics for each keyword
        """
        self.pytrends.build_payload(kw_list=keywords[:5])
        return self.pytrends.related_topics()

    def get_trending_searches(self, country: str = "united_states") -> pd.DataFrame:
        """
        Get current trending searches.

        Args:
            country: Country name (lowercase with underscores)

        Returns:
            DataFrame with trending searches
        """
        return self.pytrends.trending_searches(pn=country)

    def get_realtime_trending(self, country: str = "US") -> pd.DataFrame:
        """
        Get real-time trending searches.

        Args:
            country: Country code

        Returns:
            DataFrame with real-time trends
        """
        return self.pytrends.realtime_trending_searches(pn=country)

    def compare_keywords(
        self,
        keywords: List[str],
        timeframe: str = "today 12-m",
        geo: str = "",
    ) -> Dict[str, Any]:
        """
        Compare multiple keywords comprehensively.

        Args:
            keywords: Keywords to compare (max 5)
            timeframe: Time range
            geo: Geographic location

        Returns:
            Dictionary with comparison data
        """
        keywords = keywords[:5]

        self.pytrends.build_payload(
            kw_list=keywords,
            timeframe=timeframe,
            geo=geo,
        )

        interest_time = self.pytrends.interest_over_time()
        interest_region = self.pytrends.interest_by_region()
        related = self.pytrends.related_queries()

        # Calculate summary statistics
        summary = {}
        if not interest_time.empty:
            for kw in keywords:
                if kw in interest_time.columns:
                    summary[kw] = {
                        "avg_interest": float(interest_time[kw].mean()),
                        "max_interest": int(interest_time[kw].max()),
                        "min_interest": int(interest_time[kw].min()),
                        "trend": "rising" if interest_time[kw].iloc[-1] > interest_time[kw].iloc[0] else "falling",
                    }

        return {
            "interest_over_time": interest_time,
            "interest_by_region": interest_region,
            "related_queries": related,
            "summary": summary,
        }

    def detect_seasonality(
        self,
        keyword: str,
        years: int = 5,
    ) -> Dict[str, Any]:
        """
        Detect seasonality patterns for a keyword.

        Args:
            keyword: Keyword to analyze
            years: Number of years to analyze

        Returns:
            Dictionary with seasonality data
        """
        end_date = datetime.now()
        start_date = end_date - timedelta(days=365 * years)
        timeframe = f"{start_date.strftime('%Y-%m-%d')} {end_date.strftime('%Y-%m-%d')}"

        self.pytrends.build_payload(kw_list=[keyword], timeframe=timeframe)
        df = self.pytrends.interest_over_time()

        if df.empty:
            return {"error": "No data available"}

        # Calculate monthly averages
        df["month"] = df.index.month
        monthly_avg = df.groupby("month")[keyword].mean()

        peak_month = int(monthly_avg.idxmax())
        low_month = int(monthly_avg.idxmin())

        month_names = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ]

        return {
            "monthly_averages": monthly_avg.to_dict(),
            "peak_month": month_names[peak_month - 1],
            "low_month": month_names[low_month - 1],
            "seasonality_strength": float(monthly_avg.std() / monthly_avg.mean()),
        }
