import React, { useState } from 'react';
import { IoDownload, IoCloudUpload, IoClose } from 'react-icons/io5';
import toast from 'react-hot-toast';
import '../styles/Components.css';

export default function LeadImportForm({ onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast.error('📄 Please select a CSV file');
        return;
      }
      setFile(selectedFile);
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/import/template');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'leads_template.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('✅ Template downloaded!');
    } catch (err) {
      toast.error('❌ Failed to download template');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      toast.error('📄 Please select a CSV file');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('⏳ Importing leads from CSV...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/import/csv', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Import failed');
      }

      setStats(data.stats);
      toast.success(
        `✅ Import complete! ${data.stats.importedLeads} leads added, ${data.stats.duplicateSkipped} duplicates skipped`,
        { id: toastId }
      );

      if (onSuccess) {
        onSuccess();
      }

      // Close form after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      toast.error(`❌ ${err.message}`, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="import-form-overlay">
      <div className="import-form-container">
        {/* Header */}
        <div className="form-header">
          <h2 className="form-title">📊 Import Leads from CSV</h2>
          <button
            onClick={onClose}
            className="close-button"
            disabled={loading}
          >
            <IoClose size={24} />
          </button>
        </div>

        {/* Stats Display */}
        {stats && (
          <div className="import-stats">
            <div className="stat-item">
              <div className="stat-label">✅ Imported</div>
              <div className="stat-value success">{stats.importedLeads}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">⚠️ Duplicates Skipped</div>
              <div className="stat-value warning">{stats.duplicateSkipped}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">❌ Errors</div>
              <div className="stat-value error">{stats.errorLines}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">📝 Valid Lines</div>
              <div className="stat-value info">{stats.validLines}</div>
            </div>
          </div>
        )}

        {/* Form */}
        {!stats && (
          <form onSubmit={handleSubmit} className="import-form">
            {/* Instructions */}
            <div className="instruction-box">
              <h3>📋 CSV Format Required:</h3>
              <p>Columns: <code>full_name, phone_number, email, city, school_origin, program_interest, entry_year, lead_source</code></p>
              <p className="instruction-help">📌 Required: <strong>full_name</strong> and <strong>phone_number</strong></p>
              <p className="instruction-help">💡 Download the template to see the correct format</p>
            </div>

            {/* File Input */}
            <div className="form-group">
              <label className="file-input-label">
                <IoCloudUpload size={20} />
                <span>Choose CSV File</span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  disabled={loading}
                  style={{ display: 'none' }}
                />
              </label>
              {file && (
                <div className="file-selected">
                  ✅ {file.name}<button
                    type="button"
                    onClick={() => setFile(null)}
                    className="remove-file"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="import-form-buttons">
              <button
                type="button"
                onClick={downloadTemplate}
                className="btn btn-secondary"
                disabled={loading}
              >
                <IoDownload size={18} />
                Download Template
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!file || loading}
              >
                <IoCloudUpload size={18} />
                {loading ? 'Importing...' : 'Import Leads'}
              </button>
            </div>
          </form>
        )}

        {/* Success Message */}
        {stats && (
          <div className="import-success">
            <div className="success-icon">✨</div>
            <p>Import completed successfully!</p>
            <p className="success-subtitle">Your leads have been added to the system.</p>
          </div>
        )}
      </div>
    </div>
  );
}
