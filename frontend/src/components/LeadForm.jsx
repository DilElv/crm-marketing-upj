import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import '../styles/Components.css';

function LeadForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    email: '',
    school_origin: '',
    city: '',
    program_interest: '',
    entry_year: new Date().getFullYear(),
    lead_source: '',
    notes: '',
    status: 'NEW'
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'entry_year' ? parseInt(value) || new Date().getFullYear() : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.full_name.trim()) {
      toast.error('Full name is required');
      return;
    }

    if (!formData.phone_number.trim()) {
      toast.error('Phone number is required');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
      toast.success('Lead created successfully');
      setFormData({
        full_name: '',
        phone_number: '',
        email: '',
        school_origin: '',
        city: '',
        program_interest: '',
        entry_year: new Date().getFullYear(),
        lead_source: '',
        notes: '',
        status: 'NEW'
      });
    } catch (err) {
      toast.error(err.message || 'Failed to create lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <div className="form-header">
        <h3>📝 Add New Lead</h3>
        <p style={{ color: 'var(--neutral-500)', fontSize: '0.875rem', margin: '0.5rem 0 0 0' }}>
          Fill in the lead information below
        </p>
      </div>

      <form onSubmit={handleSubmit} className="form-content">
        <div className="form-row">
          <div className="form-group">
            <label>👤 Full Name *</label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              placeholder="Enter full name"
              required
            />
          </div>
          <div className="form-group">
            <label>📱 Phone Number *</label>
            <input
              type="tel"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              placeholder="Enter phone number"
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>✉️ Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter email address"
            />
          </div>
          <div className="form-group">
            <label>📍 City</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="Enter city"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>🏫 School Origin</label>
            <input
              type="text"
              name="school_origin"
              value={formData.school_origin}
              onChange={handleChange}
              placeholder="Enter school origin"
            />
          </div>
          <div className="form-group">
            <label>📚 Program Interest</label>
            <input
              type="text"
              name="program_interest"
              value={formData.program_interest}
              onChange={handleChange}
              placeholder="Enter program interest"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>📅 Entry Year</label>
            <input
              type="number"
              name="entry_year"
              value={formData.entry_year}
              onChange={handleChange}
              placeholder="Enter entry year"
              min="1900"
              max="9999"
            />
          </div>
          <div className="form-group">
            <label>🔗 Lead Source</label>
            <input
              type="text"
              name="lead_source"
              value={formData.lead_source}
              onChange={handleChange}
              placeholder="How did you get this lead?"
            />
          </div>
        </div>

        <div className="form-group">
          <label>📝 Notes</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Additional notes about this lead"
            rows="3"
            style={{
              width: '100%',
              padding: 'var(--spacing-2)',
              border: '1px solid var(--neutral-200)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'inherit',
              fontSize: '0.875rem',
              resize: 'vertical'
            }}
          />
        </div>

        <div className="form-actions" style={{ marginTop: 'var(--spacing-4)' }}>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? '⏳ Creating...' : '✨ Create Lead'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default LeadForm;
