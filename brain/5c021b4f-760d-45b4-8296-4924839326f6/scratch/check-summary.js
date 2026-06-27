const mongoose = require('mongoose');
const path = require('path');

const uri = "mongodb+srv://kinfenati7_db_user:Natkinfe2325@cluster0.smcnulu.mongodb.net/clinic-cms?retryWrites=true&w=majority&appName=Cluster0";
const projectRoot = "c:/Users/HP/OneDrive/Desktop/clinic new life/backend";

// Mock req / res / auth / etc
const run = async () => {
  await mongoose.connect(uri);
  console.log("Mongoose connected!");

  // Load models
  require(path.join(projectRoot, 'models/MedicalInvoice'));
  require(path.join(projectRoot, 'models/Payment'));
  require(path.join(projectRoot, 'models/OperatingExpense'));
  require(path.join(projectRoot, 'models/InventoryTransaction'));
  require(path.join(projectRoot, 'models/InventoryItem'));

  const billingService = require(path.join(projectRoot, 'services/billingService'));
  const billingController = require(path.join(projectRoot, 'controllers/billingController'));

  const start = new Date("2026-06-01T00:00:00.000Z");
  const end = new Date("2026-06-30T23:59:59.999Z");

  console.log("--- Calling billingService.getFinancialSummary ---");
  const summaryService = await billingService.getFinancialSummary(start, end);
  console.log(summaryService);

  console.log("--- Calling billingController getFinancialSummary mock ---");
  // Let's call the controller logic directly
  // We can just construct a mock req and res
  const req = {
    query: {
      startDate: start.toISOString(),
      endDate: end.toISOString()
    }
  };
  const res = {
    json: (data) => {
      console.log(data);
    },
    status: (code) => {
      console.log("Status code:", code);
      return res;
    }
  };

  // Wrap controller in asyncHandler or call it directly
  await billingController.getFinancialSummary(req, res, (err) => {
    if (err) console.error("Error in controller:", err);
  });

  await mongoose.disconnect();
};

run();
