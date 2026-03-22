import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  SelectChangeEvent,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Fade,
  Skeleton,
} from '@mui/material';
import { Grid } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import {
  Refresh as RefreshIcon,
  TrendingUp,
  People as PeopleIcon,
  Female as FemaleIcon,
  Male as MaleIcon,
  LocalHospital as HospitalIcon,
  CalendarToday as CalendarIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import patientService from '../../services/patientService';

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'];
const GENDER_COLORS = {
  Male: '#4facfe',
  Female: '#f093fb',
  Other: '#a8edea'
};

interface PatientStats {
  totalPatients: number;
  byGender: Array<{ name: string; value: number }>;
  byAgeGroup: Array<{ name: string; value: number }>;
  monthlyTrends: Array<{ month: string; newPatients: number; returnPatients: number }>;
  byDepartment: Array<{ name: string; value: number }>;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  gradient: string;
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, gradient, subtitle }) => (
  <Card 
    sx={{ 
      height: '100%',
      background: `linear-gradient(135deg, ${gradient})`,
      color: 'white',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
      '&:hover': {
        transform: 'translateY(-8px)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
      }
    }}
  >
    <CardContent sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Box sx={{ 
          p: 1.5, 
          borderRadius: '50%', 
          bgcolor: 'rgba(255,255,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mr: 2
        }}>
          {icon}
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
            {value}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" sx={{ opacity: 0.7 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

// Enhanced tooltip styles for all charts
const enhancedTooltipStyle = {
  background: 'rgba(255,255,255,0.98)',
  border: 'none',
  borderRadius: '12px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
  minWidth: '280px',
  padding: '20px',
  fontSize: '14px',
  fontWeight: '500'
};

const enhancedLabelStyle = {
  color: '#333',
  fontWeight: '600',
  marginBottom: '12px',
  fontSize: '16px',
  borderBottom: '2px solid #667eea',
  paddingBottom: '8px'
};

export const PatientDemographics: React.FC = () => {
  const [timeRange, setTimeRange] = useState<string>('month');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [patientStats, setPatientStats] = useState<PatientStats>({
    totalPatients: 0,
    byGender: [],
    byAgeGroup: [],
    monthlyTrends: [],
    byDepartment: []
  });

  const fetchPatientStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const stats = await patientService.getPatientStatistics(timeRange);
      setPatientStats(stats);
    } catch (error) {
      console.error('Error fetching patient statistics:', error);
      setError('Failed to load patient demographics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientStats();
  }, [timeRange]);

  const handleTimeRangeChange = (event: SelectChangeEvent) => {
    setTimeRange(event.target.value);
  };

  const handleRefresh = () => {
    fetchPatientStats();
  };

  const getTimeRangeLabel = (range: string) => {
    switch (range) {
      case 'week': return 'Past 7 Days';
      case 'month': return 'Past 30 Days';
      case 'quarter': return 'Past 3 Months';
      case 'year': return 'Past Year';
      default: return 'Past Month';
    }
  };

  const totalNewPatients = patientStats.monthlyTrends?.reduce((sum, item) => sum + (item.newPatients || 0), 0) || 0;
  const totalReturnPatients = patientStats.monthlyTrends?.reduce((sum, item) => sum + (item.returnPatients || 0), 0) || 0;
  const maleCount = patientStats.byGender?.find(g => g.name === 'Male')?.value || 0;
  const femaleCount = patientStats.byGender?.find(g => g.name === 'Female')?.value || 0;

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      pt: 4, 
      pb: 6 
    }}>
      <Container maxWidth="xl">
        {/* Header Section */}
        <Fade in timeout={800}>
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <Typography 
              variant="h3" 
              sx={{ 
                fontWeight: 800,
                background: 'linear-gradient(45deg, #fff 30%, #f0f0f0 90%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 1,
                letterSpacing: '-1px'
              }}
            >
              📊 Patient Demographics
            </Typography>
            <Typography 
              variant="h6" 
              sx={{ 
                color: 'rgba(255,255,255,0.8)',
                fontWeight: 400,
                mb: 3
              }}
            >
              Comprehensive analytics and insights into patient demographics
            </Typography>
            
            {/* Controls */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: 2,
              flexWrap: 'wrap'
            }}>
              <Card sx={{ 
                background: 'rgba(255,255,255,0.1)', 
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)',
                minWidth: '400px'
              }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <FormControl sx={{ minWidth: 320 }}>
                      <InputLabel sx={{ color: 'white' }}>Time Range</InputLabel>
                      <Select
                        value={timeRange}
                        label="Time Range"
                        onChange={handleTimeRangeChange}
                        MenuProps={{
                          PaperProps: {
                            sx: {
                              minWidth: 350,
                              maxWidth: 450,
                              '& .MuiMenuItem-root': {
                                fontSize: '1.1rem',
                                padding: '14px 20px',
                                fontWeight: '500',
                                '&:hover': {
                                  backgroundColor: 'rgba(102, 126, 234, 0.1)',
                                  transform: 'translateX(4px)',
                                  transition: 'all 0.2s ease'
                                },
                                '&.Mui-selected': {
                                  backgroundColor: 'rgba(102, 126, 234, 0.2)',
                                  fontWeight: '600'
                                }
                              }
                            }
                          }
                        }}
                        sx={{
                          color: 'white',
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(255,255,255,0.3)'
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(255,255,255,0.5)'
                          },
                          '& .MuiSvgIcon-root': {
                            color: 'white'
                          }
                        }}
                      >
                        <MenuItem value="week">📅 Last Week</MenuItem>
                        <MenuItem value="month">📊 Last Month</MenuItem>
                        <MenuItem value="quarter">📈 Last Quarter (3 Months)</MenuItem>
                        <MenuItem value="year">🗓️ Last Year</MenuItem>
                      </Select>
                    </FormControl>
                    
                    <Chip 
                      label={getTimeRangeLabel(timeRange)}
                      sx={{ 
                        background: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        padding: '8px'
                      }}
                    />
                    
                    <Tooltip title="Refresh Data" arrow>
                      <IconButton 
                        onClick={handleRefresh}
                        disabled={loading}
                        sx={{ 
                          color: 'white',
                          background: 'rgba(255,255,255,0.1)',
                          '&:hover': {
                            background: 'rgba(255,255,255,0.2)',
                            transform: 'rotate(180deg)'
                          },
                          transition: 'all 0.3s ease'
                        }}
                      >
                        <RefreshIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Box>
        </Fade>

        {/* Error Alert */}
        {error && (
          <Fade in timeout={600}>
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3,
                borderRadius: 3,
                background: 'rgba(244, 67, 54, 0.1)',
                border: '1px solid rgba(244, 67, 54, 0.3)',
                color: 'white'
              }}
            >
              {error}
            </Alert>
          </Fade>
        )}

        {/* Statistics Cards */}
        <Fade in timeout={1000}>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{xs: 12, sm: 6, md: 3}}>
              {loading ? (
                <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
              ) : (
                <StatCard
                  title="Total Patients"
                  value={patientStats.totalPatients}
                  icon={<PeopleIcon sx={{ fontSize: 28 }} />}
                  gradient="#667eea, #764ba2"
                  subtitle={getTimeRangeLabel(timeRange)}
                />
              )}
            </Grid>
            <Grid size={{xs: 12, sm: 6, md: 3}}>
              {loading ? (
                <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
              ) : (
                <StatCard
                  title="New Patients"
                  value={totalNewPatients}
                  icon={<TrendingUp sx={{ fontSize: 28 }} />}
                  gradient="#f093fb, #f5576c"
                  subtitle="First-time visits"
                />
              )}
            </Grid>
            <Grid size={{xs: 12, sm: 6, md: 3}}>
              {loading ? (
                <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
              ) : (
                <StatCard
                  title="Return Patients"
                  value={totalReturnPatients}
                  icon={<CalendarIcon sx={{ fontSize: 28 }} />}
                  gradient="#4facfe, #00f2fe"
                  subtitle="Follow-up visits"
                />
              )}
            </Grid>
            <Grid size={{xs: 12, sm: 6, md: 3}}>
              {loading ? (
                <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
              ) : (
                <StatCard
                  title="Departments"
                  value={patientStats.byDepartment?.length || 0}
                  icon={<HospitalIcon sx={{ fontSize: 28 }} />}
                  gradient="#a8edea, #fed6e3"
                  subtitle="Active departments"
                />
              )}
            </Grid>
          </Grid>
        </Fade>

        {/* Charts Grid */}
        <Grid container spacing={3}>
          {/* Monthly Patient Trends */}
          <Grid size={{xs: 12}}>
            <Fade in timeout={1200}>
              <Card sx={{ 
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(20px)',
                borderRadius: 3,
                border: '1px solid rgba(255,255,255,0.2)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <AssessmentIcon sx={{ mr: 1, color: '#667eea' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#333' }}>
                      Monthly Patient Trends
                    </Typography>
                  </Box>
                  {loading ? (
                    <Skeleton variant="rectangular" height={350} />
                  ) : (
                    <Box sx={{ height: 350 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={patientStats.monthlyTrends || []}>
                          <defs>
                            <linearGradient id="newPatients" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#667eea" stopOpacity={0.1}/>
                            </linearGradient>
                            <linearGradient id="returnPatients" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f093fb" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#f093fb" stopOpacity={0.1}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                          <XAxis 
                            dataKey="month" 
                            tick={{ fontSize: 12 }}
                            stroke="#666"
                          />
                          <YAxis 
                            tick={{ fontSize: 12 }}
                            stroke="#666"
                          />
                          <RechartsTooltip 
                            contentStyle={enhancedTooltipStyle}
                            labelStyle={enhancedLabelStyle}
                            formatter={(value, name) => [
                              `${value} patients`,
                              name === 'newPatients' ? '🆕 New Patients' : '🔄 Return Patients'
                            ]}
                          />
                          <Legend />
                          <Area
                            type="monotone"
                            dataKey="newPatients"
                            stroke="#667eea"
                            fillOpacity={1}
                            fill="url(#newPatients)"
                            name="New Patients"
                            strokeWidth={3}
                          />
                          <Area
                            type="monotone"
                            dataKey="returnPatients"
                            stroke="#f093fb"
                            fillOpacity={1}
                            fill="url(#returnPatients)"
                            name="Return Patients"
                            strokeWidth={3}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Fade>
          </Grid>

          {/* Gender Distribution */}
          <Grid size={{xs: 12, md: 6}}>
            <Fade in timeout={1400}>
              <Card sx={{ 
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(20px)',
                borderRadius: 3,
                border: '1px solid rgba(255,255,255,0.2)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                height: '100%'
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                      <MaleIcon sx={{ color: '#4facfe', mr: 0.5 }} />
                      <FemaleIcon sx={{ color: '#f093fb' }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#333' }}>
                      Gender Distribution
                    </Typography>
                  </Box>
                  {loading ? (
                    <Skeleton variant="rectangular" height={300} />
                  ) : (
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={patientStats.byGender || []}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {patientStats.byGender?.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={GENDER_COLORS[entry.name as keyof typeof GENDER_COLORS] || COLORS[index % COLORS.length]} 
                              />
                            )) || []}
                          </Pie>
                          <RechartsTooltip 
                            contentStyle={enhancedTooltipStyle}
                            labelStyle={enhancedLabelStyle}
                            formatter={(value, name) => [
                              `${value} patients (${(((Number(value) || 0) / (patientStats.totalPatients || 1)) * 100).toFixed(1)}%)`,
                              name === 'Male' ? '👨 Male' : name === 'Female' ? '👩 Female' : '👤 Other'
                            ]}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Fade>
          </Grid>

          {/* Age Distribution */}
          <Grid size={{xs: 12, md: 6}}>
            <Fade in timeout={1600}>
              <Card sx={{ 
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(20px)',
                borderRadius: 3,
                border: '1px solid rgba(255,255,255,0.2)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                height: '100%'
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <CalendarIcon sx={{ mr: 1, color: '#f093fb' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#333' }}>
                      Age Distribution
                    </Typography>
                  </Box>
                  {loading ? (
                    <Skeleton variant="rectangular" height={300} />
                  ) : (
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={patientStats.byAgeGroup || []}>
                          <defs>
                            <linearGradient id="ageBar" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f093fb" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#f5576c" stopOpacity={0.8}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                          <XAxis 
                            dataKey="name" 
                            tick={{ fontSize: 12 }}
                            stroke="#666"
                          />
                          <YAxis 
                            tick={{ fontSize: 12 }}
                            stroke="#666"
                          />
                          <RechartsTooltip 
                            contentStyle={enhancedTooltipStyle}
                            labelStyle={enhancedLabelStyle}
                            formatter={(value, name) => [
                              `${value} patients`,
                              `👥 Age Group`
                            ]}
                            labelFormatter={(label) => `📅 Age Range: ${label} years`}
                          />
                          <Legend />
                          <Bar 
                            dataKey="value" 
                            fill="url(#ageBar)" 
                            name="Patients"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Fade>
          </Grid>

          {/* Department Distribution */}
          <Grid size={{xs: 12}}>
            <Fade in timeout={1800}>
              <Card sx={{ 
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(20px)',
                borderRadius: 3,
                border: '1px solid rgba(255,255,255,0.2)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <HospitalIcon sx={{ mr: 1, color: '#4facfe' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#333' }}>
                      Patients by Department
                    </Typography>
                  </Box>
                  {loading ? (
                    <Skeleton variant="rectangular" height={350} />
                  ) : (
                    <Box sx={{ height: 350 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={patientStats.byDepartment || []} layout="vertical">
                          <defs>
                            <linearGradient id="deptBar" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="5%" stopColor="#4facfe" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#00f2fe" stopOpacity={0.8}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                          <XAxis 
                            type="number" 
                            tick={{ fontSize: 12 }}
                            stroke="#666"
                          />
                          <YAxis 
                            dataKey="name" 
                            type="category" 
                            width={150}
                            tick={{ fontSize: 12 }}
                            stroke="#666"
                          />
                          <RechartsTooltip 
                            contentStyle={enhancedTooltipStyle}
                            labelStyle={enhancedLabelStyle}
                            formatter={(value, name) => [
                              `${value} patients`,
                              `🏥 Department`
                            ]}
                            labelFormatter={(label) => `🏥 ${label} Department`}
                          />
                          <Legend />
                          <Bar 
                            dataKey="value" 
                            fill="url(#deptBar)" 
                            name="Patients"
                            radius={[0, 4, 4, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Fade>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}; 