const router = require('express').Router();
const multer = require('multer');
const { createWorker, listWorkers, getWorker, updateWorker, deleteWorker } = require('../controllers/workerController');
const { authenticate } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(authenticate);

router.post('/', upload.single('profilePhoto'), createWorker);
router.get('/', listWorkers);
router.get('/:id', getWorker);
router.patch('/:id', updateWorker);
router.delete('/:id', deleteWorker);

module.exports = router;
