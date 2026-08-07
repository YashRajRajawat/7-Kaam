const router = require('express').Router();
const {
  login,
  refresh,
  logout,
  workerRegister,
  workerLogin,
  customerRegister,
  customerLogin,
} = require('../controllers/authController');

// Admin
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);

// Worker (phone + fixed OTP 1234 for now)
router.post('/worker/register', workerRegister);
router.post('/worker/login', workerLogin);

// Customer (phone + fixed OTP 1234 for now)
router.post('/customer/register', customerRegister);
router.post('/customer/login', customerLogin);

module.exports = router;
