const Joi = require('joi');
const db = require('../config/database');

const leadStatusValues = ['NEW', 'CONTACTED', 'INTERESTED', 'FOLLOW_UP', 'REGISTERED', 'REJECTED'];

const idSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

const createLeadSchema = Joi.object({
  full_name: Joi.string().trim().min(1).required(),
  phone_number: Joi.string().trim().min(6).required(),
  email: Joi.string().email().allow(null, ''),
  school_origin: Joi.string().allow(null, ''),
  city: Joi.string().allow(null, ''),
  program_interest: Joi.string().allow(null, ''),
  entry_year: Joi.number().integer().min(1900).max(9999).allow(null),
  lead_source: Joi.string().allow(null, ''),
  status: Joi.string()
    .valid(...leadStatusValues)
    .default('NEW'),
  assigned_to: Joi.string().uuid().allow(null),
  notes: Joi.string().allow(null, ''),
});

const updateLeadSchema = Joi.object({
  full_name: Joi.string().trim().min(1),
  phone_number: Joi.string().trim().min(6),
  email: Joi.string().email().allow(null, ''),
  school_origin: Joi.string().allow(null, ''),
  city: Joi.string().allow(null, ''),
  program_interest: Joi.string().allow(null, ''),
  entry_year: Joi.number().integer().min(1900).max(9999).allow(null),
  lead_source: Joi.string().allow(null, ''),
  status: Joi.string().valid(...leadStatusValues),
  assigned_to: Joi.string().uuid().allow(null),
  notes: Joi.string().allow(null, ''),
})
  .min(1)
  .required();

const listLeadsQuerySchema = Joi.object({
  search: Joi.string().allow('', null),
  city: Joi.string().allow('', null),
  interest_program: Joi.string().allow('', null),
  source: Joi.string().allow('', null),
  status: Joi.string().valid(...leadStatusValues).allow('', null),
  created_from: Joi.date().iso().optional(),
  created_to: Joi.date().iso().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(20),
});

function normalizeOptionalText(value) {
  if (value === '') return null;
  return value;
}

function mapCreateLeadPayload(payload) {
  return {
    full_name: payload.full_name,
    phone_number: payload.phone_number,
    email: normalizeOptionalText(payload.email),
    school_origin: normalizeOptionalText(payload.school_origin),
    city: normalizeOptionalText(payload.city),
    program_interest: normalizeOptionalText(payload.program_interest),
    entry_year: payload.entry_year ?? null,
    lead_source: normalizeOptionalText(payload.lead_source),
    status: payload.status,
    assigned_to: payload.assigned_to ?? null,
    notes: normalizeOptionalText(payload.notes),
  };
}

function mapUpdateLeadPayload(payload) {
  const result = {};

  Object.entries(payload).forEach(([key, value]) => {
    if (
      key === 'email' ||
      key === 'school_origin' ||
      key === 'city' ||
      key === 'program_interest' ||
      key === 'lead_source' ||
      key === 'notes'
    ) {
      result[key] = normalizeOptionalText(value);
      return;
    }

    result[key] = value;
  });

  return result;
}

