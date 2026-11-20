import React from 'react';
import BillingDashboard from '../Billing/BillingDashboard';

/**
 * Upgraded Finance Dashboard
 * Serves as the central finance hub, integrating Daily Financial Reports,
 * Standard Financial Statements, Operating Expenses, Invoices, and Financial Analytics.
 */
const FinanceDashboard: React.FC = React.memo(() => {
  return <BillingDashboard />;
});

export default FinanceDashboard;
