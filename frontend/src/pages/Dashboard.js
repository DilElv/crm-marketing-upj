import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { campaignService, leadService } from '../services/api';
import CampaignList from '../components/CampaignList';
import CampaignForm from '../components/CampaignForm';
import LeadList from '../components/LeadList';
import '../styles/Dashboard.css';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('campaigns');
  const [campaigns, setCampaigns] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCampaignForm, setShowCampaignForm] = useState(false);
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

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>CRM Marketing Dashboard</h1>
          <div className="user-info">
            <span>{user.email} ({user.role})</span>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        <nav className="tabs">
          <button
            className={`tab ${activeTab === 'campaigns' ? 'active' : ''}`}
            onClick={() => setActiveTab('campaigns')}
          >
            Campaigns
          </button>
          <button
            className={`tab ${activeTab === 'leads' ? 'active' : ''}`}
            onClick={() => setActiveTab('leads')}
          >
            Leads
          </button>
        </nav>

        {error && <div className="error-message">{error}</div>}

        <div className="tab-content">
          {activeTab === 'campaigns' && (
            <div className="campaigns-section">
              <div className="section-header">
                <h2>Campaigns</h2>
                {user.role === 'ADMIN' && (
                  <button
                    onClick={() => setShowCampaignForm(!showCampaignForm)}
                    className="btn-primary"
                  >
                    {showCampaignForm ? 'Cancel' : 'New Campaign'}
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
                <div>Loading campaigns...</div>
              ) : (
                <CampaignList campaigns={campaigns} />
              )}
            </div>
          )}

          {activeTab === 'leads' && (
            <div className="leads-section">
              <div className="section-header">
                <h2>Leads</h2>
              </div>

              {loading ? (
                <div>Loading leads...</div>
              ) : (
                <LeadList leads={leads} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
