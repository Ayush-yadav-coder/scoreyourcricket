import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

export const usePushNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    if ('Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error('Push notifications are not supported in this browser');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        toast.success('Push notifications enabled!');
        return true;
      } else if (result === 'denied') {
        toast.error('Notification permission denied');
        return false;
      }
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Failed to request notification permission');
      return false;
    }
  }, [isSupported]);

  const showNotification = useCallback(async ({ 
    title, 
    body, 
    icon = '/favicon.ico',
    tag,
    data 
  }: NotificationOptions): Promise<boolean> => {
    // Always show in-app toast
    toast.info(title, { description: body, duration: 5000 });

    if (!isSupported) {
      return false;
    }

    // Request permission if not granted
    if (permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return false;
    }

    try {
      // Show browser notification when page is hidden
      if (document.hidden || document.visibilityState === 'hidden') {
        const notification = new Notification(title, {
          body,
          icon,
          tag,
          data,
          badge: icon,
          requireInteraction: false,
          silent: false,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
          
          // Handle navigation based on data
          if (data?.url) {
            window.location.href = data.url as string;
          }
        };

        // Auto-close after 10 seconds
        setTimeout(() => notification.close(), 10000);
        
        // Play notification sound
        try {
          const audio = new Audio('/notification.mp3');
          audio.volume = 0.5;
          await audio.play().catch(() => {}); // Ignore autoplay errors
        } catch {}
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error showing notification:', error);
      return false;
    }
  }, [isSupported, permission, requestPermission]);

  const showMatchNotification = useCallback((
    type: 'wicket' | 'boundary' | 'six' | 'milestone' | 'match_start' | 'match_end',
    details: { team?: string; player?: string; runs?: number; matchId?: string }
  ) => {
    const notifications: Record<string, NotificationOptions> = {
      wicket: {
        title: '🏏 WICKET!',
        body: `${details.player || 'Batsman'} is out!`,
        tag: `wicket-${Date.now()}`,
        data: { url: details.matchId ? `/match/${details.matchId}` : undefined },
      },
      boundary: {
        title: '🏏 FOUR!',
        body: `${details.player || 'Batsman'} hits a boundary!`,
        tag: `boundary-${Date.now()}`,
      },
      six: {
        title: '💥 SIX!',
        body: `${details.player || 'Batsman'} hits it out of the park!`,
        tag: `six-${Date.now()}`,
      },
      milestone: {
        title: `🎉 ${details.runs} RUNS!`,
        body: `${details.team || 'Team'} reaches ${details.runs} runs!`,
        tag: `milestone-${details.runs}`,
      },
      match_start: {
        title: '🔴 Match Started!',
        body: `${details.team || 'Match'} is now LIVE!`,
        tag: 'match-start',
        data: { url: details.matchId ? `/match/${details.matchId}` : undefined },
      },
      match_end: {
        title: '🏆 Match Completed!',
        body: 'The match has ended. Check the scorecard!',
        tag: 'match-end',
        data: { url: details.matchId ? `/match/${details.matchId}` : undefined },
      },
    };

    const notification = notifications[type];
    if (notification) {
      showNotification(notification);
    }
  }, [showNotification]);

  const showMessageNotification = useCallback((
    senderName: string,
    message: string,
    senderId?: string
  ) => {
    showNotification({
      title: `💬 ${senderName}`,
      body: message.length > 100 ? message.substring(0, 100) + '...' : message,
      tag: `message-${senderId || Date.now()}`,
      data: { url: senderId ? `/messages?user=${senderId}` : '/messages' },
    });
  }, [showNotification]);

  return {
    isSupported,
    permission,
    requestPermission,
    showNotification,
    showMatchNotification,
    showMessageNotification,
  };
};
