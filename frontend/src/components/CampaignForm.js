import React, { useState, useEffect } from 'react';
import { templateService } from '../services/api';
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
      <h3>Create New Campaign</h3>

      {error && <div className="error-message">{error}</div>}

      <div className="form-group">
        <label htmlFor="name">Campaign Name:</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="templateName">Template:</label>
        <select
          id="templateName"
          name="templateName"
          value={formData.templateName}
          onChange={handleChange}
          required
        >
          <option value="">Select a template</option>
          {templates.map((template) => (
            <option key={template.name} value={template.name}>
              {template.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="targetLeadStatus">Target Lead Status:</label>
        <select
          id="targetLeadStatus"
          name="targetLeadStatus"
          value={formData.targetLeadStatus}
          onChange={handleChange}
        >
          <option value="NEW">New</option>
          <option value="CONTACTED">Contacted</option>
          <option value="QUALIFIED">Qualified</option>
          <option value="CONVERTED">Converted</option>
        </select>
      </div>

      <div className="form-actions">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Creating...' : 'Create Campaign'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default CampaignForm;
