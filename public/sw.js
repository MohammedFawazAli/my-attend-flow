/**
 * Service Worker for AttendFlow
 * Handles background notifications and caching
 */

const CACHE_NAME = 'attendflow-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      }
    )
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  const action = event.action;
  const data = event.notification.data;
  
  // Handle different notification actions
  switch (action) {
    case 'mark-present':
      // Open app and mark attendance as present
      event.waitUntil(
        clients.openWindow(`${self.registration.scope}attendance?action=present&class=${data.id}`)
      );
      break;
      
    case 'mark-absent':
      // Open app and mark attendance as absent
      event.waitUntil(
        clients.openWindow(`${self.registration.scope}attendance?action=absent&class=${data.id}`)
      );
      break;
      
    case 'view-schedule':
      // Open timetable page
      event.waitUntil(
        clients.openWindow(`${self.registration.scope}timetable`)
      );
      break;
      
    default:
      // Default action - open attendance page
      event.waitUntil(
        clients.openWindow(`${self.registration.scope}attendance`)
      );
      break;
  }
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification.tag);
});

// Background sync for scheduling notifications
self.addEventListener('sync', (event) => {
  if (event.tag === 'schedule-notifications') {
    event.waitUntil(scheduleNotifications());
  }
});

// Function to schedule notifications
async function scheduleNotifications() {
  try {
    // This would typically fetch timetable data and schedule notifications
    console.log('Scheduling notifications in background');
    
    // For demo purposes, we'll just log
    // In production, you'd implement the actual scheduling logic here
  } catch (error) {
    console.error('Error scheduling notifications:', error);
  }
}