'use client';

interface CSVPreviewProps {
  headers: string[];
  data: any[];
  totalRecords: number;
}

export default function CSVPreview({ headers, data, totalRecords }: CSVPreviewProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl p-8 text-center text-gray-400">
        No data to preview
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
      <div className="overflow-x-auto">
        <div className="max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky-header">
              <tr className="bg-gray-800">
                {headers.map((header, index) => (
                  <th
                    key={index}
                    className="px-4 py-3 text-left font-medium text-gray-300 whitespace-nowrap border-b border-gray-700 text-xs uppercase tracking-wider"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                >
                  {headers.map((header, colIndex) => (
                    <td
                      key={colIndex}
                      className="px-4 py-2 text-gray-300 whitespace-nowrap text-sm"
                    >
                      {row[header] || '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="px-4 py-3 bg-gray-800/50 text-sm text-gray-400 border-t border-gray-800">
        Showing {data.length} of {totalRecords} records
      </div>
    </div>
  );
}
