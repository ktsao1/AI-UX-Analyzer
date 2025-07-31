
import React from 'react';
import { PrototypeFlow } from '../types';

interface FlowSelectorProps {
  flows: PrototypeFlow[];
  selectedFlow: PrototypeFlow | null;
  onSelectFlow: (flow: PrototypeFlow) => void;
  isLoading: boolean;
}

const FlowSelector: React.FC<FlowSelectorProps> = ({ flows, selectedFlow, onSelectFlow, isLoading }) => {
  return (
    <div className="my-4 space-y-3 animate-fade-in">
      <h4 className="text-md font-semibold text-gray-300 mb-2 text-center">Select a prototype flow to evaluate:</h4>
      <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
        {flows.map((flow) => (
          <button
            key={flow.root.id}
            onClick={() => onSelectFlow(flow)}
            disabled={isLoading}
            className={`w-full text-left p-3 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-wait
              ${selectedFlow?.root.id === flow.root.id 
                ? 'bg-blue-600 text-white ring-2 ring-blue-400' 
                : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
              }
            `}
          >
            <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 text-purple-300 flex-shrink-0"><path d="M2 6s1.5-2 5-2 5 2 5 2v14s-1.5-1-5-1-5 1-5 1V6z"/><path d="M12 6s1.5-2 5-2 5 2 5 2v14s-1.5-1-5-1-5 1-5 1V6z"/></svg>
                <span>{flow.name}</span>
            </div>
          </button>
        ))}
      </div>
      {flows.length === 0 && (
         <p className="text-center text-gray-500 text-sm">No prototype flows found in this file.</p>
      )}
    </div>
  );
};

export default FlowSelector;
