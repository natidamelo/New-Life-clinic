
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

// Import models as needed
const MedicalInvoice = require('../models/MedicalInvoice'); // Changed from BillingInvoice to MedicalInvoice
const Patient = require('../models/Patient');
const Payment = require('../models/Payment');
const Service = require('../models/Service');
const NurseTask = require('../models/NurseTask');
const LabOrder = require('../models/LabOrder');
const ImagingOrder = require('../models/ImagingOrder');

// Get all billing invoices with pagination and filtering
exports.getBillingInvoices = asyncHandler(async (req, res) => {
    console.log('[getBillingInvoices] Fetching invoices with query:', req.query);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};

    // Add status filter if provided
    if (req.query.status) {
        filter.status = req.query.status;
    }

    // Add date range filter if provided
    if (req.query.startDate || req.query.endDate) {
        filter.issueDate = {}; // Changed from dateIssued to issueDate to match MedicalInvoice schema
        if (req.query.startDate) {
            filter.issueDate.$gte = new Date(req.query.startDate);
        }
        if (req.query.endDate) {
            filter.issueDate.$lte = new Date(req.query.endDate);
        }
    }

    // Add patient filter if provided (support ObjectId, string patientId, and both params)
    if (req.query.patient || req.query.patientId) {
        const raw = req.query.patient || req.query.patientId;
        const variants = [raw];
        try {
            if (mongoose.Types.ObjectId.isValid(raw)) {
                variants.push(new mongoose.Types.ObjectId(raw));
            }
        } catch (e) { /* ignore */ }
        filter.$or = [
            { patient: { $in: variants } },
            { patientId: String(raw) }
        ];
    }

    console.log('[getBillingInvoices] Using filter:', filter);

    try {
        // Fetch invoices with population
        const invoices = await MedicalInvoice.find(filter)
            .populate('patient', 'firstName lastName patientId')
            .populate('createdBy', 'firstName lastName')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Get total count for pagination
        const totalInvoices = await MedicalInvoice.countDocuments(filter);
        const totalPages = Math.ceil(totalInvoices / limit);

        console.log(`[getBillingInvoices] Found ${invoices.length} invoices out of ${totalInvoices} total`);

        // Format invoices for frontend
        const formattedInvoices = invoices.map(invoice => ({
            ...invoice.toObject(),
            id: invoice._id.toString(),
            patientName: invoice.patientName || (invoice.patient ? `${invoice.patient.firstName} ${invoice.patient.lastName}` : 'Unknown Patient'),
            createdByName: invoice.createdBy ? `${invoice.createdBy.firstName} ${invoice.createdBy.lastName}` : 'Unknown User'
        }));

        res.json({
            success: true,
            invoices: formattedInvoices,
            pagination: {
                currentPage: page,
                totalPages,
                totalInvoices,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });

    } catch (error) {
        console.error('[getBillingInvoices] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch invoices',
            error: error.message
        });
    }
});

