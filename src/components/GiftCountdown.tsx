import React, { useState, useEffect } from 'react';
import { Gift, Lock, Unlock, Copy, Check, Sparkles, Timer } from 'lucide-react';
import { playTapSound, playSuccessSound } from '../utils/audio';

interface GiftCountdownProps {
  title: string;
  targetDate: string;
  enabled: boolean;
  giftContent: string;
}

export default function GiftCountdown({
  title,
  targetDate,
  enabled,
  giftContent
}: GiftCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isOver: boolean;
  }>(() => {
    if (!enabled || !targetDate) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isOver: true };
    }
    const targetTime = new Date(targetDate).getTime();
    const now = new Date().getTime();
    const difference = targetTime - now;

    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isOver: true };
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds, isOver: false };
  });

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!enabled || !targetDate) return;

    const calculateTime = () => {
      const targetTime = new Date(targetDate).getTime();
      const now = new Date().getTime();
      const difference = targetTime - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isOver: true });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isOver: false });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [targetDate, enabled]);

  if (!enabled || !targetDate) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(giftContent);
    setCopied(true);
    playSuccessSound();
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div 
      id="gift-countdown-banner-wrapper"
      className={`relative w-full max-w-4xl mx-auto mb-6 overflow-hidden rounded-3xl border-2 p-5 sm:p-6 transition-all duration-500 ${
        timeLeft.isOver 
          ? 'bg-gradient-to-r from-emerald-950/80 via-zinc-950/90 to-teal-950/80 border-emerald-500/60 shadow-[0_0_25px_rgba(16,185,129,0.25)]' 
          : 'bg-gradient-to-r from-purple-950/80 via-zinc-950/90 to-fuchsia-950/80 border-purple-500/60 shadow-[0_0_25px_rgba(168,85,247,0.25)]'
      }`}
    >
      {/* Dynamic Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

      {/* Glow ambient effects */}
      <div className={`absolute -right-24 -top-24 w-48 h-48 rounded-full blur-[80px] pointer-events-none opacity-45 ${
        timeLeft.isOver ? 'bg-emerald-500' : 'bg-purple-500'
      }`} />
      <div className={`absolute -left-24 -bottom-24 w-48 h-48 rounded-full blur-[80px] pointer-events-none opacity-45 ${
        timeLeft.isOver ? 'bg-teal-500' : 'bg-fuchsia-500'
      }`} />

      <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Present state / details */}
        <div className="flex items-center gap-4 text-left flex-1 w-full">
          <div className={`relative p-3.5 rounded-2xl flex-shrink-0 border ${
            timeLeft.isOver 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.15)] animate-bounce' 
              : 'bg-purple-500/10 border-purple-500/20 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.15)] animate-pulse'
          }`}>
            {timeLeft.isOver ? (
              <>
                <Unlock className="w-8 h-8" />
                <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-yellow-300 animate-spin" />
              </>
            ) : (
              <>
                <Lock className="w-8 h-8" />
                <Gift className="absolute -top-1 -right-1 w-4 h-4 text-purple-300 animate-pulse" />
              </>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] sm:text-[11px] font-mono tracking-widest font-black uppercase px-2 py-0.5 rounded-full ${
                timeLeft.isOver 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                  : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
              }`}>
                {timeLeft.isOver ? 'REVELADO! 🎉' : 'EM CONTAGEM REGRESSIVA ⏳'}
              </span>
            </div>
            <h3 className="font-sans font-black text-lg sm:text-xl text-white tracking-tight leading-tight">
              {title}
            </h3>
            <p className="text-xs text-gray-300 max-w-lg leading-relaxed">
              {timeLeft.isOver 
                ? 'A contagem acabou! O código ou presente abaixo já está liberado para resgate.' 
                : `Aguarde a contagem abaixo para revelar o seu código especial PK XD!`
              }
            </p>
          </div>
        </div>

        {/* Action content / clock side */}
        <div className="w-full md:w-auto flex flex-col items-center md:items-end gap-3 flex-shrink-0">
          
          {!timeLeft.isOver ? (
            /* CLOCK TIMER DISPLAY */
            <div className="flex items-center gap-1.5 sm:gap-2.5" id="gift-countdown-timer-clocks">
              
              {/* Days */}
              {timeLeft.days > 0 && (
                <div className="flex flex-col items-center bg-zinc-900/90 border border-purple-500/20 rounded-xl p-2 px-3 min-w-[56px] shadow-md">
                  <span className="font-mono font-black text-lg sm:text-xl text-purple-300 leading-none">
                    {String(timeLeft.days).padStart(2, '0')}
                  </span>
                  <span className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest pt-1">Dias</span>
                </div>
              )}

              {/* Hours */}
              <div className="flex flex-col items-center bg-zinc-900/90 border border-purple-500/20 rounded-xl p-2 px-3 min-w-[56px] shadow-md">
                <span className="font-mono font-black text-lg sm:text-xl text-purple-300 leading-none">
                  {String(timeLeft.hours).padStart(2, '0')}
                </span>
                <span className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest pt-1">Horas</span>
              </div>

              <span className="font-mono font-black text-purple-400 animate-pulse text-lg">:</span>

              {/* Minutes */}
              <div className="flex flex-col items-center bg-zinc-900/90 border border-purple-500/20 rounded-xl p-2 px-3 min-w-[56px] shadow-md">
                <span className="font-mono font-black text-lg sm:text-xl text-purple-300 leading-none">
                  {String(timeLeft.minutes).padStart(2, '0')}
                </span>
                <span className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest pt-1">Min</span>
              </div>

              <span className="font-mono font-black text-purple-400 animate-pulse text-lg">:</span>

              {/* Seconds */}
              <div className="flex flex-col items-center bg-zinc-950 border border-fuchsia-500/30 rounded-xl p-2 px-3 min-w-[56px] shadow-md">
                <span className="font-mono font-black text-lg sm:text-xl text-fuchsia-400 leading-none">
                  {String(timeLeft.seconds).padStart(2, '0')}
                </span>
                <span className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest pt-1">Seg</span>
              </div>

            </div>
          ) : (
            /* REVEALED GIFT/CODE CONTAINER */
            <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="bg-black/40 border border-emerald-500/30 rounded-xl p-2.5 px-4 font-mono font-black text-sm text-emerald-300 tracking-wide text-center select-all flex items-center justify-center min-w-[200px] shadow-inner">
                {giftContent}
              </div>

              <button
                onClick={handleCopy}
                className="bg-emerald-500 hover:bg-emerald-600 text-black font-sans font-black uppercase text-xs p-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md border-b-2 border-emerald-700 active:border-b-0"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar Presente</span>
                  </>
                )}
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}