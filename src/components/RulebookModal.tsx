import React from 'react';
import { Language } from '../types';
import { CHARACTERS } from '../data/cards';
import { getTranslation } from '../data/translations';
import { X, BookOpen, Crown, Trophy, Coins, Layers, Swords, Shield, Wand2 } from 'lucide-react';

interface RulebookModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const RulebookModal: React.FC<RulebookModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  const t = getTranslation(lang);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-4xl bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl p-5 sm:p-7 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950 border border-amber-800 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-serif font-black text-amber-300">
                {lang === 'fa' ? 'راهنمای رسمی بازی دژ (Citadels)' : 'Citadels / Dezh Codex & Rules'}
              </h2>
              <p className="text-xs text-stone-400">
                {lang === 'fa'
                  ? 'بر اساس قوانین رسمی بازی دژ'
                  : 'Official game mechanics based on Citadels'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Game Flow & Turn Sequence */}
        <div className="mb-8 bg-stone-950/80 p-4 rounded-xl border border-stone-800">
          <h3 className="text-sm uppercase font-bold text-amber-300 tracking-wider mb-2 flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-400" />
            <span>{lang === 'fa' ? 'جریان و مراحل هر دور بازی' : 'Round & Turn Flow'}</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-stone-300">
            <div className="p-3 bg-stone-900/60 rounded-lg border border-stone-800/80">
              <strong className="text-amber-400 block mb-1">
                {lang === 'fa' ? '۱. مرحله انتخاب نقش (Draft)' : '1. Role Selection Draft'}
              </strong>
              <p className="leading-relaxed">
                {lang === 'fa'
                  ? 'دارنده تاج کارت‌ها را بر می‌زند، بر اساس تعداد نفرات تعدادی را می‌سوزاند و مخفیانه یکی را برمی‌دارد. سپس بقیه کارت‌ها به نفر بعدی می‌رسد تا همه نقش خود را انتخاب کنند.'
                  : 'Crowned regent removes discards and secretly drafts 1 character, passing the rest. Hidden identity ensures bluffing and strategic counter-play.'}
              </p>
            </div>
            <div className="p-3 bg-stone-900/60 rounded-lg border border-stone-800/80">
              <strong className="text-amber-400 block mb-1">
                {lang === 'fa' ? '۲. مرحله اجرای نوبت (به ترتیب ۱ تا ۸)' : '2. Turn Execution (Rank 1 to 8)'}
              </strong>
              <p className="leading-relaxed">
                {lang === 'fa'
                  ? 'تاج‌دار نقش‌ها را از ۱ تا ۸ فرا می‌خواند. هر بازیکن در نوبت خود: ۱) دریافت منبع (۲ سکه یا کشیدن ۲ کارت و نگه‌داشتن ۱)، ۲) استفاده از قابلیت نقش، ۳) ساخت ۱ سازه با پرداخت هزینه.'
                  : 'King calls ranks 1 through 8. On your turn: 1) Gather resources (2 gold or draw 2 keep 1), 2) Execute rank ability, 3) Build 1 district from hand into city.'}
              </p>
            </div>
          </div>
        </div>

        {/* 2. All 8 Characters */}
        <div className="mb-8">
          <h3 className="text-sm uppercase font-bold text-amber-300 tracking-wider mb-3">
            {lang === 'fa' ? '۸ نقش و شخصیت‌های بازی' : 'The 8 Character Roles'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {CHARACTERS.map((char) => (
              <div
                key={char.id}
                className="bg-stone-950/80 border border-stone-800 rounded-xl p-3 flex gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-950 border border-amber-800/80 text-amber-300 font-bold flex items-center justify-center font-mono shrink-0">
                  {char.rank}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-serif font-bold text-sm text-stone-100">
                      {lang === 'fa' ? char.nameFa : char.nameEn}
                    </h4>
                    {char.colorAssociated && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-800 text-stone-400 font-mono">
                        +{char.colorAssociated}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-300 leading-relaxed">
                    {lang === 'fa' ? char.descriptionFa : char.descriptionEn}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. District Types & Scoring */}
        <div className="bg-stone-950/80 p-4 rounded-xl border border-stone-800">
          <h3 className="text-sm uppercase font-bold text-amber-300 tracking-wider mb-2 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>{lang === 'fa' ? 'پایان بازی و فرمول امتیازدهی' : 'Game End & Scoring Math'}</span>
          </h3>
          <ul className="text-xs text-stone-300 space-y-1.5 list-disc list-inside leading-relaxed">
            <li>
              <strong>{lang === 'fa' ? 'شرط پایان:' : 'End Condition:'}</strong>{' '}
              {lang === 'fa'
                ? 'وقتی بازیکنی ۷ سازه (یا ۸ سازه در بازی ۲-۳ نفره) بسازد، دور حاضر دور آخر خواهد بود و بازی پس از نوبت سردار پایان می‌یابد.'
                : 'When a player constructs 7 districts (or 8 in 2-3 players), the round finishes through Rank 8 and game concludes.'}
            </li>
            <li>
              <strong>{lang === 'fa' ? 'ارزش سازه‌ها:' : 'District Values:'}</strong>{' '}
              {lang === 'fa'
                ? 'به ازای هر سکه هزینه سازه‌های ساخته‌شده در شهر، ۱ امتیاز دریافت می‌شود.'
                : 'Sum of the gold costs of all built districts in the city.'}
            </li>
            <li>
              <strong>{lang === 'fa' ? 'اولین شهر کامل:' : 'First to Complete:'}</strong>{' '}
              <span className="text-emerald-400 font-bold">+4</span>{' '}
              {lang === 'fa' ? 'امتیاز پاداش برای نخستین معمار شهر کامل.' : 'bonus points.'}
            </li>
            <li>
              <strong>{lang === 'fa' ? 'سایر شهرهای کامل:' : 'Other Complete Cities:'}</strong>{' '}
              <span className="text-emerald-400 font-bold">+2</span>{' '}
              {lang === 'fa' ? 'امتیاز برای سایر بازیکنانی که در دور آخر شهر خود را تکمیل کنند.' : 'bonus points.'}
            </li>
            <li>
              <strong>{lang === 'fa' ? 'تنوع ۵ رنگ سازه:' : 'All 5 Colors Represented:'}</strong>{' '}
              <span className="text-purple-400 font-bold">+3</span>{' '}
              {lang === 'fa'
                ? 'امتیاز اضافه در صورت داشتن حداقل یک سازه از هر ۵ رنگ (سلطنتی، آیینی، تجاری، نظامی، خاص).'
                : 'bonus points for having at least 1 district of all 5 types.'}
            </li>
            <li>
              <strong>{lang === 'fa' ? 'سازه‌های خاص:' : 'Special Districts:'}</strong>{' '}
              {lang === 'fa'
                ? 'سازه‌های بنفش مانند خزانه سلطنتی (+۱ به ازای هر سکه باقی‌مانده) و نقشه‌خانه (+۱ به ازای هر کارت در دست) امتیازات ویژه اضافه می‌کنند.'
                : 'Imperial Treasury (+1 pt per gold), Map Room (+1 pt per card in hand), etc.'}
            </li>
            <li>
              <strong>{lang === 'fa' ? 'قانون تساوی (Tiebreaker):' : 'Tiebreaker Rule:'}</strong>{' '}
              {lang === 'fa'
                ? 'در صورت برابر بودن مجموع امتیاز دو یا چند بازیکن، بازیکنی برنده است که در دور آخر بازی، نقشی با شماره رتبه (Rank) بالاتر انتخاب کرده باشد.'
                : 'If total scores are tied, the player who held the higher character rank in the final round wins.'}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
