import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { VitalSigns } from '../../services/doctorService';
import doctorService from '../../services/doctorService';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface VitalSignsMonitorProps {
  patientId: string;
}

const VitalSignsMonitor: React.FC<VitalSignsMonitorProps> = ({ patientId }) => {
  const [vitalSigns, setVitalSigns] = useState<VitalSigns[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVitalSigns = async () => {
      try {
        const data = await doctorService.getPatientVitalSigns(patientId);
        setVitalSigns(data);
      } catch (err) {
        setError('Failed to fetch vital signs');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVitalSigns();
    const interval = setInterval(fetchVitalSigns, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [patientId]);

  if (isLoading) return <div>Loading vital signs...</div>;
  if (error) return <div className="text-destructive">{error}</div>;

  const latestVitals = vitalSigns[vitalSigns.length - 1];

  const chartData = {
    labels: vitalSigns.map(v => new Date(v.timestamp).toLocaleTimeString()),
    datasets: [
      {
        label: 'Heart Rate',
        data: vitalSigns.map(v => v.heartRate),
        borderColor: 'rgb(255, 99, 132)',
        tension: 0.1
      },
      {
        label: 'Oxygen Saturation',
        data: vitalSigns.map(v => v.oxygenSaturation),
        borderColor: 'rgb(54, 162, 235)',
        tension: 0.1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: false
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Vital Signs Trend'
      }
    }
  };

  return (
    <div className="bg-primary-foreground p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Vital Signs Monitor</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 bg-muted/10 rounded">
          <p className="text-sm text-muted-foreground">Heart Rate</p>
          <p className="text-xl font-bold">{latestVitals.heartRate} BPM</p>
        </div>
        <div className="p-3 bg-muted/10 rounded">
          <p className="text-sm text-muted-foreground">Blood Pressure</p>
          <p className="text-xl font-bold">
            {latestVitals.bloodPressure.systolic}/{latestVitals.bloodPressure.diastolic} mmHg
          </p>
        </div>
        <div className="p-3 bg-muted/10 rounded">
          <p className="text-sm text-muted-foreground">Temperature</p>
          <p className="text-xl font-bold">{latestVitals.temperature}°C</p>
        </div>
        <div className="p-3 bg-muted/10 rounded">
          <p className="text-sm text-muted-foreground">Oxygen Saturation</p>
          <p className="text-xl font-bold">{latestVitals.oxygenSaturation}%</p>
        </div>
      </div>

      <div className="h-64">
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>
  );
};

export default VitalSignsMonitor; 