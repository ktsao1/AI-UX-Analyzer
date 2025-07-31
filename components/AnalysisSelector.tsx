import React from 'react';
import { ANALYSIS_OPTIONS } from '../constants';
import { AnalysisType } from '../types';

interface AnalysisSelectorProps {
  selectedType: AnalysisType;
  onTypeChange: (type: AnalysisType) => void;
  disabled: boolean;
}

const AnalysisSelector: React.FC<AnalysisSelectorProps> = ({ selectedType, onTypeChange, disabled }) => {
  return (
    <div className="my-6">
        <h3 className="text-lg font-semibold text-gray-300 mb-4 text-center">2. Choose Analysis Type</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {ANALYSIS_OPTIONS.map((option) => (
            <button
            key={option.id}
            onClick={() => onTypeChange(option.id)}
            disabled={disabled}
            className={`p-4 rounded-lg text-center transition-all duration-200 font-medium disabled:cursor-not-allowed disabled:opacity-50
                ${
                selectedType === option.id
                    ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-400'
                    : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                }`}
            >
            {option.label}
            </button>
        ))}
        </div>
    </div>
  );
};

export default AnalysisSelector;