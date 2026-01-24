"""
Sentiment Analysis Module
=========================

Tools for analyzing sentiment in text data for market research.
"""

from typing import Optional, List, Dict, Any, Tuple
import re
from collections import Counter

try:
    from textblob import TextBlob
    TEXTBLOB_AVAILABLE = True
except ImportError:
    TEXTBLOB_AVAILABLE = False

try:
    import nltk
    from nltk.tokenize import word_tokenize
    from nltk.corpus import stopwords
    NLTK_AVAILABLE = True
except ImportError:
    NLTK_AVAILABLE = False


class SentimentAnalyzer:
    """
    Analyze sentiment and extract insights from text data.

    Features:
    - Sentiment scoring
    - Keyword extraction
    - Topic detection
    - Text summarization
    """

    def __init__(self, download_nltk_data: bool = True):
        """
        Initialize sentiment analyzer.

        Args:
            download_nltk_data: Whether to download required NLTK data
        """
        if not TEXTBLOB_AVAILABLE:
            raise ImportError("textblob is not installed. Run: pip install textblob")

        if NLTK_AVAILABLE and download_nltk_data:
            self._download_nltk_data()

        self._stop_words = set()
        if NLTK_AVAILABLE:
            try:
                self._stop_words = set(stopwords.words("english"))
            except LookupError:
                pass

    def _download_nltk_data(self):
        """Download required NLTK data."""
        try:
            nltk.data.find("tokenizers/punkt")
        except LookupError:
            nltk.download("punkt", quiet=True)

        try:
            nltk.data.find("corpora/stopwords")
        except LookupError:
            nltk.download("stopwords", quiet=True)

    def analyze_sentiment(self, text: str) -> Dict[str, Any]:
        """
        Analyze sentiment of a text.

        Args:
            text: Text to analyze

        Returns:
            Sentiment analysis results
        """
        blob = TextBlob(text)

        polarity = blob.sentiment.polarity
        subjectivity = blob.sentiment.subjectivity

        # Determine sentiment label
        if polarity > 0.1:
            label = "positive"
        elif polarity < -0.1:
            label = "negative"
        else:
            label = "neutral"

        # Determine subjectivity label
        if subjectivity > 0.6:
            subj_label = "subjective"
        elif subjectivity < 0.4:
            subj_label = "objective"
        else:
            subj_label = "mixed"

        return {
            "polarity": polarity,
            "subjectivity": subjectivity,
            "sentiment": label,
            "subjectivity_label": subj_label,
            "word_count": len(blob.words),
            "sentence_count": len(blob.sentences),
        }

    def analyze_batch(self, texts: List[str]) -> Dict[str, Any]:
        """
        Analyze sentiment of multiple texts.

        Args:
            texts: List of texts to analyze

        Returns:
            Batch analysis results with aggregated statistics
        """
        results = [self.analyze_sentiment(text) for text in texts]

        if not results:
            return {"error": "No texts provided"}

        # Calculate aggregates
        polarities = [r["polarity"] for r in results]
        sentiments = [r["sentiment"] for r in results]

        sentiment_dist = Counter(sentiments)

        return {
            "total_texts": len(texts),
            "avg_polarity": sum(polarities) / len(polarities),
            "sentiment_distribution": dict(sentiment_dist),
            "positive_ratio": sentiment_dist.get("positive", 0) / len(texts),
            "negative_ratio": sentiment_dist.get("negative", 0) / len(texts),
            "neutral_ratio": sentiment_dist.get("neutral", 0) / len(texts),
            "individual_results": results,
        }

    def extract_keywords(
        self,
        text: str,
        top_n: int = 10,
        min_word_length: int = 3,
    ) -> List[Tuple[str, int]]:
        """
        Extract keywords from text.

        Args:
            text: Text to analyze
            top_n: Number of top keywords to return
            min_word_length: Minimum word length to consider

        Returns:
            List of (keyword, count) tuples
        """
        # Tokenize
        if NLTK_AVAILABLE:
            try:
                words = word_tokenize(text.lower())
            except LookupError:
                words = text.lower().split()
        else:
            words = text.lower().split()

        # Clean and filter
        words = [
            re.sub(r"[^\w]", "", word)
            for word in words
            if len(word) >= min_word_length
        ]

        # Remove stop words
        words = [w for w in words if w and w not in self._stop_words]

        # Count and return top
        word_counts = Counter(words)
        return word_counts.most_common(top_n)

    def extract_noun_phrases(self, text: str) -> List[str]:
        """
        Extract noun phrases from text.

        Args:
            text: Text to analyze

        Returns:
            List of noun phrases
        """
        blob = TextBlob(text)
        return list(blob.noun_phrases)

    def detect_topics(
        self,
        texts: List[str],
        top_n: int = 5,
    ) -> List[Tuple[str, int]]:
        """
        Detect common topics across multiple texts.

        Args:
            texts: List of texts to analyze
            top_n: Number of top topics to return

        Returns:
            List of (topic, frequency) tuples
        """
        all_phrases = []
        for text in texts:
            phrases = self.extract_noun_phrases(text)
            all_phrases.extend(phrases)

        phrase_counts = Counter(all_phrases)
        return phrase_counts.most_common(top_n)

    def get_text_statistics(self, text: str) -> Dict[str, Any]:
        """
        Get detailed statistics about a text.

        Args:
            text: Text to analyze

        Returns:
            Text statistics
        """
        blob = TextBlob(text)

        words = blob.words
        sentences = blob.sentences

        # Calculate readability (simple approximation)
        if len(sentences) > 0 and len(words) > 0:
            avg_sentence_length = len(words) / len(sentences)
            avg_word_length = sum(len(w) for w in words) / len(words)
        else:
            avg_sentence_length = 0
            avg_word_length = 0

        return {
            "character_count": len(text),
            "word_count": len(words),
            "sentence_count": len(sentences),
            "avg_sentence_length": avg_sentence_length,
            "avg_word_length": avg_word_length,
            "unique_words": len(set(w.lower() for w in words)),
            "vocabulary_richness": len(set(w.lower() for w in words)) / len(words) if words else 0,
        }

    def compare_sentiments(
        self,
        texts_a: List[str],
        texts_b: List[str],
        label_a: str = "Group A",
        label_b: str = "Group B",
    ) -> Dict[str, Any]:
        """
        Compare sentiments between two groups of texts.

        Args:
            texts_a: First group of texts
            texts_b: Second group of texts
            label_a: Label for first group
            label_b: Label for second group

        Returns:
            Comparison results
        """
        analysis_a = self.analyze_batch(texts_a)
        analysis_b = self.analyze_batch(texts_b)

        polarity_diff = analysis_a["avg_polarity"] - analysis_b["avg_polarity"]

        if abs(polarity_diff) < 0.1:
            comparison = "similar"
        elif polarity_diff > 0:
            comparison = f"{label_a} is more positive"
        else:
            comparison = f"{label_b} is more positive"

        return {
            label_a: {
                "avg_polarity": analysis_a["avg_polarity"],
                "sentiment_distribution": analysis_a["sentiment_distribution"],
            },
            label_b: {
                "avg_polarity": analysis_b["avg_polarity"],
                "sentiment_distribution": analysis_b["sentiment_distribution"],
            },
            "polarity_difference": polarity_diff,
            "comparison": comparison,
        }
