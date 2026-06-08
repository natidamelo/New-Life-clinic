const fs = require('fs');
const path = require('path');

const targetFilePath = path.join(__dirname, '../frontend/src/pages/Finance/Reports/StandardFinancialReport.tsx');
let content = fs.readFileSync(targetFilePath, 'utf8');

// Find start index of StandardFinancialReport component
const startKeyword = 'const StandardFinancialReport: React.FC = () => {';
const startIndex = content.indexOf(startKeyword);

if (startIndex === -1) {
  console.error('Could not find start keyword');
  process.exit(1);
}

// Find downloadReport function which marks the end of our target block
const endKeyword = 'const downloadReport = async';
const endIndex = content.indexOf(endKeyword);

if (endIndex === -1) {
  console.error('Could not find end keyword');
  process.exit(1);
}

// Check that start index is before end index
if (startIndex >= endIndex) {
  console.error('Invalid indices');
  process.exit(1);
}

// Define the optimized replacement block
const newBlock = `const StandardFinancialReport: React.FC = () => {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState<Date>(() => { const d = new Date(); d.setMonth(d.getMonth() - 3); return d; });
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [showEthiopianCalendar, setShowEthiopianCalendar] = useState(true);
  const [loading, setLoading] = useState(false);
  const [agingLoading, setAgingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [agingData, setAgingData] = useState<AgingData | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [revenueByService, setRevenueByService] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  const fetchAgingData = useCallback(async () => {
    setAgingLoading(true);
    try {
      const agingRes = await billingService.getAccountsReceivableAging();
      setAgingData(agingRes || { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 });
    } catch (err) {
      console.error('Failed to fetch aging data:', err);
    } finally {
      setAgingLoading(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [summaryRes, monthlyRes, serviceRes, paymentRes] = await Promise.all([
        billingService.getFinancialSummary(startDate, endDate),
        billingService.getMonthlyFinancialData(startDate, endDate),
        billingService.getRevenueByService(startDate, endDate),
        billingService.getPaymentMethodBreakdown(startDate, endDate),
      ]);

      setFinancialSummary(summaryRes || { totalRevenue: 0, totalOutstanding: 0, totalPaid: 0, totalOverdue: 0, totalCostOfGoodsSold: 0, grossProfit: 0, grossMargin: 0, operatingExpenses: 0, netProfit: 0, netMargin: 0, averageInvoiceValue: 0, collectionRate: 0 });
      setMonthlyData(Array.isArray(monthlyRes) ? monthlyRes : []);
      // Normalize API shape { service, revenue } → { name, value, shortName, category }
      const rawServices = Array.isArray(serviceRes) ? serviceRes : [];
      setRevenueByService(
        rawServices
          .filter((s: any) => s && (s.revenue ?? s.value) > 0)
          .map((s: any) => {
            const fullName: string = s.service ?? s.name ?? 'Unknown';
            // Strip dosage parenthetical: "Medication: Ceftriaxone (5 doses...)" → "Ceftriaxone"
            const withoutDosage = fullName.replace(/\\s*\\([^)]*doses[^)]*\\)/gi, '').trim();
            // Detect category prefix like "Medication:", "Lab test:", etc.
            const catMatch = withoutDosage.match(/^(Medication|Lab test|Lab|Procedure|Service|Consultation|Imaging|Supply):\\s*/i);
            const category = catMatch ? catMatch[1].toLowerCase() : 'other';
            const shortName = catMatch ? withoutDosage.replace(catMatch[0], '').trim() : withoutDosage;
            return {
              name: fullName,
              shortName: shortName.length > 22 ? shortName.slice(0, 22) + '…' : shortName,
              displayName: shortName,
              category,
              value: s.revenue ?? s.value ?? 0,
              quantity: s.quantity ?? 0,
              averagePrice: s.averagePrice ?? 0,
            };
          })
          .slice(0, 8)
      );
      setPaymentMethods(Array.isArray(paymentRes) ? paymentRes : []);
    } catch (err: any) {
      const status = err.response?.status;
      setError(
        status === 401 ? 'Authentication required. Please log in.' :
          status === 403 ? 'Access denied. Admin or Finance role required.' :
            'Failed to load financial data. Please try again.'
      );
    } finally { setLoading(false); }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchAgingData();
  }, [fetchAgingData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  
  `;

// Replace content between start keyword and end keyword
content = content.substring(0, startIndex) + newBlock + content.substring(endIndex);

fs.writeFileSync(targetFilePath, content, 'utf8');
console.log('✅ Replaced main component block successfully.');
