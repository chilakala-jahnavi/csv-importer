import { ParsedRecord } from './csvParser';
import { extractRecords } from './aiExtractor';
import { BATCH_SIZE } from '../utils/constants';

export const processBatch = async (records: ParsedRecord[]) => {
  const batches = [];
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    batches.push(records.slice(i, Math.min(i + BATCH_SIZE, records.length)));
  }

  const allRecords = [];
  const allSkipped = [];

  console.log(`Processing ${records.length} records in ${batches.length} batches...`);

  for (let i = 0; i < batches.length; i++) {
    try {
      console.log(`Processing batch ${i + 1}/${batches.length} (${batches[i].length} records)...`);
      const batchResult = await extractRecords(batches[i]);
      allRecords.push(...batchResult.records);
      allSkipped.push(...batchResult.skipped);
      console.log(`✅ Batch ${i + 1} complete: ${batchResult.records.length} extracted, ${batchResult.skipped.length} skipped`);
    } catch (error) {
      console.error(`❌ Error processing batch ${i + 1}:`, error);
      // Continue with next batch instead of failing completely
      allSkipped.push(...batches[i].map(record => ({
        original_data: record,
        reason: `Batch processing error: ${error instanceof Error ? error.message : 'Unknown error'}`
      })));
    }
  }

  return {
    records: allRecords,
    skipped: allSkipped
  };
};