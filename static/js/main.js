// State Management
let allUpdates = [];
let filteredUpdates = [];
let isLoading = false;
let currentSortOrder = 'desc'; // 'desc' or 'asc'
let activeCategory = 'all';
let activeDays = 'all';
let selectedUpdate = null;

// DOM Elements
const elements = {
    themeToggle: document.getElementById('themeToggle'),
    refreshBtn: document.getElementById('refreshBtn'),
    lastUpdatedText: document.getElementById('lastUpdatedText'),
    searchInput: document.getElementById('searchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    categoryList: document.getElementById('categoryList'),
    timeframeButtons: document.querySelector('.timeframe-buttons'),
    sortOrderBtn: document.getElementById('sortOrderBtn'),
    visibleCount: document.getElementById('visibleCount'),
    timelineFeed: document.getElementById('timelineFeed'),
    timelineSkeletons: document.getElementById('timelineSkeletons'),
    emptyState: document.getElementById('emptyState'),
    resetFiltersBtn: document.getElementById('resetFiltersBtn'),
    
    // Overview metrics
    statAll: document.getElementById('statAll'),
    statFeatures: document.getElementById('statFeatures'),
    statChanges: document.getElementById('statChanges'),
    statDeprecations: document.getElementById('statDeprecations'),
    statsWidget: document.querySelector('.stats-widget'),

    // Tweet Modal
    tweetModal: document.getElementById('tweetModal'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    tweetTextArea: document.getElementById('tweetTextArea'),
    tweetPreviewText: document.getElementById('tweetPreviewText'),
    charProgressCircle: document.getElementById('charProgressCircle'),
    charCountText: document.getElementById('charCountText'),
    charCounterContainer: document.querySelector('.char-counter-container'),
    copyTweetBtn: document.getElementById('copyTweetBtn'),
    postTweetBtn: document.getElementById('postTweetBtn'),
    suggestedTags: document.querySelector('.suggested-tags'),
    
    // Toast Container
    toastContainer: document.getElementById('toastContainer')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    fetchReleaseNotes(false); // Initial load (uses cache)
    setupEventListeners();
});

// Theme Management (Light / Dark Mode)
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'light') {
        document.body.classList.remove('dark-theme');
    } else if (savedTheme === 'dark' || systemPrefersDark) {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.add('dark-theme'); // Default to dark-theme for premium aesthetics
    }
    
    lucide.createIcons();
}

function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    // Play a small hover/active scale animation on toggle
    elements.themeToggle.style.transform = 'scale(0.9)';
    setTimeout(() => {
        elements.themeToggle.style.transform = '';
    }, 150);
    
    showToast(isDark ? 'Dark mode enabled' : 'Light mode enabled', 'info');
}

