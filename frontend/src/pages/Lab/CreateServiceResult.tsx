import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const CreateServiceResult: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to lab dashboard with a flag to open the create service modal
    navigate('/app/lab?openCreateService=true');
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting to Lab Dashboard...</p>
      </div>
    </div>
  );
};

export default CreateServiceResult;
