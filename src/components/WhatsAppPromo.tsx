import React, { useState } from 'react';
import { MessageSquare, Heart, Bookmark, ExternalLink, ArrowRight, ShieldCheck, Zap, Ticket } from 'lucide-react';
import { playTapSound, playSuccessSound } from '../utils/audio';

interface WhatsAppPromoProps {
  channelUrl: string;
  onAddXP?: (amount: number, reason: string) => void;
}

export default function WhatsAppPromo({ channelUrl, onAddXP }: WhatsAppPromoProps) {
  const [likes, setLikes] = useState(384);
  const [hasLiked, setHasLiked] = useState(false);
  const [xpClaimed, setXpClaimed] = useState(() => {
    try {
      return localStorage.getItem('pkxd_whatsapp_xp_claimed') === 'true';
    } catch {
      return false;
    }
  });

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasLiked) {
      setLikes(likes + 1);
      setHasLiked(true);
      playSuccessSound();
    } else {
      setLikes(likes - 1);
      setHasLiked(false);
      playTapSound();
    }
  };

  const handleJoinClick = () => {
    playLevelUpSound();
    
    // Award 250 XP if not already claimed
    if (!xpClaimed && onAddXP) {
      onAddXP(250, 'Comunidade WhatsApp 🟢');
      setXpClaimed(true);
      try {
        localStorage.setItem('pkxd_whatsapp_xp_claimed', 'true');
      } catch {}
    }

    // Also redirect
    window.open(channelUrl, '_blank', 'noreferrer');
  };

  function playLevelUpSound() {
    // Just reuse or call local Audio
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioCtx.currentTime;
      [261.63, 329.63, 392.00, 523.25].forEach((freq, index) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.08);
        gain.gain.setValueAtTime(0.12, now + index * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, now + index * 0.08 + 0.15);
        osc.start(now + index * 0.08);
        osc.stop(now + index * 0.08 + 0.16);
      });
    } catch (e) {}
  }

  return (
    <div 
      id="whatsapp-promo-container"
      className="bg-radial from-emerald-950/70 to-zinc-950 p-6 sm:p-8 rounded-3xl border-4 border-emerald-400 shadow-[0_12px_0_0_rgb(16,185,129,0.3)] text-white overflow-hidden relative"
    >
      {/* Dynamic decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full filter blur-2xl pointer-events-none" />
      
      <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
        
        {/* Left Side: Mockup WhatsApp Message Feed */}
        <div className="w-full md:w-5/12 flex-shrink-0">
          <div className="bg-[#0b141a] rounded-2xl border-2 border-emerald-500/40 overflow-hidden shadow-2xl relative select-none">
            {/* Header / Chat Name */}
            <div className="bg-[#1f2c34] p-3.5 flex items-center gap-3 border-b border-[#2a3942]">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-pink-500 via-purple-500 to-cyan-400 flex items-center justify-center font-bold font-sans text-sm text-white shadow-md">
                PC
              </div>
              <div>
                <h4 className="font-sans font-bold text-sm text-gray-100 flex items-center gap-1.5">
                  PKXD Central
                  <span className="bg-emerald-500 text-[9px] font-black tracking-wider text-black px-1.5 py-0.5 rounded-full flex items-center">
                    ✓
                  </span>
                </h4>
                <p className="font-mono text-[10px] text-emerald-400 font-semibold animate-pulse">Canal Oficial • Online</p>
              </div>
            </div>

            {/* Chat Body */}
            <div className="p-4 space-y-4 max-h-[220px] overflow-y-auto bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat bg-[size:180px]">
              
               {/* Message bubble 1 */}
               <div className="bg-[#1f2c34] text-gray-250 p-3 rounded-2xl rounded-tl-sm max-w-[85%] text-xs shadow-md border-l-4 border-cyan-400">
                <span className="text-cyan-400 font-extrabold text-[10px] block mb-1">📢 COMUNIDADE PKXD CENTRAL</span>
                Fala galera de PK XD! 🕹️ Aqui postamos com total exclusividade os spoilers das novas atualizações e códigos ativos!
                <span className="text-[9px] text-gray-400 text-right block mt-1.5">17:28</span>
              </div>

              {/* Message bubble 2 */}
              <div className="bg-[#1f2c34] text-gray-250 p-3 rounded-2xl rounded-tl-sm max-w-[85%] text-xs shadow-md border-l-4 border-pink-400">
                <span className="text-pink-400 font-extrabold text-[10px] block mb-1">🚀 SPOILERS SEMANAIS</span>
                Tem spoiler novo toda semana, SEGUNDA-FEIRA às 17:30h (NORMALMENTE)! Ative o sininho no canal para não perder nada! 🔮✨
                
                {/* Fake action/reaction bar in chat bubble */}
                <div className="mt-3 pt-2 border-t border-gray-650 flex justify-between items-center">
                  <button 
                    onClick={handleLike}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      hasLiked ? 'bg-pink-650/30 text-pink-400 border border-pink-500/50' : 'bg-black/40 text-gray-300'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${hasLiked ? 'fill-pink-400 text-pink-400' : 'text-gray-300'}`} />
                    <span>{likes} curtidas</span>
                  </button>
                  <span className="text-[9px] text-gray-400">17:31</span>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Right Side: Informative Title & Call To Action */}
        <div className="flex-1 space-y-5 text-center md:text-left">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-400/50 text-emerald-400 font-mono text-[10px] font-bold rounded-full uppercase tracking-wider mb-2">
              <Zap className="w-3.5 h-3.5" /> Canal Oficial do WhatsApp
            </div>
            
            <h3 className="font-sans font-black text-2xl sm:text-3xl lg:text-4xl leading-tight tracking-wide uppercase">
              SEJA O PRIMEIRO A SABER DE TUDO!
            </h3>
            
            <p className="font-sans text-sm sm:text-base text-gray-300 leading-relaxed max-w-xl mt-2">
              Junte-se à nossa comunidade no WhatsApp! Receba diretamente as notícias do PK XD, alertas de códigos, novidades da administração e a contagem regressiva para os spoilers semanais sem complicação.
            </p>
          </div>

          {/* Value Badges */}
          <div className="grid grid-cols-2 gap-3 max-w-md mx-auto md:mx-0">
            {[
              { icon: Ticket, text: 'Códigos Exclusivos', color: 'text-amber-400 border-amber-500/30 bg-amber-500/5' },
              { icon: ShieldCheck, text: 'Notícias Oficiais', color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/5' }
            ].map((feature, idx) => (
              <div 
                key={idx}
                className={`flex items-center gap-2 p-2.5 rounded-xl border ${feature.color} select-none`}
              >
                <feature.icon className="w-4 h-4 flex-shrink-0" />
                <span className="font-sans font-bold text-xs">{feature.text}</span>
              </div>
            ))}
          </div>

          {/* Main Join CTA Button */}
          <div className="pt-2 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <div className="relative w-full sm:w-auto">
                <button
                  onClick={handleJoinClick}
                  className="w-full px-4 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-emerald-500 to-green-500 text-black font-sans font-black text-sm sm:text-lg rounded-2xl border-b-4 border-emerald-700 shadow-[0_8px_16px_rgba(16,185,129,0.3)] transition-all transform hover:-translate-y-0.5 hover:shadow-[0_12px_20px_rgba(16,185,129,0.4)] active:translate-y-1 active:border-b-0 cursor-pointer flex flex-wrap items-center justify-center gap-2 group text-center"
                >
                  <MessageSquare className="w-5 h-5 fill-black flex-shrink-0" />
                  <span className="break-words">ENTRAR NO CANAL AGORA</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform flex-shrink-0" />
                </button>
                {/* Floating Badge */}
                <div className="absolute -top-2.5 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-black text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-md whitespace-nowrap border border-black/10">
                  {xpClaimed ? "✓ +250 XP Coletado" : "⚡ +250 XP Grátis!"}
                </div>
              </div>

              <button
                onClick={() => {
                  try {
                    navigator.clipboard.writeText(channelUrl);
                    playSuccessSound();
                    alert("Link do Canal copiado com sucesso! Compartilhe com os seus amigos de PK XD! 🕹️");
                  } catch (e) {
                    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent('Acesse o canal de Spoilers e Códigos Oficiais de PK XD: ' + channelUrl)}`, '_blank');
                  }
                }}
                className="w-full sm:w-auto px-4 py-3 sm:py-4 bg-zinc-900 hover:bg-zinc-850 text-emerald-400 font-sans font-black text-xs sm:text-sm rounded-2xl border border-emerald-500/30 transition-all flex flex-wrap items-center justify-center gap-2 cursor-pointer text-center"
              >
                <span>🔗 COMPARTILHAR CANAL</span>
              </button>
            </div>

            <p className="font-sans text-xs text-gray-400">
              ⚡ <strong className="text-emerald-300">Gostou da Central?</strong> Copie o link do canal ou use o botão para compartilhar os spoilers e códigos legítimos com todo o seu clã de amigos no WhatsApp!
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
