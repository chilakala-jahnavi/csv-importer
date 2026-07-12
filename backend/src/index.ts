import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://csv-importer-frontend.vercel.app',
  'https://csv-importer-git-main-chilakala-jahnavis-projects.vercel.app',
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

// Rest of your middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (ext === 'csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Parse CSV function
const parseCSV = (buffer: Buffer): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    try {
      const results: any[] = [];
      const lines = buffer.toString().split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        resolve([]);
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      
      for (let i = 1; i < lines.length; i++) {
        try {
          const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const row: any = {};
          
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          
          const hasData = Object.values(row).some(val => val !== '');
          if (hasData) {
            results.push(row);
          }
        } catch (error) {
          // Skip malformed rows
        }
      }
      
      resolve(results);
    } catch (error) {
      reject(new Error(`Failed to parse CSV: ${error}`));
    }
  });
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'CSV Importer API',
    openai: process.env.OPENAI_API_KEY ? 'enabled' : 'disabled',
    port: PORT
  });
});

// Preview endpoint
app.post('/api/preview', upload.single('file'), async (req: any, res: any) => {
  try {
    console.log('📁 Preview request received');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`📄 File: ${req.file.originalname}, Size: ${req.file.size} bytes`);
    const records = await parseCSV(req.file.buffer);

    if (records.length === 0) {
      return res.status(400).json({ error: 'CSV file is empty or contains no valid data' });
    }

    const preview = records.slice(0, 10);
    const headers = Object.keys(records[0]);

    console.log(`✅ Preview generated: ${records.length} records, ${headers.length} columns`);

    res.json({
      success: true,
      total_records: records.length,
      headers: headers,
      preview: preview
    });
  } catch (error) {
    console.error('❌ Preview error:', error);
    res.status(500).json({
      error: 'Failed to preview CSV file',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Process endpoint
app.post('/api/process', upload.single('file'), async (req: any, res: any) => {
  try {
    console.log('🤖 Process request received');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`📄 File: ${req.file.originalname}, Size: ${req.file.size} bytes`);
    const records = await parseCSV(req.file.buffer);

    if (records.length === 0) {
      return res.status(400).json({ error: 'CSV file is empty' });
    }

    console.log(`🔄 Processing ${records.length} records...`);

    const processedRecords = records.map((record: any, index: number) => {
      const email = record.email || record.Email || record['Email Address'] || '';
      const mobile = record.mobile || record.Mobile || record['Phone Number'] || record.phone || '';
      const name = record.name || record.Name || record.full_name || `Lead ${index + 1}`;

      return {
        created_at: new Date().toISOString(),
        name: name,
        email: email,
        country_code: record.country_code || record['Country Code'] || '+91',
        mobile_without_country_code: mobile.replace(/\D/g, ''),
        company: record.company || record.Company || '',
        city: record.city || record.City || '',
        state: record.state || record.State || '',
        country: record.country || record.Country || 'India',
        lead_owner: record.lead_owner || record['Lead Owner'] || '',
        crm_status: 'GOOD_LEAD_FOLLOW_UP',
        crm_note: record.crm_note || record['CRM Note'] || '',
        data_source: '',
        possession_time: '',
        description: record.description || record.Description || ''
      };
    });

    const validRecords = processedRecords.filter(record => 
      record.email || record.mobile_without_country_code
    );

    const skippedRecords = processedRecords.filter(record => 
      !record.email && !record.mobile_without_country_code
    ).map(record => ({
      original_data: record,
      reason: 'Missing email and mobile number'
    }));

    console.log(`✅ Processing complete: ${validRecords.length} valid, ${skippedRecords.length} skipped`);

    res.json({
      success: true,
      total_records: records.length,
      imported: validRecords.length,
      skipped: skippedRecords.length,
      records: validRecords,
      skipped_records: skippedRecords
    });
  } catch (error) {
    console.error('❌ Processing error:', error);
    res.status(500).json({
      error: 'Failed to process CSV file',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'CSV Importer API',
    status: 'running',
    endpoints: {
      health: '/health',
      preview: '/api/preview (POST - upload CSV)',
      process: '/api/process (POST - upload CSV with AI)'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    available_endpoints: ['/', '/health', '/api/preview', '/api/process']
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message || 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📍 API Root: http://localhost:${PORT}`);
  console.log(`🤖 OpenAI: ${process.env.OPENAI_API_KEY ? '✅ Enabled' : '⚠️  Demo Mode'}`);
  console.log(`📁 Preview: POST http://localhost:${PORT}/api/preview`);
  console.log(`🤖 Process: POST http://localhost:${PORT}/api/process`);
  console.log('\n✅ Server is ready! Press Ctrl+C to stop.\n');
});