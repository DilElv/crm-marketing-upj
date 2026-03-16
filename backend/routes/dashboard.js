const express = require('express');
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const dashboardController = require('../controllers/dashboardController');

const router = express.Router();

router.get('/overview', auth, roles('ADMIN', 'MARKETING'), dashboardController.getOverview);

module.exports = router;
