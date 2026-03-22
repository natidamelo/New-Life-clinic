import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { ChevronRight, BeakerIcon, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ServiceCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: React.ReactNode;
  to: string;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ icon, title, subtitle, to }) => {
  return (
    <Link to={to} style={{ textDecoration: 'none' }} key={to}>
      <Card className="p-4 hover:shadow-md transition-shadow duration-200 cursor-pointer h-full bg-primary-foreground">
        <div className="flex items-start">
          <div className="text-teal-600 mr-4">
            {icon}
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-medium text-muted-foreground mb-1">{title}</h3>
            <div className="text-muted-foreground">{subtitle}</div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground/50 mt-1" />
        </div>
      </Card>
    </Link>
  );
};

const PatientServicesHub: React.FC = () => {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    console.log('PatientServicesHub mounted');
    console.log('Auth state:', { user, isLoading });
    
    // Log any potential issues with the Card component
    try {
      console.log('Card component:', Card);
    } catch (error) {
      console.error('Error accessing Card component:', error);
    }
  }, [user, isLoading]);

  try {
    if (isLoading) {
      return <div className="p-8 text-center text-lg">Loading...</div>;
    }

    if (!user) {
      return <div className="p-8 text-center text-destructive">You must be logged in to view this page.</div>;
    }

    const isAdmin = user.role === 'admin';

    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-muted-foreground">Patient</h1>
            <p className="text-muted-foreground mt-2">
              Patient service is a service where patients and patient medical treatment records are stored.
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <svg viewBox="0 0 24 24" className="w-24 h-24 text-teal-600" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3.75 13.5l2.25-2.25L9 9.75 12 12l3-2.25L18 13.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Staff Control Center - Only visible to admins */}
          {isAdmin && (
            <ServiceCard
              icon={
                <Users className="h-6 w-6" />
              }
              title="Staff Control Center"
              subtitle={<>Manage <span className="bg-destructive/20 px-1 py-0.5 rounded text-destructive">staff</span> across departments</>}
              to="/app/staff-control"
            />
          )}
        
          <ServiceCard
            icon={
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 4.5v15m7.5-7.5h-15" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            title="Reception"
            subtitle="Reception"
            to="/app/reception"
          />
          
          <ServiceCard
            icon={
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3.75 13.5l2.25-2.25L9 9.75 12 12l3-2.25L18 13.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            title="OPD"
            subtitle={<>Out <span className="bg-primary/20 px-1 py-0.5 rounded text-primary">Patient</span> Department</>}
            to="/app/doctor"
          />
          
          <ServiceCard
            icon={
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            title="IPD"
            subtitle={<>In <span className="bg-primary/20 px-1 py-0.5 rounded text-primary">Patient</span> Department — ward, beds & admitted care</>}
            to="/app/ward"
          />
          
          <ServiceCard
            icon={
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            title="MCH"
            subtitle={<>Mother & <span className="bg-pink-100 px-1 py-0.5 rounded text-pink-700">Child</span> Health</>}
            to="/app/mch"
          />
          
          <ServiceCard
            icon={
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            title="OR"
            subtitle={<><span className="bg-accent/20 px-1 py-0.5 rounded text-accent-foreground">Operation</span> Room</>}
            to="/app/surgery"
          />
          
          <ServiceCard
            icon={
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            title="Nurse Station"
            subtitle={<>Tasks, vitals, meds & <span className="bg-secondary/20 px-1 py-0.5 rounded text-secondary-foreground">ward</span> care</>}
            to="/app/nurse"
          />
          
          <ServiceCard
            icon={
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            title="Psychiatry"
            subtitle="Psychiatry"
            to="/app/psychiatry"
          />
          
          <ServiceCard
            icon={
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            title="Data Share"
            subtitle={<><span className="bg-primary/20 px-1 py-0.5 rounded text-primary">Data</span> Share</>}
            to="/app/data-share"
          />
          
          <ServiceCard
            icon={
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            title="Report"
            subtitle={<><span className="bg-teal-100 px-1 py-0.5 rounded text-teal-700">Patient</span> Report</>}
            to="/app/reports"
          />
          
          <ServiceCard
            icon={
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a6.759 6.759 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            title="Settings"
            subtitle="Settings"
            to="/app/settings"
          />

          {/* Add Laboratory Card */}
          <ServiceCard
            icon={<BeakerIcon className="h-6 w-6" />}
            title="Laboratory"
            subtitle={<>Manage <span className="bg-cyan-100 px-1 py-0.5 rounded text-cyan-700">Lab</span> Orders & Results</>}
            to="/app/lab"
          />
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error in PatientServicesHub:', error);
    return (
      <div className="p-8 text-center text-destructive">
        <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
        <p className="mb-4">Error: {error instanceof Error ? error.message : 'Unknown error'}</p>
        <Link to="/" className="text-primary hover:underline" style={{ textDecoration: 'none' }}>
          Return to Home
        </Link>
      </div>
    );
  }
};

export default PatientServicesHub; 