exports.getBillingStats = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    // Parse dates or set default to last 12 months if no dates provided
    let start, end;

    if (startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);

        // Set start date to beginning of day (00:00:00)
        start.setHours(0, 0, 0, 0);
        // Set end date to end of day (23:59:59.999)
        end.setHours(23, 59, 59, 999);
    } else {
        // Default to last 12 months if no dates provided
        end = new Date();
        end.setHours(23, 59, 59, 999); // End of today
        start = new Date();
        start.setFullYear(start.getFullYear() - 1);
        start.setHours(0, 0, 0, 0); // Start of day 12 months ago
    }

    // Ensure dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid date range provided.' });
    }

    // Validate date range
    if (start > end) {
        return res.status(400).json({ success: false, message: 'Start date cannot be after end date.' });
    }

    console.log('Billing stats date range:', {
        start: start.toISOString(),
        end: end.toISOString(),
        startLocal: start.toLocaleString(),
        endLocal: end.toLocaleString()
    });

    // Get comprehensive billing statistics
    const invoiceStats = await MedicalInvoice.aggregate([
        { $match: { issueDate: { $gte: start, $lte: end } } },
        {
            $group: {
                _id: null,
                totalRevenue: { $sum: '$total' },
                totalOutstanding: { $sum: '$balance' },
                totalOverdue: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $lt: ['$dueDate', new Date()] },
                                    { $gt: ['$balance', 0] }
                                ]
                            },
                            '$balance',
                            0
                        ]
                    }
                },
                averageInvoiceValue: { $avg: '$total' },
                invoiceCount: { $sum: 1 }
            }
        }
    ]);

    // Get payment data for the same period
    const paymentStats = await Payment.aggregate([
        {
            $lookup: {
                from: 'medicalinvoices',
                localField: 'invoice',
                foreignField: '_id',
                as: 'invoice'
            }
        },
        { $unwind: '$invoice' },
        { $match: { 'invoice.issueDate': { $gte: start, $lte: end } } },
        {
            $group: {
                _id: null,
                totalPaid: { $sum: '$amount' },
                paymentCount: { $sum: 1 }
            }
        }
    ]);

    // Debug: Check total invoices in database
    const totalInvoicesInDB = await MedicalInvoice.countDocuments({});
    const totalPaymentsInDB = await Payment.countDocuments({});
    console.log('Total invoices in database:', totalInvoicesInDB);
    console.log('Total payments in database:', totalPaymentsInDB);
    console.log('Invoices in date range:', invoiceStats[0]?.invoiceCount || 0);
    console.log('Payments in date range:', paymentStats[0]?.paymentCount || 0);

    // Get invoices by status for detailed breakdown
    const invoicesByStatus = await MedicalInvoice.aggregate([
        { $match: { issueDate: { $gte: start, $lte: end } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Get recent invoices for the dashboard
    const recentInvoices = await MedicalInvoice.aggregate([
        { $match: { issueDate: { $gte: start, $lte: end } } },
        { $sort: { issueDate: -1 } },
        { $limit: 10 },
        {
            $lookup: {
                from: 'patients',
                localField: 'patient',
                foreignField: '_id',
                as: 'patientData'
            }
        },
        { $unwind: { path: '$patientData', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                _id: 1,
                invoiceNumber: 1,
                issueDate: 1,
                total: 1,
                status: 1,
                patientName: { $concat: ['$patientData.firstName', ' ', '$patientData.lastName'] }
            }
        }
    ]);

    // Calculate monthly revenue for the last 12 months
    const monthlyRevenue = await MedicalInvoice.aggregate([
        {
            $match: {
                issueDate: {
                    $gte: new Date(new Date().getFullYear() - 1, new Date().getMonth(), 1),
                    $lte: new Date()
                }
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: '$issueDate' },
                    month: { $month: '$issueDate' }
                },
                revenue: { $sum: '$total' }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Convert monthly revenue to array format expected by frontend
    const monthlyRevenueArray = Array(12).fill(0);
    monthlyRevenue.forEach(item => {
        const monthIndex = item._id.month - 1;
        monthlyRevenueArray[monthIndex] = item.revenue;
    });

    const stats = invoiceStats[0] || {};
    const payments = paymentStats[0] || {};
    const statusCounts = invoicesByStatus.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {});

    console.log('Billing stats summary:', {
        totalRevenue: stats.totalRevenue || 0,
        totalOutstanding: stats.totalOutstanding || 0,
        totalPaid: payments.totalPaid || 0,
        invoiceCount: stats.invoiceCount || 0,
        paymentCount: payments.paymentCount || 0
    });

    res.json({
        success: true,
        data: {
            totalRevenue: stats.totalRevenue || 0,
            outstandingAmount: stats.totalOutstanding || 0,
            totalPaid: payments.totalPaid || 0,
            invoicesCount: {
                paid: statusCounts.paid || 0,
                pending: statusCounts.pending || 0,
                overdue: statusCounts.overdue || 0,
                partial: statusCounts.partial || 0,
                cancelled: statusCounts.cancelled || 0
            },
            monthlyRevenue: monthlyRevenueArray,
            recentInvoices: recentInvoices,
            dateRange: { start, end }
        }
    });
});

exports.getFinancialSummary = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    // Parse dates with defaults
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
    const end = endDate ? new Date(endDate) : new Date();

    try {
        // Get revenue data from medical invoices
        const revenueData = await MedicalInvoice.aggregate([
            { $match: { issueDate: { $gte: start, $lte: end } } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$total' },
                    totalOutstanding: { $sum: { $subtract: ['$total', '$amountPaid'] } },
                    totalOverdue: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $lt: ['$dueDate', new Date()] },
                                        { $gt: [{ $subtract: ['$total', '$amountPaid'] }, 0] }
                                    ]
                                },
                                { $subtract: ['$total', '$amountPaid'] },
                                0
                            ]
                        }
                    },
                    averageInvoiceValue: { $avg: '$total' },
                    invoiceCount: { $sum: 1 }
                }
            }
        ]);

        // Get total paid from Payment collection
        const paymentData = await Payment.aggregate([
            {
                $lookup: {
                    from: 'medicalinvoices',
                    localField: 'invoice',
                    foreignField: '_id',
                    as: 'invoice'
                }
            },
            { $unwind: '$invoice' },
            { $match: { 'invoice.issueDate': { $gte: start, $lte: end } } },
            {
                $group: {
                    _id: null,
                    totalPaid: { $sum: '$amount' },
                    paymentCount: { $sum: 1 }
                }
            }
        ]);

        // Get total paid from invoice.payments arrays (avoiding double counting)
        // Only count payments that are NOT already in the Payment collection
        const invoicePaymentsData = await MedicalInvoice.aggregate([
            { $match: { issueDate: { $gte: start, $lte: end } } },
            { $unwind: { path: '$payments', preserveNullAndEmptyArrays: false } },
            {
                $group: {
                    _id: null,
                    totalPaidFromInvoices: { $sum: '$payments.amount' },
                    paymentCountFromInvoices: { $sum: 1 }
                }
            }
        ]);

        // Alternative approach: Use the invoice amountPaid field directly to avoid double counting
        const invoiceAmountPaidData = await MedicalInvoice.aggregate([
            { $match: { issueDate: { $gte: start, $lte: end } } },
            {
                $group: {
                    _id: null,
                    totalAmountPaid: { $sum: '$amountPaid' },
                    invoiceCount: { $sum: 1 }
                }
            }
        ]);

        // ===== Cost of Goods Sold (COGS) =====
        // Calculate COGS ONLY from actual inventory deductions (not from invoice items)
        const InventoryTransaction = require('../models/InventoryTransaction');
        const inventoryCostAgg = await InventoryTransaction.aggregate([
            {
                $match: {
                    createdAt: { $gte: start, $lte: end },
                    quantity: { $lt: 0 }, // only stock deductions
                    status: 'completed',
                    // Include all deduction types: medical-use, prescription, sale, etc.
                    transactionType: {
                        $in: ['medical-use', 'prescription', 'sale', 'damaged', 'expired']
                    }
                }
            },
            // Join with inventory item to get costPrice if unitCost/totalCost are missing
            {
                $lookup: {
                    from: 'inventoryitems',
                    localField: 'item',
                    foreignField: '_id',
                    as: 'invItem'
                }
            },
            { $unwind: { path: '$invItem', preserveNullAndEmptyArrays: true } },
            // Determine cost per unit and total cost
            {
                $addFields: {
                    _unitCost: {
                        $ifNull: [
                            '$unitCost',
                            { $ifNull: ['$invItem.costPrice', 0] }
                        ]
                    },
                    _totalCost: {
                        $cond: [
                            { $ne: ['$totalCost', null] },
                            '$totalCost',
                            {
                                $multiply: [
                                    { $abs: '$quantity' }, // Use absolute quantity to get positive cost
                                    { $ifNull: ['$unitCost', { $ifNull: ['$invItem.costPrice', 0] }] }
                                ]
                            }
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    // Sum absolute values to get total positive cost
                    totalInventoryCost: { $sum: { $abs: '$_totalCost' } },
                    inventoryTransactionCount: { $sum: 1 }
                }
            }
        ]);

        const inventoryCosts = inventoryCostAgg[0] || { totalInventoryCost: 0, inventoryTransactionCount: 0 };

        // COGS is now ONLY calculated from actual inventory deductions
        // COGS should be negative (expense) in accounting
        let totalCogs = -(inventoryCosts.totalInventoryCost || 0);

        // Force COGS to zero if no actual inventory deductions (per user request)
        // Removed the 40% fallback calculation that was causing incorrect COGS values

        // ===== Expense data =====
        // Operating expenses = one-time (dated in range) + recurring (monthly amount × months in range)
        const OperatingExpense = require('../models/OperatingExpense');
        const [oneTimeExpenseAgg, recurringExpenseAgg] = await Promise.all([
            OperatingExpense.aggregate([
                {
                    $match: {
                        expenseDate: { $gte: start, $lte: end },
                        $or: [{ recurring: { $ne: true } }, { recurring: { $exists: false } }]
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$amount' },
                        count: { $sum: 1 }
                    }
                }
            ]),
            OperatingExpense.aggregate([
                { $match: { recurring: true } },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$amount' },
                        count: { $sum: 1 }
                    }
                }
            ])
        ]);
        const oneTimeTotal = oneTimeExpenseAgg[0]?.total || 0;
        const recurringMonthlyTotal = recurringExpenseAgg[0]?.total || 0;
        // Use days-based months so "1 month" range shows 1 month of recurring expenses, not 2
        const daysDiff = Math.ceil((end - start) / (24 * 60 * 60 * 1000)) + 1;
        const monthsInRange = Math.max(1, Math.round(daysDiff / 30.44));
        const totalExpenses = oneTimeTotal + (recurringMonthlyTotal * monthsInRange);

        const revenue = revenueData[0] || {};
        const payments = paymentData[0] || {};
        const invoicePayments = invoicePaymentsData[0] || {};
        const invoiceAmountPaid = invoiceAmountPaidData[0] || {};
        const expenses = {
            totalExpenses,
            monthsInRange,
            oneTimeTotal,
            recurringMonthlyTotal
        };

        const totalRevenue = revenue.totalRevenue || 0;
        // Use the invoice amountPaid field directly to avoid double counting
        const totalPaid = invoiceAmountPaid.totalAmountPaid || 0;
        const totalExpensesFinal = expenses.totalExpenses || 0;

        // Use actual paid amount as revenue for calculations
        const actualRevenue = totalPaid;

        res.json({
            totalRevenue: totalRevenue, // Return total invoiced amount as revenue
            totalCollected: totalPaid, // Return actual collections
            totalCollections: totalPaid, // Alias for collections
            collections: totalPaid, // Alias for collections
            totalOutstanding: revenue.totalOutstanding || 0,
            totalPaid: totalPaid,
            totalOverdue: revenue.totalOverdue || 0,
            totalCostOfGoodsSold: totalCogs,
            grossProfit: actualRevenue - totalCogs,
            grossMargin: actualRevenue > 0 ? ((actualRevenue - totalCogs) / actualRevenue) * 100 : 0,
            operatingExpenses: totalExpensesFinal,
            netProfit: (actualRevenue - totalCogs) - totalExpensesFinal,
            netMargin: actualRevenue > 0 ? (((actualRevenue - totalCogs) - totalExpensesFinal) / actualRevenue) * 100 : 0,
            averageInvoiceValue: revenue.averageInvoiceValue || 0,
            collectionRate: totalRevenue > 0 ? (totalPaid / totalRevenue) * 100 : 0
        });
    } catch (error) {
        console.error('Error in getFinancialSummary:', error);
        res.status(500).json({ success: false, message: 'Error fetching financial summary' });
    }
});

