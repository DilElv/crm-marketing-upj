const express = require('express');
const { auth } = require('../middlewares/auth');
const { role } = require('../middlewares/roles');
const { importLeadsFromCSV, getCSVTemplate } = require('../controllers/importController');

const router = express.Router();

// GET template
router.get('/template', getCSVTemplate);

// POST import CSV
router.post('/csv', auth, role(['ADMIN', 'MARKETING']), importLeadsFromCSV);

module.exports = router;
