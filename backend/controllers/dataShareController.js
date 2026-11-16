const crypto = require('crypto');
const DataShare = require('../models/DataShare');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Invoice = require('../models/Invoice');
const LabOrder = require('../models/LabOrder');
const InventoryItem = require('../models/InventoryItem');

// Helper to escape CSV cell value according to RFC 4180
const escapeCsvCell = (val) => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    if (val instanceof Date) return val.toISOString();
    return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
  }
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

// Convert array of objects into CSV string
const convertToCsv = (items, fields) => {
  if (!fields || !fields.length) {
    if (!items.length) return '';
    fields = Object.keys(items[0]);
  }
  const header = fields.map(escapeCsvCell).join(',');
  const rows = items.map((item) =>
    fields.map((f) => escapeCsvCell(item[f])).join(',')
  );
  return [header, ...rows].join('\r\n');
};

// Build MongoDB query from dataset key and parameters
const fetchDatasetItems = async (dataset, { fields, from, to, filter = {}, limit }) => {
  const query = { ...filter };

  // Apply date range filter
  if (from || to) {
    const dateQuery = {};
    if (from) {
      const fromDate = new Date(from);
      fromDate.setHours(0, 0, 0, 0);
      dateQuery.$gte = fromDate;
    }
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      dateQuery.$lte = toDate;
    }
    // Determine the date field based on dataset
    if (dataset === 'appointments') {
      query.appointmentDateTime = dateQuery;
    } else if (dataset === 'invoices') {
      query.dateIssued = dateQuery;
    } else if (dataset === 'lab-orders') {
      query.orderDateTime = dateQuery;
    } else {
      query.createdAt = dateQuery;
    }
  }

  let items = [];
  const queryLimit = limit ? Number(limit) : 5000;

  switch (dataset) {
    case 'patients': {
      const docs = await Patient.find(query)
        .sort({ createdAt: -1 })
        .limit(queryLimit)
        .lean();
      items = docs.map((p) => ({
        patientId: p.patientId || p._id?.toString(),
        firstName: p.firstName || '',
        lastName: p.lastName || '',
        gender: p.gender || '',
        age: p.age !== undefined ? p.age : '',
        contactNumber: p.contactNumber || p.phone || '',
        email: p.email || '',
        department: p.department || '',
        priority: p.priority || 'Normal',
        createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : '',
      }));
      break;
    }

    case 'appointments': {
      const docs = await Appointment.find(query)
        .populate('patientId', 'firstName lastName patientId')
        .populate('doctorId', 'firstName lastName')
        .sort({ appointmentDateTime: -1 })
        .limit(queryLimit)
        .lean();
      items = docs.map((a) => ({
        patientId: a.patientId?.patientId || a.patientId?._id?.toString() || a.patientId || '',
        patientName: a.patientId ? `${a.patientId.firstName || ''} ${a.patientId.lastName || ''}`.trim() : '',
        doctor: a.doctorId ? `${a.doctorId.firstName || ''} ${a.doctorId.lastName || ''}`.trim() : '',
        appointmentDateTime: a.appointmentDateTime ? new Date(a.appointmentDateTime).toISOString() : '',
        durationMinutes: a.durationMinutes || 30,
        type: a.type || 'Consultation',
        status: a.status || 'Scheduled',
        reason: a.reason || '',
        createdAt: a.createdAt ? new Date(a.createdAt).toISOString() : '',
      }));
      break;
    }

    case 'invoices': {
      const docs = await Invoice.find(query)
        .populate('patient', 'firstName lastName patientId')
        .sort({ createdAt: -1 })
        .limit(queryLimit)
        .lean();
      items = docs.map((inv) => ({
        invoiceNumber: inv.invoiceNumber || inv._id?.toString(),
        patientId: inv.patient?.patientId || inv.patient?._id?.toString() || '',
        patientName: inv.patient ? `${inv.patient.firstName || ''} ${inv.patient.lastName || ''}`.trim() : '',
        dateIssued: inv.dateIssued ? new Date(inv.dateIssued).toISOString() : '',
        status: inv.status || 'Issued',
        paymentStatus: inv.paymentStatus || 'Pending',
        total: inv.total !== undefined ? inv.total : (inv.totalAmount || 0),
        createdAt: inv.createdAt ? new Date(inv.createdAt).toISOString() : '',
      }));
      break;
    }

    case 'lab-orders': {
      const docs = await LabOrder.find(query)
        .populate('patient', 'firstName lastName patientId')
        .sort({ createdAt: -1 })
        .limit(queryLimit)
        .lean();
      items = docs.map((lo) => ({
        patientId: lo.patient?.patientId || lo.patientId || '',
        patientName: lo.patient ? `${lo.patient.firstName || ''} ${lo.patient.lastName || ''}`.trim() : '',
        testName: lo.testName || lo.testType || (lo.tests && lo.tests.map(t => t.name).join('; ')) || 'Diagnostic Panel',
        status: lo.status || 'Pending',
        paymentStatus: lo.paymentStatus || 'Pending',
        orderDateTime: lo.orderDateTime ? new Date(lo.orderDateTime).toISOString() : (lo.createdAt ? new Date(lo.createdAt).toISOString() : ''),
        priority: lo.priority || 'Routine',
        createdAt: lo.createdAt ? new Date(lo.createdAt).toISOString() : '',
      }));
      break;
    }

    case 'inventory': {
      const docs = await InventoryItem.find(query)
        .sort({ createdAt: -1 })
        .limit(queryLimit)
        .lean();
      items = docs.map((item) => ({
        itemCode: item.itemCode || '',
        name: item.name || '',
        category: item.category || 'General',
        quantity: item.quantity !== undefined ? item.quantity : (item.currentStock || 0),
        minThreshold: item.minThreshold || item.reorderLevel || 10,
        sellingPrice: item.sellingPrice || item.price || 0,
        unit: item.unit || 'unit',
        createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : '',
      }));
      break;
    }

    default:
      throw new Error(`Unsupported dataset: ${dataset}`);
  }

  // Filter fields if specified
  if (fields && fields.length) {
    items = items.map((item) => {
      const filtered = {};
      fields.forEach((f) => {
        filtered[f] = item[f] !== undefined ? item[f] : '';
      });
      return filtered;
    });
  }

  return items;
};