exports.getAgingReport = asyncHandler(async (req, res) => {
    try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

        const agingData = await MedicalInvoice.aggregate([
            { $match: { balance: { $gt: 0 } } }, // Only unpaid invoices
            {
                $group: {
                    _id: null,
                    current: {
                        $sum: {
                            $cond: [
                                { $gte: ['$dueDate', thirtyDaysAgo] },
                                '$balance',
                                0
                            ]
                        }
                    },
                    days30: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $lt: ['$dueDate', thirtyDaysAgo] },
                                        { $gte: ['$dueDate', sixtyDaysAgo] }
                                    ]
                                },
                                '$balance',
                                0
                            ]
                        }
                    },
                    days60: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $lt: ['$dueDate', sixtyDaysAgo] },
                                        { $gte: ['$dueDate', ninetyDaysAgo] }
                                    ]
                                },
                                '$balance',
                                0
                            ]
                        }
                    },
                    days90: {
                        $sum: {
                            $cond: [
                                { $lt: ['$dueDate', ninetyDaysAgo] },
                                '$balance',
                                0
                            ]
                        }
                    },
                    over90: {
                        $sum: {
                            $cond: [
                                { $lt: ['$dueDate', ninetyDaysAgo] },
                                '$balance',
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        const result = agingData[0] || {};

        res.json({
            current: result.current || 0,
            days30: result.days30 || 0,
            days60: result.days60 || 0,
            days90: result.days90 || 0,
            over90: result.over90 || 0
        });
    } catch (error) {
        console.error('Error in getAgingReport:', error);
        res.status(500).json({ success: false, message: 'Error fetching aging report' });
    }
});