// Data Fetching
async function fetchReleaseNotes(forceRefresh = false) {
    if (isLoading) return;
    
    isLoading = true;
    toggleLoadingState(true);
    
    const url = `/api/release-notes${forceRefresh ? '?refresh=true' : ''}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'success') {
            allUpdates = data.updates;
            
            // Format and display last updated time
            const lastUpdated = new Date(data.last_updated);
            elements.lastUpdatedText.textContent = `Synced: ${formatTimeAgo(lastUpdated)}`;
            
            // Apply current filters & render
            applyFilters();
            
            if (forceRefresh) {
                showToast('Release notes successfully refreshed', 'success');
            }
        } else {
            throw new Error(data.message || 'Unknown error occurred');
        }
    } catch (error) {
        console.error('Error fetching release notes:', error);
        showToast('Failed to sync release notes. Please try again.', 'error');
        // Hide skeletons and show empty state if no data exists
        if (allUpdates.length === 0) {
            elements.timelineFeed.style.display = 'none';
            elements.emptyState.style.display = 'block';
        }
    } finally {
        isLoading = false;
        toggleLoadingState(false);
    }
}

function toggleLoadingState(loading) {
    if (loading) {
        elements.refreshBtn.classList.add('spinning');
        elements.refreshBtn.disabled = true;
        elements.timelineSkeletons.style.display = 'flex';
        elements.timelineFeed.style.display = 'none';
        elements.emptyState.style.display = 'none';
    } else {
        elements.refreshBtn.classList.remove('spinning');
        elements.refreshBtn.disabled = false;
        elements.timelineSkeletons.style.display = 'none';
        elements.timelineFeed.style.display = 'block';
    }
}

// Event Listeners Setup
function setupEventListeners() {
    // Theme Toggle
    elements.themeToggle.addEventListener('click', toggleTheme);
    
    // Refresh Button
    elements.refreshBtn.addEventListener('click', () => fetchReleaseNotes(true));
    
    // Search input
    elements.searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        elements.clearSearchBtn.style.display = query ? 'flex' : 'none';
        applyFilters();
    });
    
    // Clear search button
    elements.clearSearchBtn.addEventListener('click', () => {
        elements.searchInput.value = '';
        elements.clearSearchBtn.style.display = 'none';
        elements.searchInput.focus();
        applyFilters();
    });
    
    // Category pills click
    elements.categoryList.addEventListener('click', (e) => {
        const pill = e.target.closest('.category-pill');
        if (!pill) return;
        
        // Remove active class from all pills
        elements.categoryList.querySelectorAll('.category-pill').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active to clicked
        pill.classList.add('active');
        activeCategory = pill.dataset.category;
        applyFilters();
    });

    // Stats Grid Click (Quick Filter integration)
    elements.statsWidget.addEventListener('click', (e) => {
        const statCard = e.target.closest('.stat-card');
        if (!statCard) return;

        const category = statCard.dataset.filter;
        
        // Find corresponding category pill in list
        const targetPill = elements.categoryList.querySelector(`.category-pill[data-category="${category}"]`) ||
                           elements.categoryList.querySelector(`.category-pill[data-category="all"]`);
        
        if (targetPill) {
            targetPill.click();
            // Smooth scroll to feed
            document.querySelector('.app-content').scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
    
    // Timeframe buttons click
    elements.timeframeButtons.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn');
        if (!btn) return;
        
        elements.timeframeButtons.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeDays = btn.dataset.days;
        applyFilters();
    });
    
    // Sort Order toggle
    elements.sortOrderBtn.addEventListener('click', () => {
        currentSortOrder = currentSortOrder === 'desc' ? 'asc' : 'desc';
        
        // Update UI button
        const orderText = currentSortOrder === 'desc' ? 'Newest First' : 'Oldest First';
        elements.sortOrderBtn.querySelector('span').textContent = orderText;
        
        const icon = elements.sortOrderBtn.querySelector('i');
        if (currentSortOrder === 'desc') {
            icon.setAttribute('data-lucide', 'arrow-down-narrow-wide');
        } else {
            icon.setAttribute('data-lucide', 'arrow-up-narrow-wide');
        }
        
        lucide.createIcons();
        applyFilters();
    });
    
    // Empty state reset button
    elements.resetFiltersBtn.addEventListener('click', resetAllFilters);
    
    // Tweet Modal Events
    elements.closeModalBtn.addEventListener('click', closeTweetModal);
    elements.tweetTextArea.addEventListener('input', updateTweetCharacterCount);
    elements.copyTweetBtn.addEventListener('click', copyTweetText);
    elements.postTweetBtn.addEventListener('click', postTweetToTwitter);
    
    // suggested tag pill clicks
    elements.suggestedTags.addEventListener('click', (e) => {
        const tagPill = e.target.closest('.tag-pill');
        if (!tagPill) return;
        
        const tag = tagPill.dataset.tag;
        const currentVal = elements.tweetTextArea.value;
        
        // Append tag if it's not already in the tweet
        if (!currentVal.includes(tag)) {
            const separator = currentVal.endsWith(' ') || currentVal.endsWith('\n') ? '' : ' ';
            elements.tweetTextArea.value = currentVal + separator + tag;
            updateTweetCharacterCount();
        }
    });

    // Close modal on clicking outside card
    elements.tweetModal.addEventListener('click', (e) => {
        if (e.target === elements.tweetModal) {
            closeTweetModal();
        }
    });

    // Close modal on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && elements.tweetModal.style.display === 'flex') {
            closeTweetModal();
        }
    });
}

// Reset Filters
function resetAllFilters() {
    elements.searchInput.value = '';
    elements.clearSearchBtn.style.display = 'none';
    
    elements.categoryList.querySelectorAll('.category-pill').forEach(btn => {
        btn.classList.remove('active');
    });
    elements.categoryList.querySelector('[data-category="all"]').classList.add('active');
    
    elements.timeframeButtons.querySelectorAll('.btn').forEach(btn => {
        btn.classList.remove('active');
    });
    elements.timeframeButtons.querySelector('[data-days="all"]').classList.add('active');
    
    activeCategory = 'all';
    activeDays = 'all';
    
    applyFilters();
}

// Filter and Sort Logic
function applyFilters() {
    const searchQuery = elements.searchInput.value.toLowerCase().trim();
    
    // 1. Filter updates
    filteredUpdates = allUpdates.filter(update => {
        // Search query filter
        const matchesSearch = !searchQuery || 
            update.type.toLowerCase().includes(searchQuery) ||
            update.date_str.toLowerCase().includes(searchQuery) ||
            update.content_text.toLowerCase().includes(searchQuery);
            
        // Category filter
        const matchesCategory = activeCategory === 'all' || 
            update.type.toLowerCase() === activeCategory.toLowerCase() ||
            (activeCategory === 'Breaking change' && update.type.toLowerCase() === 'breaking change') ||
            (activeCategory === 'Deprecation' && update.type.toLowerCase() === 'deprecation');
            
        // Timeframe filter
        let matchesTimeframe = true;
        if (activeDays !== 'all') {
            const daysLimit = parseInt(activeDays, 10);
            const updateDate = new Date(update.sort_date);
            const currentDate = new Date();
            const timeDiff = Math.abs(currentDate.getTime() - updateDate.getTime());
            const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
            matchesTimeframe = diffDays <= daysLimit;
        }
        
        return matchesSearch && matchesCategory && matchesTimeframe;
    });
    
    // 2. Sort updates
    filteredUpdates.sort((a, b) => {
        const dateA = new Date(a.sort_date);
        const dateB = new Date(b.sort_date);
        return currentSortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
    
    // 3. Update dashboard counter numbers
    updateOverviewMetrics();
    
    // 4. Render feed
    renderTimelineFeed();
}

// Update Dashboard Statistics
function updateOverviewMetrics() {
    elements.statAll.textContent = allUpdates.length;
    
    const features = allUpdates.filter(u => u.type.toLowerCase() === 'feature').length;
    const changes = allUpdates.filter(u => u.type.toLowerCase() === 'change').length;
    const deprecations = allUpdates.filter(u => u.type.toLowerCase() === 'deprecation' || u.type.toLowerCase() === 'breaking change').length;
    
    elements.statFeatures.textContent = features;
    elements.statChanges.textContent = changes;
    elements.statDeprecations.textContent = deprecations;
}

// Render Timeline Updates
function renderTimelineFeed() {
    elements.visibleCount.textContent = filteredUpdates.length;
    
    if (filteredUpdates.length === 0) {
        elements.timelineFeed.innerHTML = '';
        elements.emptyState.style.display = 'block';
        return;
    }
    
    elements.emptyState.style.display = 'none';
    
    let html = '';
    
    filteredUpdates.forEach(update => {
        const typeClass = getCategoryClass(update.type);
        const badgeClass = getBadgeClass(update.type);
        const iconName = getCategoryIcon(update.type);
        
        html += `
            <article class="update-card ${typeClass}" id="card_${update.id}">
                <div class="card-header">
                    <div class="card-header-left">
                        <span class="type-badge ${badgeClass}">
                            <i data-lucide="${iconName}" class="icon-xs"></i>
                            ${update.type}
                        </span>
                        <span class="card-date">${update.date_str}</span>
                    </div>
                    <div class="card-actions-top">
                        <button class="btn btn-icon btn-tweet-card" onclick="openTweetComposer('${update.id}')" title="Share this update on X/Twitter">
                            <svg class="icon-x-sm" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    ${update.content_html}
                </div>
                <div class="card-footer">
                    <a href="${update.link}" target="_blank" rel="noopener noreferrer" class="original-link">
                        <span>View Official Documentation</span>
                        <i data-lucide="external-link" class="icon-xs"></i>
                    </a>
                    <button class="btn btn-secondary btn-tweet" onclick="openTweetComposer('${update.id}')">
                        <svg class="icon-x-sm" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        <span>Tweet Update</span>
                    </button>
                </div>
            </article>
        `;
    });
    
    elements.timelineFeed.innerHTML = html;
    
    // Re-initialize Lucide Icons for dynamic content
    lucide.createIcons();
}

// Helpers for Classes and Icons
function getCategoryClass(type) {
    const t = type.toLowerCase();
    if (t === 'feature') return 'card-feature';
    if (t === 'change') return 'card-change';
    if (t === 'deprecation') return 'card-deprecation';
    if (t === 'breaking change') return 'card-breaking';
    if (t === 'fix') return 'card-fix';
    return 'card-update';
}

function getBadgeClass(type) {
    const t = type.toLowerCase();
    if (t === 'feature') return 'badge-feature';
    if (t === 'change') return 'badge-change';
    if (t === 'deprecation') return 'badge-deprecation';
    if (t === 'breaking change') return 'badge-breaking';
    if (t === 'fix') return 'badge-fix';
    return 'badge-update';
}

function getCategoryIcon(type) {
    const t = type.toLowerCase();
    if (t === 'feature') return 'sparkles';
    if (t === 'change') return 'wrench';
    if (t === 'deprecation') return 'alert-triangle';
    if (t === 'breaking change') return 'alert-octagon';
    if (t === 'fix') return 'bug';
    return 'info';
}

// Tweet Modal Logic
function openTweetComposer(updateId) {
    selectedUpdate = allUpdates.find(u => u.id === updateId);
    if (!selectedUpdate) return;
    
    // Format the default tweet text based on category
    const emojiMap = {
        'feature': '🚀',
        'change': '🔧',
        'deprecation': '⚠️',
        'breaking change': '🚨',
        'fix': '🐛',
        'security': '🔒',
        'update': '📢'
    };
    
    const emoji = emojiMap[selectedUpdate.type.toLowerCase()] || '📢';
    const typeLabel = selectedUpdate.type;
    const date = selectedUpdate.date_str;
    
    const header = `${emoji} BigQuery Release - ${typeLabel} (${date}):\n`;
    const footer = `\n\nRead more: ${selectedUpdate.link}\n#BigQuery #GoogleCloud`;
    
    // Let's calculate remaining space for the description
    // Twitter counts URLs as 23 characters, so let's adjust for it.
    const urlPlaceholderLength = 23; 
    const hashTags = "\n#BigQuery #GoogleCloud";
    const readMoreText = "\n\nRead more: ";
    
    const staticTextLength = header.length + readMoreText.length + urlPlaceholderLength + hashTags.length;
    const maxDescLength = 280 - staticTextLength;
    
    let desc = selectedUpdate.content_text;
    if (desc.length > maxDescLength) {
        desc = desc.substring(0, maxDescLength - 4) + "...";
    }
    
    const fullTweetText = `${header}${desc}${readMoreText}${selectedUpdate.link}${hashTags}`;
    
    // Pre-populate modal
    elements.tweetTextArea.value = fullTweetText;
    
    // Open Modal
    elements.tweetModal.style.display = 'flex';
    elements.tweetTextArea.focus();
    
    // Initialize character counts and circle
    updateTweetCharacterCount();
}

