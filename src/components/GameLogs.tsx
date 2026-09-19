import React from 'react';
import { GameLogEntry, Language } from '../types';
import { ScrollText, ChevronDown, ChevronUp } from 'lucide-react';

interface GameLogsProps {
  logs: GameLogEntry[];
  lang: Language;
}

export const GameLogs: React.FC<GameLogsProps> = ({ logs, lang }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const getLogBadge = (type: GameLogEntry['type']) => {
    switch (type) {
      case 'kill':
        return 'bg-red-950 text-red-400 border-red-800';
      case 'steal':
        return 'bg-amber-950 text-amber-400 border-amber-800';
      case 'build':
        return 'bg-emerald-950 text-emerald-400 border-emerald-800';
      case 'draft':
        return 'bg-purple-950 text-purple-400 border-purple-800';
      case 'ability':
        return 'bg-blue-950 text-blue-400 border-blue-800';
      case 'end':
        return 'bg-yellow-950 text-yellow-300 border-yellow-700';
      default:
        return 'bg-stone-900 text-stone-400 border-stone-800';
    }
  };

  return (
    <div className="bg-stone-900/90 border border-stone-800 rounded-2xl overflow-hidden mb-6">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-stone-850 transition-colors text-xs font-semibold text-stone-300"
      >
        <div className="flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-amber-400" />
          <span>{lang === 'fa' ? 'وقایع و رویدادهای تالار (تاریخچه بازی)' : 'Chamber Chronicle & Events'}</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-400 font-mono">
            {logs.length}
          </span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {isOpen && (
        <div className="max-h-60 overflow-y-auto p-3 space-y-1.5 border-t border-stone-800 text-xs font-sans">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-2 p-2 rounded-lg bg-stone-950/60 border border-stone-800/60"
            >
              <span
                className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border ${getLogBadge(
                  log.type
                )}`}
              >
                {log.type}
              </span>
              <span className="text-stone-300 leading-relaxed">
                {lang === 'fa' ? log.textFa : log.textEn}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
