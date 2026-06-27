import React, { useState } from 'react';
import { Star, Video, Play, Trash2, Trophy, MessageSquare, Code, Sparkles, HelpCircle } from 'lucide-react';
import { FeaturedVideo } from '../types';
import { playTapSound } from '../utils/audio';
import CommentsSection from './CommentsSection';

interface FeaturedVideosProps {
  videos: FeaturedVideo[];
  isAdmin: boolean;
  currentUser: any;
  onDelete: (id: string) => void;
  onAddXP?: (amount: number, reason: string) => void;
}

export default function FeaturedVideos({ videos, isAdmin, currentUser, onDelete, onAddXP }: FeaturedVideosProps) {
  const [activeType, setActiveType] = useState<'all' | 'game_highlight' | 'panel_video'>('all');
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [showResgateGuide, setShowResgateGuide] = useState(false);

  const toggleComments = (videoId: string) => {
    playTapSound();
    setOpenComments(prev => ({
      ...prev,
      [videoId]: !prev[videoId]
    }));
  };

  const filtered = videos.filter(v => activeType === 'all' || v.type === activeType);

  const getYoutubeEmbedId = (url: string) => {
    try {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = url.match(regExp);
      return (match && match[2].length === 11) ? match[2] : null;
    } catch (e) {
      return null;
    }
  };

  const openVideo = (url: string) => {
    playTapSound();
    window.open(url, '_blank', 'noreferrer');
  };

  const isLiveTitle = (title: string) => {
    return /live|ao vivo|transmissao|stream|jogando|livecom/i.test(title);
  };

  const isCodeTitle = (title: string) => {
    return /codigo|code|cupom|cupons|codigos|resgatar|gift|novocodigo/i.test(title);
  };

  return (
    <div className="relative p-[2px] rounded-3xl bg-gradient-to-r from-indigo-500 via-pink-500 to-purple-600 shadow-[0_0_35px_rgba(139,92,246,0.25)] hover:shadow-[0_0_50px_rgba(236,72,153,0.35)] transition-all duration-300">
      <section 
        id="featured-videos-section" 
        className="bg-zinc-950 rounded-[22px] p-6 sm:p-8 space-y-6 text-left relative overflow-hidden"
      >
        {/* Neon Pulsing Background Lights */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full filter blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-pink-500/10 rounded-full filter blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-pink-500 text-white rounded-2xl shadow-[0_0_15px_rgba(139,92,246,0.3)]">
              <Trophy className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="font-sans font-black text-xl sm:text-2xl tracking-tight uppercase bg-gradient-to-r from-indigo-300 via-pink-300 to-purple-300 bg-clip-text text-transparent">
                PAINEL DE DESTAQUES DA COMUNIDADE 🌟
              </h3>
              <p className="font-sans text-xs text-indigo-200 leading-relaxed">
                Os melhores vídeos, gameplays e criações da nossa comunidade recomendados pelo <span className="text-pink-400 font-bold">PKXD Hub</span>!
              </p>
            </div>
          </div>

          {/* Filter tabs styled for high premium contrast */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2 bg-black/40 p-1 rounded-xl border border-white/15 self-start lg:self-center">
            <button
              onClick={() => { playTapSound(); setActiveType('all'); }}
              className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-black transition-all uppercase cursor-pointer ${
                activeType === 'all' 
                  ? 'bg-gradient-to-r from-indigo-500 to-pink-500 text-white shadow-md' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => { playTapSound(); setActiveType('game_highlight'); }}
              className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-black transition-all uppercase cursor-pointer ${
                activeType === 'game_highlight' 
                  ? 'bg-gradient-to-r from-indigo-500 to-pink-500 text-white shadow-md' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Destaques
            </button>
            <button
              onClick={() => { playTapSound(); setActiveType('panel_video'); }}
              className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-black transition-all uppercase cursor-pointer ${
                activeType === 'panel_video' 
                  ? 'bg-gradient-to-r from-indigo-500 to-pink-500 text-white shadow-md' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Lives & Códigos
            </button>
          </div>
        </div>

        {/* Community submissions notice & Help Toggle */}
        <div className="space-y-3 relative z-10">
          <div className="bg-indigo-950/30 border border-indigo-500/25 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Star className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5 animate-pulse" />
              <div className="font-sans text-xs text-gray-300 leading-relaxed">
                <strong className="text-indigo-300">Quer ver seu conteúdo em destaque?</strong> Se você é criador de conteúdo e quer que seu vídeo ou transmissão apareça aqui, envie seu link na aba de <strong className="text-indigo-300">Inscrições</strong>!
              </div>
            </div>
            
            <button
              onClick={() => { playTapSound(); setShowResgateGuide(!showResgateGuide); }}
              className="text-xs font-black text-yellow-400 hover:text-yellow-300 transition-colors inline-flex items-center gap-1.5 bg-yellow-400/10 hover:bg-yellow-400/20 px-3 py-2 rounded-xl border border-yellow-400/20 cursor-pointer self-start md:self-auto flex-shrink-0"
            >
              <HelpCircle className="w-4 h-4" />
              <span>{showResgateGuide ? "Fechar Instruções" : "Como Resgatar Códigos?"}</span>
            </button>
          </div>

          {/* Expandable step-by-step code redeeming guide */}
          {showResgateGuide && (
            <div className="bg-black/50 border border-yellow-500/20 p-5 rounded-2xl space-y-4 text-left animate-in fade-in slide-in-from-top-2 duration-200">
              <h4 className="font-sans font-black text-xs uppercase text-yellow-400 tracking-wider flex items-center gap-2">
                <Code className="w-4 h-4" />
                <span>GUIA DE RESGATE DE CÓDIGOS EM TRANSMISSÕES AO VIVO & VÍDEOS 🔑</span>
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans">
                <div className="bg-zinc-900/60 p-3.5 rounded-xl border border-white/5 space-y-1.5">
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-black text-[11px]">1</div>
                  <h5 className="font-bold text-gray-200">Acompanhe a Transmissão</h5>
                  <p className="text-[11px] text-gray-400 leading-relaxed">Assista às lives e vídeos em destaque! Os criadores revelam códigos novos ativos na tela ou no chat em tempo real.</p>
                </div>

                <div className="bg-zinc-900/60 p-3.5 rounded-xl border border-white/5 space-y-1.5">
                  <div className="w-6 h-6 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center font-black text-[11px]">2</div>
                  <h5 className="font-bold text-gray-200">Copie o Código Cupom</h5>
                  <p className="text-[11px] text-gray-400 leading-relaxed">Assim que o código for compartilhado na transmissão oficial ou listado na discussão do vídeo, anote ou copie o cupom imediatamente.</p>
                </div>

                <div className="bg-zinc-900/60 p-3.5 rounded-xl border border-white/5 space-y-1.5">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-[11px]">3</div>
                  <h5 className="font-bold text-gray-200">Valide no Jogo</h5>
                  <p className="text-[11px] text-gray-400 leading-relaxed">Suba a página e cole o código no portal oficial do jogo para coletar suas gemas e moedas oficiais instantaneamente!</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Video Grid with Premium Layout and Lift animations */}
        {filtered.length === 0 ? (
          <div className="bg-black/30 border border-dashed border-white/10 p-8 rounded-2xl text-center">
            <Video className="w-8 h-8 text-indigo-400/40 mx-auto mb-2 animate-pulse" />
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider">
              Nenhum vídeo em destaque cadastrado nesta categoria.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            {filtered.map((video) => {
              const embedId = getYoutubeEmbedId(video.youtubeUrl);
              const isLive = isLiveTitle(video.title);
              const isCode = isCodeTitle(video.title);

              return (
                <div
                  key={video.id}
                  className="bg-zinc-900/80 border border-white/5 hover:border-pink-500/30 rounded-2xl overflow-hidden flex flex-col justify-between group transition-all duration-300 shadow-lg hover:shadow-[0_0_20px_rgba(236,72,153,0.15)] hover:-translate-y-1"
                >
                  {/* Embed player or elegant placeholder */}
                  <div className="relative aspect-video bg-zinc-950 flex items-center justify-center overflow-hidden">
                    {embedId ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${embedId}`}
                        title={video.title}
                        className="w-full h-full border-0 absolute inset-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                        <Play className="w-12 h-12 text-indigo-500/80 mb-2 group-hover:scale-110 transition-transform duration-350 cursor-pointer" />
                        <span className="text-xs uppercase font-black text-indigo-400">Assista no YouTube</span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${
                          video.type === 'game_highlight' 
                            ? 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20' 
                            : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                        }`}>
                          {video.type === 'game_highlight' ? '⭐ Destaque no Jogo' : '🖥️ No Painel'}
                        </span>

                        {isLive && (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md border bg-red-500/10 text-red-400 border-red-500/20 flex items-center gap-1 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            <span>Ao Vivo 🔴</span>
                          </span>
                        )}

                        {isCode && (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md border bg-yellow-400/10 text-yellow-400 border-yellow-400/20 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5 text-yellow-400" />
                            <span>Tem Códigos 🔑</span>
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] text-gray-500 font-mono">
                        {new Date(video.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-sans font-black text-sm text-gray-100 group-hover:text-pink-400 transition-colors line-clamp-2">
                        {video.title}
                      </h4>
                      {video.author && video.author !== 'Staff PKXD Hub' && (
                        <p className="text-[10px] text-indigo-450 font-black uppercase tracking-wider">
                          👤 Criador: @{video.author.replace('@', '')} ✨
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-white/5 space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => openVideo(video.youtubeUrl)}
                            className="text-xs font-black text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Ver no YouTube</span>
                          </button>

                          <button
                            onClick={() => toggleComments(video.id)}
                            className={`text-xs font-black inline-flex items-center gap-1 cursor-pointer transition-all ${
                              openComments[video.id] 
                                ? 'text-pink-400 font-black' 
                                : 'text-gray-400 hover:text-pink-400'
                            }`}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Discussão ({openComments[video.id] ? 'Fechar' : 'Comentar'})</span>
                          </button>
                        </div>

                        {isAdmin && (
                          <button
                            onClick={() => { playTapSound(); onDelete(video.id); }}
                            className="text-xs font-bold text-red-400 hover:text-red-300 inline-flex items-center gap-1 cursor-pointer"
                            title="Deletar vídeo destacado"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Deletar</span>
                          </button>
                        )}
                      </div>

                      {openComments[video.id] && (
                        <CommentsSection
                          targetId={video.id}
                          targetType="video"
                          currentUser={currentUser}
                          isAdmin={isAdmin}
                          onAddXP={onAddXP}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
