import React, { useState } from 'react';
import { Star, Play, Trash2, Trophy, MessageSquare } from 'lucide-react';
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
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});

  const mostRecentVideoId = videos.length > 0
    ? [...videos].sort((a, b) => b.createdAt - a.createdAt)[0].id
    : null;

  const toggleComments = (videoId: string) => {
    playTapSound();
    setOpenComments(prev => ({
      ...prev,
      [videoId]: !prev[videoId]
    }));
  };

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

  return (
    <section 
      id="featured-videos-section" 
      className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 sm:p-8 space-y-6 text-left relative overflow-hidden"
    >
      {/* Accent glow spots */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full filter blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-pink-500/5 rounded-full filter blur-2xl pointer-events-none" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-2xl">
            <Trophy className="w-5 h-5 text-indigo-400 animate-pulse" />
          </div>
          <div>
            <h3 className="font-sans font-black text-xl tracking-tight text-white uppercase">
              PAINEL DE DESTAQUES DA COMUNIDADE 🌟
            </h3>
            <p className="font-sans text-xs text-indigo-200">
              Os melhores vídeos, gameplays e criações da nossa comunidade selecionados pelo <strong className="text-pink-400">PKXD Hub</strong>!
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
          <a
            href="https://forms.gle/bmJqrXkSa9uibQqo9"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 bg-gradient-to-r from-indigo-500/20 to-pink-500/20 hover:from-indigo-500/30 hover:to-pink-500/30 text-indigo-300 border border-indigo-500/40 rounded-xl font-sans font-black text-xs uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-95 text-center flex items-center justify-center gap-1.5"
          >
            <span>✨ Enviar Conteúdo</span>
          </a>
          <span className="font-black text-[9px] uppercase font-mono px-3 py-1 bg-indigo-950/45 text-indigo-300 rounded-full border border-indigo-500/25">
            Destaques ⭐
          </span>
        </div>
      </div>

      {videos.length === 0 ? (
        <div className="bg-black/20 border border-dashed border-white/5 p-8 rounded-2xl text-center">
          <Star className="w-8 h-8 text-indigo-400/40 mx-auto mb-2 animate-pulse" />
          <p className="text-xs font-black text-gray-400 uppercase tracking-wider">
            Nenhum vídeo em destaque cadastrado pela comunidade ainda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {videos.map((video) => {
            const embedId = getYoutubeEmbedId(video.youtubeUrl);
            const isMostRecent = video.id === mostRecentVideoId;

            return (
              <div
                key={video.id}
                className={`bg-black/35 border rounded-2xl overflow-hidden flex flex-col justify-between group transition-all relative ${
                  isMostRecent 
                    ? 'border-amber-400/40 shadow-[0_0_20px_rgba(245,158,11,0.2)] ring-1 ring-amber-400/20' 
                    : 'border-white/5 hover:border-indigo-500/30'
                }`}
              >
                {isMostRecent && (
                  <div className="absolute top-3 left-3 z-20 pointer-events-none flex items-center gap-1.5 bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg shadow-[0_4px_12px_rgba(239,68,68,0.3)] border border-white/10 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                    <span>⚡ AO VIVO/EM BREVE</span>
                  </div>
                )}

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
                    <span className="text-[9px] font-mono text-indigo-400 font-extrabold uppercase bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                      Destaque da Semana
                    </span>

                    <span className="text-[10px] text-gray-500 font-mono">
                      {new Date(video.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-sans font-black text-sm text-gray-100 group-hover:text-pink-400 transition-colors line-clamp-2">
                      {video.title}
                    </h4>
                    {video.author && video.author !== 'Staff PKXD Hub' && (
                      <p className="text-[10px] text-indigo-400 font-black uppercase tracking-wider">
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
                          <span>Comentários ({openComments[video.id] ? 'Fechar' : 'Ver'})</span>
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
  );
}
