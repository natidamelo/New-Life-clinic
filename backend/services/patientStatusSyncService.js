/**
 * Patient Status Sync Service
 * 
 * This service ensures that patients with finalized medical records
 * are properly marked as 'completed' in the database.
 * 
 * It runs periodically to fix any inconsistencies that may occur
 * due to errors during the finalization process.
 */

const mongoose = require('mongoose');
const Patient = require('../models/Patient');
const MedicalRecord = require('../models/MedicalRecord');

class PatientStatusSyncService {
  constructor() {
    this.isRunning = false;
    this.syncInterval = 5 * 60 * 1000; // 5 minutes
    this.intervalId = null;
  }

  /**
   * Start the sync service
   */
  start() {
    if (this.intervalId) {
      console.log('[PatientStatusSync] Service is already running');
      return;
    }

    console.log('[PatientStatusSync] Starting sync service...');
    console.log(`[PatientStatusSync] Sync interval: ${this.syncInterval / 1000} seconds`);

    // Run immediately on start
    this.syncPatientStatuses();

    // Schedule periodic syncs
    this.intervalId = setInterval(() => {
      this.syncPatientStatuses();
    }, this.syncInterval);

    console.log('[PatientStatusSync] Service started successfully');
  }

  /**
   * Stop the sync service
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[PatientStatusSync] Service stopped');
    }
  }

  /**
   * Sync patient statuses with finalized medical records
   */
  async syncPatientStatuses() {
    // Prevent concurrent syncs
    if (this.isRunning) {
      console.log('[PatientStatusSync] Sync already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log('[PatientStatusSync] Starting sync...');

      // Find all finalized medical records
      const finalizedRecords = await MedicalRecord.find({ status: 'Finalized' })
        .select('patient updatedAt')
        .lean();

      if (finalizedRecords.length === 0) {
        console.log('[PatientStatusSync] No finalized medical records found');
        this.isRunning = false;
        return;
      }

      console.log(`[PatientStatusSync] Found ${finalizedRecords.length} finalized medical records`);

      // Get unique patient IDs
      const patientIds = [...new Set(finalizedRecords.map(r => r.patient.toString()))];
      console.log(`[PatientStatusSync] Checking ${patientIds.length} unique patients`);

      // Find patients that should be completed but aren't
      const patientsToUpdate = await Patient.find({
        _id: { $in: patientIds },
        status: { $ne: 'completed' }
      }).select('_id firstName lastName patientId status assignedDoctorId');

      if (patientsToUpdate.length === 0) {
        console.log('[PatientStatusSync] All patients are in sync ✅');
        this.isRunning = false;
        return;
      }

      console.log(`[PatientStatusSync] Found ${patientsToUpdate.length} patients that need status update`);

      // Update each patient
      let successCount = 0;
      let errorCount = 0;

      for (const patient of patientsToUpdate) {
        try {
          // Find the most recent finalized record for this patient
          const latestRecord = await MedicalRecord.findOne({
            patient: patient._id,
            status: 'Finalized'
          })
          .sort({ updatedAt: -1 })
          .select('updatedAt');

          if (!latestRecord) {
            console.warn(`[PatientStatusSync] No finalized record found for patient ${patient._id}, skipping`);
            continue;
          }

          // Update patient status
          const updated = await Patient.findByIdAndUpdate(
            patient._id,
            {
              status: 'completed',
              completedAt: latestRecord.updatedAt || new Date(),
              lastUpdated: new Date()
            },
            { new: true, runValidators: true }
          );

          if (updated) {
            console.log(`[PatientStatusSync] ✅ Updated patient ${patient.firstName} ${patient.lastName} (${patient.patientId})`);
            console.log(`[PatientStatusSync]    Old status: ${patient.status} → New status: ${updated.status}`);
            successCount++;
          } else {
            console.error(`[PatientStatusSync] ❌ Failed to update patient ${patient._id}`);
            errorCount++;
          }
        } catch (error) {
          console.error(`[PatientStatusSync] ❌ Error updating patient ${patient._id}:`, error.message);
          errorCount++;
        }
      }

      const duration = Date.now() - startTime;
      console.log('[PatientStatusSync] Sync completed');
      console.log(`[PatientStatusSync] Duration: ${duration}ms`);
      console.log(`[PatientStatusSync] Success: ${successCount}, Errors: ${errorCount}`);

    } catch (error) {
      console.error('[PatientStatusSync] Error during sync:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Manual sync trigger (for testing or manual intervention)
   */
  async triggerSync() {
    console.log('[PatientStatusSync] Manual sync triggered');
    await this.syncPatientStatuses();
  }
}

// Create singleton instance
const patientStatusSyncService = new PatientStatusSyncService();

module.exports = patientStatusSyncService;