// @desc    Create a new secure share link
// @route   POST /api/data-share/shares
// @access  Private (Admin)
const createShare = async (req, res) => {
  try {
    const { title, dataset, fields, filter, expiresInDays, allowedRoles } = req.body;

    if (!title || !dataset) {
      return res.status(400).json({
        success: false,
        message: 'Title and dataset are required fields.',
      });
    }

    const token = crypto.randomBytes(24).toString('hex');
    let expiresAt = null;

    if (expiresInDays && Number(expiresInDays) > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + Number(expiresInDays));
    }

    const newShare = await DataShare.create({
      title: title.trim(),
      dataset,
      fields: Array.isArray(fields) && fields.length ? fields : [],
      filter: typeof filter === 'object' && filter !== null ? filter : {},
      token,
      expiresAt,
      allowedRoles: Array.isArray(allowedRoles) && allowedRoles.length ? allowedRoles : ['admin'],
      createdBy: req.user?._id || req.user?.id,
      isActive: true,
      accessCount: 0,
    });

    const populated = await DataShare.findById(newShare._id)
      .populate('createdBy', 'firstName lastName email')
      .lean();

    res.status(201).json({
      success: true,
      message: 'Secure share link created successfully',
      data: populated,
    });
  } catch (error) {
    console.error('Error creating share:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create share link',
      error: error.message,
    });
  }
};

