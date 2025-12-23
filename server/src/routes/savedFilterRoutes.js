const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const {
  createSavedFilter,
  getSavedFilters,
  updateSavedFilter,
  deleteSavedFilter,
} = require('../controllers/savedFilterController');

const router = express.Router();

router.get('/filters', auth, requireRole('tenant'), getSavedFilters);
router.post('/filters', auth, requireRole('tenant'), createSavedFilter);
router.put('/filters/:id', auth, requireRole('tenant'), updateSavedFilter);
router.delete('/filters/:id', auth, requireRole('tenant'), deleteSavedFilter);

module.exports = router;
