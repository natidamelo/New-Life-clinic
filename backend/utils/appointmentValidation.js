const User = require('../models/User');
const Appointment = require('../models/Appointment');

/**
 * Checks if a doctor is available at the given date, time, and duration
 * @param {string} doctorId - User ID of the doctor
 * @param {Date|string} appointmentDateTime - Proposed appointment start date & time
 * @param {number} durationMinutes - Proposed duration of appointment
 * @param {string} [excludeAppointmentId] - Existing appointment ID to exclude (during edit)
 * @returns {Promise<{available: boolean, message?: string}>}
 */
async function checkDoctorAvailability(doctorId, appointmentDateTime, durationMinutes = 30, excludeAppointmentId = null) {
  if (!doctorId) {
    return { available: true }; // No doctor assigned initially
  }

  const newStart = new Date(appointmentDateTime);
  if (isNaN(newStart.getTime())) {
    return { available: false, message: 'Invalid appointment date and time.' };
  }

  const now = new Date();
  if (newStart < now) {
    return { available: false, message: 'Appointment date and time must be in the future.' };
  }

  const duration = Number(durationMinutes) || 30;
  const newEnd = new Date(newStart.getTime() + duration * 60000);

  // 1. Fetch Doctor details
  const doctor = await User.findById(doctorId).lean();
  if (!doctor) {
    return { available: false, message: 'Selected doctor/staff member not found.' };
  }

  // 2. Verify Working Hours if enabled
  if (doctor.workingHours && doctor.workingHours.enabled) {
    // Format YYYY-MM-DD in local timezone
    const yyyy = newStart.getFullYear();
    const mm = String(newStart.getMonth() + 1).padStart(2, '0');
    const dd = String(newStart.getDate()).padStart(2, '0');
    const dateKey = `${yyyy}-${mm}-${dd}`;

    const specialDates = doctor.workingHours.specialDates || [];
    const override = specialDates.find(o => o.date === dateKey);

    const getMinutesSinceMidnight = (date) => date.getHours() * 60 + date.getMinutes();
    const getMinutesFromStr = (str) => {
      const [h, m] = str.split(':').map(Number);
      return h * 60 + m;
    };

    if (override) {
      // If day is specifically marked as blocked/holiday
      if (!override.enabled) {
        return {
          available: false,
          message: `${doctor.firstName} ${doctor.lastName} is unavailable (Off/Holiday) on ${dateKey}.`
        };
      }

      // If day has custom overridden hours
      const startHourStr = override.startTime || '09:00';
      const endHourStr = override.endTime || '17:00';

      const newStartMinutes = getMinutesSinceMidnight(newStart);
      const newEndMinutes = getMinutesSinceMidnight(newEnd);
      const workingStartMinutes = getMinutesFromStr(startHourStr);
      const workingEndMinutes = getMinutesFromStr(endHourStr);

      if (newStartMinutes < workingStartMinutes || newEndMinutes > workingEndMinutes) {
        return {
          available: false,
          message: `${doctor.firstName} ${doctor.lastName} is only available between ${startHourStr} and ${endHourStr} on ${dateKey}.`
        };
      }
    } else {
      // Fallback to default weekly schedule rules
      const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const weekdayName = weekdays[newStart.getDay()];

      const allowedDays = doctor.workingHours.days || [];
      if (!allowedDays.includes(weekdayName)) {
        return {
          available: false,
          message: `${doctor.firstName} ${doctor.lastName} is not scheduled to work on ${weekdayName}s.`
        };
      }

      const startHourStr = doctor.workingHours.startTime || '09:00';
      const endHourStr = doctor.workingHours.endTime || '17:00';

      const newStartMinutes = getMinutesSinceMidnight(newStart);
      const newEndMinutes = getMinutesSinceMidnight(newEnd);
      const workingStartMinutes = getMinutesFromStr(startHourStr);
      const workingEndMinutes = getMinutesFromStr(endHourStr);

      if (newStartMinutes < workingStartMinutes || newEndMinutes > workingEndMinutes) {
        return {
          available: false,
          message: `${doctor.firstName} ${doctor.lastName} is only available between ${startHourStr} and ${endHourStr}.`
        };
      }
    }
  }

  // 3. Check for overlapping appointments
  const startOfDay = new Date(newStart);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(newStart);
  endOfDay.setHours(23, 59, 59, 999);

  const dayAppointments = await Appointment.find({
    doctorId,
    status: { $nin: ['Cancelled', 'No Show'] },
    appointmentDateTime: { $gte: startOfDay, $lte: endOfDay }
  }).lean();

  for (const appt of dayAppointments) {
    if (excludeAppointmentId && appt._id.toString() === excludeAppointmentId.toString()) {
      continue;
    }

    const apptStart = new Date(appt.appointmentDateTime);
    const apptDuration = Number(appt.durationMinutes) || 30;
    const apptEnd = new Date(apptStart.getTime() + apptDuration * 60000);

    // Overlap condition
    if (newStart < apptEnd && newEnd > apptStart) {
      const timeFormatter = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      return {
        available: false,
        message: `Doctor is already booked from ${timeFormatter(apptStart)} to ${timeFormatter(apptEnd)}.`
      };
    }
  }

  return { available: true };
}

module.exports = { checkDoctorAvailability };
