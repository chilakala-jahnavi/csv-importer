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

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://csv-importer-frontend.vercel.app',
    'https://your-frontend-url.vercel.app' // Replace with your actual frontend URL
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (ext === 'csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Improved CSV parser that handles inconsistent rows
const parseCSV = (buffer: Buffer): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const results: any[] = [];
    const lines = buffer.toString().split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      resolve([]);
      return;
    }

    // Parse headers from first line
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    
    // Process each data row
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const row: any = {};
        
        // Map values to headers
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        
        // Check if row has any data
        const hasData = Object.values(row).some(val => val !== '');
        if (hasData) {
          results.push(row);
        }
      } catch (error) {
        console.warn(`⚠️ Skipping malformed row ${i}:`, error);
      }
    }
    
    resolve(results);
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

// Preview endpoint - NO AI processing
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

// Process endpoint - WITH AI processing
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

    // Process records - map to CRM format
    const processedRecords = records.map((record: any, index: number) => {
      // Extract email from various possible column names
      const email = record.email || record.Email || record['Email Address'] || record['E-mail'] || record.EMAIL || '';
      
      // Extract mobile from various possible column names
      const mobile = record.mobile || record.Mobile || record['Phone Number'] || record['Phone'] || record.phone || record.PHONE || '';
      
      // Extract name from various possible column names
      const name = record.name || record.Name || record.full_name || record['Full Name'] || record.NAME || `Lead ${index + 1}`;

      // Extract created_at
      let createdAt = record.created_at || record['Created At'] || record.CREATED_AT || record.date || record.Date || '';
      if (!createdAt) {
        createdAt = new Date().toISOString();
      }

      return {
        created_at: createdAt,
        name: name,
        email: email,
        country_code: record.country_code || record['Country Code'] || record.COUNTRY_CODE || '+91',
        mobile_without_country_code: mobile.replace(/\D/g, ''), // Remove non-digit characters
        company: record.company || record.Company || record.COMPANY || '',
        city: record.city || record.City || record.CITY || '',
        state: record.state || record.State || record.STATE || '',
        country: record.country || record.Country || record.COUNTRY || 'India',
        lead_owner: record.lead_owner || record['Lead Owner'] || record.LEAD_OWNER || '',
        crm_status: 'GOOD_LEAD_FOLLOW_UP',
        crm_note: record.crm_note || record['CRM Note'] || record.CRM_NOTE || record.notes || record.Notes || '',
        data_source: '',
        possession_time: '',
        description: record.description || record.Description || record.DESCRIPTION || ''
      };
    });

    // Filter out records without email or mobile
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