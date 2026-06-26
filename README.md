# BigQuery Release Hub

A modern, responsive dashboard application built with Python Flask and plain vanilla HTML, CSS, and JavaScript. It aggregates, segments, and displays the official Google Cloud BigQuery release notes feed, offering advanced search, category filtering, and direct integration to share specific updates on Twitter/X.

## 🚀 Core Features

*   **Granular Update Segmentation**: Daily release logs are parsed and split into individual, independent cards representing a single specific change (e.g., a specific Feature, Change, Deprecation, or Fix) rather than a giant text block.
*   **Interactive Overview Metrics**: A sidebar displaying real-time metrics for total notes, features, changes, and deprecations, which also serve as quick-filtering controllers.
*   **Multi-Dimensional Filtering**: Real-time client-side search across title, date, and content, combined with category pills and temporal filters (Past 7, 30, or 90 days).
*   **In-Memory Server Caching**: Utilizes an in-memory cache with a 15-minute Time-To-Live (TTL) to guarantee fast page loads, combined with a manual refresh button to force-fetch live data.
*   **Animated State Transitions**: Fully animated UI states, including skeleton loaders during sync operations, hover micro-interactions, and toast notifications.
*   **Interactive Tweet Composer**: A modal displaying a realistic mockup of an X/Twitter post. The composer automatically structures text, injects category emojis, appends relevant hashtags, and truncates descriptions to fit X's 280-character limit (accounting for X's 23-character link policy) with a live SVG progress ring.
*   **Theme Persistence**: Support for dark and light modes, automatically matching system preferences and persisting user overrides in `localStorage`.

---

## 🛠️ Technology Stack

### Backend (Python/Flask)
*   **Flask (3.0.3)**: Web framework serving static pages and JSON APIs.
*   **requests**: Handles outgoing HTTP requests to retrieve the XML feed.
*   **feedparser**: Parses the Atom XML feed.
*   **BeautifulSoup4**: Navigates and segments the HTML content within the feed.

### Frontend (Vanilla Web Tech)
*   **HTML5**: Semantic markup structuring the dashboard and controls.
*   **Vanilla CSS**: Theme-supporting design tokens, layout grids/flexboxes, custom scrollbars, and keyframe animations.
*   **Vanilla JavaScript**: State management, local filtering/sorting, theme toggling, and interactive modal composition.
*   **Lucide Icons**: Sleek, modern vector icons loaded via CDN.

---

## 📁 Project Structure

```text
bq-release-notes/
├── app.py                  # Main Flask application, routes, parser, and cache
├── requirements.txt        # Python package dependencies
├── .gitignore              # Git ignore configuration
├── README.md               # Project documentation (this file)
├── templates/
│   └── index.html          # Main HTML structure and UI layouts
└── static/
    ├── css/
    │   └── style.css       # Core stylesheet (tokens, themes, and layouts)
    └── js/
        └── main.js         # Frontend controller (state, filtering, and modal)
```

---

## ⚙️ Installation & Setup

### Prerequisites
*   Python 3.7 or higher
*   `pip` (Python package manager)

### 1. Clone or Navigate to the Directory
Ensure you are in the root of the project directory:
```bash
cd bq-release-notes
```

### 2. Install Dependencies
Install the required packages using pip:
```bash
python3 -m pip install -r requirements.txt
```

### 3. Run the Application
Start the Flask development server:
```bash
python3 app.py
```

By default, the server will start on `http://127.0.0.1:5000`.

---

## 📖 Usage Guide

### Syncing Data
*   The backend automatically fetches and caches the feed on the first load.
*   Click the **Refresh** button in the header at any time to force-fetch the latest live updates from Google Cloud. A loading animation and skeleton screens will display while the sync is in progress.

### Filtering and Searching
*   **Keyword Search**: Type in the search box to filter updates instantly.
*   **Overview Cards**: Click any of the metrics cards (Total, Features, Changes, Deprecations) to quickly filter by that type.
*   **Category Pills**: Use the sidebar category list to filter the timeline.
*   **Timeframe Filters**: Narrow down updates to the past week, month, or quarter.
*   **Sorting**: Toggle the sorting button to switch between **Newest First** and **Oldest First** ordering.

### Tweeting Updates
1. Click **Tweet Update** or the X logo button on any release card.
2. The **Compose Tweet** modal will open, showing a live mockup of a post.
3. The text is pre-formatted and auto-truncated to stay within Twitter's 280-character limit.
4. You can edit the text in the text area. The progress ring and character counter will update in real time.
5. Click **Suggested Tags** to instantly append popular hashtags.
6. Click **Copy Text** to copy the text to your clipboard, or **Post to X** to open the official Twitter/X web composer in a new browser tab.
