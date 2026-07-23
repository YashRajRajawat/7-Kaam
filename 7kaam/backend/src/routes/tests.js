const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { createTest, listTests, getTest, updateTest, deleteTest } = require('../controllers/testController');

router.use(authenticate);

router.post('/', createTest);
router.get('/', listTests);
router.get('/:id', getTest);
router.patch('/:id', updateTest);
router.delete('/:id', deleteTest);

module.exports = router;