function closeTweetModal() {
    elements.tweetModal.style.display = 'none';
    selectedUpdate = null;
}

function updateTweetCharacterCount() {
    const text = elements.tweetTextArea.value;
    elements.tweetPreviewText.textContent = text;
    
    // Character limit logic (Twitter standard: 280 chars)
    // URLs are counted as 23 characters. Let's do a smart calculation:
    // Replace the specific link inside the text with a 23-char placeholder for exact Twitter character count
    let countedText = text;
    if (selectedUpdate && selectedUpdate.link) {
        // Regex to find the link and replace it with a 23 character placeholder
        const linkEscaped = selectedUpdate.link.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(linkEscaped, 'g');
        countedText = text.replace(regex, 'x'.repeat(23));
    }
    
    const charCount = countedText.length;
    const limit = 280;
    const remaining = limit - charCount;
    
    // Update text
    elements.charCountText.textContent = remaining;
    
    // SVG Progress Ring calculations
    // Radius is 14. Circumference is 2 * PI * R = ~87.96
    const circumference = 2 * Math.PI * 14;
    
    // Calculate progress
    const progress = Math.min(charCount / limit, 1);
    const strokeDashoffset = circumference - (progress * circumference);
    
    // Update progress ring offset
    elements.charProgressCircle.style.strokeDashoffset = strokeDashoffset;
    
    // Styles based on limit
    elements.charCounterContainer.classList.remove('char-warning', 'char-danger');
    elements.postTweetBtn.disabled = charCount > limit || charCount === 0;
    
    if (remaining <= 20 && remaining >= 0) {
        elements.charCounterContainer.classList.add('char-warning');
    } else if (remaining < 0) {
        elements.charCounterContainer.classList.add('char-danger');
    }
}

