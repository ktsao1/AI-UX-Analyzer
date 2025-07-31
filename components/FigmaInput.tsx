
import React from 'react';

interface FigmaInputProps {
  figmaUrl: string;
  setFigmaUrl: (url: string) => void;
  onFetch: () => void;
  isLoading: boolean;
}

const FigmaIcon: React.FC = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500 mb-4">
        <path d="M15 12C15 13.657 13.657 15 12 15C10.343 15 9 13.657 9 12C9 10.343 10.343 9 12 9C13.657 9 15 10.343 15 12Z" fill="#F24E1E"></path>
        <path d="M9 6H12C13.657 6 15 7.343 15 9V12H9V6Z" fill="#FF7262"></path>
        <path d="M9 18H12C13.657 18 15 16.657 15 15V12H9V18Z" fill="#A259FF"></path>
        <path d="M6 15H9V12H6C4.343 12 3 10.657 3 9C3 7.343 4.343 6 6 6H9V9H6C5.448 9 5 9.448 5 10C5 10.552 5.448 11 6 11H9V12C9 13.657 7.657 15 6 15Z" fill="#1ABCFE"></path>
        <path d="M18 9H15V12H18C19.657 12 21 13.343 21 15C21 16.657 19.657 18 18 18H15V15H18C18.552 15 19 14.552 19 14C19 13.448 18.552 13 18 13H15V12C15 10.343 16.343 9 18 9Z" fill="#0ACF83"></path>
    </svg>
);


const FigmaInput: React.FC<FigmaInputProps> = ({ figmaUrl, setFigmaUrl, onFetch, isLoading }) => {
  return (
    <div className="w-full p-6 md:p-8 bg-gray-800/40 rounded-xl shadow-lg border border-gray-700">
      <div className="flex flex-col items-center text-center">
        <FigmaIcon />
        <h3 className="text-lg font-semibold text-gray-300 mb-2">1. Link to your Figma File</h3>
        <p className="text-gray-400 text-sm max-w-md mb-6">
            Provide a link to a specific Figma frame to begin.
        </p>
      </div>

      <div className="max-w-lg mx-auto">
        <div className="space-y-6">
            <div>
              <label htmlFor="figmaUrl" className="block text-sm font-medium text-gray-400 mb-2">
                Figma Frame URL
              </label>
              <input
                type="url"
                id="figmaUrl"
                value={figmaUrl}
                onChange={(e) => setFigmaUrl(e.target.value)}
                disabled={isLoading}
                placeholder="https://www.figma.com/file/..."
                className="w-full bg-gray-900/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              />
              <p className="text-xs text-gray-500 mt-1 pl-1">In Figma, right-click on a frame and select "Copy link to selection".</p>
            </div>
        </div>

        <div className="pt-8">
            <h3 className="text-lg font-semibold text-gray-300 mb-4 text-center">2. Fetch Your File</h3>
            <button
                onClick={onFetch}
                disabled={isLoading || !figmaUrl.trim()}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg transform transition-transform duration-200 ease-in-out hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
            >
                {isLoading ? 'Fetching from Figma...' : 'Fetch File Data'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default FigmaInput;