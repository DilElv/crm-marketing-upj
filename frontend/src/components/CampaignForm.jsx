import React, { useState, useEffect } from 'react';
import { templateService } from '../services/api.js';
import '../styles/Components.css';

function CampaignForm({ onSubmit, onCancel }) {
  const [templates, setTemplates] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    templateName: '',
    targetLeadStatus: 'NEW',
    parameters: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await templateService.getAll();
      setTemplates(response.data || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await onSubmit(formData);
      setFormData({
        name: '',
        templateName: '',
        targetLeadStatus: 'NEW',
        parameters: [],
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="campaign-form" onSubmit={handleSubmit}>
      <div>
        <h3>📋 Create New Campaign</h3>
        <p style={{ color: 'var(--neutral-500)', margin: '0 0 1.5rem 0', fontSize: '0.875rem' }}>
          Set up a new marketing campaign to reach your target leads
        </p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="form-group">
        <label htmlFor="name">Campaign Name</label>
        <input
          type="text"
          id="name"
          name="name"
          placeholder="e.g., Q1 Lead Outreach"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="templateName">Select Template</label>
        <select
          id="templateName"
          name="templateName"
          value={formData.templateName}
          onChange={handleChange}
          required
        >
          <option value="">Choose a template...</option>
          {templates.map((template) => (
            <option key={template.name} value={template.name}>
              {template.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="targetLeadStatus">Target Lead Status</label>
        <select
          id="targetLeadStatus"
          name="targetLeadStatus"
          value={formData.targetLeadStatus}
          onChange={handleChange}
        >
          <option value="NEW">New Leads</option>
          <option value="CONTACTED">Already Contacted</option>
          <option value="INTERESTED">Interested Leads</option>
          <option value="FOLLOW_UP">Follow-up Required</option>
          <option value="REGISTERED">Already Registered</option>
        </select>
      </div>

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? '⏳ Creating...' : '✨ Create Campaign'}
        </button>
      </div>
    </form>
  );
}

export default CampaignForm;