function copyTweetText() {
    const text = elements.tweetTextArea.value;
    if (!text) return;
    
    navigator.clipboard.writeText(text).then(() => {
        showToast('Tweet text copied to clipboard', 'success');
    }).catch(err => {
        console.error('Clipboard copy failed:', err);
        showToast('Failed to copy text', 'error');
    });
}

function postTweetToTwitter() {
    const text = elements.tweetTextArea.value;
    if (!text) return;
    
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
    closeTweetModal();
    showToast('Redirected to Twitter/X compose tab', 'success');
}

// Toast Notifications System
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconName = 'info';
    let iconClass = 'toast-icon-info';
    
    if (type === 'success') {
        iconName = 'check-circle';
        iconClass = 'toast-icon-success';
    } else if (type === 'error') {
        iconName = 'alert-octagon';
        iconClass = 'toast-icon-error';
    } else if (type === 'warning') {
        iconName = 'alert-triangle';
        iconClass = 'toast-icon-warning';
    }
    
    toast.innerHTML = `
        <i data-lucide="${iconName}" class="${iconClass}"></i>
        <div class="toast-message">${message}</div>
        <button class="toast-close"><i data-lucide="x" class="icon-xs"></i></button>
    `;
    
    elements.toastContainer.appendChild(toast);
    lucide.createIcons(); // Instantly create lucide icons in the toast
    
    // Add close listener
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.style.animation = 'fadeOut 0.2s ease forwards';
        setTimeout(() => toast.remove(), 200);
    });
    
    // Auto remove after 4.5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.animation = 'fadeOut 0.2s ease forwards';
            setTimeout(() => toast.remove(), 200);
        }
    }, 4500);
}

// Human readable time ago helper
function formatTimeAgo(date) {
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'just now';
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    if (days === 1) return 'yesterday';
    return `${days} days ago`;
}
