"""
Data Collector Module
=====================

Tools for collecting market research data from various sources.
"""

import requests
from bs4 import BeautifulSoup
from typing import Optional, Dict, List, Any
from urllib.parse import urljoin, urlparse
import time
import json


class DataCollector:
    """
    A versatile data collector for market research.

    Supports:
    - Web page scraping
    - API data fetching
    - RSS feed parsing
    - Sitemap crawling
    """

    def __init__(self, user_agent: Optional[str] = None, timeout: int = 30):
        """
        Initialize the data collector.

        Args:
            user_agent: Custom user agent string
            timeout: Request timeout in seconds
        """
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": user_agent or "MarketResearchBot/1.0 (Educational Purpose)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        })

    def fetch_page(self, url: str) -> Optional[BeautifulSoup]:
        """
        Fetch and parse a web page.

        Args:
            url: The URL to fetch

        Returns:
            BeautifulSoup object or None if failed
        """
        try:
            response = self.session.get(url, timeout=self.timeout)
            response.raise_for_status()
            return BeautifulSoup(response.text, "lxml")
        except requests.RequestException as e:
            print(f"Error fetching {url}: {e}")
            return None

    def extract_links(self, url: str, internal_only: bool = True) -> List[str]:
        """
        Extract all links from a page.

        Args:
            url: The page URL
            internal_only: Only return links to the same domain

        Returns:
            List of URLs
        """
        soup = self.fetch_page(url)
        if not soup:
            return []

        base_domain = urlparse(url).netloc
        links = []

        for a_tag in soup.find_all("a", href=True):
            href = a_tag["href"]
            full_url = urljoin(url, href)

            if internal_only:
                if urlparse(full_url).netloc == base_domain:
                    links.append(full_url)
            else:
                links.append(full_url)

        return list(set(links))

    def extract_text(self, url: str, selector: Optional[str] = None) -> str:
        """
        Extract text content from a page.

        Args:
            url: The page URL
            selector: CSS selector to target specific elements

        Returns:
            Extracted text
        """
        soup = self.fetch_page(url)
        if not soup:
            return ""

        if selector:
            elements = soup.select(selector)
            return "\n".join(el.get_text(strip=True) for el in elements)

        # Remove script and style elements
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()

        return soup.get_text(separator="\n", strip=True)

    def extract_structured_data(self, url: str) -> Dict[str, Any]:
        """
        Extract structured data (JSON-LD, meta tags) from a page.

        Args:
            url: The page URL

        Returns:
            Dictionary with structured data
        """
        soup = self.fetch_page(url)
        if not soup:
            return {}

        data = {
            "title": "",
            "description": "",
            "keywords": [],
            "json_ld": [],
            "og_tags": {},
        }

        # Title
        title_tag = soup.find("title")
        if title_tag:
            data["title"] = title_tag.get_text(strip=True)

        # Meta tags
        for meta in soup.find_all("meta"):
            name = meta.get("name", "").lower()
            property_name = meta.get("property", "").lower()
            content = meta.get("content", "")

            if name == "description":
                data["description"] = content
            elif name == "keywords":
                data["keywords"] = [k.strip() for k in content.split(",")]
            elif property_name.startswith("og:"):
                data["og_tags"][property_name] = content

        # JSON-LD
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                data["json_ld"].append(json.loads(script.string))
            except (json.JSONDecodeError, TypeError):
                pass

        return data

    def fetch_api(
        self,
        url: str,
        method: str = "GET",
        params: Optional[Dict] = None,
        data: Optional[Dict] = None,
        headers: Optional[Dict] = None,
    ) -> Optional[Dict]:
        """
        Fetch data from an API endpoint.

        Args:
            url: API endpoint URL
            method: HTTP method
            params: Query parameters
            data: Request body data
            headers: Additional headers

        Returns:
            JSON response or None
        """
        try:
            response = self.session.request(
                method=method,
                url=url,
                params=params,
                json=data,
                headers=headers,
                timeout=self.timeout,
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"API error {url}: {e}")
            return None

    def crawl_site(
        self,
        start_url: str,
        max_pages: int = 50,
        delay: float = 1.0,
    ) -> List[Dict[str, Any]]:
        """
        Crawl a website starting from a URL.

        Args:
            start_url: Starting URL
            max_pages: Maximum pages to crawl
            delay: Delay between requests in seconds

        Returns:
            List of page data dictionaries
        """
        visited = set()
        to_visit = [start_url]
        results = []

        while to_visit and len(visited) < max_pages:
            url = to_visit.pop(0)
            if url in visited:
                continue

            print(f"Crawling: {url}")
            visited.add(url)

            page_data = self.extract_structured_data(url)
            page_data["url"] = url
            page_data["text_preview"] = self.extract_text(url)[:500]
            results.append(page_data)

            # Add new links to queue
            new_links = self.extract_links(url, internal_only=True)
            for link in new_links:
                if link not in visited:
                    to_visit.append(link)

            time.sleep(delay)

        return results
