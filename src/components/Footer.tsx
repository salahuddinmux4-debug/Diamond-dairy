import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 py-4 px-4 text-center text-xs text-slate-400 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="font-medium text-slate-300">
          Diamond Dairy &bull; <span className="text-amber-400">Proprietor: Muhammad Imran</span>
        </p>
        <p className="text-slate-400 font-medium">
          Developed by <span className="text-slate-200 font-semibold">MAS Account Solution</span>
        </p>
      </div>
    </footer>
  );
};
