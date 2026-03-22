import React, { useState } from 'react';
import {
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Lightbulb as LightbulbIcon,
  MenuBook as MenuBookIcon,
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  ArrowForward as ArrowForwardIcon,
  LocalHospital as LocalHospitalIcon,
  Science as ScienceIcon,
  Biotech as BiotechIcon,
  Psychology as PsychologyIcon,
  HealthAndSafety as HealthAndSafetyIcon,
  Medication as MedicationIcon,
  Vaccines as VaccinesIcon,
  Coronavirus as CoronavirusIcon,
  Bloodtype as BloodtypeIcon,
  MonitorHeart as MonitorHeartIcon,
  Favorite as FavoriteIcon
} from '@mui/icons-material';

interface ClinicalDecisionSupportProps {
  selectedPatient: string | null;
  onPatientSelect: (patientId: string) => void;
}

interface ClinicalGuideline {
  id: string;
  title: string;
  description: string;
  category: string;
  source: string;
  lastUpdated: string;
  relevance: 'high' | 'medium' | 'low';
  url: string;
}

interface DrugInteraction {
  id: string;
  drug1: string;
  drug2: string;
  severity: 'severe' | 'moderate' | 'mild';
  description: string;
  recommendation: string;
  source: string;
}

interface ClinicalAlert {
  id: string;
  type: 'warning' | 'info' | 'success' | 'error';
  title: string;
  message: string;
  timestamp: string;
  source: string;
  priority: 'high' | 'medium' | 'low';
}

interface ResearchArticle {
  id: string;
  title: string;
  authors: string[];
  journal: string;
  publicationDate: string;
  abstract: string;
  keywords: string[];
  url: string;
  relevance: 'high' | 'medium' | 'low';
}

