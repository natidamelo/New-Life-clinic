import React, { useState } from 'react';
import { 
  Sparkles, 
  Heart, 
  Zap, 
  Shield, 
  Pill, 
  Calendar,
  Clock,
  User,
  CheckCircle,
  AlertTriangle,
  Star,
  Palette,
  Eye,
  Settings
} from 'lucide-react';
import SimplifiedMedicationAdmin from './SimplifiedMedicationAdmin';
import ModernMedicationList from './ModernMedicationList';
import '../../styles/ui-upgrades.css';

const UIShowcase: React.FC = () => {
  const [activeDemo, setActiveDemo] = useState('overview');

  const demoMedication = {
    _id: 'demo-1',
    patientName: 'Samuael Kinfe',
    medicationDetails: {
      medicationName: 'Ceftriaxone',
      frequency: 'Mixed (QD + BID extension)',
      dosage: '1g',
      route: 'Intravenous',
      duration: 5,
      isExtension: true,
      totalDoses: 11,
      extensionDetails: {
        additionalDays: 3,
        additionalDoses: 6
      },
      doseRecords: [
        // Active days (QD)
        { day: 1, timeSlot: '09:00', administered: true, period: 'active' },
        { day: 2, timeSlot: '09:00', administered: true, period: 'active' },
        { day: 3, timeSlot: '09:00', administered: false, period: 'active' },
        { day: 4, timeSlot: '09:00', administered: false, period: 'active' },
        { day: 5, timeSlot: '09:00', administered: false, period: 'active' },
        // Extension days (BID)
        { day: 6, timeSlot: '09:00', administered: false, period: 'extension1' },
        { day: 6, timeSlot: '21:00', administered: false, period: 'extension1' },
        { day: 7, timeSlot: '09:00', administered: false, period: 'extension1' },
        { day: 7, timeSlot: '21:00', administered: false, period: 'extension1' },
        { day: 8, timeSlot: '09:00', administered: false, period: 'extension1' },
        { day: 8, timeSlot: '21:00', administered: false, period: 'extension1' }
      ]
    },
    createdAt: new Date(),
    progress: 18
  };

  const demoMedications = [
    {
      ...demoMedication,
      _id: 'demo-1',
      patientName: 'Samuael Kinfe',
      progress: 18
    },
    {
      ...demoMedication,
      _id: 'demo-2',
      patientName: 'John Doe',
      medicationDetails: {
        ...demoMedication.medicationDetails,
        medicationName: 'Amoxicillin',
        frequency: 'TID (three times daily)',
        isExtension: false
      },
      progress: 75,
      completed: false
    },
    {
      ...demoMedication,
      _id: 'demo-3',
      patientName: 'Sarah Johnson',
      medicationDetails: {
        ...demoMedication.medicationDetails,
        medicationName: 'Paracetamol',
        frequency: 'QID (four times daily)',
        isExtension: false
      },
      progress: 100,
      completed: true
    }
  ];

  const renderOverview = () => (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="modern-card p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center">
            <Sparkles className="text-primary-foreground" size={32} />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-muted-foreground mb-4">
          🎨 Modern UI Upgrades
        </h1>
        <p className="text-lg text-muted-foreground mb-6">
          Experience the new beautiful, modern interface for medication administration
        </p>
        <div className="flex justify-center space-x-4">
          <div className="status-badge success">✨ Glassmorphism Effects</div>
          <div className="status-badge info">🎨 Modern Gradients</div>
          <div className="status-badge warning">⚡ Smooth Animations</div>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="modern-card p-6 text-center">
          <div className="w-12 h-12 bg-gradient-success rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="text-primary-foreground" size={24} />
          </div>
          <h3 className="text-lg font-semibold mb-2">Enhanced Cards</h3>
          <p className="text-muted-foreground text-sm">Beautiful glassmorphism effects with smooth hover animations</p>
        </div>

        <div className="modern-card p-6 text-center">
          <div className="w-12 h-12 bg-gradient-info rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap className="text-primary-foreground" size={24} />
          </div>
          <h3 className="text-lg font-semibold mb-2">Interactive Buttons</h3>
          <p className="text-muted-foreground text-sm">Ultra-modern dose buttons with state-aware colors and effects</p>
        </div>

        <div className="modern-card p-6 text-center">
          <div className="w-12 h-12 bg-gradient-warning rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="text-primary-foreground" size={24} />
          </div>
          <h3 className="text-lg font-semibold mb-2">Smart Progress</h3>
          <p className="text-muted-foreground text-sm">Animated progress bars with shimmer effects and real-time updates</p>
        </div>

        <div className="modern-card p-6 text-center">
          <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Pill className="text-primary-foreground" size={24} />
          </div>
          <h3 className="text-lg font-semibold mb-2">Modern Tooltips</h3>
          <p className="text-muted-foreground text-sm">Contextual information with beautiful hover states</p>
        </div>

        <div className="modern-card p-6 text-center">
          <div className="w-12 h-12 bg-gradient-success rounded-full flex items-center justify-center mx-auto mb-4">
            <Star className="text-primary-foreground" size={24} />
          </div>
          <h3 className="text-lg font-semibold mb-2">Status Indicators</h3>
          <p className="text-muted-foreground text-sm">Clear visual feedback with gradient badges and animations</p>
        </div>

        <div className="modern-card p-6 text-center">
          <div className="w-12 h-12 bg-gradient-info rounded-full flex items-center justify-center mx-auto mb-4">
            <Palette className="text-primary-foreground" size={24} />
          </div>
          <h3 className="text-lg font-semibold mb-2">Responsive Design</h3>
          <p className="text-muted-foreground text-sm">Perfect adaptation to all screen sizes with mobile-first approach</p>
        </div>
      </div>

      {/* Sample Buttons Showcase */}
      <div className="modern-card p-6">
        <h3 className="text-lg font-semibold mb-4 text-center">Modern Button Styles</h3>
        <div className="flex justify-center space-x-4 flex-wrap gap-4">
          <button className="ultra-dose-button administered">
            <CheckCircle size={20} />
          </button>
          <button className="ultra-dose-button available">
            <Pill size={20} />
          </button>
          <button className="ultra-dose-button payment-required">
            <AlertTriangle size={20} />
          </button>
          <button className="ultra-dose-button future">
            <Clock size={20} />
          </button>
        </div>
        <div className="flex justify-center space-x-4 mt-2 text-xs text-muted-foreground">
          <span>Completed</span>
          <span>Available</span>
          <span>Payment Required</span>
          <span>Future</span>
        </div>
      </div>

      {/* Progress Demo */}
      <div className="modern-card p-6">
        <h3 className="text-lg font-semibold mb-4 text-center">Modern Progress Indicators</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Treatment Progress</span>
              <span>75%</span>
            </div>
            <div className="modern-progress">
              <div className="modern-progress-bar" style={{ width: '75%' }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Daily Compliance</span>
              <span>100%</span>
            </div>
            <div className="modern-progress">
              <div className="modern-progress-bar" style={{ width: '100%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: <Eye size={16} /> },
    { id: 'enhanced', label: 'Enhanced Card', icon: <Heart size={16} /> },
    { id: 'list', label: 'Modern List', icon: <Calendar size={16} /> },
    { id: 'components', label: 'Components', icon: <Settings size={16} /> }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Navigation */}
        <div className="modern-card p-4 mb-6">
          <div className="flex flex-wrap justify-center space-x-2 space-y-2 lg:space-y-0">
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveDemo(item.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  activeDemo === item.id
                    ? 'bg-gradient-primary text-primary-foreground shadow-lg scale-105'
                    : 'bg-muted/20 text-muted-foreground hover:bg-muted/30'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {activeDemo === 'overview' && renderOverview()}
        
        {activeDemo === 'enhanced' && (
          <div>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-muted-foreground mb-2">Enhanced Medication Card</h2>
              <p className="text-muted-foreground">Beautiful, modern medication administration interface</p>
            </div>
            <SimplifiedMedicationAdmin 
              task={demoMedication}
              onRefresh={() => console.log('Demo dose administered')}
              displayName={demoMedication.medicationDetails?.medicationName || 'Demo Medication'}
            />
          </div>
        )}
        
        {activeDemo === 'list' && (
          <div>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-muted-foreground mb-2">Modern Medication List</h2>
              <p className="text-muted-foreground">Comprehensive list view with advanced filtering and search</p>
            </div>
            <ModernMedicationList 
              medications={demoMedications}
              onMedicationSelect={(med) => console.log('Selected:', med)}
            />
          </div>
        )}

        {activeDemo === 'components' && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-muted-foreground mb-2">UI Components</h2>
              <p className="text-muted-foreground">Individual components showcase</p>
            </div>
            
            {/* Status Badges */}
            <div className="modern-card p-6">
              <h3 className="text-lg font-semibold mb-4">Status Badges</h3>
              <div className="flex flex-wrap gap-2">
                <div className="status-badge success">Success</div>
                <div className="status-badge warning">Warning</div>
                <div className="status-badge info">Info</div>
              </div>
            </div>

            {/* Day Boxes */}
            <div className="modern-card p-6">
              <h3 className="text-lg font-semibold mb-4">Enhanced Day Boxes</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="enhanced-day-box today">
                  <div className="text-center mb-3">
                    <div className="text-lg font-bold text-primary">D1</div>
                    <div className="text-sm text-muted-foreground">Today</div>
                  </div>
                  <div className="flex justify-center">
                    <button className="ultra-dose-button available">
                      <Pill size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="enhanced-day-box extension">
                  <div className="text-center mb-3">
                    <div className="text-lg font-bold text-accent-foreground">D6</div>
                    <div className="text-sm text-muted-foreground">Extension</div>
                  </div>
                  <div className="flex justify-center space-x-2">
                    <button className="ultra-dose-button available">🌅</button>
                    <button className="ultra-dose-button available">🌙</button>
                  </div>
                </div>
                
                <div className="enhanced-day-box completed">
                  <div className="text-center mb-3">
                    <div className="text-lg font-bold text-primary">D2 ✓</div>
                    <div className="text-sm text-muted-foreground">Completed</div>
                  </div>
                  <div className="flex justify-center">
                    <button className="ultra-dose-button administered">
                      <CheckCircle size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UIShowcase;
