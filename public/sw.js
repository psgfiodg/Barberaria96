// Barberaria 96 Service Worker - Industry-Leading PWA Implementation
const CACHE_NAME = 'barberaria-96-v2.0.0';
const OFFLINE_URL = '/offline.html';

// Enhanced precache manifest with background sync support
self.__WB_MANIFEST;

// Background sync queue for offline actions
const BACKGROUND_SYNC_TAG = 'barberaria-background-sync';
const NOTIFICATION_SYNC_TAG = 'notification-sync';

// Install event - Enhanced caching strategy
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache offline page and critical assets
      caches.open(CACHE_NAME).then((cache) => {
        console.log('Caching critical assets...');
        return cache.addAll([
          OFFLINE_URL,
          '/',
          '/manifest.json',
          '/logo.png',
          '/1024x1024.png'
        ]);
      }),
      // Skip waiting for immediate activation
      self.skipWaiting()
    ])
  );
});

// Activate event - Enhanced cleanup and client claiming
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName.startsWith('barberaria-96-')) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all pages immediately
      self.clients.claim(),
      // Initialize background sync
      initializeBackgroundSync()
    ])
  );
});

// Enhanced fetch event with intelligent caching strategies
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and non-http requests
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  const url = new URL(event.request.url);
  const pathname = url.pathname;

  // Handle navigation requests (page loads) with network-first strategy
  if (event.request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(event.request));
    return;
  }

  // Handle BokaDirekt iframe requests with enhanced caching
  if (url.hostname.includes('bokadirekt.se')) {
    event.respondWith(handleBokaDirektRequest(event.request));
    return;
  }

  // Handle static assets with cache-first strategy
  if (isStaticAsset(event.request)) {
    event.respondWith(handleStaticAssetRequest(event.request));
    return;
  }

  // Handle API requests with network-first strategy
  if (pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(event.request));
    return;
  }

  // Default: network-first with cache fallback
  event.respondWith(handleDefaultRequest(event.request));
});

// Enhanced navigation request handler
async function handleNavigationRequest(request) {
  try {
    // Try network first for fresh content
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    // If network fails, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback to index.html for SPA routing
    const indexResponse = await caches.match('/');
    if (indexResponse) {
      return indexResponse;
    }
    
    // Last resort: offline page
    return caches.match(OFFLINE_URL);
    
  } catch (error) {
    console.log('Navigation request failed:', error);
    
    // Try cache first when network is completely unavailable
    const cachedResponse = await caches.match(request) || 
                          await caches.match('/') || 
                          await caches.match(OFFLINE_URL);
    
    return cachedResponse || new Response('Offline', { status: 503 });
  }
}

// Enhanced BokaDirekt request handler
async function handleBokaDirektRequest(request) {
  try {
    // Always try network first for booking system
    const networkResponse = await fetch(request, {
      credentials: 'include',
      mode: 'cors'
    });
    
    if (networkResponse.ok) {
      // Cache successful responses for short term
      const cache = await caches.open(CACHE_NAME);
      const responseToCache = networkResponse.clone();
      
      // Set shorter cache time for booking system
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cache-time', Date.now().toString());
      
      const cachedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      });
      
      cache.put(request, cachedResponse);
      return networkResponse;
    }
    
    return networkResponse;
    
  } catch (error) {
    console.log('BokaDirekt request failed:', error);
    
    // Try cached version if available and not too old
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      const cacheTime = cachedResponse.headers.get('sw-cache-time');
      const isStale = cacheTime && (Date.now() - parseInt(cacheTime)) > 300000; // 5 minutes
      
      if (!isStale) {
        return cachedResponse;
      }
    }
    
    // Return error response for booking system failures
    return new Response(JSON.stringify({
      error: 'Booking system temporarily unavailable',
      message: 'Please try again or call us directly'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Enhanced static asset handler
async function handleStaticAssetRequest(request) {
  try {
    // Cache-first strategy for static assets
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fetch from network and cache
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.log('Static asset request failed:', error);
    
    // Try cache as fallback
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return appropriate fallback based on asset type
    if (request.destination === 'image') {
      return caches.match('/logo.png');
    }
    
    return new Response('Asset unavailable', { status: 404 });
  }
}

// API request handler with background sync
async function handleApiRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful API responses briefly
      const cache = await caches.open(CACHE_NAME);
      const responseToCache = networkResponse.clone();
      
      // Set short cache time for API responses
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cache-time', Date.now().toString());
      
      const cachedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      });
      
      cache.put(request, cachedResponse);
    }
    
    return networkResponse;
    
  } catch (error) {
    console.log('API request failed:', error);
    
    // For POST requests, queue for background sync
    if (request.method === 'POST') {
      await queueBackgroundSync(request);
    }
    
    // Try cached response for GET requests
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        const cacheTime = cachedResponse.headers.get('sw-cache-time');
        const isStale = cacheTime && (Date.now() - parseInt(cacheTime)) > 60000; // 1 minute
        
        if (!isStale) {
          return cachedResponse;
        }
      }
    }
    
    return new Response(JSON.stringify({
      error: 'API temporarily unavailable',
      queued: request.method === 'POST'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Default request handler
async function handleDefaultRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    const cachedResponse = await caches.match(request);
    return cachedResponse || new Response('Content unavailable', { status: 404 });
  }
}

// Utility function to check if request is for static asset
function isStaticAsset(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  return (
    request.destination === 'image' ||
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font' ||
    pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot)$/i) ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  );
}

