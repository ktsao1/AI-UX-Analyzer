import React from 'react';
import { FlowAnalysisStep, Rect } from '../types';
import MarkdownRenderer from './MarkdownRenderer';

const extractActionComponent = (text: string): string | null => {
    const match = text.match(/ACTION_COMPONENT:\s*"([^"]+)"/);
    return match ? match[1] : null;
};

const extractActionLocation = (text: string): string | null => {
    const match = text.match(/ACTION_LOCATION:\s*"([^"]+)"/);
    return match ? match[1] : null;
};

const extractCompletionStatus = (text: string): boolean => {
    const match = text.match(/TASK_COMPLETE:\s*(YES|NO)/);
    return match ? match[1].toUpperCase() === 'YES' : false;
}

const cleanAnalysisText = (text: string): string => {
    return text
        .replace(/ACTION_COMPONENT:\s*"[^"]+"\s*/g, '')
        .replace(/ACTION_LOCATION:\s*"[^"]+"\s*/g, '')
        .replace(/TASK_COMPLETE:\s*(YES|NO)\s*/g, '')
        .replace(/### System Usability Scale \(SUS\) Analysis from Persona's Perspective[\s\S]*/, '')
        .trim();
};

const KeyValueDisplay: React.FC<{ label: string; value: string | null }> = ({ label, value }) => {
    if (!value) return null;
    return (
        <div className="text-sm">
            <span className="font-semibold text-gray-400">{label}:</span>
            <span className="ml-2 font-bold text-gray-200">{value}</span>
        </div>
    );
};

const TapIndicator: React.FC<{ location: Rect }> = ({ location }) => {
    const centerX = location.x + location.width / 2;
    const centerY = location.y + location.height / 2;

    return (
        <div
            className="absolute pointer-events-none"
            style={{
                left: `${centerX}%`,
                top: `${centerY}%`,
            }}
            role="presentation"
        >
            <div className="w-5 h-5 bg-red-500/60 rounded-full animate-pulse border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2" />
        </div>
    );
};


interface FlowAnalysisReportProps {
  steps: FlowAnalysisStep[];
}

const FlowAnalysisReport: React.FC<FlowAnalysisReportProps> = ({ steps }) => {
  if (!steps || steps.length === 0) {
    return null;
  }

  return (
    <div className="w-full mt-8 space-y-12">
       <div className="text-center pb-4">
        <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
          Persona Challenge Report
        </h2>
        <p className="text-lg text-gray-400">A step-by-step journey through your prototype.</p>
      </div>
      {steps.map((step) => {
          const actionComponent = extractActionComponent(step.analysisText);
          const actionLocation = extractActionLocation(step.analysisText);
          const isComplete = extractCompletionStatus(step.analysisText);
          const thoughtProcess = cleanAnalysisText(step.analysisText);

          return (
            <div key={step.step} className="bg-gray-800/60 rounded-xl p-4 md:p-6 shadow-lg border border-gray-700 animate-fade-in-up">
              <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 border-b border-gray-700 pb-4 mb-4">
                  <div className="flex-shrink-0 bg-gray-900 text-blue-300 rounded-full h-12 w-12 flex items-center justify-center text-xl font-bold border-2 border-blue-500">
                    {step.step}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-100 text-center md:text-left">
                    {step.nodeName}
                  </h3>
              </div>
    
              <div className="flex flex-col lg:flex-row gap-8">
                <div className="lg:w-1/2">
                   <h4 className="text-lg font-semibold text-gray-300 mb-4 text-center lg:text-left">Screen Analyzed</h4>
                   <div className="bg-gray-900/50 p-2 rounded-lg">
                    <div className="relative inline-block">
                        <img 
                          src={step.imageUrl} 
                          alt={`Screen for step ${step.step}`} 
                          className="rounded-lg block h-auto max-w-full max-h-[450px]" 
                        />
                        {step.actionLocation && <TapIndicator location={step.actionLocation} />}
                    </div>
                   </div>
                </div>
                <div className="lg:w-1/2 flex flex-col">
                  <h4 className="text-lg font-semibold text-gray-300 mb-4 text-center lg:text-left">AI's Decision</h4>
                  <div className="bg-gray-900/50 p-4 rounded-lg space-y-3">
                      <KeyValueDisplay label="Identified Action Component" value={actionComponent} />
                      <KeyValueDisplay label="Identified Action Location" value={actionLocation} />
                      <KeyValueDisplay label="Identified Task Completion" value={isComplete ? 'YES' : 'NO'} />
                      {step.analysisText.includes("🤖") && (
                          <p className="text-amber-400 font-bold text-sm">
                              {step.analysisText.split("🤖")[1].trim()}
                          </p>
                      )}
                  </div>

                  <details className="mt-4 bg-gray-900/50 rounded-lg group">
                      <summary className="p-3 font-medium cursor-pointer text-gray-300 group-hover:text-white flex items-center justify-between">
                          <span>Show thought process</span>
                          <svg className="w-5 h-5 transition-transform duration-200 group-open:rotate-180" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                      </summary>
                      <div className="p-4 border-t border-gray-700">
                          <MarkdownRenderer content={thoughtProcess} />
                      </div>
                  </details>
                </div>
              </div>
            </div>
          );
      })}
    </div>
  );
};

export default FlowAnalysisReport;