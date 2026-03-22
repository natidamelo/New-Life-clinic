import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import nurseTaskService, { NurseTask } from '../../services/nurseTaskService';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { formatDistanceToNow } from 'date-fns';
import TaskDetailsModal from './TaskDetailsModal';
import { AlertTriangle, DollarSign } from 'lucide-react';
import { api } from '../../services/api';

interface NurseTaskListProps {
  filterStatus?: string;
  filterTaskType?: string;
  patientId?: string;
  onTaskUpdated?: () => void;
}

const priorityColors = {
  LOW: 'bg-primary/20 text-primary',
  MEDIUM: 'bg-accent/20 text-accent-foreground',
  HIGH: 'bg-accent/20 text-accent-foreground',
  URGENT: 'bg-destructive/20 text-destructive',
};

const statusColors = {
  PENDING: 'bg-accent/20 text-accent-foreground',
  IN_PROGRESS: 'bg-primary/20 text-primary',
  COMPLETED: 'bg-primary/20 text-primary',
  CANCELLED: 'bg-muted/20 text-muted-foreground',
};

const NurseTaskList: React.FC<NurseTaskListProps> = ({
  filterStatus,
  filterTaskType,
  patientId,
  onTaskUpdated,
}) => {
  const { user, token } = useAuth();
  const [tasks, setTasks] = useState<NurseTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<NurseTask | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [paymentInfoByPatient, setPaymentInfoByPatient] = useState<Record<string, { amountPaid?: number; outstandingAmount?: number; paymentStatus?: string }>>({});

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      
      if (filterStatus) {
        params.status = filterStatus;
      }
      
      if (filterTaskType) {
        params.taskType = filterTaskType;
      }
      
      if (patientId) {
        params.patientId = patientId;
      }
      
      // Remove nurse filtering since tasks don't have assignedTo field set properly
      // Show all tasks for now
      // if (user?.role === 'nurse') {
      //   params.nurseId = user.id;
      // }
      
      console.log('Fetching nurse tasks with params:', params);
      const fetchedTasks = await nurseTaskService.getNurseTasks(params, token || '');
      console.log('Fetched tasks:', fetchedTasks);
      setTasks(fetchedTasks);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError('Failed to load tasks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [filterStatus, filterTaskType, patientId, user?.id, token]);

  // Load nurse-facing medication payment notifications to surface Paid/Due amounts
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/notifications', {
          params: { recipientRole: 'nurse', type: 'medication_payment_info', limit: 200 }
        });
        const list = res.data?.data || res.data?.notifications || [];
        const map: Record<string, { amountPaid?: number; outstandingAmount?: number; paymentStatus?: string }> = {};
        for (const n of list) {
          const pid = n?.data?.patientId;
          const pname = (n?.data?.patientName || '').toString().toLowerCase();
          if (pid) {
            map[String(pid)] = {
              amountPaid: n?.data?.amountPaid,
              outstandingAmount: n?.data?.outstandingAmount,
              paymentStatus: n?.data?.paymentStatus
            };
          }
          if (pname) {
            map[`name:${pname}`] = {
              amountPaid: n?.data?.amountPaid,
              outstandingAmount: n?.data?.outstandingAmount,
              paymentStatus: n?.data?.paymentStatus
            };
          }
        }
        setPaymentInfoByPatient(map);
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const handleTaskClick = (task: NurseTask) => {
    setSelectedTask(task);
    setIsDetailsModalOpen(true);
  };

  const handleTaskUpdated = () => {
    fetchTasks();
    if (onTaskUpdated) {
      onTaskUpdated();
    }
  };

  const handleCloseModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedTask(null);
  };
  
  const getTaskIcon = (taskType: string) => {
    switch (taskType) {
      case 'MEDICATION':
        return (
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        );
      case 'VITAL_SIGNS':
        return (
          <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'PROCEDURE':
        return (
          <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        );
    }
  };

  const renderPaymentIndicator = (task: NurseTask) => {
    if (task.taskType !== 'MEDICATION') return null;
    const fallbackKey = paymentInfoByPatient[String(task.patientId)] ? String(task.patientId) : `name:${(task.patientName||'').toLowerCase()}`;
    const status = (task.paymentAuthorization?.paymentStatus || paymentInfoByPatient[fallbackKey]?.paymentStatus || '').toLowerCase();
    const due = (typeof task.paymentAuthorization?.outstandingAmount === 'number')
      ? task.paymentAuthorization?.outstandingAmount
      : paymentInfoByPatient[fallbackKey]?.outstandingAmount;
    const paid = (task as any).paymentAuthorization?.amountPaid as number | undefined;
    const paidFromNotif = paymentInfoByPatient[fallbackKey]?.amountPaid;

    const paidDisplay = typeof paid === 'number' ? paid : (typeof paidFromNotif === 'number' ? paidFromNotif : null);

    if (status === 'paid' || status === 'fully_paid') {
      return (
        <div className="flex items-center space-x-1 text-xs text-primary">
          <DollarSign className="w-3 h-3" />
          <span>Fully Paid{paidDisplay !== null ? ` • ETB ${paidDisplay?.toFixed?.(0)}` : ''}</span>
        </div>
      );
    }

    if (status === 'partial' || status === 'partially_paid' || (typeof due === 'number' && (due as number) > 0)) {
      return (
        <div className="flex items-center space-x-2 text-xs">
          <span className="flex items-center text-accent-foreground"><AlertTriangle className="w-3 h-3 mr-1" />Partial</span>
          {paidDisplay !== null && <span className="text-primary">Paid: ETB {Number(paidDisplay).toFixed(0)}</span>}
          {typeof due === 'number' && (due as number) > 0 && <span className="text-destructive">Due: ETB {(due as number).toFixed(0)}</span>}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-6">
        <Skeleton className="h-8 w-32" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center p-6 bg-primary-foreground rounded-lg shadow">
        <p className="text-muted-foreground">No tasks found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <Card key={task.id || task._id || `task-${Math.random()}`} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleTaskClick(task)}>
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-3">
              {getTaskIcon(task.taskType)}
              <div>
                <h3 className="font-medium">{task.description}</h3>
                <p className="text-sm text-muted-foreground">
                  Patient: {task.patientName}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge className={statusColors[task.status]}>
                    {task.status}
                  </Badge>
                  <Badge className={priorityColors[task.priority]}>
                    {task.priority}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Due: {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                  </span>
                  {renderPaymentIndicator(task)}
                </div>
              </div>
            </div>
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTaskClick(task);
                }}
              >
                View Details
              </Button>
            </div>
          </div>
        </Card>
      ))}

      {selectedTask && isDetailsModalOpen && (
        <TaskDetailsModal
          task={selectedTask}
          isOpen={isDetailsModalOpen}
          onClose={handleCloseModal}
          onTaskUpdated={handleTaskUpdated}
        />
      )}
    </div>
  );
};

export default NurseTaskList; 