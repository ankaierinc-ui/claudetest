#!/usr/bin/env python3
"""
Example: Sentiment Analysis Script
==================================

This script demonstrates how to use the SentimentAnalyzer
for market research sentiment analysis.

Usage:
    python scripts/example_sentiment_analysis.py
"""

import sys
sys.path.insert(0, "src")

from market_research import SentimentAnalyzer


def main():
    """Run sentiment analysis example."""
    print("=" * 60)
    print("Market Research - Sentiment Analysis Example")
    print("=" * 60)

    try:
        analyzer = SentimentAnalyzer(download_nltk_data=True)
    except ImportError as e:
        print(f"\nError: {e}")
        print("Please install dependencies: pip install -r requirements.txt")
        return

    # Example 1: Single text sentiment analysis
    print("\n1. Single Text Sentiment Analysis")
    print("-" * 40)

    sample_texts = [
        "This product is absolutely amazing! Best purchase I've ever made.",
        "Terrible experience. The quality is poor and customer service was unhelpful.",
        "The product works as expected. Nothing special but does the job.",
    ]

    for text in sample_texts:
        result = analyzer.analyze_sentiment(text)
        print(f"\nText: \"{text[:50]}...\"")
        print(f"  Sentiment: {result['sentiment']} (polarity: {result['polarity']:.2f})")
        print(f"  Subjectivity: {result['subjectivity_label']} ({result['subjectivity']:.2f})")

    # Example 2: Batch analysis
    print("\n2. Batch Sentiment Analysis")
    print("-" * 40)

    reviews = [
        "Love this brand! Always high quality.",
        "Good value for money.",
        "Not what I expected, quite disappointed.",
        "Excellent customer service!",
        "Average product, nothing to write home about.",
        "Would definitely recommend to friends.",
        "Poor packaging, arrived damaged.",
        "Best in its category!",
    ]

    batch_result = analyzer.analyze_batch(reviews)
    print(f"\nAnalyzed {batch_result['total_texts']} reviews")
    print(f"Average polarity: {batch_result['avg_polarity']:.2f}")
    print(f"Sentiment distribution: {batch_result['sentiment_distribution']}")
    print(f"Positive ratio: {batch_result['positive_ratio']:.1%}")
    print(f"Negative ratio: {batch_result['negative_ratio']:.1%}")

    # Example 3: Keyword extraction
    print("\n3. Keyword Extraction")
    print("-" * 40)

    sample_text = """
    The new smartphone features an incredible camera system with advanced AI capabilities.
    Battery life is exceptional, lasting all day with heavy usage. The display is bright
    and vibrant, perfect for watching videos and gaming. Build quality feels premium
    with its aluminum frame and glass back. Overall, this is a flagship device that
    competes well with other premium smartphones in the market.
    """

    keywords = analyzer.extract_keywords(sample_text, top_n=10)
    print("Top keywords:")
    for word, count in keywords:
        print(f"  {word}: {count}")

    # Example 4: Noun phrase extraction
    print("\n4. Noun Phrase Extraction")
    print("-" * 40)

    phrases = analyzer.extract_noun_phrases(sample_text)
    print("Noun phrases found:")
    for phrase in phrases[:10]:
        print(f"  - {phrase}")

    # Example 5: Topic detection across multiple texts
    print("\n5. Topic Detection")
    print("-" * 40)

    tech_reviews = [
        "The battery life on this laptop is impressive. Great for mobile work.",
        "Camera quality exceeds expectations. Battery also lasts long.",
        "Fast processor and excellent battery performance.",
        "The screen resolution is stunning. Best display I've seen.",
        "Battery drains quickly when gaming. Screen is beautiful though.",
    ]

    topics = analyzer.detect_topics(tech_reviews, top_n=5)
    print("Common topics:")
    for topic, freq in topics:
        print(f"  {topic}: mentioned {freq} times")

    # Example 6: Text statistics
    print("\n6. Text Statistics")
    print("-" * 40)

    stats = analyzer.get_text_statistics(sample_text)
    print(f"Character count: {stats['character_count']}")
    print(f"Word count: {stats['word_count']}")
    print(f"Sentence count: {stats['sentence_count']}")
    print(f"Avg sentence length: {stats['avg_sentence_length']:.1f} words")
    print(f"Vocabulary richness: {stats['vocabulary_richness']:.1%}")

    # Example 7: Sentiment comparison
    print("\n7. Sentiment Comparison (Product A vs Product B)")
    print("-" * 40)

    product_a_reviews = [
        "Excellent quality, highly recommend!",
        "Great product, fast shipping.",
        "Love it! Will buy again.",
        "Good but a bit pricey.",
    ]

    product_b_reviews = [
        "Disappointed with the quality.",
        "Not worth the money.",
        "Average at best.",
        "Okay product, nothing special.",
    ]

    comparison = analyzer.compare_sentiments(
        product_a_reviews,
        product_b_reviews,
        label_a="Product A",
        label_b="Product B"
    )

    print(f"Product A avg polarity: {comparison['Product A']['avg_polarity']:.2f}")
    print(f"Product B avg polarity: {comparison['Product B']['avg_polarity']:.2f}")
    print(f"Conclusion: {comparison['comparison']}")

    print("\n" + "=" * 60)
    print("Sentiment analysis complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
