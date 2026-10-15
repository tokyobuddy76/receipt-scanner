import React from 'react';
import { Receipt, History, Sparkles } from 'lucide-react';

interface HeaderProps {
  savedCount: number;
  onOpenSaved: () => void;
  onNewScan: () => void;
}

export const Header: React.FC<HeaderProps> = ({ savedCount, onOpenSaved, onNewScan }) => {
  return (
    <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur-sm sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <button
          onClick={onNewScan}
          className="flex items-center gap-3 text-left group transition cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20 group-hover:bg-blue-700 transition">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-900 tracking-tight text-lg">Receipt Scanner</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                <Sparkles className="w-2.5 h-2.5 mr-0.5 text-blue-600" /> AI Vision
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">Instant multimodal receipt extraction</p>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenSaved}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition border border-slate-200 cursor-pointer"
          >
            <History className="w-4 h-4 text-slate-500" />
            <span>Saved</span>
            {savedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-xs font-semibold">
                {savedCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
