
import React, { ReactNode } from 'react';

const getIconForTitle = (title: string): ReactNode => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('how your screen was analyzed')) {
      return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 mr-3 text-purple-300 flex-shrink-0"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
    }
    if (lowerTitle.includes('recommended improvement steps')) {
      return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 mr-3 text-purple-300 flex-shrink-0"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>;
    }
    if (lowerTitle.includes('usability score')) {
        return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 mr-3 text-purple-300 flex-shrink-0"><path d="M21.25 12A9.25 9.25 0 1 1 12 2.75"></path><path d="M12 12v-2"></path><path d="m15 15-1-1"></path><path d="m9 15 1-1"></path></svg>;
    }
    return null;
  }

const parseMarkdown = (text: string): ReactNode[] => {
  const lines = text.split('\n');
  const elements: ReactNode[] = [];
  let listItems: string[] = [];
  let inList = false;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-2 mb-4 pl-2">
          {listItems.map((item, idx) => (
            <li key={`li-${elements.length}-${idx}`}>{item}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
    inList = false;
  };

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith('#### ')) {
      flushList();
      const title = trimmedLine.substring(5);
      elements.push(<h4 key={index} className="text-lg font-semibold mt-4 mb-1 text-gray-200">{title}</h4>);
      return;
    }
    if (trimmedLine.startsWith('### ')) {
      flushList();
      const titleWithMarkdown = trimmedLine.substring(4);
      const title = titleWithMarkdown.replace(/\*/g, '').trim();
      const icon = getIconForTitle(title);
      elements.push(<h3 key={index} className="text-xl font-semibold mt-6 mb-2 text-blue-300 flex items-center">{icon}{title}</h3>);
      return;
    }
    if (trimmedLine.startsWith('## ')) {
      flushList();
      elements.push(<h2 key={index} className="text-2xl font-bold mt-6 mb-3 text-blue-300">{trimmedLine.substring(3)}</h2>);
      return;
    }
    if (trimmedLine.startsWith('# ')) {
        flushList();
        elements.push(<h1 key={index} className="text-3xl font-extrabold mt-8 mb-4 text-blue-400">{trimmedLine.substring(2)}</h1>);
        return;
    }
    
    const listItemMatch = trimmedLine.match(/^(\*|-|\d+\.)\s(.*)/);
    if (listItemMatch) {
      if (!inList) {
        flushList();
        inList = true;
      }
      listItems.push(listItemMatch[2]);
      return;
    }

    flushList();
    if (trimmedLine) {
        elements.push(<p key={index} className="mb-4">{trimmedLine}</p>);
    }
  });
  
  flushList();
  return elements;
};

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="prose prose-invert prose-p:text-gray-300 prose-li:text-gray-300 max-w-none">
      {parseMarkdown(content)}
    </div>
  );
};

export default MarkdownRenderer;