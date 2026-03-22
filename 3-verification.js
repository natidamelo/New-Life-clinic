
// VERIFICATION - Check if everything is working
use clinic-cms

// Check the nurse task
const task = db.nursetasks.findOne({ _id: ObjectId("68b852703decb1155bc61efe") })
print("\n🔍 Nurse Task Status:")
print("  - Payment Status:", task.paymentAuthorization.paymentStatus)
print("  - Authorized Doses:", task.paymentAuthorization.authorizedDoses)
print("  - Can Administer:", task.paymentAuthorization.canAdminister)
print("  - Invoice ID:", task.medicationDetails.invoiceId)
print("  - Prescription ID:", task.medicationDetails.prescriptionId)

// Check the prescription
const prescription = db.prescriptions.findOne({ _id: ObjectId("68b852703decb1155bc61ed2") })
print("\n💊 Prescription Status:")
print("  - Payment Status:", prescription.paymentStatus)
print("  - Total Cost:", prescription.totalCost)

// Check the invoice
if (task.medicationDetails.invoiceId) {
  const invoice = db.medicalinvoices.findOne({ _id: task.medicationDetails.invoiceId })
  print("\n💰 Invoice Status:")
  print("  - Amount Paid:", invoice.amountPaid)
  print("  - Total:", invoice.total)
  print("  - Balance:", invoice.balance)
}
