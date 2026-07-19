import api from './apiService';
import axios from 'axios';
import { API_BASE_URL } from '../config';

// ── Types ────────────────────────────────────────────────────────────────────

export interface HomeStat {
  label: string;
  value: string;
  dynamicKey?: string;
}

export interface WorkingHour {
  day: string;
  time: string;
}

export interface WhyChooseItem {
  title: string;
  desc: string;
}

export interface Department {
  name: string;
  desc: string;
  count: string;
}

export interface JourneyStep {
  step: string;
  title: string;
  desc: string;
}

export interface Testimonial {
  quote: string;
  author: string;
  role: string;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface HomeContent {
  _id?: string;
  clinicId?: string;

  // Hero
  heroTitle: string;
  heroHighlight: string;
  heroTitleEnd: string;
  heroSubtitle: string;
  heroBadge: string;

  // Stats
  useRealCounts: boolean;
  stats: HomeStat[];

  // Trust Badges
  trustBadges: string[];

  // Contact
  contactAddress: string;
  contactPhone: string;
  contactEmail: string;
  workingHours: WorkingHour[];

  // Content sections
  whyChooseUs: WhyChooseItem[];
  departments: Department[];
  patientJourney: JourneyStep[];
  testimonials: Testimonial[];
  faqs: FAQ[];

  // Visibility toggles
  showDoctors: boolean;
  showPackages: boolean;
  showTestimonials: boolean;
  showFaq: boolean;
  showContactForm: boolean;

  // Real-time DB counts (only present when useRealCounts=true)
  _realCounts?: { doctorCount: number; patientCount: number; serviceCount: number };
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

// ── Default fallback content (matches backend defaults) ───────────────────────
export const DEFAULT_HOME_CONTENT: HomeContent = {
  heroTitle: 'Healthcare That Puts',
  heroHighlight: 'Your Life',
  heroTitleEnd: 'First',
  heroSubtitle:
    'Experience compassionate care, advanced diagnostics, and expert medical professionals—all in one trusted clinic. Empower your health journey with our premium patient portal.',
  heroBadge: 'Accredited Private Clinic in Addis Ababa',
  useRealCounts: false,
  stats: [
    { label: 'Licensed Doctors', value: '30+', dynamicKey: 'doctors' },
    { label: 'Clinical Services', value: '250+', dynamicKey: 'services' },
    { label: 'Patients Served', value: '25k+', dynamicKey: 'patients' },
    { label: 'Satisfaction Rate', value: '99%', dynamicKey: '' },
    { label: 'Clinic Experience', value: '15 Yrs', dynamicKey: '' }
  ],
  trustBadges: ['Licensed Specialists', 'Advanced Laboratory', 'Digital Health Card', 'Same-Day Checkups'],
  contactAddress: 'Bole Sub-City, Woreda 03, Addis Ababa, Ethiopia',
  contactPhone: '+251 925 959 219',
  contactEmail: 'newlifemediumclinic@gmail.com',
  workingHours: [
    { day: 'Monday – Friday', time: '8:00 AM – 8:00 PM' },
    { day: 'Saturday', time: '8:00 AM – 5:00 PM' },
    { day: 'Sunday', time: '9:00 AM – 2:00 PM' },
    { day: 'Emergency', time: '24/7 Available' }
  ],
  whyChooseUs: [
    { title: 'Experienced Specialists', desc: 'Board-certified medical team covering internal medicine, pediatrics, and custom diagnostics.' },
    { title: 'Modern Laboratory', desc: 'Accredited high-throughput lab equipment providing CBC, chemistries, and cultures.' },
    { title: 'Digital Health Records', desc: 'Secure patient EMR with instant Telegram card ID generation and real-time portal results.' },
    { title: 'Advanced Ultrasound', desc: 'High-definition 3D/4D obstetric, pelvic, and abdominal sonography checks.' },
    { title: '24/7 Emergency Support', desc: 'Continuous clinical backup on call for urgent treatment, procedures, and ambulance.' },
    { title: 'Fast Appointment Booking', desc: 'Digital check-in kiosk integration allowing patient waiting times under 15 minutes.' }
  ],
  departments: [
    { name: 'General Medicine', desc: 'Comprehensive adult health checkups, chronic disease management, and internal medicine.', count: '12 Services' },
    { name: 'Pediatrics', desc: 'Compassionate pediatric healthcare, developmental monitoring, and child vaccinations.', count: '8 Services' },
    { name: 'Gynecology', desc: 'Expert obstetrics care, antenatal screening, maternal wellness, and pelvic imaging.', count: '6 Services' },
    { name: 'Internal Medicine', desc: 'In-depth diagnostics and specialist management for complex metabolic and systemic diseases.', count: '10 Services' },
    { name: 'Laboratory', desc: 'Fully-automated testing facility providing instant chemistry, hematology, and serology updates.', count: '45 Services' },
    { name: 'Radiology & ECG', desc: 'Diagnostic electrical activity charting, chest radiography review, and physical analysis.', count: '5 Services' },
    { name: 'Ultrasound', desc: 'High-resolution imaging for abdominal organs, pregnancy progression, and vascular scans.', count: '6 Services' },
    { name: 'Pharmacy', desc: 'In-house pharmacy stocked with certified medications and patient safety counseling.', count: '250+ Meds' },
    { name: 'Emergency', desc: 'Immediate clinical rescue, minor surgeries, trauma support, and intravenous therapy.', count: '24/7 Open' }
  ],
  patientJourney: [
    { step: '1', title: 'Book Appointment', desc: 'Select a clinical doctor, preferred slot, and request visit online.' },
    { step: '2', title: 'Meet Doctor', desc: 'Visit our Bole Sub-City clinic and receive standard clinical checkup.' },
    { step: '3', title: 'Lab / Radiology', desc: 'Get same-day diagnostic tests under one unified medical system.' },
    { step: '4', title: 'Treatment Plan', desc: 'Receive certified medical advice and medications at our pharmacy.' },
    { step: '5', title: 'Digital Results', desc: 'Check verified lab test results immediately on Telegram and patient portal.' }
  ],
  testimonials: [
    {
      quote: '"New Life Clinic has completely transformed my healthcare experience. The smart portal allowed me to register and generate my card in seconds, and the doctors are incredibly thorough."',
      author: 'Samuel Kebede',
      role: 'Verified Patient'
    },
    {
      quote: '"As a mother, convenience is everything. Booking self-appointments for my kids is simple, and the pediatric department is outstanding. Highly recommended!"',
      author: 'Helen Tekle',
      role: 'Verified Patient'
    },
    {
      quote: '"I am thoroughly impressed by the integration of clinical services, lab diagnostics, and patient portal workflows. It is a highly professional system that respects patient time."',
      author: 'Dr. Nataniel Girma',
      role: 'Verified Patient'
    }
  ],
  faqs: [
    { question: 'How do I register as a new patient?', answer: 'Click on the "Self-Appointment" tab and choose "No, I am a new patient" to register. You can also visit the "Get Patient Card" tab to instantly generate your official clinical ID card.' },
    { question: 'What is the benefit of the Patient Card?', answer: 'The Patient Card contains your unique Patient ID and QR code. Depending on your chosen card tier (Basic, Premium, VIP, Family), it grants you direct service discounts of up to 25%, free clinical consultations, and priority appointment booking.' },
    { question: 'How do I check in for my self-appointment?', answer: 'When you arrive at the clinic, present your digital or printed Patient Card (with barcode/QR code) at the reception desk, or scan it at our check-in kiosk for immediate queue integration.' },
    { question: 'Can I choose my specific physician or specialist?', answer: 'Yes, in Step 3 of the Self-Appointment wizard, you can select your preferred practitioner or specialist depending on the selected medical department.' },
    { question: 'Are clinical laboratory results accessible online?', answer: 'Yes, clinic staff record laboratory results securely. Patients can verify their credentials or scan their QR code on the patient portal to view their active clinical records instantly.' }
  ],
  showDoctors: true,
  showPackages: true,
  showTestimonials: true,
  showFaq: true,
  showContactForm: true
};

// ── Service ──────────────────────────────────────────────────────────────────

const homeContentService = {
  /**
   * Fetch home content — public endpoint, no auth required.
   * Falls back to DEFAULT_HOME_CONTENT if request fails.
   */
  async getHomeContent(): Promise<HomeContent> {
    try {
      const baseUrl = API_BASE_URL;
      const response = await axios.get<ApiResponse<HomeContent>>(
        `${baseUrl}/api/home-content`,
        { timeout: 5000 }
      );
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      return DEFAULT_HOME_CONTENT;
    } catch {
      return DEFAULT_HOME_CONTENT;
    }
  },

  /**
   * Update home content — admin only, uses authenticated API instance.
   */
  async updateHomeContent(updates: Partial<HomeContent>): Promise<HomeContent> {
    const response = await api.put<ApiResponse<HomeContent>>('/api/home-content', updates);
    if (!response.data?.success) throw new Error(response.data?.message || 'Update failed');
    return response.data.data;
  },

  /**
   * Reset home content to defaults — admin only.
   */
  async resetHomeContent(): Promise<HomeContent> {
    const response = await api.post<ApiResponse<HomeContent>>('/api/home-content/reset');
    if (!response.data?.success) throw new Error(response.data?.message || 'Reset failed');
    return response.data.data;
  },

  /**
   * Get live DB counts — public endpoint.
   */
  async getLiveCounts(): Promise<{ doctors: number; patients: number; services: number }> {
    try {
      const baseUrl = API_BASE_URL;
      const response = await axios.get<ApiResponse<{ doctors: number; patients: number; services: number }>>(
        `${baseUrl}/api/home-content/stats`,
        { timeout: 5000 }
      );
      return response.data?.data || { doctors: 0, patients: 0, services: 0 };
    } catch {
      return { doctors: 0, patients: 0, services: 0 };
    }
  }
};

export default homeContentService;
