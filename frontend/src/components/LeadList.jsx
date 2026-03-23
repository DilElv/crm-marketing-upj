import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Components.css';

function LeadList({ leads }) {
  const navigate = useNavigate();

  if (leads.length === 0) {
    return (
      <div className="empty-state">
        🎯 No leads found yet.<br />
        <span style={{ fontSize: '0.875rem', color: 'var(--neutral-400)' }}>
          Start adding leads to manage your contacts!
        </span>
      </div>
    );
  }

  const getStatusIcon = (status) => {
    const icons = {
      'NEW': '⭐',
      'CONTACTED': '📞',
      'INTERESTED': '👀',
      'FOLLOW_UP': '⏳',
      'REGISTERED': '✅',
      'REJECTED': '❌'
    };
    return icons[status] || '•';
  };

  const handleRowKeyDown = (e, leadId) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(`/lead/${leadId}`);
    }
  };

  return (
    <div className="lead-table-container">
      <table className="lead-table">
        <thead>
          <tr>
            <th>👤 Name</th>
            <th>📱 Phone</th>
            <th>✉️ Email</th>
            <th>📍 City</th>
            <th>Status</th>
            <th>📅 Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr
              key={lead.id}
              className="lead-table-row"
              onClick={() => navigate(`/lead/${lead.id}`)}
              onKeyDown={(e) => handleRowKeyDown(e, lead.id)}
              tabIndex={0}
              role="button"
            >
              <td><strong>{lead.full_name}</strong></td>
              <td>{lead.phone_number || '-'}</td>
              <td style={{ color: 'var(--primary)' }}>{lead.email || '-'}</td>
              <td>{lead.city || '-'}</td>
              <td>
                <span className={`badge badge-${lead.status.toLowerCase()}`}>
                  {getStatusIcon(lead.status)} {lead.status}
                </span>
              </td>
              <td>{new Date(lead.created_at).toLocaleDateString('id-ID')}</td>
              <td onClick={(e) => e.stopPropagation()}>
                <button
                  className="btn-edit"
                  onClick={() => navigate(`/lead/${lead.id}`)}
                >
                  View →
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default LeadList;
