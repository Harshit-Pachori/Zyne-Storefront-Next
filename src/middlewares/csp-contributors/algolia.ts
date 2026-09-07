export const algoliaCsp = {
  'connect-src': [
    'https://*.algolia.net',
    'https://*.algolianet.com',
    'https://*.algolia.io',
  ],
  // If you are using InstantSearch search-insights or JS bundles, also include:
  'script-src': [
    'https://cdn.jsdelivr.net',
  ]
};