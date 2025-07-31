
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="text-center p-4 md:p-6">
      <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-2">
        UI/UX Analyzer AI
      </h1>
      <p className="text-lg text-gray-400">
        Get instant design feedback powered by Gemini
      </p>
    </header>
  );
};

export default Header;
