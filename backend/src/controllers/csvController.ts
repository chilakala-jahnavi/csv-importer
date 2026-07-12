import { Request, Response } from 'express';
import { parseCSV } from '../services/csvParser';
import { processBatch } from '../services/batchProcessor';
import { MAX_FILE_SIZE } from '../utils/constants';

export const previewCSV = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Check file size
    if (req.file.size > MAX_FILE_SIZE) {
      return res.status(400).json({ 
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` 
      });
    }

    const records = await parseCSV(req.file.buffer);

    if (records.length === 0) {
      return res.status(400).json({ error: 'CSV file is empty or contains no valid data' });
    }

    // Get first 10 rows for preview
    const preview = records.slice(0, 10);
    const headers = Object.keys(records[0]);

    res.json({
      success: true,
      total_records: records.length,
      headers: headers,
      preview: preview
    });
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({
      error: 'Failed to preview CSV file',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const processCSV = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Check file size
    if (req.file.size > MAX_FILE_SIZE) {
      return res.status(400).json({ 
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` 
      });
    }

    // Parse CSV
    const records = await parseCSV(req.file.buffer);

    if (records.length === 0) {
      return res.status(400).json({ error: 'CSV file is empty or contains no valid data' });
    }

    // Process records with AI
    const result = await processBatch(records);

    res.json({
      success: true,
      total_records: records.length,
      imported: result.records.length,
      skipped: result.skipped.length,
      records: result.records,
      skipped_records: result.skipped
    });
  } catch (error) {
    console.error('Processing error:', error);
    res.status(500).json({
      error: 'Failed to process CSV file',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};