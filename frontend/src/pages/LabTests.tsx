import React from 'react';

const LabTests: React.FC = () => {
  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h2 className="text-xl font-semibold text-muted-foreground">Laboratory Tests</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage and track laboratory test requests and results.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-primary-foreground bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            Create Test Request
          </button>
        </div>
      </div>

      {/* Pending Tests */}
      <div className="mt-8">
        <h3 className="text-lg font-medium text-muted-foreground">Pending Tests</h3>
        <div className="mt-4 overflow-hidden bg-primary-foreground shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">No pending tests</p>
            </div>
          </div>
        </div>
      </div>

      {/* Completed Tests */}
      <div className="mt-8">
        <h3 className="text-lg font-medium text-muted-foreground">Completed Tests</h3>
        <div className="mt-4 overflow-hidden bg-primary-foreground shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">No completed tests</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabTests; 