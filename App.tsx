import React from 'react';
import PromptBuilder from './components/PromptBuilder';
import { FilmIcon } from '@heroicons/react/24/outline';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-indigo-500/30 selection:text-indigo-200 flex flex-col font-sans">
      
      {/* Compact Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/60 h-14">
        <div className="w-full max-w-[1800px] mx-auto px-4 h-full">
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-tr from-indigo-600 to-purple-600 p-1.5 rounded-lg shadow-lg shadow-indigo-500/20">
                <FilmIcon className="w-5 h-5 text-white" />
              </div>
              <div className="flex items-baseline gap-2">
                <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                  CinePrompt Pro
                </h1>
                <span className="hidden sm:inline-block text-[10px] text-slate-500 uppercase tracking-widest border-l border-slate-700 pl-2">
                  AI Video Gen Assistant
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
                <a href="#" className="text-xs text-slate-400 hover:text-indigo-400 transition-colors">Guide</a>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-500">
                    v1.2
                </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Full Width & Height */}
      <main className="flex-grow flex flex-col">
        <div className="w-full max-w-[1800px] mx-auto p-4 md:p-6 flex-grow">
          <PromptBuilder />
        </div>
      </main>

    </div>
  );
};

export default App;