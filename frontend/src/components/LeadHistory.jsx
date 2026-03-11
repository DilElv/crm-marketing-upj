import React from 'react';
import { IoCheckmark } from 'react-icons/io5';
import '../styles/Components.css';

function LeadHistory({ history }) {
  if (!history || history.length === 0) {
    return <div className="empty-state">No status history available</div>;
  }

  return (
    <div className="history-timeline">
      {history.map((entry, index) => (
        <div key={index} className="history-item">
          <div className="history-dot">
            <IoCheckmark />
          </div>
          <div className="history-content">
            <div className="history-change">
              <span className={`badge badge-${entry.old_status?.toLowerCase()}`}>
                {entry.old_status || 'START'}
              </span>
              <span className="arrow">→</span>
              <span className={`badge badge-${entry.new_status?.toLowerCase()}`}>
                {entry.new_status}
              </span>
            </div>
            <div className="history-meta">
              <p className="changed-by">
                Changed by: {entry.changed_by_name || entry.changed_by || 'System'}
              </p>
              <p className="timestamp">
                {new Date(entry.changed_at).toLocaleString('id-ID')}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default LeadHistory;
