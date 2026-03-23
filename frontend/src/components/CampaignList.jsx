import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Components.css';

function CampaignList({ campaigns }) {
  const navigate = useNavigate();

  if (campaigns.length === 0) {
    return (
      <div className="empty-state">
        📭 No campaigns found yet.<br />
        <span style={{ fontSize: '0.875rem', color: 'var(--neutral-400)' }}>
          Create your first campaign to get started!
        </span>
      </div>
    );
  }

  return (
    <div className="campaign-grid">
      {campaigns.map((campaign) => (
        <button
          key={campaign.id}
          className="campaign-card"
          onClick={() => navigate(`/campaign/${campaign.id}`)}
          style={{ 
            cursor: 'pointer',
            background: 'inherit',
            border: 'inherit',
            padding: 'inherit',
            textAlign: 'left',
            fontFamily: 'inherit'
          }}
        >
          <div className="campaign-header">
            <h3>📬 {campaign.name}</h3>
            <span className={`status-badge ${campaign.status.toLowerCase()}`}>
              {campaign.status}
            </span>
          </div>

          <div className="campaign-details">
            <p>
              <strong>Template:</strong> {campaign.template_name}
            </p>
            <p>
              <strong>By:</strong> {campaign.created_by_name}
            </p>
            <p>
              <strong>Date:</strong> {new Date(campaign.created_at).toLocaleDateString()}
            </p>
          </div>

          <div className="campaign-stats">
            <div className="stat-item">
              <span className="stat-label">📊 Total</span>
              <span className="stat-value">{campaign.total_messages}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">✓ Delivered</span>
              <span className="stat-value">{campaign.delivered}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">👁 Read</span>
              <span className="stat-value">{campaign.read_count}</span>
            </div>
          </div>

          <div className="campaign-actions">
            <span className="btn-secondary" onClick={(e) => e.stopPropagation()}>
              View Details →
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

export default CampaignList;
