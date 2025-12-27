const express = require('express');
const { auth } = require('../middleware/auth');
const { getMe, updateProfile, getVerificationStatus, deleteMe } = require('../controllers/userController');
const { uploadVerification } = require('../controllers/verificationController');
const upload = require('../middleware/upload');

const router = express.Router();

router.get('/me', auth, getMe);
router.put('/me', auth, upload.single('avatar'), updateProfile);
router.delete('/me', auth, deleteMe);
router.delete('/users/me', auth, deleteMe);
router.get('/me/verification-status', auth, getVerificationStatus);
router.post(
  '/me/verification/upload',
  auth,
  upload.fields([
    { name: 'front', maxCount: 1 },
    { name: 'back', maxCount: 1 },
  ]),
  uploadVerification
);

module.exports = router;
