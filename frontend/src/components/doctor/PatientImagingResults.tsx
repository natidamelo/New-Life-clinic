import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Image as ImageIcon, CalendarIcon, UserIcon } from 'lucide-react';
import { api } from '../../services/api';
import { User } from '../../types/user';

interface PatientImagingResultsProps {
  patientId: string;
  user: User | null;
}

const PatientImagingResults: React.FC<PatientImagingResultsProps> = ({ patientId, user }) => {
  const [imagingResults, setImagingResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchImagingResults = async () => {
    if (!patientId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/api/imaging/patient/${patientId}`);
      
      if (response.data && Array.isArray(response.data)) {
        setImagingResults(response.data);
      } else {
        setImagingResults([]);
        setError('No imaging results found');
      }
    } catch (error) {
      console.error('Error fetching imaging results:', error);
      setError('Failed to load imaging results');
      setImagingResults([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchImagingResults();
  }, [patientId]);

  const scrollToNextImage = () => {
    if (!containerRef.current) return;
    
    containerRef.current.scrollBy({ 
      top: 400, 
      behavior: 'smooth' 
    });
  };

  return (
    <div className="p-4 bg-primary-foreground rounded-lg border border-border/30 shadow-sm">
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-border/30">
        <h3 className="text-lg font-semibold text-muted-foreground flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-secondary-foreground" />
          Imaging Studies
        </h3>
        <div className="flex items-center gap-2 relative z-10">
          {imagingResults.length > 1 && (
            <button
              onClick={scrollToNextImage}
              className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium bg-primary-foreground text-muted-foreground hover:bg-muted/20 border border-border/40 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-purple-500"
              title="Scroll to next result"
            >
              <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              <span>Next</span>
            </button>
          )}
          <button
            onClick={fetchImagingResults}
            className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium bg-secondary/10 text-secondary-foreground hover:bg-secondary/20 border border-secondary/30 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-purple-500"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Imaging Results Content */}
      <div className="space-y-6 max-h-[calc(95vh-280px)] overflow-y-auto pr-2 -mr-2 custom-scrollbar" ref={containerRef}>
        {isLoading ? (
          <div className="py-12 text-center">
            <RefreshCw className="h-8 w-8 mx-auto text-secondary-foreground animate-spin mb-4" />
            <p className="text-muted-foreground">Loading imaging results...</p>
          </div>
        ) : imagingResults.length > 0 ? (
          imagingResults.map((result, index) => (
            <div key={result._id || index} className="border border-border/30 rounded-lg overflow-hidden bg-primary-foreground shadow-sm hover:shadow-md transition-all duration-200">
              {/* Study Header */}
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-3 border-b border-border/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-secondary/20 flex items-center justify-center border border-secondary/30">
                      <ImageIcon className="h-5 w-5 text-secondary-foreground" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-muted-foreground text-base">{result.studyType || 'Unknown Study'}</h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span className="inline-flex items-center gap-1">
                          <CalendarIcon className="h-3.5 w-3.5" />
                          {result.studyDate ? new Date(result.studyDate).toLocaleDateString() : 'Unknown date'}
                        </span>
                        {result.modality && (
                          <span className="bg-secondary/20 text-secondary-foreground px-2 py-0.5 rounded-full font-medium">
                            {result.modality}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    {result.status && (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        result.status === 'completed' ? 'bg-primary/20 text-primary' : 'bg-primary/20 text-primary'
                      }`}>
                        {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Study Details */}
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  {/* Details Column */}
                  <div className="space-y-4">
                    <div>
                      <h5 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Study Area</h5>
                      <p className="text-sm text-muted-foreground">{result.bodyPart || 'Not specified'}</p>
                    </div>
                    
                    {result.radiologistName && (
                      <div>
                        <h5 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Radiologist</h5>
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                          <UserIcon className="h-4 w-4 text-muted-foreground/50" />
                          Dr. {result.radiologistName}
                        </p>
                      </div>
                    )}
                    
                    {result.findings && (
                      <div>
                        <h5 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Findings</h5>
                        <div className="text-sm text-muted-foreground bg-muted/10 p-3 rounded border border-border/20 leading-relaxed">
                          {result.findings}
                        </div>
                      </div>
                    )}
                    
                    {result.impression && (
                      <div>
                        <h5 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Impression</h5>
                        <div className="text-sm font-medium text-muted-foreground bg-secondary/10 p-3 rounded border border-secondary/20 leading-relaxed">
                          {result.impression}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Images Column */}
                  {result.imageUrls && result.imageUrls.length > 0 && (
                    <div>
                      <h5 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Images</h5>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {result.imageUrls.map((url: string, i: number) => (
                          <a 
                            key={i} 
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="block border border-border/30 rounded overflow-hidden hover:shadow-lg transition-all duration-200 group aspect-square"
                          >
                            <div className="relative h-full">
                              <img
                                src={url}
                                alt={`${result.studyType} image ${i+1}`}
                                className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                              />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-20">
                                <span className="bg-primary-foreground bg-opacity-90 text-xs font-medium px-2 py-1 rounded">
                                  View Full
                                </span>
                              </div>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Additional Information Footer */}
              {(result.referringPhysician || result.technique) && (
                <div className="border-t border-border/20 px-4 py-2 bg-muted/10 text-xs text-muted-foreground">
                  {result.referringPhysician && (
                    <span className="inline-block mr-4">
                      <span className="font-medium">Referring:</span> Dr. {result.referringPhysician}
                    </span>
                  )}
                  {result.technique && (
                    <span className="inline-block">
                      <span className="font-medium">Technique:</span> {result.technique}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-muted/10 rounded-lg border border-border/30">
            <div className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3">
              <ImageIcon className="h-full w-full" />
            </div>
            <h3 className="text-sm font-medium text-muted-foreground">No imaging studies found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              There are no imaging studies available for this patient.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientImagingResults; 