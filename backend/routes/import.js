const express = require('express');
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const {
	previewLeadsFromCSV,
	commitPreviewImport,
	importLeadsFromCSV,
	getCSVTemplate,
} = require('../controllers/importController');

const router = express.Router();

// GET template
router.get('/template', getCSVTemplate);

// POST import CSV preview
router.post('/csv/preview', auth, roles('ADMIN', 'MARKETING'), previewLeadsFromCSV);

// POST commit import from preview
router.post('/csv/commit', auth, roles('ADMIN', 'MARKETING'), commitPreviewImport);

// POST import CSV
router.post('/csv', auth, roles('ADMIN', 'MARKETING'), importLeadsFromCSV);

module.exports = router;
