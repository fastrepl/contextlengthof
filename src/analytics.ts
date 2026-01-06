import mixpanel from 'mixpanel-browser';

// Get Mixpanel token from environment variable
const MIXPANEL_TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN;

// Initialize Mixpanel
export function initAnalytics() {
  if (MIXPANEL_TOKEN) {
    mixpanel.init(MIXPANEL_TOKEN, {
      debug: import.meta.env.DEV,
      track_pageview: true,
      persistence: 'localStorage'
    });
    console.log('Mixpanel initialized');
  } else {
    console.warn('Mixpanel token not found. Set VITE_MIXPANEL_TOKEN in your .env file');
  }
}

// Track page view
export function trackPageView(page: string) {
  if (MIXPANEL_TOKEN) {
    mixpanel.track('Page View', {
      page: page,
      url: window.location.href,
      referrer: document.referrer
    });
  }
}

// Track search
export function trackSearch(query: string, provider?: string, resultsCount?: number) {
  if (MIXPANEL_TOKEN) {
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
  if (MIXPANEL_TOKEN) {
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
  if (MIXPANEL_TOKEN) {
    mixpanel.track('Request Form Opened', {
      timestamp: new Date().toISOString()
    });
  }
}

// Track tab change
export function trackTabChange(tab: 'models' | 'providers') {
  if (MIXPANEL_TOKEN) {
    mixpanel.track('Tab Changed', {
      tab: tab,
      timestamp: new Date().toISOString()
    });
  }
}