const ClinicalDecisionSupport: React.FC<ClinicalDecisionSupportProps> = ({ selectedPatient, onPatientSelect }) => {
  const [activeTab, setActiveTab] = useState('guidelines');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Mock data for clinical guidelines
  const clinicalGuidelines: ClinicalGuideline[] = [
    {
      id: '1',
      title: 'Management of Type 2 Diabetes in Adults',
      description: 'Evidence-based guidelines for the management of type 2 diabetes in adults, including screening, diagnosis, and treatment recommendations.',
      category: 'Endocrinology',
      source: 'American Diabetes Association',
      lastUpdated: '2023-01-15',
      relevance: 'high',
      url: 'https://example.com/guidelines/diabetes'
    },
    {
      id: '2',
      title: 'Hypertension Treatment Guidelines',
      description: 'Updated guidelines for the diagnosis and treatment of hypertension, including lifestyle modifications and pharmacological interventions.',
      category: 'Cardiology',
      source: 'American Heart Association',
      lastUpdated: '2023-02-20',
      relevance: 'high',
      url: 'https://example.com/guidelines/hypertension'
    },
    {
      id: '3',
      title: 'Asthma Management in Adults',
      description: 'Comprehensive guidelines for the diagnosis and management of asthma in adults, including assessment, treatment, and monitoring.',
      category: 'Pulmonology',
      source: 'Global Initiative for Asthma',
      lastUpdated: '2023-03-10',
      relevance: 'medium',
      url: 'https://example.com/guidelines/asthma'
    }
  ];

  // Mock data for drug interactions
  const drugInteractions: DrugInteraction[] = [
    {
      id: '1',
      drug1: 'Metformin',
      drug2: 'ACE Inhibitors',
      severity: 'moderate',
      description: 'ACE inhibitors may enhance the hypoglycemic effect of metformin.',
      recommendation: 'Monitor blood glucose levels closely when these medications are used together.',
      source: 'Drug Interactions Database'
    },
    {
      id: '2',
      drug1: 'Warfarin',
      drug2: 'NSAIDs',
      severity: 'severe',
      description: 'NSAIDs may increase the risk of bleeding when used with warfarin.',
      recommendation: 'Avoid concurrent use if possible. If necessary, monitor INR more frequently.',
      source: 'Drug Interactions Database'
    },
    {
      id: '3',
      drug1: 'Statins',
      drug2: 'Grapefruit Juice',
      severity: 'moderate',
      description: 'Grapefruit juice may increase the concentration of statins in the blood.',
      recommendation: 'Advise patients to avoid grapefruit juice while taking statins.',
      source: 'Drug Interactions Database'
    }
  ];

  // Mock data for clinical alerts
  const clinicalAlerts: ClinicalAlert[] = [
    {
      id: '1',
      type: 'warning',
      title: 'Potential Drug Interaction',
      message: 'Patient is taking medications that may interact with the prescribed treatment.',
      timestamp: '2023-05-15T10:30:00',
      source: 'Clinical Decision Support System',
      priority: 'high'
    },
    {
      id: '2',
      type: 'info',
      title: 'New Research Available',
      message: 'New research article published on the treatment of the patient\'s condition.',
      timestamp: '2023-05-14T15:45:00',
      source: 'Medical Literature Database',
      priority: 'medium'
    },
    {
      id: '3',
      type: 'success',
      title: 'Treatment Guideline Update',
      message: 'Updated treatment guidelines available for the patient\'s condition.',
      timestamp: '2023-05-13T09:15:00',
      source: 'Clinical Guidelines Database',
      priority: 'medium'
    }
  ];

  // Mock data for research articles
  const researchArticles: ResearchArticle[] = [
    {
      id: '1',
      title: 'Novel Approaches to Diabetes Management',
      authors: ['Smith, J.', 'Johnson, A.', 'Williams, B.'],
      journal: 'Journal of Endocrinology',
      publicationDate: '2023-04-15',
      abstract: 'This study evaluates the effectiveness of novel approaches to diabetes management, including lifestyle interventions and pharmacological treatments.',
      keywords: ['diabetes', 'management', 'treatment', 'lifestyle'],
      url: 'https://example.com/research/diabetes',
      relevance: 'high'
    },
    {
      id: '2',
      title: 'Advances in Hypertension Treatment',
      authors: ['Brown, R.', 'Davis, M.', 'Wilson, L.'],
      journal: 'Cardiology Today',
      publicationDate: '2023-03-20',
      abstract: 'A comprehensive review of recent advances in the treatment of hypertension, including new pharmacological options and treatment strategies.',
      keywords: ['hypertension', 'treatment', 'pharmacology', 'management'],
      url: 'https://example.com/research/hypertension',
      relevance: 'medium'
    },
    {
      id: '3',
      title: 'Asthma Management in the Modern Era',
      authors: ['Taylor, K.', 'Anderson, P.', 'Martin, S.'],
      journal: 'Pulmonary Medicine Review',
      publicationDate: '2023-02-10',
      abstract: 'This article discusses modern approaches to asthma management, focusing on personalized treatment strategies and emerging therapies.',
      keywords: ['asthma', 'management', 'treatment', 'personalized medicine'],
      url: 'https://example.com/research/asthma',
      relevance: 'high'
    }
  ];

  const getRelevanceColor = (relevance: string) => {
    switch (relevance) {
      case 'high':
        return 'bg-primary/20 text-primary';
      case 'medium':
        return 'bg-accent/20 text-accent-foreground';
      case 'low':
        return 'bg-muted/20 text-muted-foreground';
      default:
        return 'bg-muted/20 text-muted-foreground';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'severe':
        return 'bg-destructive/20 text-destructive';
      case 'moderate':
        return 'bg-accent/20 text-accent-foreground';
      case 'mild':
        return 'bg-primary/20 text-primary';
      default:
        return 'bg-muted/20 text-muted-foreground';
    }
  };

  const getAlertTypeColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'bg-accent/20 text-accent-foreground';
      case 'info':
        return 'bg-primary/20 text-primary';
      case 'success':
        return 'bg-primary/20 text-primary';
      case 'error':
        return 'bg-destructive/20 text-destructive';
      default:
        return 'bg-muted/20 text-muted-foreground';
    }
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <WarningIcon className="h-5 w-5 text-accent-foreground" />;
      case 'info':
        return <InfoIcon className="h-5 w-5 text-primary" />;
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-primary" />;
      case 'error':
        return <CancelIcon className="h-5 w-5 text-destructive" />;
      default:
        return <InfoIcon className="h-5 w-5 text-primary" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    });
  };

  const renderGuidelines = () => {
    const filteredGuidelines = clinicalGuidelines.filter(guideline => 
      (selectedCategory === 'all' || guideline.category === selectedCategory) &&
      (guideline.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
       guideline.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search guidelines..."
              className="w-full pl-10 pr-4 py-2 border border-border/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <SearchIcon className="h-5 w-5 text-muted-foreground/50 absolute left-3 top-2.5" />
          </div>
          <select
            className="block w-full sm:w-64 rounded-lg border-border/40 shadow-sm focus:border-primary focus:ring-blue-500 py-2 pl-3 pr-10"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            <option value="Endocrinology">Endocrinology</option>
            <option value="Cardiology">Cardiology</option>
            <option value="Pulmonology">Pulmonology</option>
          </select>
        </div>
        {filteredGuidelines.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGuidelines.map(guideline => (
              <div key={guideline.id} className="bg-primary-foreground rounded-lg shadow-sm border border-border/30 overflow-hidden hover:shadow-md transition-shadow duration-200">
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-medium text-muted-foreground">{guideline.title}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRelevanceColor(guideline.relevance)}`}>
                      {guideline.relevance.charAt(0).toUpperCase() + guideline.relevance.slice(1)} Relevance
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{guideline.description}</p>
                  <div className="mt-4 flex items-center text-xs text-muted-foreground">
                    <MenuBookIcon className="h-4 w-4 mr-1" />
                    <span>{guideline.source}</span>
                    <span className="mx-2">•</span>
                    <SchoolIcon className="h-4 w-4 mr-1" />
                    <span>Updated {formatDate(guideline.lastUpdated)}</span>
                  </div>
                </div>
                <div className="px-4 py-3 bg-muted/10 border-t border-border/30">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-muted-foreground">{guideline.category}</span>
                    <a 
                      href={guideline.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-primary hover:text-primary"
                    >
                      View Guideline
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <MenuBookIcon className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <h3 className="mt-2 text-sm font-medium text-muted-foreground">No guidelines found</h3>
            <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search or filter criteria.</p>
          </div>
        )}
      </div>
    );
  };

  const renderDrugInteractions = () => {
    const filteredInteractions = drugInteractions.filter(interaction => 
      interaction.drug1.toLowerCase().includes(searchTerm.toLowerCase()) ||
      interaction.drug2.toLowerCase().includes(searchTerm.toLowerCase()) ||
      interaction.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="space-y-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search drug interactions..."
            className="w-full pl-10 pr-4 py-2 border border-border/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-primary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <MedicationIcon className="h-5 w-5 text-muted-foreground/50 absolute left-3 top-2.5" />
        </div>
        {filteredInteractions.length > 0 ? (
          <div className="space-y-4">
            {filteredInteractions.map(interaction => (
              <div key={interaction.id} className="bg-primary-foreground rounded-lg shadow-sm border border-border/30 overflow-hidden">
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium text-muted-foreground">{interaction.drug1} + {interaction.drug2}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{interaction.description}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(interaction.severity)}`}>
                      {interaction.severity.charAt(0).toUpperCase() + interaction.severity.slice(1)} Severity
                    </span>
                  </div>
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Recommendation:</h4>
                    <p className="mt-1 text-sm text-muted-foreground">{interaction.recommendation}</p>
                  </div>
                  <div className="mt-4 flex items-center text-xs text-muted-foreground">
                    <MenuBookIcon className="h-4 w-4 mr-1" />
                    <span>Source: {interaction.source}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <MedicationIcon className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <h3 className="mt-2 text-sm font-medium text-muted-foreground">No drug interactions found</h3>
            <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search criteria.</p>
          </div>
        )}
      </div>
    );
  };

  const renderClinicalAlerts = () => {
    const filteredAlerts = clinicalAlerts.filter(alert => 
      alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.message.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="space-y-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search clinical alerts..."
            className="w-full pl-10 pr-4 py-2 border border-border/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-primary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <WarningIcon className="h-5 w-5 text-muted-foreground/50 absolute left-3 top-2.5" />
        </div>
        {filteredAlerts.length > 0 ? (
          <div className="space-y-4">
            {filteredAlerts.map(alert => (
              <div key={alert.id} className="bg-primary-foreground rounded-lg shadow-sm border border-border/30 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      {getAlertTypeIcon(alert.type)}
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className="text-lg font-medium text-muted-foreground">{alert.title}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAlertTypeColor(alert.type)}`}>
                          {alert.type.charAt(0).toUpperCase() + alert.type.slice(1)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{alert.message}</p>
                      <div className="mt-2 flex items-center text-xs text-muted-foreground">
                        <SchoolIcon className="h-4 w-4 mr-1" />
                        <span>{formatDateTime(alert.timestamp)}</span>
                        <span className="mx-2">•</span>
                        <MenuBookIcon className="h-4 w-4 mr-1" />
                        <span>Source: {alert.source}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <WarningIcon className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <h3 className="mt-2 text-sm font-medium text-muted-foreground">No clinical alerts found</h3>
            <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search criteria.</p>
          </div>
        )}
      </div>
    );
  };

  const renderResearchArticles = () => {
    const filteredArticles = researchArticles.filter(article => 
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.abstract.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
      <div className="space-y-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search research articles..."
            className="w-full pl-10 pr-4 py-2 border border-border/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-primary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <SchoolIcon className="h-5 w-5 text-muted-foreground/50 absolute left-3 top-2.5" />
        </div>
        {filteredArticles.length > 0 ? (
          <div className="space-y-4">
            {filteredArticles.map(article => (
              <div key={article.id} className="bg-primary-foreground rounded-lg shadow-sm border border-border/30 overflow-hidden">
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-medium text-muted-foreground">{article.title}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRelevanceColor(article.relevance)}`}>
                      {article.relevance.charAt(0).toUpperCase() + article.relevance.slice(1)} Relevance
                    </span>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-muted-foreground">
                    <MenuBookIcon className="h-4 w-4 mr-1" />
                    <span>{article.authors.join(', ')}</span>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-muted-foreground">
                    <SchoolIcon className="h-4 w-4 mr-1" />
                    <span>{article.journal}</span>
                    <span className="mx-2">•</span>
                    <SchoolIcon className="h-4 w-4 mr-1" />
                    <span>{formatDate(article.publicationDate)}</span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{article.abstract}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {article.keywords.map((keyword, index) => (
                      <span 
                        key={index}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="px-4 py-3 bg-muted/10 border-t border-border/30">
                  <a 
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary hover:text-primary"
                  >
                    Read Full Article
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <SchoolIcon className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <h3 className="mt-2 text-sm font-medium text-muted-foreground">No research articles found</h3>
            <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search criteria.</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-muted/10 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-primary-foreground rounded-xl shadow-sm overflow-hidden">
          <div className="border-b border-border/30">
            <nav className="flex -mb-px">
              <button
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                  activeTab === 'guidelines'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted/20'
                }`}
                onClick={() => setActiveTab('guidelines')}
              >
                <MenuBookIcon className="h-5 w-5" />
                <span>Guidelines</span>
              </button>
              <button
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                  activeTab === 'interactions'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted/20'
                }`}
                onClick={() => setActiveTab('interactions')}
              >
                <MedicationIcon className="h-5 w-5" />
                <span>Interactions</span>
              </button>
              <button
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                  activeTab === 'alerts'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted/20'
                }`}
                onClick={() => setActiveTab('alerts')}
              >
                <WarningIcon className="h-5 w-5" />
                <span>Alerts</span>
              </button>
              <button
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                  activeTab === 'research'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted/20'
                }`}
                onClick={() => setActiveTab('research')}
              >
                <SchoolIcon className="h-5 w-5" />
                <span>Research</span>
              </button>
            </nav>
          </div>
          <div className="p-6">
            {activeTab === 'guidelines' && renderGuidelines()}
            {activeTab === 'interactions' && renderDrugInteractions()}
            {activeTab === 'alerts' && renderClinicalAlerts()}
            {activeTab === 'research' && renderResearchArticles()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClinicalDecisionSupport; 