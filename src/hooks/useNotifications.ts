import { useState, useEffect } from 'react';
import NotificationService from '@/lib/notificationService';

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);

  const notificationService = NotificationService.getInstance();

  useEffect(() => {
    setIsSupported(notificationService.isNotificationSupported());
    setPermission(notificationService.getPermissionStatus());
    
    // Check if notifications are scheduled
    const scheduled = localStorage.getItem('notifications_scheduled') === 'true';
    setIsScheduled(scheduled);
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    const granted = await notificationService.requestPermission();
    setPermission(notificationService.getPermissionStatus());
    return granted;
  };

  const scheduleNotifications = async (): Promise<void> => {
    await notificationService.scheduleDailyNotifications();
    localStorage.setItem('notifications_scheduled', 'true');
    setIsScheduled(true);
  };

  const clearNotifications = async (): Promise<void> => {
    await notificationService.clearScheduledNotifications();
    localStorage.setItem('notifications_scheduled', 'false');
    setIsScheduled(false);
  };

  const testNotifications = async (): Promise<void> => {
    await notificationService.showTestNotification();
  };

  return {
    permission,
    isSupported,
    isScheduled,
    requestPermission,
    scheduleNotifications,
    clearNotifications,
    testNotifications,
  };
}