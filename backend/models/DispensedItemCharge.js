const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DispensedItemChargeSchema = new Schema({
    patient: {
        type: Schema.Types.ObjectId,
        ref: 'Patient',
        required: true,
        index: true
    },
    inventoryItem: {
        type: Schema.Types.ObjectId,
        ref: 'InventoryItem',
        required: true
    },
    itemName: { // Denormalized for easier display on pending lists
        type: String,
        required: true
    },
    quantityDispensed: {
        type: Number,
        required: true,
        min: 0
    },
    unitPrice: { // Selling price at the time of dispensing
        type: Number,
        required: true,
        min: 0
    },
    totalPrice: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ['pending_billing', 'billed', 'cancelled'],
        default: 'pending_billing',
        index: true
    },
    dispenseDate: {
        type: Date,
        default: Date.now
    },
    dispensedBy: { // User who recorded the dispensing
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    inventoryTransaction: { // Link to the specific inventory transaction for traceability
        type: Schema.Types.ObjectId,
        ref: 'InventoryTransaction'
    },
    invoice: { // Once billed, link to the invoice
        type: Schema.Types.ObjectId,
        ref: 'MedicalInvoice', // Assuming your invoice model is MedicalInvoice
        index: true
    },
    notes: String
}, { timestamps: true });

// Ensure compound index for efficient querying of pending items for a patient
DispensedItemChargeSchema.index({ patient: 1, status: 1 });

const DispensedItemCharge = mongoose.model('DispensedItemCharge', DispensedItemChargeSchema);

module.exports = DispensedItemCharge; 
