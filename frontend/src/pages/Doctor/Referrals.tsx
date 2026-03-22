import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  Eye,
  Printer,
  Calendar,
  User,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader,
  Download,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import referralService from '../../services/referralService';

interface Referral {
  _id: string;
  referralNumber: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  referredToDoctorName: string;
  referredToClinic: string;
  referralDate: string;
  urgency: 'routine' | 'urgent' | 'emergency';
  diagnosis: string;
  reasonForReferral: string;
  status: 'Draft' | 'Sent' | 'Received' | 'Completed' | 'Cancelled';
  chiefComplaint: string;
  patientPhone?: string;
  referredToPhone?: string;
  referredToEmail?: string;
}

const Referrals: React.FC = () => {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<any>(null);
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);

  useEffect(() => {
    loadReferrals();
    loadStats();
  }, [page, statusFilter, urgencyFilter]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm !== undefined) {
        loadReferrals();
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const loadReferrals = async () => {
    setLoading(true);
    try {
      const filters: any = {
        page,
        limit: 10,
        doctorId: user?._id
      };

      if (searchTerm) filters.search = searchTerm;
      if (statusFilter) filters.status = statusFilter;
      if (urgencyFilter) filters.urgency = urgencyFilter;

      const response = await referralService.getReferrals(filters);
      setReferrals(response.data || []);
      setTotalPages(response.pagination?.pages || 1);
    } catch (error) {
      console.error('Error loading referrals:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await referralService.getReferralStats(
        undefined,
        undefined,
        user?._id
      );
      setStats(response.data?.overview);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'emergency':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'urgent':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'routine':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'emergency':
        return <AlertCircle className="w-4 h-4" />;
      case 'urgent':
        return <Clock className="w-4 h-4" />;
      case 'routine':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Sent':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Received':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handlePrintReferral = (referral: Referral) => {
    setSelectedReferral(referral);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Medical Referrals</h1>
        <p className="text-gray-600">Manage and track patient referrals</p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Referrals</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total || 0}</p>
              </div>
              <FileText className="w-10 h-10 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sent</p>
                <p className="text-2xl font-bold text-blue-900">{stats.sent || 0}</p>
              </div>
              <Clock className="w-10 h-10 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-900">{stats.completed || 0}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Emergency</p>
                <p className="text-2xl font-bold text-red-900">{stats.emergency || 0}</p>
              </div>
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by patient, doctor, clinic..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Sent">Sent</option>
              <option value="Received">Received</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Urgency Filter */}
          <div className="relative">
            <AlertCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="">All Urgencies</option>
              <option value="routine">Routine</option>
              <option value="urgent">Urgent</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={loadReferrals}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Referrals List */}
      <div className="bg-white rounded-lg shadow-sm border">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : referrals.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No referrals found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {referrals.map((referral) => (
              <div
                key={referral._id}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {referral.patientName}
                      </h3>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium border ${getUrgencyColor(
                          referral.urgency
                        )}`}
                      >
                        <span className="flex items-center space-x-1">
                          {getUrgencyIcon(referral.urgency)}
                          <span>{referral.urgency?.toUpperCase()}</span>
                        </span>
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                          referral.status
                        )}`}
                      >
                        {referral.status}
                      </span>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="space-y-2">
                        <p className="text-gray-600">
                          <strong>Referral #:</strong> {referral.referralNumber}
                        </p>
                        <p className="text-gray-600">
                          <strong>Date:</strong>{' '}
                          {new Date(referral.referralDate).toLocaleDateString()}
                        </p>
                        <p className="text-gray-600">
                          <strong>Patient Age:</strong> {referral.patientAge} years
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-gray-600">
                          <strong>Referred To:</strong> {referral.referredToDoctorName}
                        </p>
                        <p className="text-gray-600">
                          <strong>Clinic:</strong> {referral.referredToClinic}
                        </p>
                        <p className="text-gray-600">
                          <strong>Diagnosis:</strong> {referral.diagnosis}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-gray-600">
                          <strong>Chief Complaint:</strong> {referral.chiefComplaint}
                        </p>
                        <p className="text-gray-600">
                          <strong>Reason:</strong>{' '}
                          {referral.reasonForReferral?.substring(0, 50)}
                          {referral.reasonForReferral?.length > 50 ? '...' : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="ml-4 flex space-x-2">
                    <button
                      onClick={() => setSelectedReferral(referral)}
                      className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      title="View Details"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handlePrintReferral(referral)}
                      className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      title="Print"
                    >
                      <Printer className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Referral Details Modal */}
      {selectedReferral && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  Referral Details
                </h2>
                <button
                  onClick={() => setSelectedReferral(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="space-y-6">
                {/* Referral Info */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Referral Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">
                        <strong>Referral Number:</strong>{' '}
                        {selectedReferral.referralNumber}
                      </p>
                      <p className="text-gray-600">
                        <strong>Date:</strong>{' '}
                        {new Date(selectedReferral.referralDate).toLocaleDateString()}
                      </p>
                      <p className="text-gray-600">
                        <strong>Status:</strong> {selectedReferral.status}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">
                        <strong>Urgency:</strong> {selectedReferral.urgency}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Patient Info */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Patient Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">
                        <strong>Name:</strong> {selectedReferral.patientName}
                      </p>
                      <p className="text-gray-600">
                        <strong>Age:</strong> {selectedReferral.patientAge} years
                      </p>
                      <p className="text-gray-600">
                        <strong>Gender:</strong> {selectedReferral.patientGender}
                      </p>
                    </div>
                    <div>
                      {selectedReferral.patientPhone && (
                        <p className="text-gray-600">
                          <strong>Phone:</strong> {selectedReferral.patientPhone}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Referred To */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Referred To
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">
                        <strong>Doctor:</strong>{' '}
                        {selectedReferral.referredToDoctorName}
                      </p>
                      <p className="text-gray-600">
                        <strong>Clinic:</strong> {selectedReferral.referredToClinic}
                      </p>
                    </div>
                    <div>
                      {selectedReferral.referredToPhone && (
                        <p className="text-gray-600">
                          <strong>Phone:</strong> {selectedReferral.referredToPhone}
                        </p>
                      )}
                      {selectedReferral.referredToEmail && (
                        <p className="text-gray-600">
                          <strong>Email:</strong> {selectedReferral.referredToEmail}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Medical Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Medical Information
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="font-medium text-gray-700">Chief Complaint:</p>
                      <p className="text-gray-600">{selectedReferral.chiefComplaint}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Diagnosis:</p>
                      <p className="text-gray-600">{selectedReferral.diagnosis}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Reason for Referral:</p>
                      <p className="text-gray-600">
                        {selectedReferral.reasonForReferral}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setSelectedReferral(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
              <button
                onClick={() => handlePrintReferral(selectedReferral)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Printer className="w-4 h-4" />
                <span>Print</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Referrals;

