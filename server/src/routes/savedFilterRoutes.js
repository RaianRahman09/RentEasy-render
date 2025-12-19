const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const {
  createSavedFilter,
  getSavedFilters,
  updateSavedFilter,
  deleteSavedFilter,
} = require('../controllers/savedFilterController');

const router = express.Router();

router.use(auth, requireRole('tenant'));
router.get('/filters', getSavedFilters);
router.post('/filters', createSavedFilter);
router.put('/filters/:id', updateSavedFilter);
router.delete('/filters/:id', deleteSavedFilter);

module.exports = router;
