import OpenAI from 'openai';
import { ParsedRecord } from './csvParser';
import { ALLOWED_STATUSES, ALLOWED_SOURCES } from '../utils/constants';
import { isValidDate } from '../utils/validators';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface CRMRecord {
  created_at: string;
  name: string;
  email: string;
  country_code: string;
  mobile_without_country_code: string;
  company: string;
  city: string;
  state: string;
  country: string;
  lead_owner: string;
  crm_status: string;
  crm_note: string;
  data_source: string;
  possession_time: string;
  description: string;
}

interface SkippedRecord {
  original_data: ParsedRecord;
  reason: string;
}

const buildPrompt = (records: ParsedRecord[]): string => {
  const allFields = Object.keys(records[0] || {});
  
  return `You are an AI assistant that extracts CRM lead information from CSV data.

CRITICAL RULES - YOU MUST FOLLOW:
1. Output ONLY valid JSON. No markdown, no explanations, no extra text.
2. For each record, extract these 15 fields: created_at, name, email, country_code, mobile_without_country_code, company, city, state, country, lead_owner, crm_status, crm_note, data_source, possession_time, description
3. CRM_STATUS must be exactly one of: ${ALLOWED_STATUSES.join(', ')}
4. DATA_SOURCE must be exactly one of: ${ALLOWED_SOURCES.join(', ')} or empty string ""
5. created_at must be a valid date string (YYYY-MM-DD HH:mm:ss or ISO format)
6. If multiple emails exist, use first email, put others in crm_note
7. If multiple mobile numbers exist, use first, put others in crm_note
8. If a record has neither email nor mobile number, mark for skipping
9. Use crm_note for any additional information (extra emails, phones, notes)
10. Keep each record as a single object

Available columns in CSV: ${allFields.join(', ')}

Sample Records from CSV (first 3):
${JSON.stringify(records.slice(0, 3), null, 2)}

Process ALL ${records.length} records. Return JSON with structure:
{
  "records": [
    {
      "created_at": "2026-05-13 14:20:48",
      "name": "John Doe",
      "email": "john@example.com",
      "country_code": "+91",
      "mobile_without_country_code": "9876543210",
      "company": "GrowEasy",
      "city": "Mumbai",
      "state": "Maharashtra",
      "country": "India",
      "lead_owner": "test@gmail.com",
      "crm_status": "GOOD_LEAD_FOLLOW_UP",
      "crm_note": "Client asked for reschedule",
      "data_source": "leads_on_demand",
      "possession_time": "",
      "description": ""
    }
  ],
  "skipped": [
    {
      "original_data": {},
      "reason": "No email or phone found"
    }
  ]
}`;
};

export const extractRecords = async (records: ParsedRecord[]): Promise<{ records: CRMRecord[]; skipped: SkippedRecord[] }> => {
  try {
    // Filter out records without email or phone before sending to AI
    const validRecords = records.filter(record => {
      const hasEmail = record.email || record.Email || record.EMAIL || record['Email Address'];
      const hasPhone = record.mobile || record.Mobile || record['Phone Number'] || record.phone || record['Mobile Number'];
      return !!(hasEmail || hasPhone);
    });

    const invalidRecords = records.filter(record => {
      const hasEmail = record.email || record.Email || record.EMAIL || record['Email Address'];
      const hasPhone = record.mobile || record.Mobile || record['Phone Number'] || record.phone || record['Mobile Number'];
      return !(hasEmail || hasPhone);
    });

    const skippedFromValidation: SkippedRecord[] = invalidRecords.map(record => ({
      original_data: record,
      reason: 'Missing email and mobile number'
    }));

    if (validRecords.length === 0) {
      return { records: [], skipped: skippedFromValidation };
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a CRM data extraction specialist. You output ONLY valid JSON. No markdown, no explanations.'
        },
        {
          role: 'user',
          content: buildPrompt(validRecords)
        }
      ],
      temperature: 0.1,
      max_tokens: 4000,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    let result;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Invalid JSON response from AI');
    }

    // Validate and clean the records
    const validatedRecords = (result.records || []).map((record: any) => {
      // Ensure all fields exist
      const cleanedRecord: CRMRecord = {
        created_at: record.created_at || new Date().toISOString(),
        name: record.name || '',
        email: record.email || '',
        country_code: record.country_code || '',
        mobile_without_country_code: record.mobile_without_country_code || '',
        company: record.company || '',
        city: record.city || '',
        state: record.state || '',
        country: record.country || '',
        lead_owner: record.lead_owner || '',
        crm_status: ALLOWED_STATUSES.includes(record.crm_status) ? record.crm_status : 'GOOD_LEAD_FOLLOW_UP',
        crm_note: record.crm_note || '',
        data_source: ALLOWED_SOURCES.includes(record.data_source) ? record.data_source : '',
        possession_time: record.possession_time || '',
        description: record.description || ''
      };

      // Validate date
      if (!isValidDate(cleanedRecord.created_at)) {
        cleanedRecord.created_at = new Date().toISOString();
      }

      // Ensure email and mobile are strings
      cleanedRecord.email = String(cleanedRecord.email || '');
      cleanedRecord.mobile_without_country_code = String(cleanedRecord.mobile_without_country_code || '');

      return cleanedRecord;
    });

    // Merge skipped records
    const allSkipped = [...skippedFromValidation, ...(result.skipped || [])];

    return {
      records: validatedRecords,
      skipped: allSkipped
    };
  } catch (error) {
    console.error('AI Extraction Error:', error);
    throw new Error(`Failed to extract records using AI: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};