import datetime
import logging
import time
import urllib.parse
from bs4 import BeautifulSoup
import feedparser
from flask import Flask, jsonify, render_template, request
import requests

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Feed URL
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache for parsed release notes
cache = {
    "data": None,
    "last_fetched": 0,
    "ttl": 900  # 15 minutes cache lifetime
}

def parse_date(date_str):
    """Safely parses date strings from the feed."""
    for fmt in ("%B %d, %Y", "%b %d, %Y", "%Y-%m-%d"):
        try:
            return datetime.datetime.strptime(date_str.strip(), fmt)
        except ValueError:
            continue
    return None

def parse_release_notes(xml_content):
    """Parses the XML feed content and segments it into individual updates."""
    feed = feedparser.parse(xml_content)
    parsed_updates = []
    
    for entry_idx, entry in enumerate(feed.entries):
        # The entry title is typically the date (e.g., "June 25, 2026")
        date_str = entry.title
        parsed_date = parse_date(date_str)
        
        # Format date beautifully
        if parsed_date:
            formatted_date = parsed_date.strftime("%B %d, %Y")
            sort_date = parsed_date.isoformat()
        else:
            formatted_date = date_str
            sort_date = getattr(entry, 'updated', datetime.datetime.now().isoformat())
            
        link = entry.link
        entry_id = entry.id
        
        # Extract HTML content
        html_content = ""
        if 'content' in entry and len(entry.content) > 0:
            html_content = entry.content[0].value
        elif 'summary' in entry:
            html_content = entry.summary
            
        if not html_content:
            continue
            
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Look for <h3> elements which segment different updates for the same day
        h3_elements = soup.find_all('h3')
        
        if not h3_elements:
            # If no <h3> found, treat the entire content as a single update
            text_content = soup.get_text(separator=" ").strip()
            # Clean up extra spaces
            text_content = " ".join(text_content.split())
            
            parsed_updates.append({
                "id": f"{entry_id}_0",
                "date_str": formatted_date,
                "sort_date": sort_date,
                "type": "Update",
                "content_html": html_content,
                "content_text": text_content,
                "link": link
            })
        else:
            # Split the HTML by <h3> elements
            for idx, h3 in enumerate(h3_elements):
                update_type = h3.get_text().strip()
                
                # Collect sibling tags until the next <h3>
                sibling_htmls = []
                sibling_texts = []
                sibling = h3.next_sibling
                
                while sibling and sibling.name != 'h3':
                    if sibling.name:
                        # Normalize internal links to open in a new tab
                        for a_tag in sibling.find_all('a'):
                            a_tag['target'] = '_blank'
                            a_tag['rel'] = 'noopener noreferrer'
                            # Ensure absolute URLs if they are relative
                            if a_tag.get('href', '').startswith('/'):
                                a_tag['href'] = 'https://cloud.google.com' + a_tag['href']
                                
                        sibling_htmls.append(str(sibling))
                        sibling_texts.append(sibling.get_text().strip())
                    else:
                        text_val = str(sibling).strip()
                        if text_val:
                            sibling_htmls.append(text_val)
                            sibling_texts.append(text_val)
                    sibling = sibling.next_sibling
                
                content_html = "".join(sibling_htmls).strip()
                content_text = " ".join(sibling_texts).strip()
                # Clean up whitespace
                content_text = " ".join(content_text.split())
                
                parsed_updates.append({
                    "id": f"{entry_id}_{idx}",
                    "date_str": formatted_date,
                    "sort_date": sort_date,
                    "type": update_type,
                    "content_html": content_html,
                    "content_text": content_text,
                    "link": link
                })
                
    # Sort updates by date descending
    parsed_updates.sort(key=lambda x: x['sort_date'], reverse=True)
    return parsed_updates

def fetch_feed_data(force=False):
    """Fetches feed from URL or returns cached version."""
    current_time = time.time()
    
    # Return cache if valid and not forced to refresh
    if not force and cache["data"] is not None and (current_time - cache["last_fetched"]) < cache["ttl"]:
        logger.info("Returning cached release notes")
        return cache["data"], False
        
    logger.info("Fetching fresh release notes from Google Cloud Feeds")
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(FEED_URL, headers=headers, timeout=15)
        response.raise_for_status()
        
        parsed_data = parse_release_notes(response.content)
        
        # Update cache
        cache["data"] = parsed_data
        cache["last_fetched"] = current_time
        
        return parsed_data, True
    except Exception as e:
        logger.error(f"Error fetching or parsing feed: {str(e)}")
        # If fetch fails but we have cached data, fall back to cache
        if cache["data"] is not None:
            logger.warning("Fetch failed, falling back to cached data")
            return cache["data"], False
        raise e

@app.route('/')
def index():
    """Serves the main application page."""
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    """API endpoint to fetch release notes with support for forced refresh."""
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    try:
        updates, is_fresh = fetch_feed_data(force=force_refresh)
        return jsonify({
            "status": "success",
            "count": len(updates),
            "is_fresh": is_fresh,
            "last_updated": datetime.datetime.fromtimestamp(cache["last_fetched"]).isoformat(),
            "updates": updates
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to retrieve release notes: {str(e)}"
        }), 500

if __name__ == '__main__':
    # Defaulting to port 5000
    app.run(host='0.0.0.0', port=5000, debug=True)
