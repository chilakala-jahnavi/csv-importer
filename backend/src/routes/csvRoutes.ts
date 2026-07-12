import express from 'express';
import multer from 'multer';
import { previewCSV, processCSV } from '../controllers/csvController';
import { MAX_FILE_SIZE } from '../utils/constants';

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (ext !== 'csv') {
      return cb(new Error('Only CSV files are allowed'));
    }
    
    if (file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV files are allowed'));
    }
  }
});

// Routes
router.post('/preview', upload.single('file'), previewCSV);
router.post('/process', upload.single('file'), processCSV);

// Error handler for multer - FIXED
router.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

export default router;