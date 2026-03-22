# Real-time Data Cleanup System

This system provides automatic frontend data synchronization when data is removed from the database via WebSocket events.

## How It Works

1. **Backend Cleanup** → Broadcasts WebSocket event
2. **Frontend Listens** → Receives cleanup event  
3. **Auto-Update** → Refreshes UI data automatically

## Quick Start

### 1. Basic WebSocket Integration

```tsx
import { useNotificationCleanup } from '../hooks/useWebSocket';

const MyComponent = () => {
  const [notifications, setNotifications] = useState([]);

  // Auto-cleanup when notifications are removed from DB
  useNotificationCleanup((event) => {
    console.log('Notifications cleaned:', event.deletedCount);
    setNotifications([]); // Clear local state
  });

  return <div>Your component</div>;
};
```

### 2. Advanced Data Sync

```tsx
import { useDataSync } from '../hooks/useDataSync';

const TaskList = () => {
  const [tasks, setTasks] = useState([]);

  const fetchTasks = async () => {
    const response = await api.get('/api/nurse-tasks');
    setTasks(response.data);
  };

  // Auto-refetch when medication tasks are cleaned up
  useDataSync({
    refetchData: fetchTasks,
    dataTypes: ['nurse-tasks'],
    filter: (event) => event.filter?.taskType === 'MEDICATION',
    onDataCleanup: (event) => {
      toast.success(`${event.deletedCount} tasks removed`);
    }
  });

  return <TaskListComponent tasks={tasks} />;
};
```

## Available Hooks

### `useWebSocket(options)`
Basic WebSocket connection management.

```tsx
const { isConnected, addListener, removeListener } = useWebSocket({
  autoConnect: true,
  onConnect: () => console.log('Connected'),
  onDisconnect: () => console.log('Disconnected')
});
```

### `useDataCleanup(callback, deps)`
Listen for any data cleanup events.

```tsx
useDataCleanup((event) => {
  console.log('Data cleaned:', event.type, event.deletedCount);
}, []);
```

### `useNotificationCleanup(callback, deps)`
Listen specifically for notification cleanup events.

```tsx
useNotificationCleanup((event) => {
  if (event.filter?.type === 'medication_payment_required') {
    setNotifications([]);
  }
}, []);
```

### `useNurseTaskCleanup(callback, deps)`
Listen specifically for nurse task cleanup events.

```tsx
useNurseTaskCleanup((event) => {
  if (event.filter?.taskType === 'MEDICATION') {
    refetchTasks();
  }
}, []);
```

### `useDataSync(options)`
High-level hook for automatic data synchronization.

```tsx
useDataSync({
  refetchData: fetchMyData,
  dataTypes: ['notifications', 'nurse-tasks'],
  filter: (event) => event.priority === 'high',
  onDataCleanup: (event) => showToast(event),
  debounceMs: 500
});
```

## Specialized Hooks

### `useNotificationSync(refetch, onCleanup)`
```tsx
useNotificationSync(
  fetchNotifications,
  (event) => toast.info(`${event.deletedCount} notifications removed`)
);
```

### `useNurseTaskSync(refetch, taskType, onCleanup)`
```tsx
useNurseTaskSync(
  fetchTasks,
  'MEDICATION',
  (event) => console.log('Medication tasks cleaned')
);
```

### `usePatientSync(refetch, onCleanup)`
```tsx
usePatientSync(
  fetchPatients,
  (event) => refreshPatientList()
);
```

## Backend Integration

### Adding WebSocket Broadcasting to Cleanup Endpoints

```javascript
// In your route handler
router.delete('/cleanup-data', async (req, res) => {
  // Perform database cleanup
  const deleted = await Model.deleteMany(filter);
  
  // Broadcast to all connected clients
  if (req.app.get('io') && deleted.deletedCount > 0) {
    req.app.get('io').emit('data-cleanup', {
      type: 'your-data-type',
      action: 'bulk-delete',
      filter: filter,
      deletedCount: deleted.deletedCount,
      timestamp: new Date()
    });
  }
  
  res.json({ success: true, deletedCount: deleted.deletedCount });
});
```

### Event Structure

```typescript
interface CleanupEvent {
  type: 'notifications' | 'nurse-tasks' | 'patients' | 'invoices';
  action: 'bulk-delete' | 'delete' | 'update';
  filter?: any; // The filter used for deletion
  deletedCount?: number;
  deletedId?: string; // For single deletions
  timestamp: Date;
}
```

