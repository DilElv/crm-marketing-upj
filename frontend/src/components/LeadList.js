import React from 'react';
import '../styles/Components.css';

function LeadList({ leads }) {
  if (leads.length === 0) {
    return <div className="empty-state">No leads found</div>;
  }

  return (
    <div className="lead-table-container">
      <table className="lead-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Email</th>
            <th>City</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id}>
              <td>{lead.full_name}</td>
              <td>{lead.phone_number}</td>
              <td>{lead.email || '-'}</td>
              <td>{lead.city}</td>
              <td>
                <span className={`badge badge-${lead.status.toLowerCase()}`}>
                  {lead.status}
                </span>
              </td>
              <td>{new Date(lead.created_at).toLocaleDateString()}</td>
              <td>
                <button className="btn-edit">Edit</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default LeadList;
