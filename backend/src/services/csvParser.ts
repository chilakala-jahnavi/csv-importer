import csv from 'csv-parser';
import { Readable } from 'stream';

export interface ParsedRecord {
  [key: string]: string;
}

export const parseCSV = (buffer: Buffer): Promise<ParsedRecord[]> => {
  return new Promise((resolve, reject) => {
    const results: ParsedRecord[] = [];
    
    try {
      const readable = Readable.from(buffer.toString());
      
      readable
        .pipe(csv({
          skipLines: 0,
          strict: true
        }))
        .on('data', (data) => {
          const trimmedData: ParsedRecord = {};
          let hasData = false;
          
          Object.keys(data).forEach(key => {
            const value = data[key]?.trim() || '';
            if (value) hasData = true;
            trimmedData[key.trim()] = value;
          });
          
          if (hasData) {
            results.push(trimmedData);
          }
        })
        .on('end', () => {
          resolve(results);
        })
        .on('error', (error) => {
          reject(new Error(`CSV parsing error: ${error.message}`));
        });
    } catch (error) {
      reject(new Error(`Failed to parse CSV: ${error}`));
    }
  });
};