## Real-world Examples

### 1. Payment Notifications Component

```tsx
import { useNotificationCleanup } from '../hooks/useWebSocket';

const PaymentNotifications = () => {
  const [notifications, setNotifications] = useState([]);

  // Auto-clear when admin removes test data
  useNotificationCleanup((event) => {
    if (event.filter?.type === 'medication_payment_required') {
      setNotifications([]);
      toast.info(`${event.deletedCount} notification(s) removed`);
    }
  }, []);

  return (
    <div>
      {notifications.map(notification => (
        <NotificationCard key={notification.id} {...notification} />
      ))}
    </div>
  );
};
```

### 2. Nurse Dashboard with Task Sync

```tsx
import { useNurseTaskSync } from '../hooks/useDataSync';

const NurseDashboard = () => {
  const [tasks, setTasks] = useState([]);

  const fetchTasks = async () => {
    const response = await nurseTaskService.getTasks();
    setTasks(response.data);
  };

  // Auto-refresh when medication tasks are cleaned up
  useNurseTaskSync(
    fetchTasks,
    'MEDICATION',
    (event) => {
      toast({
        title: "Tasks Updated",
        description: `${event.deletedCount} medication task(s) removed`,
      });
    }
  );

  return <TaskList tasks={tasks} />;
};
```

### 3. Generic Data Table with Auto-Sync

```tsx
import { useDataSync } from '../hooks/useDataSync';

const DataTable = ({ dataType, fetchFunction }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const refetchData = async () => {
    setLoading(true);
    try {
      const result = await fetchFunction();
      setData(result);
    } finally {
      setLoading(false);
    }
  };

  // Auto-sync for any data type
  useDataSync({
    refetchData,
    dataTypes: [dataType],
    onDataCleanup: (event) => {
      console.log(`${event.deletedCount} ${dataType} items removed`);
    },
    debounceMs: 300
  });

  if (loading) return <Spinner />;
  return <Table data={data} />;
};
```

## Best Practices

### 1. Use Appropriate Hooks
- Use specific hooks (`useNotificationCleanup`) for simple cases
- Use `useDataSync` for complex scenarios with filtering
- Use `useWebSocket` for custom WebSocket logic

### 2. Handle Loading States
```tsx
const [isRefreshing, setIsRefreshing] = useState(false);

useDataSync({
  refetchData: async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  },
  dataTypes: ['notifications']
});
```

### 3. Debounce Rapid Updates
```tsx
useDataSync({
  refetchData: fetchData,
  dataTypes: ['notifications'],
  debounceMs: 500 // Wait 500ms before refetching
});
```

### 4. Filter Relevant Events
```tsx
useDataSync({
  refetchData: fetchTasks,
  dataTypes: ['nurse-tasks'],
  filter: (event) => {
    // Only react to medication task cleanup
    return event.filter?.taskType === 'MEDICATION';
  }
});
```

### 5. Provide User Feedback
```tsx
useDataSync({
  refetchData: fetchData,
  dataTypes: ['notifications'],
  onDataCleanup: (event) => {
    toast.success(`Data updated: ${event.deletedCount} items removed`);
  }
});
```

## Troubleshooting

### WebSocket Connection Issues
1. Check if backend WebSocket server is running
2. Verify CORS settings allow WebSocket connections
3. Check browser console for connection errors

### Events Not Received
1. Ensure backend is broadcasting events with `req.app.get('io').emit()`
2. Check event type names match between backend and frontend
3. Verify filters are not blocking relevant events

### Performance Issues
1. Use debouncing to prevent excessive refetching
2. Filter events to only handle relevant ones
3. Consider using `useCallback` for refetch functions

## Migration Guide

### From Polling to WebSocket

**Before (Polling):**
```tsx
useEffect(() => {
  const interval = setInterval(fetchData, 30000);
  return () => clearInterval(interval);
}, []);
```

**After (WebSocket):**
```tsx
useDataSync({
  refetchData: fetchData,
  dataTypes: ['your-data-type']
});

// Keep initial fetch
useEffect(() => {
  fetchData();
}, []);
```

This system ensures your frontend stays synchronized with database changes in real-time, providing a better user experience and reducing the need for manual refreshes. 