'use client';

import { useState } from 'react';
import CSVUploader from './components/CSVUploader';
import CSVPreview from './components/CSVPreview';
import ResultsTable from './components/ResultsTable';
import ProgressIndicator from './components/ProgressIndicator';
import { Download, X, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';

interface PreviewData {
  headers: string[];
  preview: any[];
  total_records: number;
}

interface ProcessedData {
  records: any[];
  skipped_records: any[];
  imported: number;
  skipped: number;
  total_records: number;
}

export default function Home() {
  const [step, setStep] = useState<'upload' | 'preview' | 'processing' | 'results'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const handleFileUpload = async (file: File) => {
    setFile(file);
    setStep('preview');
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_URL}/api/preview`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setPreviewData({
          headers: response.data.headers,
          preview: response.data.preview,
          total_records: response.data.total_records,
        });
      } else {
        throw new Error(response.data.error || 'Failed to preview CSV');
      }
    } catch (error: any) {
      console.error('Preview error:', error);
      setError(error.response?.data?.error || error.message || 'Failed to preview CSV file');
      setStep('upload');
    }
  };

  const handleConfirmImport = async () => {
    if (!file) return;

    setStep('processing');
    setProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      const response = await axios.post(`${API_URL}/api/process`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (response.data.success) {
        setProcessedData({
          records: response.data.records || [],
          skipped_records: response.data.skipped_records || [],
          imported: response.data.imported || 0,
          skipped: response.data.skipped || 0,
          total_records: response.data.total_records || 0,
        });
        setStep('results');
      } else {
        throw new Error(response.data.error || 'Processing failed');
      }
    } catch (error: any) {
      console.error('Processing error:', error);
      setError(error.response?.data?.error || error.message || 'Failed to process CSV file');
      setStep('preview');
    }
  };

  const handleReset = () => {
    setStep('upload');
    setFile(null);
    setPreviewData(null);
    setProcessedData(null);
    setProgress(0);
    setError(null);
  };

  const downloadSampleCSV = () => {
    const headers = ['created_at', 'name', 'email', 'country_code', 'mobile_without_country_code', 
                     'company', 'city', 'state', 'country', 'lead_owner', 'crm_status', 'crm_note', 
                     'data_source', 'possession_time', 'description'];
    const sampleData = [
      ['2026-05-13 14:20:48', 'John Doe', 'john.doe@example.com', '+91', '9876543210', 
       'GrowEasy', 'Mumbai', 'Maharashtra', 'India', 'test@gmail.com', 'GOOD_LEAD_FOLLOW_UP', 
       'Client is asking to reschedule demo', '', '', ''],
      ['2026-05-13 14:25:30', 'Sarah Johnson', 'sarah.johnson@example.com', '+91', '9876543211', 
       'Tech Solutions', 'Bangalore', 'Karnataka', 'India', 'test@gmail.com', 'DID_NOT_CONNECT', 
       'Person was busy, will try again next week', '', '', '']
    ];
    
    const csvContent = [headers.join(','), ...sampleData.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_crm_import.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex flex-wrap justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Import Leads via CSV
            </h1>
            <p className="text-gray-400 mt-1 text-sm">
              Upload a CSV file to bulk import leads into your system.
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">30°C</p>
            <p className="text-xs text-gray-500">Partly cloudy</p>
          </div>
        </header>

        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span className="text-red-300 text-sm flex-1">{error}</span>
            <button 
              onClick={() => setError(null)} 
              className="text-red-400 hover:text-red-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 'upload' && (
          <div>
            <CSVUploader onUpload={handleFileUpload} />
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-500">
              <span>Supported file: .csv (max 10MB)</span>
              <span className="text-gray-700">|</span>
              <button 
                onClick={downloadSampleCSV}
                className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                Download Sample CSV Template
              </button>
            </div>
          </div>
        )}

        {step === 'preview' && previewData && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 bg-gray-800 rounded-lg text-sm truncate max-w-[200px]">
                    {file?.name}
                  </div>
                  <span className="text-xs text-gray-500">
                    {file && (file.size / 1024 > 1024 
                      ? `${(file.size / 1024 / 1024).toFixed(2)} MB` 
                      : `${(file.size / 1024).toFixed(2)} KB`)}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  {previewData.total_records} records found. Review the data before importing.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-800 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmImport}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium text-sm flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload File
                </button>
              </div>
            </div>
            <CSVPreview
              headers={previewData.headers}
              data={previewData.preview}
              totalRecords={previewData.total_records}
            />
          </div>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-16">
            <ProgressIndicator progress={progress} />
            <p className="mt-4 text-gray-400 text-sm">
              AI is intelligently mapping your data to CRM fields...
            </p>
            <p className="text-xs text-gray-500 mt-2">
              This may take a few moments depending on the file size
            </p>
          </div>
        )}

        {step === 'results' && processedData && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-900/50 rounded-lg p-4 border border-gray-800">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Import Complete!
                </h2>
                <div className="flex flex-wrap gap-4 mt-1 text-sm">
                  <span className="text-green-400">
                    ✓ {processedData.imported} records imported
                  </span>
                  {processedData.skipped > 0 && (
                    <span className="text-yellow-500">
                      ⚠ {processedData.skipped} records skipped
                    </span>
                  )}
                  <span className="text-gray-400">
                    Total: {processedData.total_records} records
                  </span>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-800 transition-colors text-sm"
              >
                Import Another File
              </button>
            </div>

            <ResultsTable
              records={processedData.records}
              skippedRecords={processedData.skipped_records}
            />
          </div>
        )}
      </div>
    </main>
  );
}