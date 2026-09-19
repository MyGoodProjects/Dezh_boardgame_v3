import React from 'react';
import { LogOut, Flag, AlertTriangle, X } from 'lucide-react';
import { Language } from '../types';
import { getTranslation } from '../data/translations';

interface ConfirmModalProps {
  isOpen: boolean;
  type: 'leave' | 'endGame';
  roomCode?: string;
  lang: Language;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  type,
  roomCode,
  lang,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const t = getTranslation(lang);
  const isLeave = type === 'leave';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-stone-900 border-2 border-stone-700 max-w-md w-full rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        {/* Top Header Accent */}
        <div
          className={`absolute top-0 left-0 right-0 h-1.5 ${
            isLeave
              ? 'bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600'
              : 'bg-gradient-to-r from-rose-600 via-red-500 to-rose-600'
          }`}
        />

        {/* Close button */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 left-4 text-stone-400 hover:text-stone-200 p-1 rounded-lg hover:bg-stone-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Icon & Title */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
              isLeave
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
            }`}
          >
            {isLeave ? <LogOut className="w-6 h-6" /> : <Flag className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-stone-100 font-serif">
              {isLeave ? t.leaveGameTitle : t.endGameTitle}
            </h3>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                isLeave
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : 'bg-rose-950 text-rose-300 border border-rose-800'
              }`}
            >
              {isLeave ? (lang === 'fa' ? 'خروج امن' : 'Safe Exit') : (lang === 'fa' ? 'مخصوص میزبان' : 'Host Only')}
            </span>
          </div>
        </div>

        {/* Modal Description */}
        <p className="text-sm text-stone-300 leading-relaxed mb-4">
          {isLeave ? t.confirmLeaveGame : t.confirmEndGame}
        </p>

        {/* Extra Note / Room info */}
        {isLeave && roomCode && (
          <div className="mb-5 p-3 rounded-xl bg-stone-950/80 border border-stone-800 flex items-center justify-between text-xs text-stone-400">
            <span>{lang === 'fa' ? 'کد تالار شما جهت بازگشت:' : 'Chamber code to rejoin:'}</span>
            <span className="font-mono font-bold text-amber-400 bg-stone-900 px-2 py-1 rounded border border-stone-700">
              {roomCode}
            </span>
          </div>
        )}

        {!isLeave && (
          <div className="mb-5 p-3 rounded-xl bg-rose-950/40 border border-rose-600/40 flex items-center gap-2 text-xs text-rose-200">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              {lang === 'fa'
                ? 'توجه: پس از پایان بازی، امتیاز تمام بازیکنان محاسبه و برنده اعلام می‌شود.'
                : 'Notice: Ending the game will calculate all scores and crown the victor immediately.'}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-stone-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs transition-colors cursor-pointer"
          >
            {t.cancel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all transform active:scale-95 cursor-pointer flex items-center gap-2 ${
              isLeave
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950'
                : 'bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white shadow-rose-950/50'
            }`}
          >
            {isLeave ? <LogOut className="w-4 h-4" /> : <Flag className="w-4 h-4" />}
            <span>
              {isLeave
                ? (lang === 'fa' ? 'تایید و خروج' : 'Confirm Exit')
                : (lang === 'fa' ? 'تایید و پایان بازی' : 'Confirm End Game')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
