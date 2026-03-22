
// VERIFICATION SCRIPT - Check if all payment sync issues are fixed

use clinic-cms

print("🔍 Verifying payment synchronization fixes...");

// Check nurse tasks
const nurseTasks = db.nursetasks.find({ taskType: "MEDICATION" }).toArray();
print("\n📋 Found " + nurseTasks.length + " medication nurse tasks");

let fullyPaidCount = 0;
let partialCount = 0;
let unpaidCount = 0;
let linkedCount = 0;

for (const task of nurseTasks) {
  const paymentStatus = task.paymentAuthorization?.paymentStatus || "unpaid";
  const hasInvoiceLink = !!task.medicationDetails?.invoiceId;
  const hasPrescriptionLink = !!task.medicationDetails?.prescriptionId;
  
  if (paymentStatus === "fully_paid") fullyPaidCount++;
  else if (paymentStatus === "partial") partialCount++;
  else unpaidCount++;
  
  if (hasInvoiceLink && hasPrescriptionLink) linkedCount++;
}

print("\n💰 Payment Status Summary:");
print("  - Fully Paid: " + fullyPaidCount);
print("  - Partial: " + partialCount);
print("  - Unpaid: " + unpaidCount);

print("\n🔗 Data Linking Summary:");
print("  - Properly Linked: " + linkedCount);
print("  - Missing Links: " + (nurseTasks.length - linkedCount));

// Check for any remaining issues
const problematicTasks = db.nursetasks.find({
  taskType: "MEDICATION",
  $or: [
    { "paymentAuthorization.paymentStatus": "unpaid" },
    { "medicationDetails.invoiceId": { $exists: false } },
    { "medicationDetails.prescriptionId": { $exists: false } }
  ]
}).toArray();

if (problematicTasks.length > 0) {
  print("\n⚠️ Remaining issues found:");
  for (const task of problematicTasks) {
    print("  - " + task.description + " (ID: " + task._id + ")");
    print("    Payment Status: " + (task.paymentAuthorization?.paymentStatus || "missing"));
    print("    Invoice ID: " + (task.medicationDetails?.invoiceId || "missing"));
    print("    Prescription ID: " + (task.medicationDetails?.prescriptionId || "missing"));
  }
} else {
  print("\n✅ All payment synchronization issues have been resolved!");
}

// Check prescriptions
const prescriptions = db.prescriptions.find({}).toArray();
let paidPrescriptions = 0;
let unpaidPrescriptions = 0;

for (const prescription of prescriptions) {
  if (prescription.paymentStatus === "paid") paidPrescriptions++;
  else unpaidPrescriptions++;
}

print("\n💊 Prescription Payment Summary:");
print("  - Paid: " + paidPrescriptions);
print("  - Unpaid: " + unpaidPrescriptions);
