import React from 'react';
import MarkdownRenderer from './MarkdownRenderer';

interface SusReportDisplayProps {
  report: string;
}

const SusReportDisplay: React.FC<SusReportDisplayProps> = ({ report }) => {
  if (!report) return null;

  const extractSusScore = (reportText: string): string | null => {
    const match = reportText.match(/FINAL_SUS_SCORE:\s*(\d{1,3}(?:\.\d{1,2})?)/i);
    return match ? match[1] : null;
  };

  const cleanReportForDisplay = (reportText: string): string => {
    return reportText.replace(/FINAL_SUS_SCORE:\s*(\d{1,3}(?:\.\d{1,2})?)\s*\n?/i, '').trim();
  }
  
  const score = extractSusScore(report);
  const displayReport = cleanReportForDisplay(report);

  return (
    <div className="w-full bg-gradient-to-br from-blue-900/40 to-purple-900/40 rounded-xl p-6 mt-8 shadow-lg border border-blue-800 animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 text-blue-300 flex-shrink-0"><path d="M21.25 12A9.25 9.25 0 1 1 12 2.75"></path><path d="M12 12v-2"></path><path d="m15 15-1-1"></path><path d="m9 15 1-1"></path></svg>
            System Usability Analysis
        </h2>
        {score && (
          <>
            <p className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mt-4">
              {score}
            </p>
            <p className="text-gray-400 text-lg mt-1">Final SUS Score</p>
          </>
        )}
      </div>

      <details className="bg-gray-900/50 rounded-lg group">
          <summary className="p-3 font-medium cursor-pointer text-gray-300 group-hover:text-white flex items-center justify-between">
              <span>Show Detailed Analysis</span>
              <svg className="w-5 h-5 transition-transform duration-200 group-open:rotate-180" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
          </summary>
          <div className="p-4 border-t border-gray-700">
              <MarkdownRenderer content={displayReport} />
          </div>
      </details>
    </div>
  );
};

export default SusReportDisplay;