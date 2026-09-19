import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { PlayerScoreBreakdown, Language } from '../types';
import { getTranslation } from '../data/translations';
import { Trophy, Crown, Sparkles, RotateCcw, LogOut } from 'lucide-react';
import { soundFx } from '../utils/audio';

interface GameOverModalProps {
  scores: PlayerScoreBreakdown[] | null;
  onPlayAgain: () => void;
  onExitToLobby?: () => void;
  lang: Language;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  scores,
  onPlayAgain,
  onExitToLobby,
  lang,
}) => {
  const t = getTranslation(lang);

  useEffect(() => {
    soundFx.playCrown();
    // Fire celebratory confetti
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
    });
  }, []);

  if (!scores || scores.length === 0) return null;

  const winner = scores[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md">
      <div className="w-full max-w-3xl bg-stone-900 border-2 border-amber-500 rounded-2xl shadow-2xl p-6 max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 mb-3 shadow-lg">
            <Trophy className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-black text-amber-300 tracking-wide">
            {t.gameOver}
          </h2>
          <p className="text-xs text-stone-400 mt-1">{t.scoresSummary}</p>
        </div>

        {/* Winner Showcase Card */}
        <div className="bg-gradient-to-r from-amber-950/80 via-amber-900/60 to-amber-950/80 border border-amber-500 rounded-xl p-4 sm:p-5 mb-6 text-center shadow-lg">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Crown className="w-6 h-6 text-amber-400" />
            <span className="text-xs uppercase font-bold tracking-widest text-amber-300">
              {t.victory}
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-serif font-black text-stone-100 flex items-center justify-center gap-2">
            <span>{winner.avatar}</span>
            <span>{winner.playerName}</span>
          </h3>
          <p className="text-3xl font-black text-amber-400 font-mono mt-1">
            {winner.totalScore} {lang === 'fa' ? 'امتیاز' : 'PTS'}
          </p>
        </div>

        {/* Scoring Table */}
        <div className="overflow-x-auto bg-stone-950 rounded-xl border border-stone-800 mb-6">
          <table className="w-full text-left text-xs text-stone-300">
            <thead className="bg-stone-900 border-b border-stone-800 text-[11px] uppercase font-mono text-stone-400">
              <tr>
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">{lang === 'fa' ? 'بازیکن' : 'Player'}</th>
                <th className="py-2.5 px-3">{lang === 'fa' ? 'ارزش سازه‌ها' : 'Districts'}</th>
                <th className="py-2.5 px-3">{lang === 'fa' ? 'اولین شهر (+۴)' : 'First (+4)'}</th>
                <th className="py-2.5 px-3">{lang === 'fa' ? 'شهر کامل (+۲)' : 'Complete (+2)'}</th>
                <th className="py-2.5 px-3">{lang === 'fa' ? '۵ رنگ (+۳)' : '5 Colors (+3)'}</th>
                <th className="py-2.5 px-3">{lang === 'fa' ? 'سازه‌های خاص' : 'Specials'}</th>
                <th className="py-2.5 px-3 text-center" title={lang === 'fa' ? 'شماره نقش دور آخر (قانون تساوی)' : 'Final Round Character Rank (Tiebreaker)'}>
                  {lang === 'fa' ? 'نقش آخر' : 'Rank'}
                </th>
                <th className="py-2.5 px-3 text-right font-bold text-amber-400">
                  {lang === 'fa' ? 'مجموع' : 'Total'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60 font-sans">
              {scores.map((s, idx) => (
                <tr
                  key={s.playerId}
                  className={`hover:bg-stone-900/40 transition-colors ${
                    idx === 0 ? 'bg-amber-950/30 font-semibold' : ''
                  }`}
                >
                  <td className="py-3 px-3 font-mono text-stone-400">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                  </td>
                  <td className="py-3 px-3 flex items-center gap-1.5">
                    <span>{s.avatar}</span>
                    <span className="text-stone-200">{s.playerName}</span>
                  </td>
                  <td className="py-3 px-3 font-mono">{s.districtScore}</td>
                  <td className="py-3 px-3 font-mono text-emerald-400">
                    {s.firstToCompleteBonus > 0 ? `+${s.firstToCompleteBonus}` : '—'}
                  </td>
                  <td className="py-3 px-3 font-mono text-emerald-400">
                    {s.completedBonus > 0 ? `+${s.completedBonus}` : '—'}
                  </td>
                  <td className="py-3 px-3 font-mono text-purple-400">
                    {s.allColorsBonus > 0 ? `+${s.allColorsBonus}` : '—'}
                  </td>
                  <td className="py-3 px-3 font-mono text-amber-400">
                    {s.specialDistrictsBonus > 0 ? `+${s.specialDistrictsBonus}` : '—'}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-xs text-stone-400">
                    {s.lastRoundRank > 0 ? `#${s.lastRoundRank}` : '—'}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-sm text-amber-300">
                    {s.totalScore}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Play Again & Back to Lobby CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onPlayAgain}
            className="py-3.5 px-8 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-bold text-sm shadow-xl flex items-center gap-2 cursor-pointer transform active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t.playAgain}</span>
          </button>

          {onExitToLobby && (
            <button
              type="button"
              onClick={onExitToLobby}
              className="py-3.5 px-6 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-300 hover:text-stone-100 font-bold text-sm shadow border border-stone-700 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <LogOut className="w-4 h-4 text-amber-400" />
              <span>{t.backToLobby}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
