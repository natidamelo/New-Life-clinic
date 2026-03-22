import React, { useState } from 'react';
// import { Dialog } from '@headlessui/react';
import { NurseTask } from '../../services/nurseTaskService';
import nurseTaskService from '../../services/nurseTaskService';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { CheckCircle, XCircle, Clock, AlertTriangle, DollarSign } from 'lucide-react';

interface TaskDetailsModalProps {
  task: NurseTask;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated: () => void;
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

const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({
  task,
  isOpen,
  onClose,
  onTaskUpdated,
}) => {
  const { token } = useAuth();
  const [notes, setNotes] = useState(task.notes || '');
  const [status, setStatus] = useState(task.status);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartTask = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await nurseTaskService.updateNurseTask(
        task.id!,
        { status: 'IN_PROGRESS' },
        token || ''
      );
      setStatus('IN_PROGRESS');
      onTaskUpdated();
    } catch (err) {
      console.error('Error starting task:', err);
      setError('Failed to update task status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteTask = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await nurseTaskService.completeNurseTask(task.id!, notes, token || '');
      setStatus('COMPLETED');
      onTaskUpdated();
      onClose();
    } catch (err) {
      console.error('Error completing task:', err);
      setError('Failed to complete task');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelTask = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await nurseTaskService.updateNurseTask(
        task.id!,
        { status: 'CANCELLED' },
        token || ''
      );
      setStatus('CANCELLED');
      onTaskUpdated();
      onClose();
    } catch (err) {
      console.error('Error cancelling task:', err);
      setError('Failed to cancel task');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderPaymentAuthorization = () => {
    if (!task.paymentAuthorization || task.taskType !== 'MEDICATION') {
      return null;
    }

    const { paymentAuthorization } = task;
    const isPartialPayment = paymentAuthorization.paymentStatus === 'partially_paid';
    const isFullyPaid = paymentAuthorization.paymentStatus === 'fully_paid';

    return (
      <div className="border-t pt-3">
        <h4 className="font-medium mb-2 flex items-center">
          <DollarSign className="w-4 h-4 mr-2 text-primary" />
          Payment Authorization
        </h4>
        
        <div className="grid grid-cols-3 gap-2 mb-2">
          <div className="bg-muted/10 p-2 rounded border">
            <div className="text-xs text-muted-foreground">Total Days</div>
            <div className="font-semibold text-xs">{paymentAuthorization.totalDays}</div>
          </div>
          <div className="bg-muted/10 p-2 rounded border">
            <div className="text-xs text-muted-foreground">Paid Days</div>
            <div className="font-semibold text-xs">{paymentAuthorization.paidDays}</div>
          </div>
          <div className="bg-muted/10 p-2 rounded border">
            <div className="text-xs text-muted-foreground">Outstanding</div>
            <div className="font-semibold text-xs text-destructive">ETB {paymentAuthorization.outstandingAmount.toFixed(2)}</div>
          </div>
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center justify-between p-2 bg-primary/10 rounded border border-primary/30">
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-primary mr-2" />
              <div>
                <div className="font-semibold text-primary text-xs">
                  {paymentAuthorization.authorizedDoses} / {paymentAuthorization.authorizedDoses + paymentAuthorization.unauthorizedDoses} doses
                </div>
                <div className="text-xs text-primary">Can administer</div>
              </div>
            </div>
          </div>
          
          {isPartialPayment && (
            <div className="flex items-center justify-between p-2 bg-destructive/10 rounded border border-destructive/30">
              <div className="flex items-center">
                <XCircle className="w-4 h-4 text-destructive mr-2" />
                <div>
                  <div className="font-semibold text-destructive text-xs">Unauthorized</div>
                  <div className="text-xs text-destructive">
                    {paymentAuthorization.unauthorizedDoses} remaining doses
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {isPartialPayment && (
          <div className="mt-2 p-2 bg-accent/10 rounded border border-yellow-200">
            <div className="flex items-center">
              <Clock className="w-3 h-3 text-accent-foreground mr-2" />
              <div className="text-xs text-accent-foreground">
                ETB {paymentAuthorization.outstandingAmount.toFixed(2)} needed for {paymentAuthorization.unauthorizedDoses} doses
              </div>
            </div>
          </div>
        )}
        
        <div className="mt-2 text-xs text-muted-foreground">
          <div className="font-semibold mb-0.5">Administration Rules:</div>
          <div className="text-xs space-y-0.5">
            <div>• Only administer doses for paid days</div>
            <div>• System blocks unpaid administrations</div>
            <div>• Contact billing for additional payments</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded bg-primary-foreground p-6 shadow-xl">
          <h2 className="text-lg font-medium leading-6 text-muted-foreground mb-2">
            Task Details
          </h2>

          {error && (
            <div className="mb-4 p-2 bg-destructive/20 text-destructive rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-medium">{task.description}</h3>
              <div className="flex items-center space-x-2 mt-1">
                <Badge className={statusColors[status]}>
                  {status}
                </Badge>
                <Badge className={priorityColors[task.priority]}>
                  {task.priority}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Patient</p>
                <p>{task.patientName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Due Date</p>
                <p>{formatDate(task.dueDate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Assigned By</p>
                <p>{task.assignedByName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Assigned To</p>
                <p>{task.assignedToName || 'Not assigned'}</p>
              </div>
            </div>

            {task.medicationDetails && (
              <div className="border-t pt-3">
                <h4 className="font-medium mb-2">Medication Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Medication</p>
                    <p>{task.medicationDetails.medicationName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Dosage</p>
                    <p>{task.medicationDetails.dosage}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Frequency</p>
                    <p>{task.medicationDetails.frequency}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Route</p>
                    <p>{task.medicationDetails.route || 'Not specified'}</p>
                  </div>
                </div>
                {task.medicationDetails.instructions && (
                  <div className="mt-2">
                    <p className="text-muted-foreground">Instructions</p>
                    <p>{task.medicationDetails.instructions}</p>
                  </div>
                )}
              </div>
            )}

            {/* Payment Authorization Section */}
            {renderPaymentAuthorization()}

            {status !== 'COMPLETED' && status !== 'CANCELLED' && (
              <div className="border-t pt-3">
                <label className="block mb-2 text-sm font-medium text-muted-foreground">
                  Notes
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this task..."
                  rows={3}
                  className="w-full"
                />
              </div>
            )}

            {task.completedDate && (
              <div>
                <p className="text-muted-foreground">Completed Date</p>
                <p>{formatDate(task.completedDate)}</p>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4 border-t">
              {status === 'PENDING' && (
                <Button
                  variant="outline"
                  onClick={handleStartTask}
                  disabled={isLoading}
                >
                  Start Task
                </Button>
              )}
              {(status === 'PENDING' || status === 'IN_PROGRESS') && (
                <Button
                  variant="default"
                  onClick={handleCompleteTask}
                  disabled={isLoading}
                >
                  Complete
                </Button>
              )}
              {(status === 'PENDING' || status === 'IN_PROGRESS') && (
                <Button
                  variant="destructive"
                  onClick={handleCancelTask}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              )}
              <Button variant="outline" onClick={onClose} disabled={isLoading}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailsModal; 