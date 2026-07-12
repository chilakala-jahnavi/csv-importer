'use client';

import { useEffect, useState } from 'react';

interface ProgressIndicatorProps {
  progress: number;
}

export default function ProgressIndicator({ progress }: ProgressIndicatorProps) {
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayProgress(progress);
    }, 100);
    return () => clearTimeout(timer);
  }, [progress]);

  return (
    <div className="w-full max-w-md">
      <div className="flex justify-between mb-2">
        <span className="text-sm text-gray-400">Processing...</span>
        <span className="text-sm font-medium text-blue-400">{Math.round(displayProgress)}%</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500 ease-out rounded-full"
          style={{ width: `${displayProgress}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-2 text-center">
        AI is analyzing and mapping your data
      </p>
    </div>
  );
}
