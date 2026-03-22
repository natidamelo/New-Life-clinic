import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Bell } from 'lucide-react';

const SimpleNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/api/notifications?recipientRole=reception');
      const allNotifications = response.data?.data || response.data?.notifications || [];
      
      if (Array.isArray(allNotifications)) {
        const activeNotifications = allNotifications.filter((n: any) => !n.read);
        setNotifications(activeNotifications);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to fetch notifications');
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <Card className="shadow-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center">
          <Bell className="h-6 w-6 mr-3 text-primary" />
          <div>
            <CardTitle>Notifications</CardTitle>
          </div>
        </div>
        <Badge variant="secondary">{notifications.length} Pending</Badge>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">No notifications</div>
        ) : (
          <div className="space-y-2">
            {notifications.slice(0, 5).map((notification) => (
              <div key={notification._id} className="p-2 border rounded">
                <p className="font-medium">{notification.title}</p>
                <p className="text-sm text-muted-foreground">{notification.message}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SimpleNotifications; 