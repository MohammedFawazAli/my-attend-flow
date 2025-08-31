import { useEffect, useState } from 'react';
import { Bell, BellOff, Settings, TestTube } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import NotificationService from '@/lib/notificationService';
import { useToast } from '@/hooks/use-toast';

export default function NotificationManager() {
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [isTestingNotifications, setIsTestingNotifications] = useState(false);
  const { toast } = useToast();

  const notificationService = NotificationService.getInstance();

  useEffect(() => {
    checkNotificationStatus();
  }, []);

  const checkNotificationStatus = () => {
    const permission = notificationService.getPermissionStatus();
    setNotificationPermission(permission);
    setNotificationsEnabled(permission === 'granted');
    
    // Check if notifications are scheduled (from localStorage)
    const scheduled = localStorage.getItem('notifications_scheduled') === 'true';
    setIsScheduled(scheduled);
  };

  const requestNotificationPermission = async () => {
    try {
      const granted = await notificationService.requestPermission();
      if (granted) {
        setNotificationPermission('granted');
        setNotificationsEnabled(true);
        toast({
          title: "Notifications enabled!",
          description: "You'll receive daily class reminders",
        });
      } else {
        toast({
          title: "Permission denied",
          description: "Enable notifications in browser settings to receive reminders",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to request notification permission",
        variant: "destructive",
      });
    }
  };

  const toggleNotifications = async (enabled: boolean) => {
    if (enabled && notificationPermission !== 'granted') {
      await requestNotificationPermission();
      return;
    }

    if (enabled) {
      try {
        await notificationService.scheduleDailyNotifications();
        localStorage.setItem('notifications_scheduled', 'true');
        setIsScheduled(true);
        toast({
          title: "Notifications scheduled",
          description: "You'll receive daily class reminders at midnight",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to schedule notifications",
          variant: "destructive",
        });
      }
    } else {
      await notificationService.clearScheduledNotifications();
      localStorage.setItem('notifications_scheduled', 'false');
      setIsScheduled(false);
      toast({
        title: "Notifications disabled",
        description: "Daily reminders have been turned off",
      });
    }
    
    setNotificationsEnabled(enabled);
  };

  const testNotifications = async () => {
    setIsTestingNotifications(true);
    try {
      await notificationService.showTestNotification();
      toast({
        title: "Test notifications sent!",
        description: "Check your notification panel",
      });
    } catch (error) {
      toast({
        title: "Test failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsTestingNotifications(false);
    }
  };

  const getPermissionBadge = () => {
    switch (notificationPermission) {
      case 'granted':
        return <Badge className="bg-success text-success-foreground">Enabled</Badge>;
      case 'denied':
        return <Badge variant="destructive">Blocked</Badge>;
      default:
        return <Badge variant="outline">Not Set</Badge>;
    }
  };

  return (
    <Card className="stat-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-5 w-5 text-primary" />
          Notification Settings
          {getPermissionBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Notification Support Check */}
        {!notificationService.isNotificationSupported() && (
          <div className="p-3 bg-warning-light border border-warning/20 rounded-lg">
            <div className="flex items-center gap-2 text-warning">
              <BellOff className="h-4 w-4" />
              <span className="text-sm font-medium">
                Notifications not supported in this browser
              </span>
            </div>
          </div>
        )}

        {/* Permission Status */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Daily Notifications</Label>
            <p className="text-xs text-muted-foreground">
              Get reminded of your classes at midnight
            </p>
          </div>
          <Switch
            checked={notificationsEnabled && isScheduled}
            onCheckedChange={toggleNotifications}
            disabled={!notificationService.isNotificationSupported()}
          />
        </div>

        {/* Test Notifications */}
        <div className="space-y-2">
          <Button
            onClick={testNotifications}
            disabled={isTestingNotifications || notificationPermission !== 'granted'}
            className="w-full"
            variant="outline"
          >
            <TestTube className="h-4 w-4 mr-2" />
            {isTestingNotifications ? 'Sending...' : 'Test Notifications'}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Sends sample notifications with your current timetable
          </p>
        </div>

        {/* Notification Features */}
        <div className="space-y-2 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Notification Features:</p>
          <p>📅 Daily class schedule at midnight</p>
          <p>📌 Pinned notifications (can't be swiped away)</p>
          <p>⚡ Quick attendance marking from notifications</p>
          <p>🔔 Works even when app is closed</p>
        </div>

        {/* Permission Help */}
        {notificationPermission === 'denied' && (
          <div className="p-3 bg-destructive-light border border-destructive/20 rounded-lg">
            <div className="text-sm text-destructive">
              <p className="font-medium mb-1">Notifications Blocked</p>
              <p className="text-xs">
                To enable notifications, click the lock icon in your browser's address bar 
                and allow notifications for this site.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}