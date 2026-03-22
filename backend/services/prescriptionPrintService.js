const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const Prescription = require('../models/Prescription');
const Patient = require('../models/Patient');
const User = require('../models/User');

class PrescriptionPrintService {
  constructor() {
    this.clinicInfo = {
      name: 'New Life Clinic',
      address: '123 Healthcare Street, Medical District',
      phone: '+251-XXX-XXXX',
      email: 'info@newlifeclinic.com',
      license: 'CL-2024-001'
    };
  }

  /**
   * Generate prescription PDF
   */
  async generatePrescriptionPDF(prescriptionId, options = {}) {
    try {
      const prescription = await Prescription.findById(prescriptionId)
        .populate('patient', 'firstName lastName dateOfBirth gender phone address')
        .populate('doctor', 'firstName lastName specialization licenseNumber');

      if (!prescription) {
        throw new Error('Prescription not found');
      }

      const doc = new PDFDocument({ margin: 50 });
      const fileName = `prescription_${prescriptionId}_${Date.now()}.pdf`;
      const filePath = path.join(__dirname, '../temp', fileName);

      // Ensure temp directory exists
      const tempDir = path.dirname(filePath);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      doc.pipe(fs.createWriteStream(filePath));

      // Header
      await this.addHeader(doc, prescription);
      
      // Patient Information
      await this.addPatientInfo(doc, prescription.patient);
      
      // Prescription Details
      await this.addPrescriptionDetails(doc, prescription);
      
      // Doctor Information and Signature
      await this.addDoctorInfo(doc, prescription.doctor);
      
      // Footer
      await this.addFooter(doc, prescription);

      doc.end();

      // Record print history
      await this.recordPrintHistory(prescriptionId, options);

      return {
        fileName,
        filePath,
        success: true
      };
    } catch (error) {
      console.error('Error generating prescription PDF:', error);
      throw error;
    }
  }

  /**
   * Add header to prescription
   */
  async addHeader(doc, prescription) {
    // Clinic Logo (if available)
    const logoPath = path.join(__dirname, '../assets/clinic-logo.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 30, { width: 60 });
    }

    // Clinic Information
    doc.fontSize(18)
       .font('Helvetica-Bold')
       .text(this.clinicInfo.name, 120, 40);

    doc.fontSize(10)
       .font('Helvetica')
       .text(this.clinicInfo.address, 120, 65)
       .text(`Phone: ${this.clinicInfo.phone}`, 120, 80)
       .text(`Email: ${this.clinicInfo.email}`, 120, 95)
       .text(`License: ${this.clinicInfo.license}`, 120, 110);

    // Prescription Title
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('PRESCRIPTION', 400, 50);

    // Prescription ID and Date
    doc.fontSize(10)
       .font('Helvetica')
       .text(`Prescription ID: ${prescription._id}`, 400, 75)
       .text(`Date: ${prescription.datePrescribed.toLocaleDateString()}`, 400, 90);

    // Add line separator
    doc.moveTo(50, 140)
       .lineTo(550, 140)
       .stroke();

    return 150; // Return Y position for next section
  }

  /**
   * Add patient information
   */
  async addPatientInfo(doc, patient) {
    const startY = 160;
    
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('PATIENT INFORMATION', 50, startY);

    const patientInfo = [
      `Name: ${patient.firstName} ${patient.lastName}`,
      `Date of Birth: ${patient.dateOfBirth ? patient.dateOfBirth.toLocaleDateString() : 'N/A'}`,
      `Gender: ${patient.gender || 'N/A'}`,
      `Phone: ${patient.phone || 'N/A'}`,
      `Address: ${patient.address || 'N/A'}`
    ];

    doc.fontSize(10)
       .font('Helvetica');

    let currentY = startY + 20;
    patientInfo.forEach(info => {
      doc.text(info, 50, currentY);
      currentY += 15;
    });

    // Add line separator
    doc.moveTo(50, currentY + 10)
       .lineTo(550, currentY + 10)
       .stroke();

    return currentY + 20;
  }

  /**
   * Add prescription details
   */
  async addPrescriptionDetails(doc, prescription) {
    let currentY = 280;

    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('PRESCRIPTION DETAILS', 50, currentY);

    currentY += 30;

    // Main medication
    doc.fontSize(11)
       .font('Helvetica-Bold')
       .text('Rx:', 50, currentY);

    const medicationDetails = [
      `Medication: ${prescription.medicationName}`,
      `Dosage: ${prescription.dosage}`,
      `Frequency: ${prescription.frequency}`,
      `Duration: ${prescription.duration || 'As directed'}`,
      `Route: ${prescription.route}`,
      `Quantity: ${prescription.quantity || 'N/A'}`,
      `Refills: ${prescription.refills || 0}`
    ];

    doc.fontSize(10)
       .font('Helvetica');

    currentY += 20;
    medicationDetails.forEach(detail => {
      doc.text(detail, 70, currentY);
      currentY += 15;
    });

    // Additional medications (if any)
    if (prescription.medications && prescription.medications.length > 1) {
      currentY += 10;
      doc.fontSize(11)
         .font('Helvetica-Bold')
         .text('Additional Medications:', 50, currentY);

      currentY += 20;
      prescription.medications.slice(1).forEach((med, index) => {
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text(`${index + 2}. ${med.name}`, 70, currentY);
        
        currentY += 15;
        doc.font('Helvetica')
           .text(`   Dosage: ${med.dosage}`, 70, currentY)
           .text(`   Frequency: ${med.frequency}`, 70, currentY + 12)
           .text(`   Duration: ${med.duration}`, 70, currentY + 24);
        
        currentY += 45;
      });
    }

    // Instructions
    if (prescription.instructions) {
      currentY += 10;
      doc.fontSize(11)
         .font('Helvetica-Bold')
         .text('Instructions:', 50, currentY);

      currentY += 15;
      doc.fontSize(10)
         .font('Helvetica')
         .text(prescription.instructions, 70, currentY, { width: 450 });

      currentY += Math.ceil(prescription.instructions.length / 80) * 12 + 10;
    }

    // Add line separator
    doc.moveTo(50, currentY + 10)
       .lineTo(550, currentY + 10)
       .stroke();

    return currentY + 20;
  }