exports.getAllLeads = async (req, res, next) => {
  try {
    const { error, value } = listLeadsQuerySchema.validate(req.query, { stripUnknown: true });
    if (error) return res.status(400).json({ message: error.details[0].message });

    const whereClauses = [];
    const values = [];

    const pushClause = (clause, clauseValue) => {
      values.push(clauseValue);
      whereClauses.push(`${clause} $${values.length}`);
    };

    if (value.search) {
      const term = `%${value.search.trim().toLowerCase()}%`;
      values.push(term);
      values.push(term);
      values.push(term);
      whereClauses.push(
        `(lower(full_name) LIKE $${values.length - 2} OR lower(phone_number) LIKE $${values.length - 1} OR lower(COALESCE(email, '')) LIKE $${values.length})`
      );
    }

    if (value.city) {
      pushClause('lower(city) = lower(', value.city.trim());
      whereClauses[whereClauses.length - 1] += ')';
    }

    if (value.interest_program) {
      pushClause('lower(program_interest) = lower(', value.interest_program.trim());
      whereClauses[whereClauses.length - 1] += ')';
    }

    if (value.source) {
      pushClause('lower(lead_source) = lower(', value.source.trim());
      whereClauses[whereClauses.length - 1] += ')';
    }

    if (value.status) {
      pushClause('status =', value.status);
    }

    if (value.created_from) {
      pushClause('created_at >=', value.created_from);
    }

    if (value.created_to) {
      pushClause('created_at <=', value.created_to);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const page = value.page || 1;
    const limit = value.limit || 20;
    const offset = (page - 1) * limit;

    values.push(limit);
    values.push(offset);

    const dataQuery = `
      SELECT id, full_name, phone_number, email, school_origin, city, program_interest,
             entry_year, lead_source, status, assigned_to, notes, created_at
      FROM leads
      ${whereSql}
      ORDER BY created_at DESC
      LIMIT $${values.length - 1}
      OFFSET $${values.length}`;

    const countValues = values.slice(0, values.length - 2);
    const countQuery = `SELECT COUNT(*)::int AS total FROM leads ${whereSql}`;

    const [dataResult, countResult] = await Promise.all([
      db.query(dataQuery, values),
      db.query(countQuery, countValues),
    ]);

    res.json({
      data: dataResult.rows,
      total: countResult.rows[0]?.total || 0,
      page,
      limit,
    });
  } catch (err) {
    next(err);
  }
};

exports.getLeadById = async (req, res, next) => {
  try {
    const { error, value } = idSchema.validate(req.params);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const result = await db.query(
      `SELECT id, full_name, phone_number, email, school_origin, city, program_interest,
              entry_year, lead_source, status, assigned_to, notes, created_at
       FROM leads
       WHERE id = $1`,
      [value.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.createLead = async (req, res, next) => {
  try {
    const { error, value } = createLeadSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const payload = mapCreateLeadPayload(value);

    const result = await db.query(
      `INSERT INTO leads
        (full_name, phone_number, email, school_origin, city, program_interest,
         entry_year, lead_source, status, assigned_to, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING id, full_name, phone_number, email, school_origin, city, program_interest,
                 entry_year, lead_source, status, assigned_to, notes, created_at`,
      [
        payload.full_name,
        payload.phone_number,
        payload.email,
        payload.school_origin,
        payload.city,
        payload.program_interest,
        payload.entry_year,
        payload.lead_source,
        payload.status,
        payload.assigned_to,
        payload.notes,
      ]
    );

    res.status(201).json({ data: result.rows[0], message: 'Lead created' });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Phone number already exists' });
    }
    if (err.code === '23503') {
      return res.status(400).json({ message: 'Invalid assigned_to user id' });
    }
    next(err);
  }
};

exports.updateLead = async (req, res, next) => {
  let client;

  try {
    const idValidation = idSchema.validate(req.params);
    if (idValidation.error) return res.status(400).json({ message: idValidation.error.details[0].message });

    const { error, value } = updateLeadSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const payload = mapUpdateLeadPayload(value);
    const entries = Object.entries(payload);
    const values = [];
    const setClauses = [];

    entries.forEach(([key, fieldValue]) => {
      if (fieldValue === undefined) return;
      values.push(fieldValue);
      setClauses.push(`${key} = $${values.length}`);
    });

    if (setClauses.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    client = await db.pool.connect();
    await client.query('BEGIN');

    const currentLeadResult = await client.query(
      'SELECT id, status FROM leads WHERE id = $1 FOR UPDATE',
      [idValidation.value.id]
    );

    if (currentLeadResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Lead not found' });
    }

    const oldStatus = currentLeadResult.rows[0].status;

    values.push(idValidation.value.id);

    const result = await client.query(
      `UPDATE leads
       SET ${setClauses.join(', ')}
       WHERE id = $${values.length}
       RETURNING id, full_name, phone_number, email, school_origin, city, program_interest,
                 entry_year, lead_source, status, assigned_to, notes, created_at`,
      values
    );

    const updatedLead = result.rows[0];
    const statusWasProvided = Object.prototype.hasOwnProperty.call(payload, 'status');
    const statusChanged = statusWasProvided && oldStatus !== updatedLead.status;

    if (statusChanged) {
      await client.query(
        `INSERT INTO lead_status_history (lead_id, old_status, new_status, changed_by)
         VALUES ($1, $2, $3, $4)`,
        [updatedLead.id, oldStatus, updatedLead.status, req.user?.id || null]
      );
    }

    await client.query('COMMIT');

    res.json({ data: updatedLead, message: 'Lead updated' });
  } catch (err) {
    if (client) {
      await client.query('ROLLBACK');
    }

    if (err.code === '23505') {
      return res.status(409).json({ message: 'Phone number already exists' });
    }
    if (err.code === '23503') {
      return res.status(400).json({ message: 'Invalid assigned_to user id' });
    }
    next(err);
  } finally {
    if (client) {
      client.release();
    }
  }
};

exports.getLeadStatusHistory = async (req, res, next) => {
  try {
    const { error, value } = idSchema.validate(req.params);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const leadExists = await db.query('SELECT 1 FROM leads WHERE id = $1', [value.id]);
    if (leadExists.rowCount === 0) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    const historyResult = await db.query(
      `SELECT h.id, h.lead_id, h.old_status, h.new_status, h.changed_by, h.changed_at,
              u.name AS changed_by_name, u.email AS changed_by_email
       FROM lead_status_history h
       LEFT JOIN users u ON u.id = h.changed_by
       WHERE h.lead_id = $1
       ORDER BY h.changed_at DESC`,
      [value.id]
    );

    res.json({ data: historyResult.rows, total: historyResult.rowCount });
  } catch (err) {
    next(err);
  }
};

exports.deleteLead = async (req, res, next) => {
  try {
    const { error, value } = idSchema.validate(req.params);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const result = await db.query(
      `DELETE FROM leads
       WHERE id = $1
       RETURNING id, full_name, phone_number, email, school_origin, city, program_interest,
                 entry_year, lead_source, status, assigned_to, notes, created_at`,
      [value.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    res.json({ data: result.rows[0], message: 'Lead deleted' });
  } catch (err) {
    next(err);
  }
};
