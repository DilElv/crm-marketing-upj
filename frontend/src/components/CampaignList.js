import React from 'react';
import '../styles/Components.css';

function CampaignList({ campaigns }) {
  if (campaigns.length === 0) {
    return <div className="empty-state">No campaigns found</div>;
  }

  return (
    <div className="campaign-grid">
      {campaigns.map((campaign) => (
        <div key={campaign.id} className="campaign-card">
          <div className="campaign-header">
            <h3>{campaign.name}</h3>
            <span className={`status-badge ${campaign.status.toLowerCase()}`}>
              {campaign.status}
            </span>
          </div>

          <div className="campaign-details">
            <p>
              <strong>Template:</strong> {campaign.template_name}
            </p>
            <p>
              <strong>Created by:</strong> {campaign.created_by_name}
            </p>
            <p>
              <strong>Created:</strong>{' '}
              {new Date(campaign.created_at).toLocaleDateString()}
            </p>
          </div>

          <div className="campaign-stats">
            <div className="stat-item">
              <span className="stat-label">Total Messages</span>
              <span className="stat-value">{campaign.total_messages}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Delivered</span>
              <span className="stat-value">{campaign.delivered}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Read</span>
              <span className="stat-value">{campaign.read_count}</span>
            </div>
          </div>

          <div className="campaign-actions">
            <button className="btn-secondary">View</button>
            <button className="btn-secondary">Edit</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default CampaignList;
