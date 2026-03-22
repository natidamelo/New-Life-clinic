import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { toast } from 'react-toastify';
import serviceRequestService from '../../services/serviceRequestService';
import billingService from '../../services/billingService';

interface ServicePatient {
  _id: string;
  patient: {
    _id: string;
    firstName: string;
    lastName: string;
    contactNumber: string;
  };
  service: {
    _id: string;
    name: string;
    category: string;
    price: number;
  };
  assignedNurse: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  status: 'pending' | 'paid' | 'in-progress' | 'completed';
  requestDate: string;
  invoice: {
    _id: string;
    status: string;
    total: number;
  };
  notes?: string;
}

const ServicePatientsManagement: React.FC = () => {
  const [servicePatients, setServicePatients] = useState<ServicePatient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServicePatients();
  }, []);

  const fetchServicePatients = async () => {
    try {
      const response = await serviceRequestService.getServiceRequests();
      // Response could be either an array or an object with a `data` field
      const serviceRequests = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : [];
      setServicePatients(serviceRequests);
    } catch (error) {
      console.error('Error fetching service patients:', error);
      toast.error('Failed to load service patients');
    } finally {
      setLoading(false);
    }
  };

  const getDepartmentByServiceCategory = (category: string) => {
    const departmentMap = {
      'injection': 'nurse',
      'procedure': 'nurse',
      'imaging': 'imaging',
      'ultrasound': 'imaging',
      'lab': 'lab',
      'blood_test': 'lab',
      'rbs': 'lab',
      'consultation': 'doctor'
    };
    return departmentMap[category.toLowerCase()] || 'nurse';
  };

  const getDepartmentColor = (department: string) => {
    switch (department.toLowerCase()) {
      case 'nurse': return 'bg-[hsl(var(--dept-nurse))] text-[hsl(var(--dept-nurse-foreground))] border-[hsl(var(--dept-nurse-border))]';
      case 'imaging': return 'bg-[hsl(var(--dept-imaging))] text-[hsl(var(--dept-imaging-foreground))] border-[hsl(var(--dept-imaging-border))]';
      case 'lab': return 'bg-[hsl(var(--dept-lab))] text-[hsl(var(--dept-lab-foreground))] border-[hsl(var(--dept-lab-border))]';
      case 'doctor': return 'bg-[hsl(var(--dept-doctor))] text-[hsl(var(--dept-doctor-foreground))] border-[hsl(var(--dept-doctor-border))]';
      default: return 'bg-muted/20 text-muted-foreground border-border/30';
    }
  };

  const getStatusColor = (status: string, paymentStatus: string) => {
    if (paymentStatus !== 'paid') {
      return 'bg-[hsl(var(--status-error))] text-[hsl(var(--status-error-foreground))] border-[hsl(var(--status-error-border))]'; // Pending payment
    }
    
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-[hsl(var(--status-warning))] text-[hsl(var(--status-warning-foreground))] border-[hsl(var(--status-warning-border))]';
      case 'in-progress': return 'bg-[hsl(var(--status-info))] text-[hsl(var(--status-info-foreground))] border-[hsl(var(--status-info-border))]';
      case 'completed': return 'bg-[hsl(var(--status-success))] text-[hsl(var(--status-success-foreground))] border-[hsl(var(--status-success-border))]';
      default: return 'bg-muted/20 text-muted-foreground border-border/30';
    }
  };

  const handleSendToDepartment = async (servicePatient: ServicePatient) => {
    if (servicePatient.invoice.status !== 'paid') {
      toast.error('Payment must be completed before sending to department');
      return;
    }

    try {
      await serviceRequestService.updateServiceRequest(servicePatient._id, {
        status: 'in-progress'
      });
      
      toast.success(`Service request sent to ${getDepartmentByServiceCategory(servicePatient.service.category)} department`);
      fetchServicePatients(); // Refresh the list
    } catch (error) {
      console.error('Error sending to department:', error);
      toast.error('Failed to send to department');
    }
  };

  const handleMarkCompleted = async (servicePatient: ServicePatient) => {
    try {
      await serviceRequestService.updateServiceRequest(servicePatient._id, {
        status: 'completed',
        completionDate: new Date()
      });
      
      toast.success('Service request marked as completed');
      fetchServicePatients(); // Refresh the list
    } catch (error) {
      console.error('Error marking as completed:', error);
      toast.error('Failed to mark as completed');
    }
  };

  if (loading) {
    return <div className="p-6">Loading service patients...</div>;
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Service Patients Management</CardTitle>
          <p className="text-sm text-muted-foreground">
            Manage service requests, payments, and department routing
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {servicePatients.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No service patients found</p>
            ) : (
              servicePatients.map((servicePatient) => {
                const department = getDepartmentByServiceCategory(servicePatient.service.category);
                const isPaid = servicePatient.invoice.status === 'paid';
                
                return (
                  <div key={servicePatient._id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {servicePatient.patient.firstName} {servicePatient.patient.lastName}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Contact: {servicePatient.patient.contactNumber}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Requested: {new Date(servicePatient.requestDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <Badge className={getStatusColor(servicePatient.status, servicePatient.invoice.status)}>
                          {isPaid ? servicePatient.status : 'Pending Payment'}
                        </Badge>
                        <Badge className={getDepartmentColor(department)}>
                          {department.charAt(0).toUpperCase() + department.slice(1)}
                        </Badge>
                      </div>
                    </div>

                    <div className="bg-muted/10 p-3 rounded">
                      <h4 className="font-medium">{servicePatient.service.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Category: {servicePatient.service.category} | Price: ${servicePatient.service.price}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Assigned Nurse: {servicePatient.assignedNurse.firstName} {servicePatient.assignedNurse.lastName}
                      </p>
                      {servicePatient.notes && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Notes: {servicePatient.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="text-sm">
                        <span className={`font-medium ${isPaid ? 'text-primary' : 'text-destructive'}`}>
                          Payment: {isPaid ? 'Paid' : 'Pending'} (${servicePatient.invoice.total})
                        </span>
                      </div>
                      
                      <div className="flex space-x-2">
                        {!isPaid && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              // Redirect to payment processing
                              window.location.href = `/app/billing/invoices/${servicePatient.invoice._id}`;
                            }}
                          >
                            Process Payment
                          </Button>
                        )}
                        
                        {isPaid && servicePatient.status === 'pending' && (
                          <Button 
                            size="sm"
                            onClick={() => handleSendToDepartment(servicePatient)}
                          >
                            Send to {department.charAt(0).toUpperCase() + department.slice(1)}
                          </Button>
                        )}
                        
                        {servicePatient.status === 'in-progress' && (
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkCompleted(servicePatient)}
                          >
                            Mark Completed
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ServicePatientsManagement; 