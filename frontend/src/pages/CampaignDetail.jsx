import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { campaignService } from '../services/api.js';
import { Toaster, toast } from 'react-hot-toast';
import { IoArrowBack, IoPencil, IoTrash, IoPlay } from 'react-icons/io5';
import CampaignStats from '../components/CampaignStats.jsx';
import '../styles/Detail.css';

function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(null);

  useEffect(() => {
    fetchCampaignDetail();
  }, [id]);

  const fetchCampaignDetail = async () => {
    setLoading(true);
    try {
      const response = await campaignService.getById(id);
      setCampaign(response.data);
      setEditData(response.data);

      // Fetch stats если доступно
      const statsResponse = await campaignService.getStats(id);
      setStats(statsResponse.data);
    } catch (err) {
      setError(err.message);
      toast.error('Failed to load campaign');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this campaign?')) {
      try {
        await campaignService.delete(id);
        toast.success('Campaign deleted');
        navigate('/dashboard');
      } catch (err) {
        toast.error(err.message);
      }
    }
  };

  const handleSaveEdit = async () => {
    try {
      await campaignService.update(id, editData);
      setCampaign(editData);
      setIsEditing(false);
      toast.success('Campaign updated');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await campaignService.update(id, { status: newStatus });
      setCampaign({ ...campaign, status: newStatus });
      toast.success(`Campaign ${newStatus.toLowerCase()}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <div className="detail-container"><p>Loading...</p></div>;
  if (!campaign) return <div className="detail-container"><p>Campaign not found</p></div>;

  return (
    <div className="detail-container">
      <Toaster position="top-right" />

      <div className="detail-header">
        <button className="btn-back" onClick={() => navigate('/dashboard')}>
          <IoArrowBack /> Back
        </button>
        <h1>📬 {campaign.name}</h1>
        <div className="detail-actions">
          <button
            className="btn-icon"
            onClick={() => setIsEditing(!isEditing)}
          >
            <IoPencil /> Edit
          </button>
          <button
            className="btn-icon btn-danger"
            onClick={handleDelete}
          >
            <IoTrash /> Delete
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="detail-content">
        {/* Main Campaign Info */}
        <section className="detail-section">
          <h2>📋 Campaign Information</h2>
          {!isEditing ? (
            <div className="info-grid">
              <div className="info-item">
                <label>Name</label>
                <p>{campaign.name}</p>
              </div>
              <div className="info-item">
                <label>Template</label>
                <p>{campaign.template_name}</p>
              </div>
              <div className="info-item">
                <label>Status</label>
                <p>
                  <span className={`badge badge-${campaign.status.toLowerCase()}`}>
                    {campaign.status}
                  </span>
                </p>
              </div>
              <div className="info-item">
                <label>Target Lead Status</label>
                <p>{campaign.target_lead_status || '-'}</p>
              </div>
              <div className="info-item">
                <label>Created By</label>
                <p>{campaign.created_by_name}</p>
              </div>
              <div className="info-item">
                <label>Created Date</label>
                <p>{new Date(campaign.created_at).toLocaleString()}</p>
              </div>
            </div>
          ) : (
            <div className="edit-form">
              <div className="form-group">
                <label>Campaign Name</label>
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Target Lead Status</label>
                <select
                  value={editData.target_lead_status || ''}
                  onChange={(e) => setEditData({ ...editData, target_lead_status: e.target.value })}
                >
                  <option value="">Any</option>
                  <option value="NEW">New</option>
                  <option value="CONTACTED">Contacted</option>
                  <option value="INTERESTED">Interested</option>
                  <option value="FOLLOW_UP">Follow-up</option>
                  <option value="REGISTERED">Registered</option>
                </select>
              </div>
              <div className="form-actions">
                <button className="btn-primary" onClick={handleSaveEdit}>
                  Save Changes
                </button>
                <button className="btn-secondary" onClick={() => setIsEditing(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Campaign Statistics */}
        {stats && (
          <section className="detail-section">
            <h2>📊 Campaign Statistics</h2>
            <CampaignStats stats={stats} />
          </section>
        )}

        {/* Status Control */}
        <section className="detail-section">
          <h2>⚙️ Campaign Status</h2>
          <div className="current-status" style={{ marginBottom: '1.5rem' }}>
            <p className="label">Current Status:</p>
            <p className={`status-chip badge-${campaign.status.toLowerCase()}`}>
              {campaign.status}
            </p>
          </div>
          <div className="status-controls">
            <button
              className="btn-status"
              onClick={() => handleStatusChange('RUNNING')}
              disabled={campaign.status === 'RUNNING' || ['COMPLETED', 'CANCELLED'].includes(campaign.status)}
            >
              <IoPlay /> Run Campaign
            </button>
            <button
              className="btn-status"
              onClick={() => handleStatusChange('COMPLETED')}
              disabled={!['RUNNING'].includes(campaign.status)}
            >
              Complete
            </button>
            <button
              className="btn-status btn-danger"
              onClick={() => handleStatusChange('CANCELLED')}
              disabled={['COMPLETED', 'CANCELLED'].includes(campaign.status)}
            >
              Cancel
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default CampaignDetail;
