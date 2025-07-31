import React, { useState } from 'react';
import { FlowAnalysisStep } from '../types';
import FlowAnalysisReport from './FlowAnalysisReport';
import SusReportDisplay from './SusReportDisplay';

interface MultipleRunsDisplayProps {
  runs: Array<{
    steps: FlowAnalysisStep[];
    susAnalysis: string;
    executionTime?: string;
  }>;
}

const MultipleRunsDisplay: React.FC<MultipleRunsDisplayProps> = ({ runs }) => {
  const [selectedRun, setSelectedRun] = useState<number | null>(null);

  return (
    <div className="mt-8 space-y-4">
      <h2 className="text-xl font-semibold text-gray-200 mb-4">All Analysis Runs</h2>
      
      <div className="grid gap-4">
        {runs.map((run, index) => (
          <div key={index} className="bg-gray-800/40 rounded-lg border border-gray-700">
            <button
              onClick={() => setSelectedRun(selectedRun === index ? null : index)}
              className="w-full px-4 py-3 flex items-center justify-between text-left"
            >
              <div>
                <span className="text-gray-200 font-medium">Run {index + 1}</span>
                <div className="inline-flex gap-3">
                  <span className="ml-4 text-gray-400">
                    {run.steps.length} steps
                  </span>
                  {run.executionTime && (
                    <span className="px-2 py-0.5 text-xs bg-blue-900/50 text-blue-300 rounded">
                      {run.executionTime}
                    </span>
                  )}
                </div>
              </div>
              <svg
                className={`w-5 h-5 transform transition-transform ${
                  selectedRun === index ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            
            {selectedRun === index && (
              <div className="px-4 py-3 border-t border-gray-700">
                <FlowAnalysisReport steps={run.steps} />
                <SusReportDisplay report={run.susAnalysis} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MultipleRunsDisplay;
