import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { leadService } from '../services/api.js';
import { Toaster, toast } from 'react-hot-toast';
import { IoArrowBack, IoPencil, IoTrash } from 'react-icons/io5';
import LeadHistory from '../components/LeadHistory.jsx';
import '../styles/Detail.css';

function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(null);
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);

  const fetchLeadDetail = useCallback(async () => {
    setLoading(true);
    try {
      const [leadResponse, historyResponse] = await Promise.all([
        leadService.getById(id),
        leadService.getHistory(id).catch(() => ({ data: [] }))
      ]);
      
      setLead(leadResponse.data);
      setEditData(leadResponse.data);
      setHistory(historyResponse.data || []);
    } catch (err) {
      setError(err.message);
      toast.error('Failed to load lead');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLeadDetail();
  }, [fetchLeadDetail]);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this lead?')) {
      try {
        await leadService.delete(id);
        toast.success('Lead deleted');
        navigate('/dashboard');
      } catch (err) {
        toast.error(err.message);
      }
    }
  };

  const handleSaveEdit = async () => {
    try {
      await leadService.update(id, editData);
      setLead(editData);
      setIsEditing(false);
      toast.success('Lead updated');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await leadService.update(id, { status: newStatus });
      const updatedLead = { ...lead, status: newStatus };
      setLead(updatedLead);
      setEditData(updatedLead);
      setShowStatusUpdate(false);
      toast.success(`Lead status changed to ${newStatus}`);
      
      // Add to history (local update until next refresh)
      setHistory([
        {
          old_status: lead.status,
          new_status: newStatus,
          changed_at: new Date().toISOString(),
          changed_by: 'Current User'
        },
        ...history
      ]);
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <div className="detail-container"><p>Loading...</p></div>;
  if (!lead) return <div className="detail-container"><p>Lead not found</p></div>;

  const statusOptions = ['NEW', 'CONTACTED', 'INTERESTED', 'FOLLOW_UP', 'REGISTERED', 'REJECTED'];

  return (
    <div className="detail-container">
      <Toaster position="top-right" />

      <div className="detail-header">
        <button className="btn-back" onClick={() => navigate('/dashboard')}>
          <IoArrowBack /> Back
        </button>
        <h1>👤 {lead.full_name}</h1>
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
        {/* Lead Information */}
        <section className="detail-section">
          <h2>📋 Lead Information</h2>
          {!isEditing ? (
            <div className="info-grid">
              <div className="info-item">
                <label>Full Name</label>
                <p>{lead.full_name}</p>
              </div>
              <div className="info-item">
                <label>Phone Number</label>
                <p>{lead.phone_number}</p>
              </div>
              <div className="info-item">
                <label>Email</label>
                <p>{lead.email || '-'}</p>
              </div>
              <div className="info-item">
                <label>City</label>
                <p>{lead.city}</p>
              </div>
              <div className="info-item">
                <label>Current Status</label>
                <p>
                  <span className={`badge badge-${lead.status.toLowerCase()}`}>
                    {lead.status}
                  </span>
                </p>
              </div>
              <div className="info-item">
                <label>Created Date</label>
                <p>{new Date(lead.created_at).toLocaleString()}</p>
              </div>
            </div>
          ) : (
            <div className="edit-form">
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={editData.full_name}
                  onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={editData.phone_number}
                  onChange={(e) => setEditData({ ...editData, phone_number: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={editData.email || ''}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  value={editData.city}
                  onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                />
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

        {/* Lead Status Management */}
        <section className="detail-section">
          <h2>🎯 Lead Status</h2>
          <div className="status-section">
            <div className="current-status">
              <p className="label">Current Status:</p>
              <p className={`status-chip badge-${lead.status.toLowerCase()}`}>
                {lead.status}
              </p>
            </div>
            {!showStatusUpdate ? (
              <button
                className="btn-primary"
                onClick={() => setShowStatusUpdate(true)}
              >
                Change Status
              </button>
            ) : (
              <div className="status-options">
                {statusOptions.map((status) => (
                  status !== lead.status && (
                    <button
                      key={status}
                      className="btn-status-option"
                      onClick={() => handleStatusChange(status)}
                    >
                      → {status}
                    </button>
                  )
                ))}
                <button
                  className="btn-secondary"
                  onClick={() => setShowStatusUpdate(false)}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Lead History */}
        {history.length > 0 && (
          <section className="detail-section">
            <h2>📜 Status History</h2>
            <LeadHistory history={history} />
          </section>
        )}
      </div>
    </div>
  );
}

export default LeadDetail;