// @desc    List all data shares
// @route   GET /api/data-share/shares
// @access  Private (Admin)
const listShares = async (req, res) => {
  try {
    const shares = await DataShare.find()
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .lean();

    const now = new Date();
    const enriched = shares.map((s) => ({
      ...s,
      isExpired: s.expiresAt ? new Date(s.expiresAt) < now : false,
    }));

    res.json({
      success: true,
      count: enriched.length,
      data: enriched,
    });
  } catch (error) {
    console.error('Error listing shares:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve share records',
      error: error.message,
    });
  }
};

// @desc    Revoke a data share link
// @route   PATCH /api/data-share/shares/:id/revoke
// @access  Private (Admin)
const revokeShare = async (req, res) => {
  try {
    const share = await DataShare.findById(req.params.id);
    if (!share) {
      return res.status(404).json({
        success: false,
        message: 'Share record not found',
      });
    }

    share.isActive = false;
    await share.save();

    res.json({
      success: true,
      message: 'Share link successfully revoked',
      data: share,
    });
  } catch (error) {
    console.error('Error revoking share:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke share link',
      error: error.message,
    });
  }
};

// @desc    Delete a data share permanently
// @route   DELETE /api/data-share/shares/:id
// @access  Private (Admin)
const deleteShare = async (req, res) => {
  try {
    const share = await DataShare.findByIdAndDelete(req.params.id);
    if (!share) {
      return res.status(404).json({
        success: false,
        message: 'Share record not found',
      });
    }

    res.json({
      success: true,
      message: 'Share record deleted permanently',
    });
  } catch (error) {
    console.error('Error deleting share:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete share record',
      error: error.message,
    });
  }
};

// @desc    Export dataset to CSV or JSON
// @route   GET /api/data-share/export/:dataset
// @access  Private (Admin)
const exportDataset = async (req, res) => {
  try {
    const { dataset } = req.params;
    const { fields, from, to, format = 'csv' } = req.query;

    const requestedFields = fields ? fields.split(',').map((f) => f.trim()).filter(Boolean) : undefined;
    const items = await fetchDatasetItems(dataset, {
      fields: requestedFields,
      from,
      to,
    });

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${dataset}-export-${new Date().toISOString().slice(0, 10)}.json"`
      );
      return res.json({
        success: true,
        dataset,
        exportedAt: new Date().toISOString(),
        count: items.length,
        data: items,
      });
    }

    // Default CSV format
    const csvData = convertToCsv(items, requestedFields);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${dataset}-export-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    return res.status(200).send(csvData);
  } catch (error) {
    console.error('Error exporting dataset:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export dataset',
      error: error.message,
    });
  }
};

// @desc    Preview top records of a dataset
// @route   GET /api/data-share/preview/:dataset
// @access  Private (Admin)
const getDatasetPreview = async (req, res) => {
  try {
    const { dataset } = req.params;
    const { fields, from, to } = req.query;
    const requestedFields = fields ? fields.split(',').map((f) => f.trim()).filter(Boolean) : undefined;

    const items = await fetchDatasetItems(dataset, {
      fields: requestedFields,
      from,
      to,
      limit: 8,
    });

    res.json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    console.error('Error previewing dataset:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to preview dataset',
      error: error.message,
    });
  }
};

