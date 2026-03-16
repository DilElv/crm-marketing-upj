import React, { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import { campaignService } from '../services/api';

const EXPECTED_FIELDS = ['name', 'phone_number', 'email', 'city', 'program_interest'];
const REQUIRED_FIELDS = ['name', 'phone_number'];

const FIELD_LABELS = {
  name: 'Name',
  phone_number: 'Phone Number',
  email: 'Email',
  city: 'City',
  program_interest: 'Program Interest',
};

const FIELD_ALIASES = {
  name: ['name', 'full_name', 'nama', 'nama_lengkap'],
  phone_number: ['phone_number', 'phone', 'no_hp', 'nomor_hp', 'whatsapp', 'no_wa'],
  email: ['email', 'email_address', 'alamat_email'],
  city: ['city', 'kota', 'domisili'],
  program_interest: ['program_interest', 'program', 'minat_program', 'jurusan', 'prodi'],
};

function normalizeHeader(header) {
  return String(header || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function autoMapHeaders(headers) {
  const normalized = headers.map((header) => ({
    original: header,
    normalized: normalizeHeader(header),
  }));

  const mapping = {};

  EXPECTED_FIELDS.forEach((field) => {
    const aliases = [field, ...(FIELD_ALIASES[field] || [])].map(normalizeHeader);
    const match = normalized.find((item) => aliases.includes(item.normalized));
    mapping[field] = match ? match.original : '';
  });

  return mapping;
}

function CampaignLeadImportModal({ campaignId, file, onClose, onImported }) {
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [parseError, setParseError] = useState('');
  const [parseLoading, setParseLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!file) return;

    setParseLoading(true);
    setParseError('');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => String(header || '').trim(),
      complete: (results) => {
        const parsedHeaders = results.meta?.fields || [];
        const parsedRows = Array.isArray(results.data)
          ? results.data.filter((row) =>
            Object.values(row || {}).some((value) => String(value || '').trim() !== '')
          )
          : [];

        if (parsedHeaders.length === 0) {
          setParseError('Unable to detect CSV headers. Please check your file format.');
          setParseLoading(false);
          return;
        }

        setHeaders(parsedHeaders);
        setRows(parsedRows);
        setMapping(autoMapHeaders(parsedHeaders));
        setParseLoading(false);
      },
      error: (error) => {
        setParseError(error.message || 'Failed to parse CSV file');
        setParseLoading(false);
      },
    });
  }, [file]);

  const missingRequired = useMemo(
    () => REQUIRED_FIELDS.filter((field) => !mapping[field]),
    [mapping]
  );

  const previewRows = useMemo(() => {
    return rows.slice(0, 10).map((row, index) => {
      const output = { _index: index + 1 };
      EXPECTED_FIELDS.forEach((field) => {
        const sourceHeader = mapping[field];
        output[field] = sourceHeader ? row[sourceHeader] || '' : '';
      });
      return output;
    });
  }, [rows, mapping]);

  const handleMappingChange = (field, value) => {
    setMapping((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await campaignService.downloadImportTemplate();
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = 'campaign_leads_import_template.csv';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setParseError(error.message || 'Failed to download template');
    }
  };

  const handleConfirmImport = async () => {
    if (!file || parseLoading || importing || missingRequired.length > 0) {
      return;
    }

    setImporting(true);
    setParseError('');

    try {
      const result = await campaignService.importLeads(campaignId, file, mapping);
      onImported(result);
      onClose();
    } catch (error) {
      setParseError(error.message || 'Failed to import leads');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="import-modal-backdrop" role="dialog" aria-modal="true">
      <div className="import-modal-panel">
        <div className="import-modal-header">
          <h3>Import Leads from CSV</h3>
          <button className="btn-status" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <p className="import-modal-subtitle">
          File: <strong>{file?.name}</strong>
        </p>

        <div className="import-modal-actions">
          <button className="btn-status" type="button" onClick={handleDownloadTemplate}>
            Download Example CSV
          </button>
        </div>

        {parseLoading ? (
          <div className="import-modal-loading">Reading CSV and generating preview...</div>
        ) : (
          <>
            <div className="import-modal-meta">
              <span>Total rows detected: {rows.length}</span>
              <span>Preview rows: {Math.min(rows.length, 10)}</span>
            </div>

            <div className="import-modal-mapping">
              {EXPECTED_FIELDS.map((field) => (
                <label key={field} className="import-modal-mapping-row">
                  <span>{FIELD_LABELS[field]}</span>
                  <select
                    value={mapping[field] || ''}
                    onChange={(event) => handleMappingChange(field, event.target.value)}
                  >
                    <option value="">Not mapped</option>
                    {headers.map((header) => (
                      <option key={`${field}-${header}`} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>

            <div className="import-modal-table-wrapper">
              <table className="import-modal-table">
                <thead>
                  <tr>
                    <th>#</th>
                    {EXPECTED_FIELDS.map((field) => (
                      <th key={field}>{FIELD_LABELS[field]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.length === 0 && (
                    <tr>
                      <td colSpan={EXPECTED_FIELDS.length + 1}>No data rows found.</td>
                    </tr>
                  )}
                  {previewRows.map((row) => (
                    <tr key={`preview-${row._index}`}>
                      <td>{row._index}</td>
                      {EXPECTED_FIELDS.map((field) => (
                        <td key={`preview-${row._index}-${field}`}>{row[field] || '-'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {missingRequired.length > 0 && !parseLoading && (
          <p className="import-modal-error">
            Required mapping missing: {missingRequired.map((item) => FIELD_LABELS[item]).join(', ')}
          </p>
        )}

        {parseError && <p className="import-modal-error">{parseError}</p>}

        <div className="import-modal-footer">
          <button
            type="button"
            className="btn-status"
            onClick={onClose}
            disabled={importing}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-status"
            onClick={handleConfirmImport}
            disabled={parseLoading || importing || missingRequired.length > 0 || rows.length === 0}
          >
            {importing ? 'Importing...' : 'Confirm Import'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CampaignLeadImportModal;
