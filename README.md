# Market Research Skills

A comprehensive Python toolkit for market research tasks.

## Features

- **Data Collection** - Web scraping, API fetching, site crawling
- **Trend Analysis** - Google Trends integration, seasonality detection
- **Social Media Monitoring** - Twitter/X and Reddit analysis
- **Sentiment Analysis** - Text sentiment, keyword extraction, topic detection
- **MCP Server Integration** - Extend Claude's capabilities with web search and fetch

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your API credentials

# Run example scripts
python scripts/example_sentiment_analysis.py
python scripts/example_trend_analysis.py
python scripts/example_web_scraping.py
python scripts/example_social_media.py
```

## Project Structure

```
market-research-skills/
├── src/market_research/       # Core library
│   ├── __init__.py
│   ├── data_collector.py      # Web scraping & data collection
│   ├── trend_analyzer.py      # Google Trends analysis
│   ├── social_monitor.py      # Social media monitoring
│   └── sentiment.py           # Sentiment analysis
├── scripts/                   # Example scripts
├── config/                    # Configuration files
│   └── mcp_servers.json       # MCP server configuration
├── requirements.txt           # Python dependencies
└── .env.example              # Environment template
```

## Usage Examples

### Sentiment Analysis

```python
from market_research import SentimentAnalyzer

analyzer = SentimentAnalyzer()

# Analyze single text
result = analyzer.analyze_sentiment("Great product, highly recommend!")
print(result['sentiment'])  # 'positive'

# Batch analysis
reviews = ["Love it!", "Terrible quality", "It's okay"]
batch = analyzer.analyze_batch(reviews)
print(batch['sentiment_distribution'])
```

### Trend Analysis

```python
from market_research import TrendAnalyzer

analyzer = TrendAnalyzer()

# Compare keywords
interest = analyzer.get_interest_over_time(
    keywords=["AI", "machine learning"],
    timeframe="today 12-m"
)

# Detect seasonality
seasonality = analyzer.detect_seasonality("winter jacket", years=3)
print(f"Peak: {seasonality['peak_month']}")
```

### Web Scraping

```python
from market_research import DataCollector

collector = DataCollector()

# Extract structured data
data = collector.extract_structured_data("https://example.com")

# Extract text content
text = collector.extract_text("https://example.com", selector="article")
```

### Social Media Monitoring

```python
from market_research import SocialMonitor

monitor = SocialMonitor()

# Reddit analysis
monitor.setup_reddit()
posts = monitor.search_reddit("market research", subreddit="marketing")
analysis = monitor.analyze_subreddit("entrepreneur")
```

## API Credentials

Configure in `.env` file:

| Service | Environment Variable | Get credentials from |
|---------|---------------------|---------------------|
| Twitter/X | `TWITTER_BEARER_TOKEN` | https://developer.twitter.com/ |
| Reddit | `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET` | https://www.reddit.com/prefs/apps |
| Brave Search | `BRAVE_API_KEY` | https://brave.com/search/api/ |

## MCP Server Setup

For Claude Code integration, configure the MCP servers in `config/mcp_servers.json`:

```bash
# Install MCP servers
npm install -g @anthropic/mcp-server-fetch
npm install -g @anthropic/mcp-server-brave-search
npm install -g @anthropic/mcp-server-filesystem
```

## License

MIT