// @desc    Consume shared data via secure token
// @route   GET /api/data-share/shared/:token
// @access  Public / Role-checked
const consumeShare = async (req, res) => {
  try {
    const { token } = req.params;
    const share = await DataShare.findOne({ token })
      .populate('createdBy', 'firstName lastName email')
      .lean();

    if (!share) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or non-existent share link. Please verify the URL with the sender.',
      });
    }

    if (!share.isActive) {
      return res.status(403).json({
        success: false,
        isRevoked: true,
        title: share.title,
        dataset: share.dataset,
        message: 'This secure share link has been revoked by a clinical administrator.',
      });
    }

    if (share.expiresAt && new Date() > new Date(share.expiresAt)) {
      return res.status(410).json({
        success: false,
        isExpired: true,
        title: share.title,
        dataset: share.dataset,
        expiresAt: share.expiresAt,
        message: `This secure share link expired on ${new Date(share.expiresAt).toLocaleDateString()}.`,
      });
    }

    // Role check
    const userRole = req.user?.role;
    const requiresRole =
      Array.isArray(share.allowedRoles) &&
      share.allowedRoles.length > 0 &&
      !share.allowedRoles.includes('all');

    if (requiresRole) {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          requiresAuth: true,
          title: share.title,
          dataset: share.dataset,
          allowedRoles: share.allowedRoles,
          createdBy: share.createdBy
            ? `${share.createdBy.firstName || ''} ${share.createdBy.lastName || ''}`.trim()
            : 'Clinic Administrator',
          message: `Authentication required: This dataset is restricted to [${share.allowedRoles.join(
            ', '
          )}] staff members. Please sign in to decrypt.`,
        });
      }

      if (!share.allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          roleMismatch: true,
          userRole,
          allowedRoles: share.allowedRoles,
          title: share.title,
          dataset: share.dataset,
          message: `Access denied: Your account role is "${userRole}", but this share requires: [${share.allowedRoles.join(
            ', '
          )}].`,
        });
      }
    }

    // Record access
    await DataShare.updateOne(
      { _id: share._id },
      {
        $inc: { accessCount: 1 },
        $set: { lastAccessedAt: new Date() },
      }
    );

    // Query data
    const items = await fetchDatasetItems(share.dataset, {
      fields: share.fields,
      filter: share.filter,
      limit: 2000,
    });

    // Check if direct CSV export was requested via ?format=csv
    if (req.query.format === 'csv') {
      const csvData = convertToCsv(items, share.fields);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${share.title.replace(/[^a-zA-Z0-9_-]/g, '_')}-${share.dataset}.csv"`
      );
      return res.status(200).send(csvData);
    }

    res.json({
      success: true,
      share: {
        id: share._id,
        title: share.title,
        dataset: share.dataset,
        fields: share.fields,
        token: share.token,
        expiresAt: share.expiresAt,
        allowedRoles: share.allowedRoles,
        createdBy: share.createdBy
          ? `${share.createdBy.firstName || ''} ${share.createdBy.lastName || ''}`.trim()
          : 'Clinic Administrator',
        createdAt: share.createdAt,
        accessCount: (share.accessCount || 0) + 1,
      },
      count: items.length,
      data: items,
    });
  } catch (error) {
    console.error('Error consuming share:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve shared dataset',
      error: error.message,
    });
  }
};

// @desc    Get dashboard metrics for data share
// @route   GET /api/data-share/stats
// @access  Private (Admin)
const getStats = async (req, res) => {
  try {
    const [totalShares, activeShares, patientsCount, appointmentsCount, invoicesCount] = await Promise.all([
      DataShare.countDocuments(),
      DataShare.countDocuments({ isActive: true, $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] }),
      Patient.countDocuments(),
      Appointment.countDocuments(),
      Invoice.countDocuments(),
    ]);

    const aggregateAccesses = await DataShare.aggregate([
      { $group: { _id: null, totalAccesses: { $sum: '$accessCount' } } },
    ]);

    res.json({
      success: true,
      data: {
        totalShares,
        activeShares,
        totalAccesses: aggregateAccesses[0]?.totalAccesses || 0,
        availableRecords: {
          patients: patientsCount,
          appointments: appointmentsCount,
          invoices: invoicesCount,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching data share stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message,
    });
  }
};

module.exports = {
  createShare,
  listShares,
  revokeShare,
  deleteShare,
  exportDataset,
  getDatasetPreview,
  consumeShare,
  getStats,
  // Backwards compatibility legacy aliases
  getdataShares: listShares,
  getdataShareById: consumeShare,
  createdataShare: createShare,
  updatedataShare: revokeShare,
  deletedataShare: deleteShare,
};
