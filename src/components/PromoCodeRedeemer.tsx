import React from 'react';
import { Ticket, ExternalLink, Zap, Play, Trash2, Edit2, Video, Sparkles } from 'lucide-react';
import { NewsItem } from '../types';
import { playTapSound, playSuccessSound } from '../utils/audio';

interface PromoCodeRedeemerProps {
  videos: NewsItem[];
  isAdmin: boolean;
  onDeleteVideo: (id: string) => void;
  onEditVideo: (item: NewsItem) => void;
}

export default function PromoCodeRedeemer({ videos, isAdmin, onDeleteVideo, onEditVideo }: PromoCodeRedeemerProps) {
  
  const handleRedeemClick = () => {
    playTapSound();
    window.open('https://app.playpkxd.com/promo-code', '_blank', 'noreferrer');
  };

  const handleWatchClick = (url: string) => {
    playTapSound();
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank', 'noreferrer');
    } else {
      // If it's not a valid link, try search or alert safely
      window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(url)}`, '_blank', 'noreferrer');
    }
  };

  return (
    <div 
      id="promo-code-redeemer-box"
      className="bg-zinc-900/80 border-3 border-amber-400 rounded-3xl p-6 sm:p-8 space-y-6 text-left relative overflow-hidden shadow-[0_12px_24px_rgba(245,158,11,0.15)]"
    >
      {/* Decorative gradients */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full filter blur-xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-yellow-500/10 rounded-full filter blur-xl pointer-events-none" />

      <div className="relative z-10 space-y-5">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 border border-amber-400/30 rounded-2xl">
              <Video className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="font-sans font-black text-xl sm:text-2xl tracking-wide uppercase text-white">
                PAINEL DE DESTAQUES DO SITE
              </h3>
              <p className="font-sans text-xs text-amber-300">
                Vídeos e transmissões da comunidade em destaque recomendados oficialmente pelo PKXD Hub!
              </p>
            </div>
          </div>

          <span className="font-mono text-[10px] font-black tracking-wider text-amber-400 bg-amber-950/50 px-3 py-1 rounded-full border border-amber-500/30 self-start sm:self-center">
            {videos.length} CONTEÚDO{videos.length === 1 ? '' : 'S'} EM DESTAQUE
          </span>
        </div>

        {/* Info notice about official site */}
        <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex items-start gap-3">
          <Zap className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="font-sans text-xs text-gray-300 leading-relaxed">
            <strong className="text-amber-300">Como funciona o Painel?</strong> Este é o Painel de Destaques do nosso site! Nós divulgamos vídeos e lives enviadas pela comunidade e selecionadas pela moderação. Assista aos conteúdos listados e, se você também quiser aparecer em destaque aqui, envie seu link na nossa página de Inscrições!
          </div>
        </div>

        {/* Videos List */}
        {videos.length === 0 ? (
          <div className="bg-black/30 border-2 border-dashed border-zinc-850 p-8 rounded-2xl text-center space-y-3">
            <Sparkles className="w-8 h-8 text-amber-400/60 mx-auto animate-bounce" />
            <h4 className="font-sans font-black text-sm text-gray-200 uppercase tracking-wider">
              Aguardando Próximas Lives & Vídeos! 🔮
            </h4>
            <p className="font-sans text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
              Nenhum criador está com live de códigos ativa agora. Ative as notificações no nosso canal do WhatsApp e fique atento para quando novos links forem colocados aqui pelo Admin!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map((item) => (
              <div 
                key={item.id}
                className="bg-black/40 border-2 border-zinc-800 hover:border-amber-400/60 p-4 rounded-2xl flex flex-col justify-between space-y-4 transition-all relative group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-amber-400 font-extrabold uppercase bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-500/20">
                      {item.date || 'Criador PK XD'}
                    </span>
                    <span className="text-[10px] font-sans text-gray-400">
                      Por: <strong className="text-gray-300">{item.author}</strong>
                    </span>
                  </div>

                  <h4 className="font-sans font-black text-sm text-white group-hover:text-amber-300 transition-colors line-clamp-2 leading-snug">
                    {item.title}
                  </h4>
                  
                  <p className="font-sans text-xs text-gray-450 line-clamp-2 leading-relaxed">
                    {item.excerpt}
                  </p>
                </div>

                <div className="space-y-2.5 pt-2 border-t border-white/5">
                  {/* Watch CTA Button */}
                  <button
                    onClick={() => handleWatchClick(item.content)}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-sans text-xs font-black tracking-wide uppercase transition-all duration-150 flex items-center justify-center gap-2 border border-rose-500/20 cursor-pointer shadow-md"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>ASSISTIR & PEGAR CÓDIGO 🍿</span>
                  </button>

                  {/* Actions for Admin */}
                  {isAdmin && (
                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        onClick={() => {
                          playTapSound();
                          onEditVideo(item);
                        }}
                        className="p-1 px-3 bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-400 rounded-lg border border-yellow-400/25 transition-colors text-xs font-black flex items-center gap-1 cursor-pointer"
                        title="Editar Vídeo"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => {
                          playTapSound();
                          onDeleteVideo(item.id);
                        }}
                        className="p-1 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/25 transition-colors text-xs font-black flex items-center gap-1 cursor-pointer"
                        title="Deletar Vídeo"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Excluir</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Master CTA Button */}
        <div className="pt-2 text-center">
          <button
            onClick={handleRedeemClick}
            className="w-full sm:w-auto px-4 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-sans font-black text-xs sm:text-sm md:text-base rounded-2xl border-b-4 border-amber-700 shadow-[0_8px_16px_rgba(245,158,11,0.2)] transition-all transform hover:-translate-y-0.5 hover:shadow-[0_12px_20px_rgba(245,158,11,0.3)] active:translate-y-1 active:border-b-0 cursor-pointer flex flex-wrap items-center justify-center gap-2 mx-auto text-center"
          >
            <Ticket className="w-5 h-5 fill-black flex-shrink-0" />
            <span className="break-words">IR PARA O PORTAL DE RESGATE OFICIAL PK XD</span>
            <ExternalLink className="w-4 h-4 flex-shrink-0" />
          </button>
          <p className="font-mono text-[9px] text-amber-400 uppercase tracking-widest mt-2 block">
            *Redirecionamento Oficial: app.playpkxd.com/promo-code
          </p>
        </div>

      </div>
    </div>
  );
}
