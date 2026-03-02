const express = require('express');
const router = express.Router();
const {
  getAllLeads,
  getLeadById,
  getLeadStatusHistory,
  createLead,
  updateLead,
  deleteLead,
} = require('../controllers/leadsController');
const authenticate = require('../middlewares/auth');
const authorize = require('../middlewares/roles');

// GET all leads
router.get('/', authenticate, getAllLeads);

// GET lead status history
router.get('/:id/history', authenticate, getLeadStatusHistory);

// GET lead by ID
router.get('/:id', authenticate, getLeadById);

// CREATE lead (ADMIN, MARKETING, SALES)
router.post('/', authenticate, authorize('ADMIN', 'MARKETING', 'SALES'), createLead);

// UPDATE lead (ADMIN, MARKETING)
router.put('/:id', authenticate, authorize('ADMIN', 'MARKETING'), updateLead);

// DELETE lead (ADMIN only)
router.delete('/:id', authenticate, authorize('ADMIN'), deleteLead);

module.exports = router;
