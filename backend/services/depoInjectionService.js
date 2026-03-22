/**
 * Depo Injection Service
 * 
 * Handles Depo-Provera injection scheduling, tracking, and management
 * Integrates with Ethiopian calendar for date display
 */

const DepoInjectionSchedule = require('../models/DepoInjectionSchedule');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const EthiopianCalendar = require('../utils/ethiopianCalendar');
const asyncHandler = require('express-async-handler');

class DepoInjectionService {
  
  /**
   * Create a new Depo injection schedule for a patient
   */
  static async createSchedule(scheduleData) {
    try {
      const {
        patientId,
        firstInjectionDate,
        prescribingDoctorId,
        prescribingDoctorName,
        notes,
        instructions,
        injectionInterval = 84,
        reminderSettings = {},
        createdBy
      } = scheduleData;

      // Verify patient exists
      const patient = await Patient.findById(patientId);
      if (!patient) {
        throw new Error('Patient not found');
      }

      // Calculate Ethiopian date for first injection
      const firstEthiopianDate = EthiopianCalendar.gregorianToEthiopian(new Date(firstInjectionDate));
      
      // Calculate next injection date (12 weeks from first injection)
      const nextInjectionDate = new Date(
        new Date(firstInjectionDate).getTime() + (injectionInterval * 24 * 60 * 60 * 1000)
      );
      const nextEthiopianDate = EthiopianCalendar.gregorianToEthiopian(nextInjectionDate);

      // Create the schedule
      const schedule = new DepoInjectionSchedule({
        patient: patientId,
        patientName: `${patient.firstName} ${patient.lastName}`,
        patientId: patient.patientId,
        firstInjectionDate: new Date(firstInjectionDate),
        lastInjectionDate: new Date(firstInjectionDate),
        nextInjectionDate,
        nextInjectionEthiopianDate: {
          year: nextEthiopianDate.year,
          month: nextEthiopianDate.month,
          day: nextEthiopianDate.day,
          monthName: nextEthiopianDate.monthName,
          formatted: nextEthiopianDate.formatted
        },
        injectionInterval,
        prescribingDoctor: prescribingDoctorId,
        prescribingDoctorName,
        notes,
        instructions,
        reminderSettings: {
          enabled: true,
          daysBeforeReminder: 7,
          reminderMethod: 'sms',
          ...reminderSettings
        },
        createdBy
      });

      // Add first injection to history
      schedule.injectionHistory.push({
        injectionDate: new Date(firstInjectionDate),
        ethiopianDate: {
          year: firstEthiopianDate.year,
          month: firstEthiopianDate.month,
          day: firstEthiopianDate.day,
          monthName: firstEthiopianDate.monthName,
          formatted: firstEthiopianDate.formatted
        },
        notes: 'Initial Depo injection'
      });

      await schedule.save();

      // Auto-schedule next appointment if enabled
      if (schedule.autoScheduleNext) {
        await this.scheduleNextAppointment(schedule._id);
      }

      return schedule;
    } catch (error) {
      console.error('Error creating Depo injection schedule:', error);
      throw error;
    }
  }

  /**
   * Record a Depo injection administration
   */
  static async recordInjection(scheduleId, injectionData) {
    try {
      const {
        injectionDate,
        administeredBy,
        administeredByName,
        notes,
        appointmentId,
        visitId,
        inventoryTransactionId
      } = injectionData;

      const schedule = await DepoInjectionSchedule.findById(scheduleId);
      if (!schedule) {
        throw new Error('Depo injection schedule not found');
      }

      // Add injection to history
      await schedule.addInjection({
        injectionDate: new Date(injectionDate),
        administeredBy,
        administeredByName,
        notes,
        appointmentId,
        visitId,
        inventoryTransactionId
      });

      // Auto-schedule next appointment if enabled
      if (schedule.autoScheduleNext) {
        await this.scheduleNextAppointment(scheduleId);
      }

      return schedule;
    } catch (error) {
      console.error('Error recording Depo injection:', error);
      throw error;
    }
  }

