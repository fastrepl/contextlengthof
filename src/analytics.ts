import mixpanel from 'mixpanel-browser';

// Replace with your actual Mixpanel project token
const MIXPANEL_TOKEN = 'YOUR_MIXPANEL_TOKEN_HERE';

// Initialize Mixpanel
export function initAnalytics() {
  if (MIXPANEL_TOKEN && MIXPANEL_TOKEN !== 'YOUR_MIXPANEL_TOKEN_HERE') {
    mixpanel.init(MIXPANEL_TOKEN, {
      debug: import.meta.env.DEV,
      track_pageview: true,
      persistence: 'localStorage'
    });
  }
}

// Track page view
export function trackPageView(page: string) {
  if (MIXPANEL_TOKEN && MIXPANEL_TOKEN !== 'YOUR_MIXPANEL_TOKEN_HERE') {
    mixpanel.track('Page View', {
      page: page,
      url: window.location.href,
      referrer: document.referrer
    });
  }
}

// Track search
export function trackSearch(query: string, provider?: string, resultsCount?: number) {
  if (MIXPANEL_TOKEN && MIXPANEL_TOKEN !== 'YOUR_MIXPANEL_TOKEN_HERE') {
    mixpanel.track('Search', {
      query: query,
      provider: provider || 'all',
      results_count: resultsCount || 0,
      timestamp: new Date().toISOString()
    });
  }
}

// Track model/provider/endpoint request
export function trackRequest(type: 'provider' | 'endpoint' | 'model', request: string, email: string, docsLink?: string) {
  if (MIXPANEL_TOKEN && MIXPANEL_TOKEN !== 'YOUR_MIXPANEL_TOKEN_HERE') {
    mixpanel.track('Request Submitted', {
      request_type: type,
      request_description: request,
      has_docs_link: !!docsLink,
      email_domain: email.split('@')[1] || 'unknown',
      timestamp: new Date().toISOString()
    });
  }
}

// Track request form opened
export function trackRequestFormOpened() {
  if (MIXPANEL_TOKEN && MIXPANEL_TOKEN !== 'YOUR_MIXPANEL_TOKEN_HERE') {
    mixpanel.track('Request Form Opened', {
      timestamp: new Date().toISOString()
    });
  }
}

// Track tab change
export function trackTabChange(tab: 'models' | 'providers') {
  if (MIXPANEL_TOKEN && MIXPANEL_TOKEN !== 'YOUR_MIXPANEL_TOKEN_HERE') {
    mixpanel.track('Tab Changed', {
      tab: tab,
      timestamp: new Date().toISOString()
    });
  }
}