  /**
   * Add doctor information and signature area
   */
  async addDoctorInfo(doc, doctor) {
    const startY = 600;

    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('PRESCRIBING PHYSICIAN', 50, startY);

    const doctorInfo = [
      `Name: Dr. ${doctor.firstName} ${doctor.lastName}`,
      `Specialization: ${doctor.specialization || 'General Practice'}`,
      `License Number: ${doctor.licenseNumber || 'N/A'}`
    ];

    doc.fontSize(10)
       .font('Helvetica');

    let currentY = startY + 20;
    doctorInfo.forEach(info => {
      doc.text(info, 50, currentY);
      currentY += 15;
    });

    // Signature area
    currentY += 20;
    doc.moveTo(350, currentY)
       .lineTo(500, currentY)
       .stroke();

    doc.fontSize(9)
       .text('Doctor Signature', 350, currentY + 5);

    return currentY + 30;
  }

  /**
   * Add footer with important information
   */
  async addFooter(doc, prescription) {
    const footerY = 720;

    // Important notices
    doc.fontSize(8)
       .font('Helvetica')
       .text('IMPORTANT NOTICES:', 50, footerY)
       .text('• Take medications as prescribed by your physician', 50, footerY + 12)
       .text('• Do not share medications with others', 50, footerY + 24)
       .text('• Contact your doctor if you experience adverse reactions', 50, footerY + 36)
       .text('• Store medications in a cool, dry place', 50, footerY + 48);

    // Prescription validity
    const expiryDate = new Date(prescription.datePrescribed);
    expiryDate.setMonth(expiryDate.getMonth() + 6); // 6 months validity

    doc.text(`This prescription is valid until: ${expiryDate.toLocaleDateString()}`, 350, footerY + 12);

    // Contact information
    doc.text('For questions, contact the clinic at:', 350, footerY + 30)
       .text(this.clinicInfo.phone, 350, footerY + 42);
  }

  /**
   * Record print history
   */
  async recordPrintHistory(prescriptionId, options) {
    try {
      await Prescription.findByIdAndUpdate(prescriptionId, {
        $push: {
          printHistory: {
            printedBy: options.userId,
            printedAt: new Date(),
            printType: options.printType || 'prescription',
            copies: options.copies || 1,
            printerName: options.printerName
          }
        }
      });
    } catch (error) {
      console.error('Error recording print history:', error);
    }
  }

  /**
   * Generate medication label
   */
  async generateMedicationLabel(prescriptionId, medicationIndex = 0) {
    try {
      const prescription = await Prescription.findById(prescriptionId)
        .populate('patient', 'firstName lastName')
        .populate('doctor', 'firstName lastName');

      if (!prescription) {
        throw new Error('Prescription not found');
      }

      const medication = prescription.medications[medicationIndex] || {
        name: prescription.medicationName,
        dosage: prescription.dosage,
        frequency: prescription.frequency,
        duration: prescription.duration
      };

      const doc = new PDFDocument({ 
        size: [288, 144], // 4x2 inches at 72 DPI
        margin: 10 
      });

      const fileName = `label_${prescriptionId}_${Date.now()}.pdf`;
      const filePath = path.join(__dirname, '../temp', fileName);

      doc.pipe(fs.createWriteStream(filePath));

      // Clinic name
      doc.fontSize(8)
         .font('Helvetica-Bold')
         .text(this.clinicInfo.name, 10, 10);

      // Patient name
      doc.fontSize(10)
         .text(`Patient: ${prescription.patient.firstName} ${prescription.patient.lastName}`, 10, 25);

      // Medication details
      doc.fontSize(9)
         .text(`Medication: ${medication.name}`, 10, 40)
         .text(`Dosage: ${medication.dosage}`, 10, 55)
         .text(`Frequency: ${medication.frequency}`, 10, 70)
         .text(`Duration: ${medication.duration}`, 10, 85);

      // Date and doctor
      doc.fontSize(7)
         .text(`Prescribed: ${prescription.datePrescribed.toLocaleDateString()}`, 10, 105)
         .text(`Dr. ${prescription.doctor.firstName} ${prescription.doctor.lastName}`, 10, 118);

      doc.end();

      return {
        fileName,
        filePath,
        success: true
      };
    } catch (error) {
      console.error('Error generating medication label:', error);
      throw error;
    }
  }

  /**
   * Clean up temporary files
   */
  async cleanupTempFiles(olderThanHours = 24) {
    try {
      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) return;

      const files = fs.readdirSync(tempDir);
      const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          fs.unlinkSync(filePath);
          console.log(`Cleaned up temp file: ${file}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up temp files:', error);
    }
  }
}

module.exports = new PrescriptionPrintService();
