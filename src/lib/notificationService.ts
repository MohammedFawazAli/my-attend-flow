/**
 * Notification Service for AttendFlow
 * Handles push notifications, scheduling, and permission management
 */

import { getTimetable, getSubjects } from './storage';
import { TimetableEntry } from '@/types/attendance';

export interface NotificationData {
  id: string;
  title: string;
  body: string;
  time: string;
  subject: string;
  room?: string;
  day: string;
  isPinned?: boolean;
}

class NotificationService {
  private static instance: NotificationService;
  private registration: ServiceWorkerRegistration | null = null;
  private notificationPermission: NotificationPermission = 'default';

  private constructor() {
    this.initializeService();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize the notification service
   */
  private async initializeService() {
    // Check if service workers are supported
    if ('serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.ready;
        console.log('Service Worker registered successfully');
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }

    // Check current notification permission
    if ('Notification' in window) {
      this.notificationPermission = Notification.permission;
    }
  }

  /**
   * Request notification permission from user
   */
  public async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (this.notificationPermission === 'granted') {
      return true;
    }

    try {
      const permission = await Notification.requestPermission();
      this.notificationPermission = permission;
      
      if (permission === 'granted') {
        console.log('Notification permission granted');
        return true;
      } else {
        console.log('Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  /**
   * Show immediate notification (for testing)
   */
  public async showTestNotification(): Promise<void> {
    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      throw new Error('Notification permission not granted');
    }

    const timetable = getTimetable();
    if (timetable.length === 0) {
      throw new Error('No timetable data found');
    }

    // Get today's classes or sample classes
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    let todayClasses = timetable.filter(entry => 
      entry.day.toLowerCase() === today.toLowerCase()
    );

    // If no classes today, use first few classes as sample
    if (todayClasses.length === 0) {
      todayClasses = timetable.slice(0, 3);
    }

    // Show notifications for each class
    todayClasses.forEach((entry, index) => {
      setTimeout(() => {
        this.showNotification({
          id: `test-${entry.id}`,
          title: `📚 ${entry.subject}`,
          body: `${entry.day} • ${entry.time}${entry.room ? ` • ${entry.room}` : ''}`,
          time: entry.time,
          subject: entry.subject,
          room: entry.room,
          day: entry.day,
          isPinned: index === 0 // Pin the first notification as example
        });
      }, index * 1000);
    });
  }

  /**
   * Show a single notification
   */
  private async showNotification(data: NotificationData): Promise<void> {
    if (this.notificationPermission !== 'granted') {
      console.warn('Cannot show notification: permission not granted');
      return;
    }

    try {
      const options: NotificationOptions = {
        body: data.body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: data.id,
        requireInteraction: data.isPinned || false,
        persistent: data.isPinned || false,
        data: {
          id: data.id,
          subject: data.subject,
          room: data.room,
          time: data.time,
          day: data.day,
          url: '/attendance'
        },
        actions: [
          {
            action: 'mark-present',
            title: '✅ Mark Present'
          },
          {
            action: 'mark-absent',
            title: '❌ Mark Absent'
          },
          {
            action: 'view-schedule',
            title: '📅 View Schedule'
          }
        ]
      };

      if (this.registration) {
        // Use service worker for better reliability
        await this.registration.showNotification(data.title, options);
      } else {
        // Fallback to regular notification
        new Notification(data.title, options);
      }

      console.log('Notification shown:', data.title);
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  /**
   * Schedule daily notifications
   */
  public async scheduleDailyNotifications(): Promise<void> {
    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      throw new Error('Notification permission required for scheduling');
    }

    // Clear existing scheduled notifications
    await this.clearScheduledNotifications();

    const timetable = getTimetable();
    if (timetable.length === 0) {
      console.warn('No timetable data available for scheduling');
      return;
    }

    // Group classes by day
    const classesByDay = this.groupClassesByDay(timetable);

    // Schedule notifications for each day
    Object.entries(classesByDay).forEach(([day, classes]) => {
      this.scheduleNotificationsForDay(day, classes);
    });

    console.log('Daily notifications scheduled successfully');
  }

  /**
   * Group timetable entries by day
   */
  private groupClassesByDay(timetable: TimetableEntry[]): Record<string, TimetableEntry[]> {
    return timetable.reduce((acc, entry) => {
      const day = entry.day.toLowerCase();
      if (!acc[day]) {
        acc[day] = [];
      }
      acc[day].push(entry);
      return acc;
    }, {} as Record<string, TimetableEntry[]>);
  }

  /**
   * Schedule notifications for a specific day
   */
  private scheduleNotificationsForDay(day: string, classes: TimetableEntry[]): void {
    const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      .indexOf(day.toLowerCase());

    if (dayIndex === -1) return;

    // Schedule notification for midnight of each occurrence of this day
    const scheduleTime = new Date();
    scheduleTime.setHours(0, 0, 0, 0);

    // Find next occurrence of this day
    const today = new Date().getDay();
    const daysUntilTarget = (dayIndex - today + 7) % 7;
    scheduleTime.setDate(scheduleTime.getDate() + daysUntilTarget);

    // Create notification data
    const notificationData: NotificationData = {
      id: `daily-${day}-${scheduleTime.getTime()}`,
      title: `📅 Today's Classes - ${day.charAt(0).toUpperCase() + day.slice(1)}`,
      body: this.formatClassesForNotification(classes),
      time: '00:00',
      subject: 'Daily Schedule',
      day: day,
      isPinned: true
    };

    // Schedule using setTimeout (for demo purposes)
    // In production, you'd use a more robust scheduling system
    const timeUntilNotification = scheduleTime.getTime() - Date.now();
    
    if (timeUntilNotification > 0) {
      setTimeout(() => {
        this.showNotification(notificationData);
      }, Math.min(timeUntilNotification, 2147483647)); // Max setTimeout value
    }
  }

  /**
   * Format classes for notification body
   */
  private formatClassesForNotification(classes: TimetableEntry[]): string {
    const sortedClasses = classes.sort((a, b) => a.time.localeCompare(b.time));
    
    if (sortedClasses.length === 0) {
      return 'No classes scheduled for today';
    }

    if (sortedClasses.length <= 3) {
      return sortedClasses
        .map(cls => `${cls.time} - ${cls.subject}${cls.room ? ` (${cls.room})` : ''}`)
        .join('\n');
    }

    // Show first 2 classes and count
    const firstTwo = sortedClasses.slice(0, 2)
      .map(cls => `${cls.time} - ${cls.subject}${cls.room ? ` (${cls.room})` : ''}`)
      .join('\n');
    
    return `${firstTwo}\n+${sortedClasses.length - 2} more classes`;
  }

  /**
   * Clear all scheduled notifications
   */
  public async clearScheduledNotifications(): Promise<void> {
    if (this.registration) {
      const notifications = await this.registration.getNotifications();
      notifications.forEach(notification => notification.close());
    }
  }

  /**
   * Check if notifications are supported and enabled
   */
  public isNotificationSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  /**
   * Get current notification permission status
   */
  public getPermissionStatus(): NotificationPermission {
    return this.notificationPermission;
  }
}

export default NotificationService;