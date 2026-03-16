import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { campaignService, leadService, dashboardService } from '../services/api';
import CampaignList from '../components/CampaignList.jsx';
import CampaignForm from '../components/CampaignForm.jsx';
import LeadList from '../components/LeadList.jsx';
import LeadForm from '../components/LeadForm.jsx';
import LeadImportForm from '../components/LeadImportForm.jsx';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import '../styles/Dashboard.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

function Dashboard() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('campaigns');
  const [campaigns, setCampaigns] = useState([]);
  const [leads, setLeads] = useState([]);
  const [leadSearch, setLeadSearch] = useState('');
  const [leadStatus, setLeadStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState(null);
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      navigate('/login');
      return;
    }
    setUser(JSON.parse(storedUser));
    fetchCampaigns();
    fetchLeads();
    fetchOverview();
  }, [navigate]);

  const fetchOverview = async () => {
    try {
      const response = await dashboardService.getOverview();
      setOverview(response.data || null);
    } catch (err) {
      // Keep dashboard functional even if analytics endpoint is not available.
      console.error('Overview error:', err.message);
    }
  };

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const response = await campaignService.getAll(1, 20);
      setCampaigns(response.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeads = async (filters = {}) => {
    setLoading(true);
    try {
      const response = await leadService.getAll(1, 20, filters);
      setLeads(response.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleCreateCampaign = async (campaignData) => {
    try {
      await campaignService.create(
        campaignData.name,
        campaignData.templateName,
        campaignData.targetLeadStatus,
        campaignData.parameters
      );
      setShowCampaignForm(false);
      fetchCampaigns();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateLead = async (leadData) => {
    try {
      await leadService.create(leadData);
      setShowLeadForm(false);
      fetchLeads();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleApplyLeadFilters = () => {
    fetchLeads({
      search: leadSearch,
      status: leadStatus,
    });
  };

  if (!user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--neutral-500)' }}>
          <p>⏳ Loading...</p>
        </div>
      </div>
    );
  }

  const totals = overview?.totals || {};
  const performanceRows = overview?.charts?.campaign_performance || [];

  const successFailedData = {
    labels: ['Success', 'Failed'],
    datasets: [
      {
        data: [
          overview?.charts?.success_vs_failed?.success || 0,
          overview?.charts?.success_vs_failed?.failed || 0,
        ],
        backgroundColor: ['rgba(46, 204, 113, 0.8)', 'rgba(231, 76, 60, 0.8)'],
        borderWidth: 1,
      },
    ],
  };

  const campaignPerformanceData = {
    labels: performanceRows.map((row) => row.name || 'Unnamed').slice(0, 6),
    datasets: [
      {
        label: 'Success',
        data: performanceRows.map((row) => row.success_messages || 0).slice(0, 6),
        backgroundColor: 'rgba(52, 152, 219, 0.7)',
      },
      {
        label: 'Failed',
        data: performanceRows.map((row) => row.failed_messages || 0).slice(0, 6),
        backgroundColor: 'rgba(230, 126, 34, 0.7)',
      },
    ],
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>🚀 CRM Marketing Dashboard</h1>
          <div className="user-info">
            <span>👤 {user.email}</span>
            <span style={{ background: 'var(--primary-light)', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', fontWeight: '600', color: 'var(--primary)' }}>
              {user.role === 'ADMIN' ? '👨‍💼 Admin' : '📊 Marketing'}
            </span>
            <button onClick={handleLogout} className="logout-btn">🚪 Logout</button>
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        <section style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
            <div className="stat-card"><p className="stat-label">Total Campaigns</p><p className="stat-value">{totals.total_campaigns || 0}</p></div>
            <div className="stat-card"><p className="stat-label">Messages Sent</p><p className="stat-value">{totals.messages_sent || 0}</p></div>
            <div className="stat-card"><p className="stat-label">Successful</p><p className="stat-value">{totals.successful_messages || 0}</p></div>
            <div className="stat-card"><p className="stat-label">Failed</p><p className="stat-value">{totals.failed_messages || 0}</p></div>
            <div className="stat-card"><p className="stat-label">Read (Blue Tick)</p><p className="stat-value">{totals.read_messages || 0}</p></div>
            <div className="stat-card"><p className="stat-label">Created Today</p><p className="stat-value">{totals.campaigns_created_today || 0}</p></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem', marginTop: '0.75rem' }}>
            <div style={{ background: '#fff', borderRadius: '12px', padding: '0.75rem 1rem' }}>
              <h4 style={{ marginBottom: '0.75rem' }}>Success vs Failed</h4>
              <Pie data={successFailedData} />
            </div>
            <div style={{ background: '#fff', borderRadius: '12px', padding: '0.75rem 1rem' }}>
              <h4 style={{ marginBottom: '0.75rem' }}>Campaign Performance</h4>
              <Bar data={campaignPerformanceData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
            </div>
          </div>
        </section>

        <nav className="tabs">
          <button
            className={`tab ${activeTab === 'campaigns' ? 'active' : ''}`}
            onClick={() => setActiveTab('campaigns')}
          >
            📬 Campaigns
          </button>
          <button
            className={`tab ${activeTab === 'leads' ? 'active' : ''}`}
            onClick={() => setActiveTab('leads')}
          >
            🎯 Leads
          </button>
        </nav>

        {error && (
          <div className="error-message">
            ⚠️ {error}
            <button 
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}
              onClick={() => setError('')}
            >
              ✕
            </button>
          </div>
        )}

        <div className="tab-content">
          {activeTab === 'campaigns' && (
            <div className="campaigns-section">
              <div className="section-header">
                <div>
                  <h2>📬 Campaigns</h2>
                  <p style={{ color: 'var(--neutral-500)', margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>
                    Manage your marketing campaigns and track performance
                  </p>
                </div>
                {user.role === 'ADMIN' && (
                  <button
                    onClick={() => setShowCampaignForm(!showCampaignForm)}
                    className="btn-primary"
                  >
                    {showCampaignForm ? '✕ Cancel' : '✨ New Campaign'}
                  </button>
                )}
              </div>

              {showCampaignForm && (
                <CampaignForm
                  onSubmit={handleCreateCampaign}
                  onCancel={() => setShowCampaignForm(false)}
                />
              )}

              {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--neutral-500)' }}>
                  ⏳ Loading campaigns...
                </div>
              ) : (
                <CampaignList campaigns={campaigns} />
              )}
            </div>
          )}

          {activeTab === 'leads' && (
            <div className="leads-section">
              <div className="section-header">
                <div>
                  <h2>🎯 Leads</h2>
                  <p style={{ color: 'var(--neutral-500)', margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>
                    View and manage all your leads in one place
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <input
                    type="text"
                    placeholder="Search name / phone / email"
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                    style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #ddd' }}
                  />
                  <select
                    value={leadStatus}
                    onChange={(e) => setLeadStatus(e.target.value)}
                    style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #ddd' }}
                  >
                    <option value="">All Status</option>
                    <option value="NEW">NEW</option>
                    <option value="CONTACTED">CONTACTED</option>
                    <option value="INTERESTED">INTERESTED</option>
                    <option value="FOLLOW_UP">FOLLOW_UP</option>
                    <option value="REGISTERED">REGISTERED</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                  <button
                    onClick={handleApplyLeadFilters}
                    className="btn-primary"
                    style={{ background: '#374151' }}
                  >
                    Filter
                  </button>
                  <button
                    onClick={() => setShowImportForm(true)}
                    className="btn-primary"
                    style={{ background: 'var(--secondary)' }}
                  >
                    📊 Import CSV
                  </button>
                  <button
                    onClick={() => setShowLeadForm(!showLeadForm)}
                    className="btn-primary"
                  >
                    {showLeadForm ? '✕ Cancel' : '✨ New Lead'}
                  </button>
                </div>
              </div>

              {showLeadForm && (
                <LeadForm
                  onSubmit={handleCreateLead}
                  onCancel={() => setShowLeadForm(false)}
                />
              )}

              {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--neutral-500)' }}>
                  ⏳ Loading leads...
                </div>
              ) : (
                <LeadList leads={leads} />
              )}
            </div>
          )}
        </div>
      </div>

      {showImportForm && (
        <LeadImportForm
          onClose={() => setShowImportForm(false)}
          onSuccess={fetchLeads}
        />
      )}
    </div>
  );
}

export default Dashboard;
