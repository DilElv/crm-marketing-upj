import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { API_BASE_URL, blastService, campaignService, reportService } from '../services/api.js';
import { Toaster, toast } from 'react-hot-toast';
import { IoArrowBack, IoPencil, IoTrash, IoPlay, IoCloudUpload } from 'react-icons/io5';
import CampaignStats from '../components/CampaignStats.jsx';
import CampaignLeadImportModal from '../components/CampaignLeadImportModal.jsx';
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
  const [blastStatus, setBlastStatus] = useState(null);
  const [campaignResult, setCampaignResult] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [resultLoading, setResultLoading] = useState(false);
  const [blastLoading, setBlastLoading] = useState(false);
  const [selectedImportFile, setSelectedImportFile] = useState(null);
  const importFileInputRef = useRef(null);

  const fetchCampaignDetail = useCallback(async () => {
    setLoading(true);
    setError('');
    setStats(null);
    setCampaignResult(null);
    setBlastStatus(null);
    setStatsLoading(true);
    setResultLoading(true);
    setBlastLoading(true);
    try {
      const response = await campaignService.getById(id);
      setCampaign(response.data);
      setEditData(response.data);

      // Render page as soon as main campaign data is available.
      setLoading(false);

      campaignService
        .getStats(id)
        .then((statsResponse) => {
          setStats(statsResponse.data);
        })
        .catch(() => {
          setStats(null);
        })
        .finally(() => {
          setStatsLoading(false);
        });

      reportService
        .getCampaignResult(id)
        .then((resultResponse) => {
          setCampaignResult(resultResponse?.data || null);
        })
        .catch(() => {
          setCampaignResult(null);
        })
        .finally(() => {
          setResultLoading(false);
        });

      blastService
        .getStatus(id)
        .then((blastStatusResponse) => {
          setBlastStatus(blastStatusResponse?.data || null);
        })
        .catch(() => {
          setBlastStatus(null);
        })
        .finally(() => {
          setBlastLoading(false);
        });
    } catch (err) {
      setError(err.message);
      toast.error('Failed to load campaign');
      setStats(null);
      setStatsLoading(false);
      setResultLoading(false);
      setBlastLoading(false);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCampaignDetail();
  }, [fetchCampaignDetail]);

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

  const handlePreviewTargets = async () => {
    try {
      const response = await blastService.previewTargets(id);
      const totalTargets = response?.data?.total_targets || 0;
      toast.success(`Preview ready: ${totalTargets} targets selected`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleStartBlast = async () => {
    try {
      await blastService.start(id, { ratePerSecond: 10, retryAttempts: 3 });
      toast.success('Blast started');
      fetchCampaignDetail();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleRetryFailed = async () => {
    try {
      await blastService.retryFailed(id, { ratePerSecond: 8, retryAttempts: 3 });
      toast.success('Failed messages re-queued');
      fetchCampaignDetail();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDownloadReport = async (type) => {
    try {
      const token = localStorage.getItem('token');
      const url = type === 'csv'
        ? `${API_BASE_URL}/reports/campaigns/${id}/export/csv`
        : `${API_BASE_URL}/reports/campaigns/${id}/export/pdf`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to download report');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = type === 'csv' ? `campaign-${id}-report.csv` : `campaign-${id}-report.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      toast.success(`Report ${type.toUpperCase()} downloaded`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleOpenImportDialog = () => {
    importFileInputRef.current?.click();
  };

  const handleImportFileChange = (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      return;
    }

    const isCsv = selectedFile.name.toLowerCase().endsWith('.csv');
    if (!isCsv) {
      toast.error('Only CSV files are allowed');
      event.target.value = '';
      return;
    }

    setSelectedImportFile(selectedFile);
  };

  const handleCloseImportModal = () => {
    setSelectedImportFile(null);
    if (importFileInputRef.current) {
      importFileInputRef.current.value = '';
    }
  };

  const handleImportedLeads = async (result) => {
    await fetchCampaignDetail();

    const previewResponse = await campaignService.previewContacts(id).catch(() => null);
    const totalTargets = previewResponse?.data?.total_targets;
    const summaryText = totalTargets != null
      ? `Imported ${result.imported}, skipped ${result.skipped}. Total targets: ${totalTargets}`
      : `Imported ${result.imported}, skipped ${result.skipped}`;

    toast.success(summaryText);
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
        <section className="detail-section">
          <h2>📊 Campaign Statistics</h2>
          {statsLoading && (
            <div className="section-skeleton-grid">
              <div className="section-skeleton-card" />
              <div className="section-skeleton-card" />
              <div className="section-skeleton-card" />
              <div className="section-skeleton-card" />
              <div className="section-skeleton-chart" />
              <div className="section-skeleton-chart" />
            </div>
          )}
          {!statsLoading && stats && (
            <div className="section-fade-in">
              <CampaignStats stats={stats} />
            </div>
          )}
          {!statsLoading && !stats && (
            <p className="section-muted-text section-fade-in">Statistics are not available yet for this campaign.</p>
          )}
        </section>

        <section className="detail-section">
          <h2>📈 Campaign Result</h2>
          {resultLoading && (
            <div className="section-skeleton-grid">
              <div className="section-skeleton-card" />
              <div className="section-skeleton-card" />
              <div className="section-skeleton-card" />
              <div className="section-skeleton-card" />
              <div className="section-skeleton-card" />
            </div>
          )}
          {!resultLoading && (
            <div className="info-grid section-fade-in">
              <div className="info-item"><label>Total</label><p>{campaignResult?.totals?.total_messages || 0}</p></div>
              <div className="info-item"><label>Success</label><p>{campaignResult?.totals?.success_messages || 0}</p></div>
              <div className="info-item"><label>Failed</label><p>{campaignResult?.totals?.failed_messages || 0}</p></div>
              <div className="info-item"><label>Read</label><p>{campaignResult?.totals?.read_messages || 0}</p></div>
              <div className="info-item"><label>Delivery Rate</label><p>{campaignResult?.totals?.delivery_rate || 0}%</p></div>
            </div>
          )}
          <div className="status-controls" style={{ marginTop: '1rem' }}>
            <button className="btn-status" onClick={() => handleDownloadReport('csv')}>Export CSV</button>
            <button className="btn-status" onClick={() => handleDownloadReport('pdf')}>Export PDF</button>
            <button className="btn-status" onClick={handleOpenImportDialog}>
              <IoCloudUpload /> Import Leads
            </button>
          </div>
          <input
            ref={importFileInputRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={handleImportFileChange}
          />
        </section>

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
            <button className="btn-status" onClick={handlePreviewTargets}>
              Preview Contacts
            </button>
            <button
              className="btn-status"
              onClick={handleStartBlast}
              disabled={campaign.status === 'RUNNING' || ['COMPLETED', 'CANCELLED'].includes(campaign.status)}
            >
              <IoPlay /> Run Campaign
            </button>
            <button className="btn-status" onClick={handleRetryFailed}>
              Retry Failed
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
          {blastLoading && (
            <div style={{ marginTop: '1rem' }}>
              <small>Loading queue status...</small>
            </div>
          )}
          {!blastLoading && blastStatus && (
            <div className="section-fade-in" style={{ marginTop: '1rem' }}>
              <small>
                Queue active: {blastStatus.queue?.active || 0}, waiting: {blastStatus.queue?.waiting || 0}, failed: {blastStatus.message_stats?.failed || 0}
              </small>
            </div>
          )}
        </section>
      </div>

      {selectedImportFile && (
        <CampaignLeadImportModal
          campaignId={id}
          file={selectedImportFile}
          onClose={handleCloseImportModal}
          onImported={handleImportedLeads}
        />
      )}
    </div>
  );
}

export default CampaignDetail;
