'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, MoreHorizontal, Plus } from 'lucide-react';

interface ResultsTableProps {
  records: any[];
  skippedRecords: any[];
}

export default function ResultsTable({ records, skippedRecords }: ResultsTableProps) {
  const [showSkipped, setShowSkipped] = useState(false);

  if (records.length === 0 && skippedRecords.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl p-8 text-center text-gray-400">
        No records to display
      </div>
    );
  }

  const displayFields = [
    { key: 'name', label: 'LEAD NAME' },
    { key: 'email', label: 'EMAIL' },
    { key: 'mobile_without_country_code', label: 'CONTACT' },
    { key: 'created_at', label: 'DATE CREATED' },
    { key: 'company', label: 'COMPANY' },
    { key: 'crm_status', label: 'STATUS' },
    { key: 'crm_note', label: 'NOTES' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SALE_DONE':
        return 'text-green-400 bg-green-900/30';
      case 'GOOD_LEAD_FOLLOW_UP':
        return 'text-blue-400 bg-blue-900/30';
      case 'DID_NOT_CONNECT':
        return 'text-yellow-400 bg-yellow-900/30';
      case 'BAD_LEAD':
        return 'text-red-400 bg-red-900/30';
      default:
        return 'text-gray-400 bg-gray-800';
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return dateStr || '—';
    }
  };

  return (
    <div className="space-y-4">
      {records.length > 0 && (
        <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
          <div className="px-4 py-3 bg-gray-800/30 border-b border-gray-800 flex items-center justify-between">
            <h3 className="font-medium text-white text-sm">
              Imported Records ({records.length})
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Quality</span>
              <span className="text-xs text-gray-500">Lead</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <div className="max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky-header">
                  <tr className="bg-gray-800/50">
                    {displayFields.map((field, index) => (
                      <th
                        key={index}
                        className="px-4 py-3 text-left font-medium text-gray-400 text-xs uppercase tracking-wider whitespace-nowrap border-b border-gray-700"
                      >
                        {field.label}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right font-medium text-gray-400 text-xs uppercase tracking-wider whitespace-nowrap border-b border-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors"
                    >
                      {displayFields.map((field, colIndex) => {
                        const value = row[field.key];
                        if (field.key === 'crm_status') {
                          return (
                            <td key={colIndex} className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(value)}`}>
                                {value || '—'}
                              </span>
                            </td>
                          );
                        }
                        if (field.key === 'created_at') {
                          return (
                            <td key={colIndex} className="px-4 py-3 text-gray-300 whitespace-nowrap text-xs">
                              {formatDate(value)}
                            </td>
                          );
                        }
                        return (
                          <td key={colIndex} className="px-4 py-3 text-gray-300 whitespace-nowrap text-sm">
                            {value || '—'}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button className="p-1 hover:bg-gray-700 rounded transition-colors">
                            <MoreHorizontal className="w-4 h-4 text-gray-400" />
                          </button>
                          <button className="p-1 hover:bg-gray-700 rounded transition-colors">
                            <Plus className="w-4 h-4 text-gray-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {records.length > 10 && (
            <div className="px-4 py-3 bg-gray-800/30 border-t border-gray-800 text-center">
              <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                Load more
              </button>
            </div>
          )}
        </div>
      )}

      {skippedRecords.length > 0 && (
        <div className="bg-gray-900 rounded-xl overflow-hidden border border-yellow-900/30">
          <button
            onClick={() => setShowSkipped(!showSkipped)}
            className="w-full px-4 py-3 bg-yellow-900/10 hover:bg-yellow-900/20 transition-colors flex items-center justify-between"
          >
            <span className="font-medium text-yellow-500 text-sm">
              ⚠ Skipped Records ({skippedRecords.length})
            </span>
            {showSkipped ? (
              <ChevronDown className="w-4 h-4 text-yellow-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-yellow-500" />
            )}
          </button>

          {showSkipped && (
            <div className="overflow-x-auto">
              <div className="max-h-[300px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky-header">
                    <tr className="bg-gray-800/50">
                      <th className="px-4 py-2 text-left font-medium text-gray-400 text-xs uppercase tracking-wider border-b border-gray-700">
                        Reason
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-400 text-xs uppercase tracking-wider border-b border-gray-700">
                        Original Data
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {skippedRecords.map((record, index) => (
                      <tr
                        key={index}
                        className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors"
                      >
                        <td className="px-4 py-2 text-yellow-400 text-xs whitespace-nowrap">
                          {record.reason || 'Missing required fields'}
                        </td>
                        <td className="px-4 py-2 text-gray-400">
                          <pre className="text-xs max-w-md truncate">
                            {JSON.stringify(record.original_data || record, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
