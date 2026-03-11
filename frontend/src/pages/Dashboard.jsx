import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { campaignService, leadService } from '../services/api';
import CampaignList from '../components/CampaignList.jsx';
import CampaignForm from '../components/CampaignForm.jsx';
import LeadList from '../components/LeadList.jsx';
import LeadForm from '../components/LeadForm.jsx';
import LeadImportForm from '../components/LeadImportForm.jsx';
import '../styles/Dashboard.css';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('campaigns');
  const [campaigns, setCampaigns] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
  }, [navigate]);

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

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const response = await leadService.getAll(1, 20);
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

  if (!user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--neutral-500)' }}>
          <p>⏳ Loading...</p>
        </div>
      </div>
    );
  }

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
