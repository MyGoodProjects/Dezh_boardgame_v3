import React from 'react';
import { DistrictCard, DistrictColor, Language } from '../types';
import { X, Sparkles } from 'lucide-react';

interface CardDetailsModalProps {
  card: DistrictCard | null;
  onClose: () => void;
  lang: Language;
}

export const CardDetailsModal: React.FC<CardDetailsModalProps> = ({
  card,
  onClose,
  lang,
}) => {
  if (!card) return null;

  const getColorStyles = (color: DistrictColor) => {
    switch (color) {
      case 'noble':
        return {
          border: 'border-amber-500',
          badge: 'bg-amber-500 text-stone-950',
          labelEn: 'Noble (Yellow)',
          labelFa: 'سلطنتی (زرد)',
        };
      case 'religious':
        return {
          border: 'border-blue-500',
          badge: 'bg-blue-500 text-white',
          labelEn: 'Religious (Blue)',
          labelFa: 'آیینی (آبی)',
        };
      case 'trade':
        return {
          border: 'border-emerald-500',
          badge: 'bg-emerald-500 text-white',
          labelEn: 'Trade (Green)',
          labelFa: 'تجاری (سبز)',
        };
      case 'military':
        return {
          border: 'border-rose-500',
          badge: 'bg-rose-500 text-white',
          labelEn: 'Military (Red)',
          labelFa: 'نظامی (قرمز)',
        };
      case 'unique':
        return {
          border: 'border-purple-500',
          badge: 'bg-purple-500 text-white',
          labelEn: 'Special / Unique (Purple)',
          labelFa: 'خاص / منحصر به فرد (بنفش)',
        };
    }
  };

  const style = getColorStyles(card.color);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div
        className={`w-full max-w-sm bg-stone-900 border-2 ${style.border} rounded-2xl shadow-2xl p-5 relative`}
      >
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Header */}
        <div className="flex items-center justify-between mb-3 pr-8">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${style.badge}`}>
            {card.cost} 🪙 {lang === 'fa' ? 'سکه' : 'Gold'}
          </span>
          <span className="text-xs font-medium text-stone-400">
            {lang === 'fa' ? style.labelFa : style.labelEn}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-serif font-black text-xl text-stone-100 mb-0.5">
          {lang === 'fa' ? card.nameFa : card.nameEn}
        </h3>
        <p className="text-xs text-stone-400 mb-4 font-mono">
          {lang === 'fa' ? card.nameEn : card.nameFa}
        </p>

        {/* Description */}
        <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800 text-xs text-stone-300 leading-relaxed">
          {card.descriptionEn ? (
            <div>
              <div className="flex items-center gap-1.5 text-amber-400 font-bold mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{lang === 'fa' ? 'قابلیت ویژه سازه:' : 'Special Ability:'}</span>
              </div>
              <p>{lang === 'fa' ? card.descriptionFa : card.descriptionEn}</p>
            </div>
          ) : (
            <p className="text-stone-400 italic">
              {lang === 'fa'
                ? `سازه استاندارد از نوع ${style.labelFa}. در پایان بازی ${card.cost} امتیاز به شهر شما می‌افزاید و در نوبت شخصیت‌های همرنگ درآمد ایجاد می‌کند.`
                : `Standard ${style.labelEn} district. Grants ${card.cost} base points at game end and tax income for matching characters.`}
            </p>
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-lg cursor-pointer transition-colors"
        >
          {lang === 'fa' ? 'بستن' : 'Close'}
        </button>
      </div>
    </div>
  );
};