// Background sync initialization
async function initializeBackgroundSync() {
  try {
    // Register for background sync
    await self.registration.sync.register(BACKGROUND_SYNC_TAG);
    console.log('Background sync registered');
  } catch (error) {
    console.log('Background sync not supported:', error);
  }
}

// Queue requests for background sync
async function queueBackgroundSync(request) {
  try {
    const requestData = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: await request.text(),
      timestamp: Date.now()
    };
    
    // Store in IndexedDB for background sync
    const db = await openDB();
    const transaction = db.transaction(['sync-queue'], 'readwrite');
    const store = transaction.objectStore('sync-queue');
    await store.add(requestData);
    
    // Register for background sync
    await self.registration.sync.register(BACKGROUND_SYNC_TAG);
    
  } catch (error) {
    console.log('Failed to queue for background sync:', error);
  }
}

// Background sync event handler
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === BACKGROUND_SYNC_TAG) {
    event.waitUntil(processBackgroundSync());
  }
  
  if (event.tag === NOTIFICATION_SYNC_TAG) {
    event.waitUntil(processNotificationSync());
  }
});

// Process background sync queue
async function processBackgroundSync() {
  try {
    const db = await openDB();
    const transaction = db.transaction(['sync-queue'], 'readwrite');
    const store = transaction.objectStore('sync-queue');
    const requests = await store.getAll();
    
    for (const requestData of requests) {
      try {
        const response = await fetch(requestData.url, {
          method: requestData.method,
          headers: requestData.headers,
          body: requestData.body
        });
        
        if (response.ok) {
          // Remove from queue on success
          await store.delete(requestData.id);
          console.log('Background sync request completed:', requestData.url);
        }
        
      } catch (error) {
        console.log('Background sync request failed:', error);
        // Keep in queue for retry
      }
    }
    
  } catch (error) {
    console.log('Background sync processing failed:', error);
  }
}

// Process notification sync
async function processNotificationSync() {
  try {
    // Check for pending notifications
    const response = await fetch('/api/notifications/pending');
    if (response.ok) {
      const notifications = await response.json();
      
      for (const notification of notifications) {
        await self.registration.showNotification(notification.title, {
          body: notification.body,
          icon: '/logo.png',
          badge: '/logo.png',
          tag: notification.tag,
          data: notification.data,
          actions: notification.actions || []
        });
      }
    }
  } catch (error) {
    console.log('Notification sync failed:', error);
  }
}

// IndexedDB helper
async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('barberaria-sync-db', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('sync-queue')) {
        const store = db.createObjectStore('sync-queue', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        store.createIndex('timestamp', 'timestamp');
      }
    };
  });
}

// Periodic background sync for updates
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'content-sync') {
    event.waitUntil(updateContent());
  }
});

// Update content in background
async function updateContent() {
  try {
    // Update critical pages
    const urlsToUpdate = ['/', '/om-oss', '/manifest.json'];
    
    for (const url of urlsToUpdate) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(url, response);
        }
      } catch (error) {
        console.log('Failed to update:', url, error);
      }
    }
    
  } catch (error) {
    console.log('Content update failed:', error);
  }
}

// Enhanced message handling for client communication
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
      
    case 'FORCE_UPDATE':
      forceUpdate().then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
      
    default:
      console.log('Unknown message type:', type);
  }
});

// Clear all caches
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
}

// Force update
async function forceUpdate() {
  await clearAllCaches();
  await self.registration.update();
  self.skipWaiting();
}