exports.getMonthlyData = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    // Parse dates with defaults
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    try {
        // Get monthly revenue data
        const monthlyRevenue = await MedicalInvoice.aggregate([
            { $match: { issueDate: { $gte: start, $lte: end } } },
            {
                $group: {
                    _id: {
                        year: { $year: '$issueDate' },
                        month: { $month: '$issueDate' }
                    },
                    revenue: { $sum: '$total' },
                    paid: { $sum: '$amountPaid' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Get monthly expense data
        const OperatingExpense = require('../models/OperatingExpense');
        const monthlyExpenses = await OperatingExpense.aggregate([
            { $match: { expenseDate: { $gte: start, $lte: end } } },
            {
                $group: {
                    _id: {
                        year: { $year: '$expenseDate' },
                        month: { $month: '$expenseDate' }
                    },
                    expenses: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Combine revenue and expense data
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];

        const monthlyData = [];
        const revenueMap = new Map();
        const expenseMap = new Map();

        // Create maps for easy lookup
        monthlyRevenue.forEach(item => {
            const key = `${item._id.year}-${item._id.month}`;
            revenueMap.set(key, item);
        });

        monthlyExpenses.forEach(item => {
            const key = `${item._id.year}-${item._id.month}`;
            expenseMap.set(key, item);
        });

        // Generate monthly data for the date range
        const startMonth = start.getMonth() + 1;
        const startYear = start.getFullYear();
        const endMonth = end.getMonth() + 1;
        const endYear = end.getFullYear();

        for (let year = startYear; year <= endYear; year++) {
            const startM = year === startYear ? startMonth : 1;
            const endM = year === endYear ? endMonth : 12;

            for (let month = startM; month <= endM; month++) {
                const key = `${year}-${month}`;
                const revenueData = revenueMap.get(key) || {};
                const expenseData = expenseMap.get(key) || {};

                monthlyData.push({
                    month: `${monthNames[month - 1]} ${year}`,
                    revenue: revenueData.revenue || 0,
                    expenses: expenseData.expenses || 0,
                    netProfit: (revenueData.revenue || 0) - (expenseData.expenses || 0),
                    invoiceCount: revenueData.count || 0,
                    expenseCount: expenseData.count || 0
                });
            }
        }

        res.json(monthlyData);
    } catch (error) {
        console.error('Error in getMonthlyData:', error);
        res.status(500).json({ success: false, message: 'Error fetching monthly data' });
    }
});

exports.getRevenueByService = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    // Parse dates with defaults
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    try {
        const revenueByService = await MedicalInvoice.aggregate([
            { $match: { issueDate: { $gte: start, $lte: end } } },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.description',
                    revenue: { $sum: '$items.total' },
                    quantity: { $sum: '$items.quantity' },
                    invoiceCount: { $sum: 1 }
                }
            },
            { $sort: { revenue: -1 } },
            { $limit: 20 } // Top 20 services
        ]);

        const formattedData = revenueByService.map(item => ({
            service: item._id || 'Unknown Service',
            revenue: item.revenue || 0,
            quantity: item.quantity || 0,
            invoiceCount: item.invoiceCount || 0
        }));

        res.json(formattedData);
    } catch (error) {
        console.error('Error in getRevenueByService:', error);
        res.status(500).json({ success: false, message: 'Error fetching revenue by service' });
    }
});

exports.getPaymentMethods = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    // Parse dates with defaults
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    try {
        const paymentMethods = await MedicalInvoice.aggregate([
            { $match: { issueDate: { $gte: start, $lte: end } } },
            { $unwind: '$payments' },
            { $match: { 'payments.date': { $gte: start, $lte: end } } },
            {
                $group: {
                    _id: '$payments.method',
                    amount: { $sum: '$payments.amount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { amount: -1 } }
        ]);

        const formattedData = paymentMethods.map(item => ({
            method: item._id || 'Unknown',
            amount: item.amount || 0,
            count: item.count || 0
        }));

        res.json(formattedData);
    } catch (error) {
        console.error('Error in getPaymentMethods:', error);
        res.status(500).json({ success: false, message: 'Error fetching payment methods' });
    }
});

exports.getUnpaidCardPayments = asyncHandler(async (req, res) => {
    // Mock unpaid card payments
    res.json([
        { id: '1', patient: 'John Doe', amount: 500 },
        { id: '2', patient: 'Jane Smith', amount: 750 }
    ]);
});

// New function to add a payment to an invoice
exports.addPaymentToInvoice = asyncHandler(async (req, res) => {
    const { invoiceId } = req.params;
    let { amount, paymentMethod, transactionId, notes } = req.body;

    console.log(`[addPaymentToInvoice] Received payment request for invoice ${invoiceId}`);
    console.log(`[addPaymentToInvoice] Request body:`, req.body);
    console.log(`[addPaymentToInvoice] Amount: ${amount}, Method: ${paymentMethod}`);

    // Enhanced validation logging
    console.log(`[addPaymentToInvoice] Validation check - Amount: ${amount}, Type: ${typeof amount}, IsNaN: ${isNaN(amount)}, IsValid: ${amount && !isNaN(amount) && amount > 0}`);
    console.log(`[addPaymentToInvoice] Validation check - PaymentMethod: ${paymentMethod}, Type: ${typeof paymentMethod}, IsValid: ${paymentMethod && typeof paymentMethod === 'string'}`);

    // 1. Find the invoice using MedicalInvoice model
    console.log(`[addPaymentToInvoice] Step 1: Finding invoice ${invoiceId}...`);
    const invoice = await MedicalInvoice.findById(invoiceId);

    if (!invoice) {
        console.log(`[addPaymentToInvoice] Invoice ${invoiceId} not found.`);
        return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    console.log(`[addPaymentToInvoice] Step 1: Invoice found. Current balance: ${invoice.balance}, Total: ${invoice.total}, AmountPaid: ${invoice.amountPaid}`);

    // 1.5. Recalculate balance consistently to ensure accuracy and fix data inconsistencies
    const totalPayments = (invoice.payments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const calculatedAmountPaid = Math.max(0, invoice.amountPaid || 0);
    const actualAmountPaid = Math.max(totalPayments, calculatedAmountPaid);
    const expectedBalance = Math.max(0, (invoice.total || 0) - actualAmountPaid);

    // Check for data inconsistency and log detailed information
    const balanceInconsistency = Math.abs(invoice.balance - expectedBalance) > 0.01;

    console.log(`[addPaymentToInvoice] Balance recalculation:`, {
        invoiceTotal: invoice.total,
        storedAmountPaid: invoice.amountPaid,
        paymentsArrayTotal: totalPayments,
        actualAmountPaid: actualAmountPaid,
        storedBalance: invoice.balance,
        expectedBalance: expectedBalance,
        hasInconsistency: balanceInconsistency,
        inconsistencyAmount: invoice.balance - expectedBalance
    });

    // Always update to the correct calculated values to fix data inconsistencies
    if (balanceInconsistency) {
        console.log(`[addPaymentToInvoice] ⚠️  DATA INCONSISTENCY DETECTED: Stored balance ${invoice.balance} does not match calculated balance ${expectedBalance}`);
        console.log(`[addPaymentToInvoice] 🔧 FIXING: Updating invoice balance from ${invoice.balance} to ${expectedBalance}`);
    }

    // Update balance to the correct calculated value
    invoice.balance = expectedBalance;
    invoice.amountPaid = actualAmountPaid;

    // Save the corrected invoice to fix data inconsistency
    if (balanceInconsistency) {
        console.log(`[addPaymentToInvoice] 💾 Saving corrected invoice data...`);
        await invoice.save();
        console.log(`[addPaymentToInvoice] ✅ Invoice data corrected and saved`);
    }

    // 2. Validate payment amount against outstanding balance
    console.log(`[addPaymentToInvoice] Step 2: Validating payment amount...`);
    try {
        amount = Number(amount);
        console.log(`[addPaymentToInvoice] Amount conversion: ${amount} (type: ${typeof amount})`);

        if (!amount || isNaN(amount) || amount <= 0) {
            console.log(`[addPaymentToInvoice] Validation failed: Amount <= 0`);
            return res.status(400).json({
                success: false,
                message: 'Payment amount must be positive.',
                error: 'validation_error',
                details: {
                    amount: amount,
                    type: typeof amount,
                    isNaN: isNaN(amount),
                    isZero: amount === 0
                }
            });
        }
    } catch (validationError) {
        console.error(`[addPaymentToInvoice] Validation error:`, validationError);
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            error: 'validation_error',
            details: validationError.message
        });
    }

    // Use the corrected balance for validation
    const outstandingBalance = expectedBalance;
    console.log(`[addPaymentToInvoice] Outstanding balance calculation:`, {
        invoiceBalance: invoice.balance,
        invoiceTotal: invoice.total,
        invoiceAmountPaid: invoice.amountPaid,
        actualAmountPaid: actualAmountPaid,
        outstandingBalance: outstandingBalance,
        paymentAmount: amount
    });

    // Add small tolerance for floating point precision issues
    const tolerance = 0.01;

    // ENHANCED PAYMENT VALIDATION - More flexible for partial payments
    console.log(`[addPaymentToInvoice] Payment validation: amount=${amount}, outstandingBalance=${outstandingBalance}, invoiceTotal=${invoice.total}`);

    // Allow payment if:
    // 1. Amount matches outstanding balance (exact payment)
    // 2. Amount is less than outstanding balance (partial payment)
    // 3. Amount is more than outstanding balance but less than or equal to invoice total (overpayment)
    if (amount <= invoice.total + tolerance) {
        console.log(`[addPaymentToInvoice] Payment amount is valid: ${amount} <= ${invoice.total}`);

        // Log the payment type
        if (Math.abs(amount - outstandingBalance) <= tolerance) {
            console.log(`[addPaymentToInvoice] Exact payment: ${amount} ETB`);
        } else if (amount < outstandingBalance) {
            console.log(`[addPaymentToInvoice] Partial payment: ${amount} ETB (balance: ${outstandingBalance} ETB)`);
        } else {
            console.log(`[addPaymentToInvoice] Overpayment: ${amount} ETB (balance: ${outstandingBalance} ETB, total: ${invoice.total} ETB)`);
        }
    } else {
        // Payment exceeds invoice total
        const errorMessage = `Payment amount ${amount} ETB exceeds invoice total ${invoice.total} ETB. Maximum payable amount is ${invoice.total} ETB.`;

        console.log(`[addPaymentToInvoice] Validation failed: ${errorMessage}`);

        return res.status(400).json({
            success: false,
            message: errorMessage,
            suggestedAmount: invoice.total,
            details: {
                paymentAmount: amount,
                outstandingBalance: outstandingBalance,
                invoiceTotal: invoice.total,
                invoiceAmountPaid: actualAmountPaid,
                paymentsTotal: totalPayments,
                tolerance: tolerance,
                dataInconsistencyFixed: balanceInconsistency
            }
        });
    }
    console.log(`[addPaymentToInvoice] Step 2: Payment amount validated.`);

    // 3. Create a new payment record in the invoice's payments array (MedicalInvoice has embedded payments)
    console.log(`[addPaymentToInvoice] Step 3: Creating new payment record...`);
    console.log(`[addPaymentToInvoice] Payment method being used: ${paymentMethod}`);

    const newPayment = {
        amount: amount,
        method: paymentMethod,
        reference: transactionId || '',
        date: new Date(),
        notes: notes || '',
        processedBy: req.user._id
    };

    // Add bank transfer details if payment method is bank_transfer
    if (paymentMethod === 'bank_transfer') {
        const { bankName, accountNumber, accountHolderName, branchName, swiftCode, transferType } = req.body;

        // Auto-detect bank name from payment method if not provided
        let detectedBankName = bankName;
        if (!detectedBankName || detectedBankName === 'Not specified') {
            const method = paymentMethod.toLowerCase();
            if (method.includes('dashen')) {
                detectedBankName = 'Dashen Bank';
            } else if (method.includes('abyssinia')) {
                detectedBankName = 'Abyssinia Bank';
            } else if (method.includes('cbe') || method.includes('commercial')) {
                detectedBankName = 'Commercial Bank of Ethiopia';
            } else {
                detectedBankName = 'Bank Transfer';
            }
        }

        // Only add bank details if we have an account number or if explicitly required
        if (accountNumber && accountNumber.trim() !== '') {
            newPayment.bankDetails = {
                bankName: detectedBankName,
                accountNumber: accountNumber,
                accountHolderName: accountHolderName || '',
                branchName: branchName || '',
                swiftCode: swiftCode || '',
                transferType: transferType || 'domestic'
            };
            console.log(`[addPaymentToInvoice] Added bank transfer details:`, newPayment.bankDetails);
        } else {
            // For bank transfers without account details, just add minimal required info
            newPayment.bankDetails = {
                bankName: detectedBankName,
                accountNumber: 'PENDING', // Temporary placeholder
                accountHolderName: accountHolderName || 'Not specified',
                branchName: branchName || '',
                swiftCode: swiftCode || '',
                transferType: transferType || 'domestic'
            };
            console.log(`[addPaymentToInvoice] Added minimal bank transfer details (account pending):`, newPayment.bankDetails);
        }
    }

    // Add card payment details if payment method is card
    if (paymentMethod === 'card') {
        const { cardType, lastFourDigits, cardHolderName } = req.body;
        newPayment.cardDetails = {
            cardType: cardType || 'other',
            lastFourDigits: lastFourDigits || '',
            cardHolderName: cardHolderName || ''
        };
        console.log(`[addPaymentToInvoice] Added card payment details:`, newPayment.cardDetails);
    }

    console.log(`[addPaymentToInvoice] Created payment object:`, newPayment);

    // Add payment to invoice's payments array
    invoice.payments.push(newPayment);
    console.log(`[addPaymentToInvoice] Step 3: Payment added to invoice payments array`);

    // 4. Update invoice balance and status
    console.log(`[addPaymentToInvoice] Step 4: Updating invoice balance and status...`);

    // Calculate new values
    const newAmountPaid = (invoice.amountPaid || 0) + amount;
    let newBalance = Math.max(0, invoice.total - newAmountPaid);

    console.log(`[addPaymentToInvoice] Balance calculation:`, {
        oldAmountPaid: invoice.amountPaid,
        paymentAmount: amount,
        newAmountPaid: newAmountPaid,
        invoiceTotal: invoice.total,
        oldBalance: invoice.balance,
        newBalance: newBalance
    });

    // Update invoice fields
    invoice.amountPaid = newAmountPaid;
    invoice.balance = newBalance;

    // Set the payment method on the invoice to avoid validation error
    invoice.paymentMethod = paymentMethod;

    // Check if this is an insurance patient with eligible services
    console.log(`[addPaymentToInvoice] Checking insurance eligibility...`);
    const billingService = require('../services/billingService');
    const isInsuranceEligible = await billingService.isInsurancePatientWithEligibleServices(invoice);

    // Update status based on insurance eligibility or balance
    if (isInsuranceEligible) {
        console.log(`[addPaymentToInvoice] ✅ INSURANCE PATIENT - Any payment accepted as full payment`);
        console.log(`[addPaymentToInvoice] 🔍 BEFORE INSURANCE UPDATE - Status: ${invoice.status}, Balance: ${invoice.balance}, AmountPaid: ${invoice.amountPaid}`);
        invoice.status = 'paid';
        invoice.paidDate = new Date();
        invoice.balance = 0;
        invoice.amountPaid = invoice.total;
        newBalance = 0;
        console.log(`[addPaymentToInvoice] 🔍 AFTER INSURANCE UPDATE - Status: ${invoice.status}, Balance: ${invoice.balance}, AmountPaid: ${invoice.amountPaid}`);
    } else if (newBalance <= 0) {
        console.log(`[addPaymentToInvoice] 🔍 BALANCE ZERO - Setting status to paid`);
        invoice.status = 'paid';
        invoice.paidDate = new Date();
    } else {
        console.log(`[addPaymentToInvoice] 🔍 PARTIAL PAYMENT - Setting status to partial`);
        invoice.status = 'partial';
    }

    invoice.updatedAt = new Date();

    // 5. Save the updated invoice
    console.log(`[addPaymentToInvoice] Step 5: Saving updated invoice...`);
    console.log(`[addPaymentToInvoice] 🔍 BEFORE SAVE - Status: ${invoice.status}, Balance: ${invoice.balance}, AmountPaid: ${invoice.amountPaid}`);
    await invoice.save();
    console.log(`[addPaymentToInvoice] 🔍 AFTER SAVE - Status: ${invoice.status}, Balance: ${invoice.balance}, AmountPaid: ${invoice.amountPaid}`);
    console.log(`[addPaymentToInvoice] Step 5: Invoice saved successfully`);

    // 5.4. If this is a card-related invoice that just became paid, activate/refresh the card & queue the patient
    if (invoice.status === 'paid' && invoice.items && invoice.items.length > 0) {
        try {
            const PatientCard = require('../models/PatientCard');
            const Patient = require('../models/Patient');

            let patientQueuedFromCardPayment = false;

            // Scan all items for card renewals
            for (const item of invoice.items) {
                if (item.category !== 'card') {
                    continue;
                }

                const cardId = item.metadata && item.metadata.patientCardId;

                if (cardId) {
                    // New flow: we know exactly which PatientCard to renew
                    const card = await PatientCard.findById(cardId);
                    if (card) {
                        const lastPayment = invoice.payments && invoice.payments.length > 0 ? invoice.payments[invoice.payments.length - 1] : null;
                        const payAmount = lastPayment ? lastPayment.amount : (item.total || invoice.total);
                        const payMethod = lastPayment ? lastPayment.method : (invoice.paymentMethod || 'cash');

                        // Renew the card record
                        await card.renew({ amount: payAmount, paymentMethod: payMethod, transactionId: null });

                        // Update Patient status to 'waiting' and refresh card info
                        const now = new Date();
                        await Patient.findByIdAndUpdate(card.patient, {
                            // Use lowercase 'waiting' to match Patient schema enum and frontend checks
                            status: 'waiting',
                            cardStatus: 'active',
                            cardIssueDate: now,
                            cardExpiryDate: card.expiryDate,
                            lastUpdated: now
                        });

                        patientQueuedFromCardPayment = true;
                        console.log(`✅ [Billing] Card ${card.cardNumber} activated and patient ${card.patient} moved to queue after payment.`);
                    }
                }
            }

            // Legacy / fallback flow:
            // Some historic card invoices don't have metadata.patientCardId.
            // For these, once the invoice is fully paid we still want to move the patient to the queue.
            if (!patientQueuedFromCardPayment) {
                const patientId = invoice.patient;
                if (patientId) {
                    const now = new Date();
                    await Patient.findByIdAndUpdate(patientId, {
                        status: 'waiting',
                        lastUpdated: now
                    });
                    console.log(`✅ [Billing] Legacy card invoice paid; patient ${patientId} moved to queue.`);
                }
            }
        } catch (cardErr) {
            console.error('[addPaymentToInvoice] Error in card renewal post-payment logic:', cardErr);
        }
    }

    // 5.5. Update associated lab orders payment status
    console.log(`[addPaymentToInvoice] Step 5.5: Updating lab orders payment status...`);
    try {
        const LabOrder = require('../models/LabOrder');

        // Find lab orders linked to this invoice
        const linkedLabOrders = await LabOrder.find({
            invoiceId: invoice._id,
            paymentStatus: { $ne: 'paid' } // Only update non-paid orders
        });

        if (linkedLabOrders.length > 0) {
            console.log(`[addPaymentToInvoice] Found ${linkedLabOrders.length} lab orders linked to invoice ${invoice.invoiceNumber}`);

            // For insurance patients, always mark as paid regardless of balance
            const paymentStatus = isInsuranceEligible ? 'paid' : (invoice.balance <= 0 ? 'paid' : 'partially_paid');
            const orderStatus = isInsuranceEligible ? 'Ordered' : (invoice.balance <= 0 ? 'Ordered' : 'Pending Payment');

            for (const labOrder of linkedLabOrders) {
                console.log(`[addPaymentToInvoice] Updating lab order: ${labOrder.testName} to ${paymentStatus}`);

                labOrder.paymentStatus = paymentStatus;
                labOrder.status = orderStatus;
                if (paymentStatus === 'paid') {
                    labOrder.paidAt = new Date();
                }

                await labOrder.save();
            }

            console.log(`[addPaymentToInvoice] Successfully updated ${linkedLabOrders.length} lab orders`);
        } else {
            console.log(`[addPaymentToInvoice] No lab orders found linked to this invoice`);
        }
    } catch (labOrderError) {
        console.error(`[addPaymentToInvoice] Warning: Failed to update lab orders:`, labOrderError);
        // Don't fail the payment if lab order update fails
    }

    // 6. Update payment notifications
    console.log(`[addPaymentToInvoice] Step 6: Updating payment notifications...`);
    try {
        const { updatePaymentNotifications } = require('../utils/notificationUpdater');

        // Determine payment status - for insurance patients, always use invoice status
        const paymentStatus = isInsuranceEligible ? invoice.status : (invoice.balance <= 0 ? 'paid' : 'partial');

        // Update notifications for this invoice
        await updatePaymentNotifications(
            invoice._id,
            paymentStatus,
            amount
        );

        console.log(`[addPaymentToInvoice] Step 6: Payment notifications updated successfully`);
    } catch (notificationError) {
        console.error(`[addPaymentToInvoice] Warning: Failed to update notifications:`, notificationError);
        // Don't fail the payment if notification update fails
    }

    // 6.5. Update associated prescription payment status
    // Must be visible to step 6.7 nurse-task sync (block scope bug previously left `prescriptions` undefined there)
    let prescriptionsLinkedToInvoice = [];
    console.log(`[addPaymentToInvoice] Step 6.5: Updating prescription payment status...`);
    try {
        const Prescription = require('../models/Prescription');

        // Find prescriptions associated with this invoice (linked on prescription or on line item metadata)
        const prescriptionIdsFromItems = [...new Set(
            (invoice.items || [])
                .map((item) => item.metadata && item.metadata.prescriptionId)
                .filter((id) => id != null && String(id).length > 0)
        )];

        prescriptionsLinkedToInvoice = await Prescription.find({
            $or: [
                { invoiceId: invoice._id },
                { 'medications.invoiceId': invoice._id },
                ...(prescriptionIdsFromItems.length > 0 ? [{ _id: { $in: prescriptionIdsFromItems } }] : [])
            ]
        });

        console.log(`[addPaymentToInvoice] Found ${prescriptionsLinkedToInvoice.length} prescriptions to update`);

        for (const prescription of prescriptionsLinkedToInvoice) {
            // Update prescription payment status based on invoice status
            const prescriptionPaymentStatus = invoice.balance <= 0 ? 'paid' : 'partial';

            // Update prescription fields
            prescription.paymentStatus = prescriptionPaymentStatus;
            prescription.status = prescriptionPaymentStatus === 'paid' ? 'Active' : prescription.status;

            if (prescriptionPaymentStatus === 'paid') {
                prescription.paidAt = new Date();
            }

            // Update payment authorization if it exists
            if (prescription.paymentAuthorization) {
                prescription.paymentAuthorization.paymentStatus = prescriptionPaymentStatus === 'paid' ? 'fully_paid' : 'partial';
                prescription.paymentAuthorization.lastUpdated = new Date();

                // If fully paid, authorize all doses
                if (prescriptionPaymentStatus === 'paid') {
                    const totalDoses = prescription.quantity || 1;
                    const totalDays = prescription.duration ? parseInt(prescription.duration) : 7;
                    prescription.paymentAuthorization.paidDays = totalDays;
                    prescription.paymentAuthorization.totalDays = totalDays;
                    prescription.paymentAuthorization.authorizedDoses = totalDoses;
                    prescription.paymentAuthorization.unauthorizedDoses = 0;
                    prescription.paymentAuthorization.outstandingAmount = 0;
                }
            }

            await prescription.save();
            console.log(`[addPaymentToInvoice] Updated prescription ${prescription._id} payment status to ${prescriptionPaymentStatus}`);
        }

        console.log(`[addPaymentToInvoice] Step 6.5: Prescription payment status updated successfully`);

    } catch (prescriptionError) {
        console.error(`[addPaymentToInvoice] Step 6.5: Error updating prescription payment status:`, prescriptionError);
        // Continue with the response even if prescription updates fail
    }

    // 6.6. Update lab order payment status for lab service invoices
    console.log(`[addPaymentToInvoice] Step 6.6: Updating lab order payment status...`);
    try {
        const LabOrder = require('../models/LabOrder');

        // Check if this invoice contains lab services
        const hasLabServices = invoice.items.some(item =>
            item.metadata &&
            (item.metadata.category === 'lab' || item.metadata.labOrderId)
        );

        if (hasLabServices) {
            console.log(`[addPaymentToInvoice] Found lab services in invoice, updating lab orders...`);

            // Find lab orders linked to this invoice
            const labOrders = await LabOrder.find({
                'metadata.invoiceId': invoice._id
            });

            if (labOrders.length > 0) {
                console.log(`[addPaymentToInvoice] Found ${labOrders.length} lab orders to update`);

                // Update lab order payment status based on invoice payment status
                const labOrderUpdateData = {
                    paymentStatus: invoice.status === 'paid' ? 'paid' : 'partial',
                    // Align with production convention: once paid, move to Processing
                    status: invoice.status === 'paid' ? 'Processing' : 'Pending Payment',
                    updatedAt: new Date()
                };

                if (invoice.status === 'paid') {
                    labOrderUpdateData.paidAt = new Date();
                    labOrderUpdateData.paymentMethod = paymentMethod;
                    labOrderUpdateData.transactionId = transactionId;
                    labOrderUpdateData.paymentNotes = notes;
                }

                await LabOrder.updateMany(
                    { 'metadata.invoiceId': invoice._id },
                    labOrderUpdateData
                );

                console.log(`[addPaymentToInvoice] Updated ${labOrders.length} lab orders to ${labOrderUpdateData.paymentStatus}`);
            } else {
                console.log(`[addPaymentToInvoice] No lab orders found for this invoice`);
            }
        } else {
            console.log(`[addPaymentToInvoice] No lab services found in this invoice`);
        }

        console.log(`[addPaymentToInvoice] Step 6.6: Lab order payment status updated successfully`);

    } catch (labOrderError) {
        console.error(`[addPaymentToInvoice] Step 6.6: Error updating lab order payment status:`, labOrderError);
        // Continue with the response even if lab order updates fail
    }

    // 6.7. Update nurse task status for injection service invoices
    console.log(`[addPaymentToInvoice] Step 6.7: Updating nurse task status...`);
    try {
        const NurseTask = require('../models/NurseTask');

        // Check if this invoice contains injection services
        const hasInjectionServices = invoice.items.some(item =>
            item.metadata &&
            (item.metadata.category === 'injection' || item.metadata.nurseTaskId)
        );

        if (hasInjectionServices) {
            console.log(`[addPaymentToInvoice] Found injection services in invoice, updating nurse tasks...`);

            // Find nurse tasks linked to this invoice
            const nurseTasks = await NurseTask.find({
                'metadata.invoiceId': invoice._id
            });

            if (nurseTasks.length > 0) {
                console.log(`[addPaymentToInvoice] Found ${nurseTasks.length} nurse tasks to update`);

                // Update nurse task status based on invoice payment status
                const nurseTaskUpdateData = {
                    status: invoice.status === 'paid' ? 'READY' : 'PENDING',
                    updatedAt: new Date()
                };

                // Use guaranteed payment sync for consistent status
                const GuaranteedPaymentSync = require('../utils/guaranteedPaymentSync');
                const PaymentStatusNormalizer = require('../utils/paymentStatusNormalizer');

                const normalizedStatus = PaymentStatusNormalizer.normalize(invoice.status);
                nurseTaskUpdateData.paymentStatus = normalizedStatus;
                nurseTaskUpdateData.paidAt = new Date();
                nurseTaskUpdateData.paymentMethod = paymentMethod;
                nurseTaskUpdateData.paymentNotes = notes;

                await NurseTask.updateMany(
                    { 'metadata.invoiceId': invoice._id },
                    nurseTaskUpdateData
                );

                console.log(`[addPaymentToInvoice] Updated ${nurseTasks.length} nurse tasks to ${nurseTaskUpdateData.status}`);
            } else {
                console.log(`[addPaymentToInvoice] No nurse tasks found for this invoice`);
            }
        } else {
            console.log(`[addPaymentToInvoice] No injection services found in this invoice`);
        }

        console.log(`[addPaymentToInvoice] Step 6.7: Nurse task status updated successfully`);

    } catch (nurseTaskError) {
        console.error(`[addPaymentToInvoice] Step 6.7: Error updating nurse task status:`, nurseTaskError);
        // Continue with the response even if nurse task updates fail
    }

    // 6.7. Update associated nurse tasks
    console.log(`[addPaymentToInvoice] Step 6.6: Updating nurse tasks...`);
    try {
        const { processPaymentAndCreateNurseTasks } = require('../utils/nurseTaskCreation');
        const Patient = require('../models/Patient');
        
        // Fetch patient for better task creation (optional but recommended)
        const patientData = await Patient.findById(invoice.patient || invoice.patientId);

        for (const prescription of prescriptionsLinkedToInvoice) {
            console.log(`[addPaymentToInvoice] Syncing nurse tasks for prescription ${prescription._id}`);
            try {
                // processPaymentAndCreateNurseTasks handles both updating existing tasks
                // and creating missing ones for all medications in the prescription
                const syncResult = await processPaymentAndCreateNurseTasks(prescription, patientData);
                console.log(`[addPaymentToInvoice] Task sync results for ${prescription._id}:`, {
                    success: syncResult.success,
                    created: syncResult.tasksCreated,
                    updated: syncResult.tasksSkipped,
                    errors: syncResult.errors.length
                });
            } catch (err) {
                console.error(`[addPaymentToInvoice] Error syncing tasks for prescription ${prescription._id}:`, err);
            }
        }

        console.log(`[addPaymentToInvoice] Step 6.6: Nurse tasks updated successfully`);
    } catch (nurseTaskError) {
        console.error(`[addPaymentToInvoice] Warning: Failed to update nurse tasks:`, nurseTaskError);
        // Don't fail the payment if nurse task update fails
    }

    // 6.8. Send Telegram notification for payment processed
    console.log(`💰 [PAYMENT NOTIFICATION] Step 6.8: Starting payment notification process...`);
    console.log(`💰 [PAYMENT NOTIFICATION] Invoice status: ${invoice.status}, Amount: ${amount}, Balance: ${invoice.balance}`);
    try {
        const notificationService = require('../services/notificationService');
        const Patient = require('../models/Patient');

        console.log(`💰 [PAYMENT NOTIFICATION] Getting patient information for ID: ${invoice.patientId}`);
        // Get patient information - invoice.patientId might be a patient ID string or ObjectId
        let patient = null;
        if (invoice.patientId) {
            // Try to find by patientId field first (for patient ID strings like "P44324-4324")
            patient = await Patient.findOne({ patientId: invoice.patientId });
            // If not found and it looks like an ObjectId, try by _id
            if (!patient && /^[0-9a-fA-F]{24}$/.test(invoice.patientId)) {
                patient = await Patient.findById(invoice.patientId);
            }
            // Also try invoice.patient if it exists
            if (!patient && invoice.patient) {
                if (typeof invoice.patient === 'string' && /^[0-9a-fA-F]{24}$/.test(invoice.patient)) {
                    patient = await Patient.findById(invoice.patient);
                } else if (typeof invoice.patient === 'object' && invoice.patient.patientId) {
                    patient = await Patient.findOne({ patientId: invoice.patient.patientId });
                }
            }
        }
        const patientName = patient ? `${patient.firstName} ${patient.lastName}` : (invoice.patientName || 'Unknown Patient');
        console.log(`💰 [PAYMENT NOTIFICATION] Patient name: ${patientName}`);

        // Determine payment type
        const isFullPayment = invoice.status === 'paid';
        const paymentType = isFullPayment ? 'Full Payment' : 'Partial Payment';
        console.log(`💰 [PAYMENT NOTIFICATION] Payment type: ${paymentType}, Full payment: ${isFullPayment}`);

        const notificationData = {
            amount: amount,
            type: paymentType,
            patientName: patientName,
            age: patient ? patient.age : undefined,
            gender: patient ? patient.gender : undefined,
            invoiceNumber: invoice.invoiceNumber || invoice._id.toString(),
            action: isFullPayment
                ? `Invoice ${invoice.invoiceNumber} has been fully paid.`
                : `Partial payment of ETB ${amount.toLocaleString()} received. Remaining balance: ETB ${invoice.balance.toLocaleString()}.`,
            paymentMethod: paymentMethod,
            remainingBalance: invoice.balance
        };

        console.log(`💰 [PAYMENT NOTIFICATION] Sending notification with data:`, JSON.stringify(notificationData, null, 2));

        // Send billing update notification
        const notificationResult = await notificationService.sendNotification(
            'billingUpdate',
            notificationData
        );

        console.log(`💰 [PAYMENT NOTIFICATION] Notification result:`, JSON.stringify(notificationResult, null, 2));
        console.log(`✅ [addPaymentToInvoice] Step 6.8: Telegram notification sent successfully`);
    } catch (notificationError) {
        console.error(`❌ [addPaymentToInvoice] Step 6.8: Error sending Telegram notification:`, notificationError);
        console.error(`❌ [addPaymentToInvoice] Step 6.8: Error stack:`, notificationError.stack);
        // Don't fail the payment if notification fails
    }

    // 7. Return success response with updated invoice data
    console.log(`[addPaymentToInvoice] Step 7: Returning success response...`);
    console.log(`[addPaymentToInvoice] 🔍 FINAL CHECK BEFORE RESPONSE - Status: ${invoice.status}, Balance: ${invoice.balance}, AmountPaid: ${invoice.amountPaid}`);
    console.log(`[addPaymentToInvoice] Final invoice values - Status: ${invoice.status}, Balance: ${invoice.balance}, AmountPaid: ${invoice.amountPaid}`);

    const responseData = {
        success: true,
        message: 'Payment processed successfully',
        data: {
            invoiceId: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            newBalance: invoice.balance,
            newStatus: invoice.status,
            paymentStatus: invoice.status, // Use the actual invoice status (which includes insurance logic)
            amountPaid: amount,
            totalPaid: invoice.amountPaid,
            notificationsUpdated: true
        }
    };

    console.log(`[addPaymentToInvoice] Payment completed successfully:`, responseData);

    // 8. Check for imaging services and create imaging orders if needed
    try {
        const { createImagingOrdersFromPayment } = require('../utils/createImagingOrderFromPayment');
        const imagingOrderResult = await createImagingOrdersFromPayment(invoice._id, amount);
        if (imagingOrderResult.created > 0) {
            console.log(`✅ [addPaymentToInvoice] Created ${imagingOrderResult.created} imaging orders`);
            responseData.data.imagingOrdersCreated = imagingOrderResult.created;
        }
    } catch (imagingError) {
        console.error('⚠️ [addPaymentToInvoice] Warning: Failed to create imaging orders:', imagingError);
        // Don't fail the payment processing if imaging order creation fails
    }

    // 9. GUARANTEED PAYMENT SYNC - Root cause fix
    try {
        const GuaranteedPaymentSync = require('../utils/guaranteedPaymentSync');
        await GuaranteedPaymentSync.syncPaymentStatus(invoice._id, session);
        console.log('✅ [GUARANTEED SYNC] Payment status synchronized across all entities');
    } catch (syncError) {
        console.error('❌ [GUARANTEED SYNC] Error synchronizing payment status:', syncError);
        // Don't fail the payment, but log the error
    }

    // 10. Send notifications for lab orders if payment triggers lab processing
    try {
        const notificationService = require('../services/notificationService');
        const telegramService = require('../services/telegramService');

        // Initialize telegram service
        await telegramService.initialize();

        if (telegramService.isInitialized) {
            console.log('📱 Checking for lab orders to notify after payment...');

            // Check if this invoice has lab orders
            const LabOrder = require('../models/LabOrder');
            const labOrders = await LabOrder.find({
                invoiceId: invoice._id,
                paymentStatus: 'paid'
            }).populate('patient', 'firstName lastName patientId age gender');

            if (labOrders.length > 0) {
                console.log(`📱 Found ${labOrders.length} paid lab orders, sending notifications...`);

                for (const labOrder of labOrders) {
                    const labNotification = await notificationService.sendNotification(
                        'labOrder',
                        {
                            patientId: labOrder.patient.patientId || labOrder.patient._id,
                            patientName: `${labOrder.patient.firstName} ${labOrder.patient.lastName}`,
                            age: labOrder.patient.age,
                            gender: labOrder.patient.gender,
                            labTests: [{
                                name: labOrder.testName,
                                type: labOrder.patient.specimenType || 'Lab Test'
                            }]
                        }
                    );

                    if (labNotification.success) {
                        console.log(`📱 Lab order notification sent for ${labOrder.testName}`);
                    } else {
                        console.log(`❌ Lab order notification failed for ${labOrder.testName}:`, labNotification.message);
                    }
                }
            } else {
                console.log('📱 No lab orders found for this invoice');
            }
        } else {
            console.log('📱 Telegram bot not initialized, skipping lab order notifications');
        }
    } catch (notificationError) {
        console.error('❌ Error sending lab order notifications after payment:', notificationError);
        // Don't fail payment processing if notification fails
    }

    res.status(200).json(responseData);

    // 10. Mark invoice as paid if balance is zero (async, don't wait)
    if (invoice.balance === 0) {
        invoice.status = 'paid';
        invoice.paidDate = new Date();
        invoice.save().then(() => {
            console.log('🔍 [PAYMENT PROCESS] Invoice marked as paid');
        }).catch(err => {
            console.error('❌ Error marking invoice as paid:', err);
        });
    }

    console.log(`[addPaymentToInvoice] Payment processing completed successfully`);
});

// Process lab payment
exports.processLabPayment = asyncHandler(async (req, res, next) => {
    console.log('[processLabPayment] Processing lab payment:', req.body);

    const { labOrderIds, amount, paymentMethod, transactionId, notes, directPayment } = req.body;

    try {
        console.log('🔍 [processLabPayment] Starting payment processing...');

        // Handle direct payments without specific lab order IDs
        if (directPayment && (!labOrderIds || labOrderIds.length === 0)) {
            console.log('🔄 Processing direct lab payment without specific lab order IDs');

            // Create payment record for direct payment
            const payment = new Payment({
                amount: amount,
                paymentMethod: paymentMethod,
                transactionId: transactionId,
                notes: notes || 'Direct lab payment',
                processedBy: req.user._id,
                processedAt: new Date(),
                type: 'lab_payment',
                relatedIds: []
            });

            console.log('🔍 [processLabPayment] Saving direct payment...');
            await payment.save();
            console.log('🔍 [processLabPayment] Direct payment saved successfully');

            console.log(`✅ Direct lab payment processed successfully`);

            return res.json({
                success: true,
                message: 'Direct lab payment processed successfully',
                data: {
                    paymentId: payment._id,
                    labOrderIds: [],
                    amount: amount,
                    paymentMethod: paymentMethod,
                    processedCount: 0,
                    requestedCount: 0,
                    isDirectPayment: true
                }
            });
        }

        // Validate lab orders exist and are pending payment
        console.log('🔍 [processLabPayment] Searching for lab orders with IDs:', labOrderIds);

        // Add timeout to prevent hanging
        const queryPromise = LabOrder.find({
            _id: { $in: labOrderIds },
            paymentStatus: { $in: ['pending', 'Pending Payment'] }
        });

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Database query timeout')), 10000)
        );

        const labOrders = await Promise.race([queryPromise, timeoutPromise]);
        console.log('🔍 [processLabPayment] Found lab orders:', labOrders.length);

        if (labOrders.length === 0) {
            console.log('⚠️ No pending lab orders found, checking if orders exist with different status...');

            // Check if lab orders exist but with different payment status
            const allOrders = await LabOrder.find({ _id: { $in: labOrderIds } });
            console.log('🔍 [processLabPayment] All orders found:', allOrders.map(o => ({ id: o._id, paymentStatus: o.paymentStatus, status: o.status })));

            if (allOrders.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Lab orders found but are not in pending payment status',
                    foundOrders: allOrders.map(o => ({ id: o._id, paymentStatus: o.paymentStatus, status: o.status }))
                });
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'No lab orders found for the provided IDs',
                    requestedIds: labOrderIds
                });
            }
        }

        if (labOrders.length !== labOrderIds.length) {
            const foundIds = labOrders.map(order => order._id.toString());
            const missingIds = labOrderIds.filter(id => !foundIds.includes(id.toString()));
            console.log(`⚠️ Some lab orders not found or already paid: ${missingIds.join(', ')}`);

            // If some orders are missing, still process the ones we found
            if (labOrders.length > 0) {
                console.log(`✅ Processing ${labOrders.length} found orders out of ${labOrderIds.length} requested`);
            }
        }

        // Calculate total amount for lab orders
        const totalAmount = labOrders.reduce((sum, order) => sum + order.totalPrice, 0);

        if (amount < totalAmount) {
            return res.status(400).json({
                success: false,
                message: `Payment amount (${amount}) is less than required amount (${totalAmount})`
            });
        }

        // Update lab orders to paid status (only the ones that were found)
        const foundLabOrderIds = labOrders.map(order => order._id);
        await LabOrder.updateMany(
            { _id: { $in: foundLabOrderIds } },
            {
                paymentStatus: 'paid',
                status: 'Ordered',
                paidAt: new Date(),
                paymentMethod: paymentMethod,
                transactionId: transactionId,
                paymentNotes: notes
            }
        );

        // Create payment record
        const payment = new Payment({
            amount: amount,
            paymentMethod: paymentMethod,
            transactionId: transactionId,
            notes: notes,
            processedBy: req.user._id,
            processedAt: new Date(),
            type: 'lab_payment',
            relatedIds: foundLabOrderIds
        });

        await payment.save();

        // Update notifications to mark as read
        const Notification = require('../models/Notification');
        await Notification.updateMany(
            {
                type: 'lab_payment_required',
                'data.labOrderIds': { $in: foundLabOrderIds }
            },
            { read: true, readAt: new Date() }
        );

        console.log(`✅ Lab payment processed successfully for ${foundLabOrderIds.length} orders`);

        res.json({
            success: true,
            message: 'Lab payment processed successfully',
            data: {
                paymentId: payment._id,
                labOrderIds: foundLabOrderIds,
                amount: amount,
                paymentMethod: paymentMethod,
                processedCount: foundLabOrderIds.length,
                requestedCount: labOrderIds.length
            }
        });

    } catch (error) {
        console.error('Error processing lab payment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process lab payment',
            error: error.message
        });
    }
});