  /**
   * Get all Depo injection schedules for a patient
   */
  static async getPatientSchedules(patientId) {
    try {
      const schedules = await DepoInjectionSchedule.find({
        patient: patientId,
        status: { $ne: 'cancelled' }
      })
      .populate('prescribingDoctor', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

      return schedules;
    } catch (error) {
      console.error('Error fetching patient schedules:', error);
      throw error;
    }
  }

  /**
   * Get upcoming Depo injections
   */
  static async getUpcomingInjections(days = 30) {
    try {
      const schedules = await DepoInjectionSchedule.getUpcomingInjections(days);
      
      // Add status information to each schedule
      const schedulesWithStatus = schedules.map(schedule => {
        const status = schedule.injectionStatus;
        return {
          ...schedule.toObject(),
          statusInfo: status
        };
      });

      return schedulesWithStatus;
    } catch (error) {
      console.error('Error fetching upcoming injections:', error);
      throw error;
    }
  }

  /**
   * Get overdue Depo injections
   */
  static async getOverdueInjections() {
    try {
      const schedules = await DepoInjectionSchedule.getOverdueInjections();
      
      // Add status information to each schedule
      const schedulesWithStatus = schedules.map(schedule => {
        const status = schedule.injectionStatus;
        return {
          ...schedule.toObject(),
          statusInfo: status
        };
      });

      return schedulesWithStatus;
    } catch (error) {
      console.error('Error fetching overdue injections:', error);
      throw error;
    }
  }

  /**
   * Get Depo injection statistics
   */
  static async getStatistics() {
    try {
      const stats = await DepoInjectionSchedule.getInjectionStatistics();
      return stats;
    } catch (error) {
      console.error('Error fetching injection statistics:', error);
      throw error;
    }
  }

  /**
   * Schedule next appointment for Depo injection
   */
  static async scheduleNextAppointment(scheduleId) {
    try {
      const schedule = await DepoInjectionSchedule.findById(scheduleId);
      if (!schedule) {
        throw new Error('Depo injection schedule not found');
      }

      // Check if appointment already exists for this date
      const existingAppointment = await Appointment.findOne({
        patientId: schedule.patient,
        appointmentDateTime: schedule.nextInjectionDate,
        reason: { $regex: /depo/i }
      });

      if (existingAppointment) {
        console.log('Appointment already exists for next injection date');
        return existingAppointment;
      }

      // Create new appointment
      const appointment = new Appointment({
        patientId: schedule.patient,
        appointmentDateTime: schedule.nextInjectionDate,
        durationMinutes: 30,
        reason: 'Depo-Provera Injection',
        type: 'Follow-up',
        status: 'Scheduled',
        notes: `Depo injection scheduled - Ethiopian date: ${schedule.nextInjectionEthiopianDate.formatted}`
      });

      await appointment.save();
      return appointment;
    } catch (error) {
      console.error('Error scheduling next appointment:', error);
      throw error;
    }
  }

  /**
   * Update Depo injection schedule
   */
  static async updateSchedule(scheduleId, updateData) {
    try {
      const schedule = await DepoInjectionSchedule.findById(scheduleId);
      if (!schedule) {
        throw new Error('Depo injection schedule not found');
      }

      // Update fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          schedule[key] = updateData[key];
        }
      });

      await schedule.save();
      return schedule;
    } catch (error) {
      console.error('Error updating Depo injection schedule:', error);
      throw error;
    }
  }

  /**
   * Cancel Depo injection schedule
   */
  static async cancelSchedule(scheduleId, reason) {
    try {
      const schedule = await DepoInjectionSchedule.findById(scheduleId);
      if (!schedule) {
        throw new Error('Depo injection schedule not found');
      }

      schedule.status = 'cancelled';
      schedule.notes = schedule.notes ? `${schedule.notes}\nCancelled: ${reason}` : `Cancelled: ${reason}`;
      
      await schedule.save();
      return schedule;
    } catch (error) {
      console.error('Error cancelling Depo injection schedule:', error);
      throw error;
    }
  }

  /**
   * Get Depo injection dashboard data
   */
  static async getDashboardData() {
    try {
      const [
        statistics,
        upcomingInjections,
        overdueInjections,
        dueToday
      ] = await Promise.all([
        this.getStatistics(),
        this.getUpcomingInjections(7), // Next 7 days
        this.getOverdueInjections(),
        this.getUpcomingInjections(1) // Today only
      ]);

      return {
        statistics,
        upcomingInjections,
        overdueInjections,
        dueToday: dueToday.filter(schedule => {
          const today = new Date();
          const injectionDate = new Date(schedule.nextInjectionDate);
          return injectionDate.toDateString() === today.toDateString();
        })
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  }

  /**
   * Search Depo injection schedules
   */
  static async searchSchedules(searchCriteria) {
    try {
      const {
        patientName,
        status,
        dateFrom,
        dateTo,
        doctorId,
        page = 1,
        limit = 10
      } = searchCriteria;

      const query = {};

      if (patientName) {
        query.patientName = { $regex: patientName, $options: 'i' };
      }

      if (status) {
        query.status = status;
      }

      if (dateFrom || dateTo) {
        query.nextInjectionDate = {};
        if (dateFrom) {
          query.nextInjectionDate.$gte = new Date(dateFrom);
        }
        if (dateTo) {
          query.nextInjectionDate.$lte = new Date(dateTo);
        }
      }

      if (doctorId) {
        query.prescribingDoctor = doctorId;
      }

      const skip = (page - 1) * limit;

      const [schedules, total] = await Promise.all([
        DepoInjectionSchedule.find(query)
          .populate('patient', 'firstName lastName phone email')
          .populate('prescribingDoctor', 'firstName lastName')
          .sort({ nextInjectionDate: 1 })
          .skip(skip)
          .limit(limit),
        DepoInjectionSchedule.countDocuments(query)
      ]);

      return {
        schedules,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Error searching Depo injection schedules:', error);
      throw error;
    }
  }

  /**
   * Get injection history for a schedule
   */
  static async getInjectionHistory(scheduleId) {
    try {
      const schedule = await DepoInjectionSchedule.findById(scheduleId)
        .populate('injectionHistory.administeredBy', 'firstName lastName')
        .populate('injectionHistory.appointmentId')
        .populate('injectionHistory.visitId');

      if (!schedule) {
        throw new Error('Depo injection schedule not found');
      }

      return schedule.injectionHistory.sort((a, b) => 
        new Date(b.injectionDate) - new Date(a.injectionDate)
      );
    } catch (error) {
      console.error('Error fetching injection history:', error);
      throw error;
    }
  }
}

module.exports = DepoInjectionService;

