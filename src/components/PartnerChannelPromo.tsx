import React, { useState } from 'react';
import { MessageSquare, Heart, ExternalLink, ArrowRight, ShieldCheck, Zap, Star, Sparkles } from 'lucide-react';
import { playTapSound, playSuccessSound } from '../utils/audio';

interface PartnerChannelPromoProps {
  onAddXP?: (amount: number, reason: string) => void;
}

export default function PartnerChannelPromo({ onAddXP }: PartnerChannelPromoProps) {
  const channelUrl = "https://whatsapp.com/channel/0029Vb66p8S47XeCPY21PF1E";
  const channelName = ".•°•. 𝙰𝚕𝚎𝚛𝚝𝚊𝚜 𝙿𝙺 𝚇𝙳 .•°•.";
  
  const [likes, setLikes] = useState(412);
  const [hasLiked, setHasLiked] = useState(false);
  const [xpClaimed, setXpClaimed] = useState(() => {
    try {
      return localStorage.getItem('pkxd_partner_xp_claimed') === 'true';
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
      onAddXP(250, 'Parceria Alertas PK XD 🟢⚡');
      setXpClaimed(true);
      try {
        localStorage.setItem('pkxd_partner_xp_claimed', 'true');
      } catch {}
    }

    // Redirect to the channel
    window.open(channelUrl, '_blank', 'noreferrer');
  };

  function playLevelUpSound() {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioCtx.currentTime;
      [293.66, 349.23, 440.00, 587.33].forEach((freq, index) => {
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
      id="partner-promo-container"
      className="bg-gradient-to-br from-[#120f24] via-zinc-950 to-[#0e1c24] p-6 sm:p-8 rounded-3xl border-4 border-yellow-400 shadow-[0_12px_0_0_rgba(234,179,8,0.25)] text-white overflow-hidden relative"
    >
      {/* Background glow and decorative stars */}
      <div className="absolute top-0 right-1/4 w-32 h-32 bg-yellow-500/10 rounded-full filter blur-2xl pointer-events-none" />
      <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-cyan-500/10 rounded-full filter blur-2xl pointer-events-none" />
      
      <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
        
        {/* Left Side: Mockup WhatsApp Message Feed for Alertas PK XD */}
        <div className="w-full md:w-5/12 flex-shrink-0">
          <div className="bg-[#0b141a] rounded-2xl border-2 border-yellow-500/40 overflow-hidden shadow-2xl relative select-none">
            {/* Header / Chat Name */}
            <div className="bg-[#1f2c34] p-3.5 flex items-center gap-3 border-b border-[#2a3942]">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-500 to-orange-500 flex items-center justify-center font-bold font-sans text-[11px] text-white shadow-md border border-yellow-400/30">
                🔔
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-sans font-extrabold text-xs text-gray-100 flex items-center gap-1">
                  <span className="truncate">{channelName}</span>
                  <span className="bg-yellow-400 text-[8px] font-black tracking-wider text-black px-1.5 py-0.5 rounded-full flex items-center flex-shrink-0">
                    ✓
                  </span>
                </h4>
                <p className="font-mono text-[9px] text-yellow-400 font-semibold animate-pulse">Parceiro Oficial • Alertas Ativos</p>
              </div>
            </div>

            {/* Chat Body */}
            <div className="p-4 space-y-4 h-[210px] overflow-y-auto bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat bg-[size:180px] scrollbar-none">
              
               {/* Message bubble 1 */}
               <div className="bg-[#1f2c34] text-gray-250 p-3 rounded-2xl rounded-tl-sm max-w-[85%] text-xs shadow-md border-l-4 border-yellow-400 text-left">
                <span className="text-yellow-400 font-extrabold text-[10px] block mb-1">📢 CANAL PARCEIRO DE ALERTAS</span>
                Bem-vindos ao maior canal de Alertas Rápidos do universo PK XD! 🚀 Aqui nós avisamos tudo em tempo real para você não perder nada!
                <span className="text-[9px] text-gray-400 text-right block mt-1">11:15</span>
              </div>

              {/* Message bubble 2 */}
              <div className="bg-[#1f2c34] text-gray-250 p-3 rounded-2xl rounded-tl-sm max-w-[85%] text-xs shadow-md border-l-4 border-cyan-400 text-left">
                <span className="text-cyan-400 font-extrabold text-[10px] block mb-1">🔥 ATUALIZAÇÕES & PROMO CODES</span>
                Novo código liberado na atualização! Corre para resgatar antes que expire! 🎒🎁 Fiquem ligados nas notificações do canal!
                
                {/* Reaction button */}
                <div className="mt-3 pt-2 border-t border-gray-650 flex justify-between items-center">
                  <button 
                    onClick={handleLike}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-bold transition-all ${
                      hasLiked ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-500/40' : 'bg-black/40 text-gray-300'
                    }`}
                  >
                    <Heart className={`w-3 h-3 ${hasLiked ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                    <span>{likes} curtidas</span>
                  </button>
                  <span className="text-[9px] text-gray-400">11:18</span>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Right Side: Informative Title & Call To Action */}
        <div className="flex-1 space-y-5 text-center md:text-left">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-400/10 border border-yellow-400/40 text-yellow-400 font-mono text-[10px] font-bold rounded-full uppercase tracking-wider mb-2">
              <Star className="w-3.5 h-3.5 fill-yellow-400/20" /> Parceiro Oficial PKXD Central
            </div>
            
            <h3 className="font-sans font-black text-2xl sm:text-3xl leading-tight tracking-wide uppercase text-yellow-300">
              {channelName}
            </h3>
            
            <p className="font-sans text-sm sm:text-base text-gray-300 leading-relaxed max-w-xl mt-2">
              Temos o orgulho de apresentar o nosso super parceiro oficial: o renomado canal de <strong className="text-yellow-400">Alertas PK XD</strong> no WhatsApp! Siga-os para receber notificações instantâneas sobre novidades relâmpago, fofocas do jogo e muito mais!
            </p>
          </div>

          {/* Value Badges */}
          <div className="grid grid-cols-2 gap-3 max-w-md mx-auto md:mx-0">
            {[
              { icon: Zap, text: 'Alertas Super Rápidos', color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/5' },
              { icon: ShieldCheck, text: 'Parceria de Confiança', color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/5' }
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
          <div className="pt-2 space-y-4 text-left">
            <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center md:justify-start">
              <div className="relative w-full sm:w-auto">
                <button
                  onClick={handleJoinClick}
                  className="w-full px-5 sm:px-8 py-3.5 bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-sans font-black text-xs sm:text-base rounded-2xl border-b-4 border-yellow-700 shadow-[0_8px_16px_rgba(234,179,8,0.25)] transition-all transform hover:-translate-y-0.5 hover:shadow-[0_12px_20px_rgba(234,179,8,0.35)] active:translate-y-1 active:border-b-0 cursor-pointer flex items-center justify-center gap-2 group text-center"
                >
                  <MessageSquare className="w-4 h-4 fill-black flex-shrink-0" />
                  <span className="uppercase">Seguir Canal de Alertas 🔔</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform flex-shrink-0" />
                </button>
                {/* Floating XP Reward Badge */}
                <div className="absolute -top-2.5 left-1/2 transform -translate-x-1/2 bg-cyan-400 text-black text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-md whitespace-nowrap border border-black/10">
                  {xpClaimed ? "✓ +250 XP Coletado" : "⚡ +250 XP Grátis!"}
                </div>
              </div>

              <button
                onClick={() => {
                  try {
                    navigator.clipboard.writeText(channelUrl);
                    playSuccessSound();
                    alert("Link do Canal de Alertas copiado com sucesso! 🎉 Compartilhe com seus amigos de PK XD!");
                  } catch (e) {
                    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent('Siga o canal de Alertas PK XD no WhatsApp, nosso parceiro oficial: ' + channelUrl)}`, '_blank');
                  }
                }}
                className="w-full sm:w-auto px-4 py-3.5 bg-zinc-900 hover:bg-zinc-850 text-yellow-400 font-sans font-black text-xs rounded-2xl border border-yellow-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-center"
              >
                <span>🔗 COPIAR LINK DE PARCERIA</span>
              </button>
            </div>

            <p className="font-sans text-xs text-gray-400">
              ✨ <strong className="text-yellow-300">Conexão Cósmica:</strong> Ao se juntar ao canal de Alertas, você apoia nossos parceiros e fortalece o ecossistema PKXD Central!
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
