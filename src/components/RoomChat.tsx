import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  X,
  ChevronDown,
  Sparkles,
  Users,
} from 'lucide-react';
import { ChatMessage, Language } from '../types';
import { getTranslation } from '../data/translations';
import { soundFx } from '../utils/audio';

interface RoomChatProps {
  messages: ChatMessage[];
  currentUserId: string;
  roomCode: string;
  onSendMessage: (text: string) => void;
  lang: Language;
  variant?: 'embedded' | 'floating';
  isOpen?: boolean;
  onToggleOpen?: () => void;
  unreadCount?: number;
  onClearUnread?: () => void;
  playerCount?: number;
}

export const RoomChat: React.FC<RoomChatProps> = ({
  messages = [],
  currentUserId,
  roomCode,
  onSendMessage,
  lang,
  variant = 'embedded',
  isOpen = false,
  onToggleOpen,
  unreadCount = 0,
  onClearUnread,
  playerCount,
}) => {
  const [inputText, setInputText] = useState('');
  const embeddedContainerRef = useRef<HTMLDivElement | null>(null);
  const floatingContainerRef = useRef<HTMLDivElement | null>(null);
  const t = getTranslation(lang);
  const isRtl = lang === 'fa';

  const scrollRefToBottom = (el: HTMLDivElement | null) => {
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  useEffect(() => {
    if (variant === 'embedded') {
      scrollRefToBottom(embeddedContainerRef.current);
      const timer = setTimeout(() => scrollRefToBottom(embeddedContainerRef.current), 30);
      return () => clearTimeout(timer);
    }
  }, [variant, messages.length]);

  useEffect(() => {
    if (variant === 'floating' && isOpen) {
      scrollRefToBottom(floatingContainerRef.current);
      const timer = setTimeout(() => scrollRefToBottom(floatingContainerRef.current), 50);
      const timer2 = setTimeout(() => scrollRefToBottom(floatingContainerRef.current), 150);
      return () => {
        clearTimeout(timer);
        clearTimeout(timer2);
      };
    }
  }, [variant, isOpen, messages.length]);

  const quickPhrases = isRtl
    ? [
        'سلام به همگی! 👋',
        'من آماده‌ام! ⚔️',
        'شروع کنیم؟ 👑',
        'چه حرکتی! 🏰',
        'خوب بازی کردی! 👏',
        'شانس آوردی! 🎲',
      ]
    : [
        'Hello everyone! 👋',
        'I am ready! ⚔️',
        'Ready to start? 👑',
        'What a move! 🏰',
        'Well played! 👏',
        'Lucky roll! 🎲',
      ];

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text) return;
    onSendMessage(text);
    setInputText('');
    soundFx.playCard();
  };

  const handleQuickPhrase = (phrase: string) => {
    onSendMessage(phrase);
    soundFx.playCard();
  };

  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp);
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // --- EMBEDDED VARIANT (Used directly in Lobby Chamber Waiting Room) ---
  if (variant === 'embedded') {
    return (
      <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-3.5 flex flex-col h-80 shadow-inner">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-800/80">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-amber-950/80 border border-amber-600/40 flex items-center justify-center text-amber-400">
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-xs text-stone-200">{t.chamberChat}</span>
            <span className="text-[10px] text-amber-400/90 font-mono bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-900/50">
              {roomCode}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-stone-400">
            <Users className="w-3 h-3 text-stone-400" />
            <span>
              {playerCount ? `${playerCount} ${t.chatMembers}` : `${messages.length} ${isRtl ? 'پیام' : 'msgs'}`}
            </span>
          </div>
        </div>

        {/* Message List */}
        <div ref={embeddedContainerRef} className="flex-1 overflow-y-auto pr-1 space-y-2 text-xs">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-stone-500 text-xs px-4">
              <MessageSquare className="w-8 h-8 text-stone-700 mb-1.5 opacity-50" />
              <p>{t.noChatMessages}</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-baseline gap-1 text-[10px] text-stone-400 mb-0.5 px-1">
                    <span className="font-medium text-stone-300 flex items-center gap-1">
                      <span>{msg.senderAvatar}</span>
                      <span>{isMe ? (isRtl ? 'شما' : 'You') : msg.senderName}</span>
                    </span>
                    <span className="text-stone-500 font-mono text-[9px]">{formatTime(msg.timestamp)}</span>
                  </div>
                  <div
                    className={`max-w-[85%] px-3 py-1.5 rounded-xl break-words text-xs leading-relaxed shadow-sm ${
                      isMe
                        ? 'bg-gradient-to-r from-amber-700 to-amber-600 text-stone-950 font-semibold rounded-br-none'
                        : 'bg-stone-900 border border-stone-800 text-stone-200 rounded-bl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Quick Phrases */}
        <div className="py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-t border-stone-800/60 mt-1">
          {quickPhrases.slice(0, 4).map((phrase, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleQuickPhrase(phrase)}
              className="text-[10px] whitespace-nowrap px-2 py-0.5 rounded-full bg-stone-900 hover:bg-stone-800 border border-stone-700/70 text-stone-300 hover:text-amber-300 transition-colors cursor-pointer shrink-0"
            >
              {phrase}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="flex items-center gap-1.5 pt-1">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={t.chatPlaceholder}
            maxLength={250}
            className="flex-1 bg-stone-900 border border-stone-700/80 focus:border-amber-500 rounded-lg px-2.5 py-1.5 text-xs text-stone-200 placeholder:text-stone-500 focus:outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-stone-950 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shrink-0"
            title={t.send}
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.send}</span>
          </button>
        </form>
      </div>
    );
  }

  // --- FLOATING VARIANT (Used in-game and globally accessible) ---
  return (
    <>
      {/* Floating Toggle Button (Always accessible when in active game) */}
      <div
        className={`fixed bottom-4 ${isRtl ? 'left-4' : 'right-4'} z-40`}
      >
        <button
          type="button"
          onClick={() => {
            onToggleOpen?.();
            if (!isOpen) onClearUnread?.();
          }}
          className={`relative p-3 rounded-2xl shadow-xl flex items-center justify-center transition-all transform active:scale-95 cursor-pointer border ${
            isOpen
              ? 'bg-amber-600 border-amber-400 text-stone-950 ring-2 ring-amber-400/40'
              : 'bg-stone-900 hover:bg-stone-800 border-amber-600/50 text-amber-400 hover:text-amber-300'
          }`}
          title={isOpen ? t.closeChat : t.openChat}
        >
          <MessageSquare className="w-5 h-5" />
          {/* Unread Counter Badge */}
          {!isOpen && unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 bg-rose-600 text-white font-bold text-[10px] rounded-full flex items-center justify-center border border-stone-950 animate-bounce shadow">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Floating Chat Window */}
      {isOpen && (
        <div
          className={`fixed bottom-18 ${isRtl ? 'left-4' : 'right-4'} z-40 w-80 sm:w-96 max-h-[460px] h-[440px] flex flex-col bg-stone-900/95 backdrop-blur-md border border-amber-600/50 rounded-2xl shadow-2xl overflow-hidden animate-fadeIn`}
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          {/* Window Header */}
          <div className="flex items-center justify-between p-3 bg-stone-950/90 border-b border-stone-800">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-950 border border-amber-600/40 flex items-center justify-center text-amber-400">
                <MessageSquare className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-stone-200">{t.chamberChat}</h4>
                <span className="text-[10px] text-amber-400 font-mono">
                  {isRtl ? `تالار: ${roomCode}` : `Chamber: ${roomCode}`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onToggleOpen}
                className="p-1 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
                title={t.minimize}
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onToggleOpen}
                className="p-1 rounded-lg hover:bg-rose-950/60 hover:text-rose-400 text-stone-400 transition-colors cursor-pointer"
                title={t.closeChat}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div ref={floatingContainerRef} className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-stone-500 text-xs p-4">
                <Sparkles className="w-7 h-7 text-amber-500/40 mb-2" />
                <p className="leading-relaxed">{t.noChatMessages}</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === currentUserId;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-baseline gap-1 text-[10px] text-stone-400 mb-0.5 px-1">
                      <span className="font-medium text-stone-300 flex items-center gap-1">
                        <span>{msg.senderAvatar}</span>
                        <span>{isMe ? (isRtl ? 'شما' : 'You') : msg.senderName}</span>
                      </span>
                      <span className="text-stone-500 font-mono text-[9px]">{formatTime(msg.timestamp)}</span>
                    </div>
                    <div
                      className={`max-w-[85%] px-3 py-1.5 rounded-xl break-words text-xs leading-relaxed shadow-sm ${
                        isMe
                          ? 'bg-gradient-to-r from-amber-700 to-amber-600 text-stone-950 font-semibold rounded-br-none'
                          : 'bg-stone-950 border border-stone-800 text-stone-200 rounded-bl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Phrase Chips */}
          <div className="px-2.5 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar bg-stone-950/60 border-t border-stone-800/80">
            {quickPhrases.map((phrase, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickPhrase(phrase)}
                className="text-[10px] whitespace-nowrap px-2.5 py-1 rounded-full bg-stone-900 hover:bg-amber-950/60 border border-stone-700 hover:border-amber-600/70 text-stone-300 hover:text-amber-300 transition-colors cursor-pointer shrink-0"
              >
                {phrase}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleSend}
            className="p-2.5 bg-stone-950/90 border-t border-stone-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t.chatPlaceholder}
              maxLength={250}
              className="flex-1 bg-stone-900 border border-stone-700 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-stone-200 placeholder:text-stone-500 focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer shrink-0"
              title={t.send}
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.send}</span>
            </button>
          </form>
        </div>
      )}
    </>
  );
};
