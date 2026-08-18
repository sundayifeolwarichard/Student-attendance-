import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="h-10 bg-white border-t border-slate-200 flex items-center px-4 sm:px-6 lg:px-8 text-slate-500 text-[10px] justify-between shrink-0 select-none z-10">
      <span className="font-semibold tracking-tight text-slate-700">
        © 2026 THE POLYTECHNIC, IBADAN • DIGITAL ATTENDANCE SYSTEM
      </span>
      <div className="flex items-center gap-4 hidden sm:flex font-mono text-[10px]">
        <span className="flex items-center gap-1.5 text-slate-600">
          <span className="w-1.5 h-1.5 bg-slate-900 rounded-full"></span>
          Server: Ibadan-N1-WAT
        </span>
        <span className="flex items-center gap-1.5 text-slate-600">
          Version 2.1.4-LTS
        </span>
        <span className="text-slate-900 font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">
          WAT (UTC+1)
        </span>
      </div>
    </footer>
  );
};
