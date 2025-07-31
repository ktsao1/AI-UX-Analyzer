import React from 'react';

interface LoaderProps {
    message?: string;
}

const Loader: React.FC<LoaderProps> = ({ message = "Analyzing your UI..." }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-4 my-8">
      <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-blue-500"></div>
      <p className="text-gray-300 text-lg">{message}</p>
    </div>
  );
};

export default Loader;