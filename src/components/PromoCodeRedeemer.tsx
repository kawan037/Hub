import React, { useRef, useState } from 'react';
import { Ticket, ExternalLink, Play, Trash2, Edit2, Video, Sparkles, AlertCircle, ChevronLeft, ChevronRight, CheckCircle2, ShieldAlert, Loader2 } from 'lucide-react';
import { NewsItem } from '../types';
import { playTapSound, playSuccessSound } from '../utils/audio';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

interface PromoCodeRedeemerProps {
  videos: NewsItem[];
  isAdmin: boolean;
  onDeleteVideo: (id: string) => void;
  onEditVideo: (item: NewsItem) => void;
}

export default function PromoCodeRedeemer({ videos, isAdmin, onDeleteVideo, onEditVideo }: PromoCodeRedeemerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [codeText, setCodeText] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemResult, setRedeemResult] = useState<{ success: boolean; msg: string } | null>(null);

  const handleRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = codeText.toUpperCase().trim().replace(/\s+/g, '');
    if (!cleanCode) {
      playTapSound();
      setRedeemResult({ success: false, msg: '⚠️ Por favor, digite um código de cupom válido!' });
      return;
    }

    setIsRedeeming(true);
    playTapSound();
    setRedeemResult(null);

    try {
      // 1. Check in Firestore
      const docRef = doc(db, 'generated_promo_codes', cleanCode);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Check redemption limits
        if ((data.currentRedeems || 0) >= (data.maxRedeems || 0)) {
          setRedeemResult({ 
            success: false, 
            msg: `⚠️ O cupom "${cleanCode}" atingiu o limite de resgates e expirou!` 
          });
          return;
        }

        // Check duplicate redeems
        const userId = auth.currentUser?.uid || localStorage.getItem('pkxd_username_nickname') || 'Koosh';
        const redeemedList = data.redeemedUsers || [];
        if (redeemedList.includes(userId)) {
          setRedeemResult({ 
            success: false, 
            msg: `⚠️ Você já resgatou o cupom "${cleanCode}" nesta conta!` 
          });
          return;
        }

        // Increment redemption count and append user ID
        const updatedList = [...redeemedList, userId];
        await updateDoc(docRef, {
          currentRedeems: (data.currentRedeems || 0) + 1,
          redeemedUsers: updatedList
        });

        // Trigger resource update event
        window.dispatchEvent(new CustomEvent('pkxd_add_gems_coins', {
          detail: { gems: data.gems || 0, coins: data.coins || 0 }
        }));

        playSuccessSound();
        setRedeemResult({
          success: true,
          msg: `🎉 Cupom resgatado com sucesso! Você ganhou +${data.gems || 0} Joias 💎 e +${data.coins || 0} Moedas 🪙!`
        });
        setCodeText('');
        return;
      }

      // 2. Offline / Hardcoded codes fallback
      const fallbacks: Record<string, { gems: number; coins: number }> = {
        'WELCOME': { gems: 50, coins: 2000 },
        'PKXD2026': { gems: 100, coins: 5000 },
        'ROXOGLASS': { gems: 150, coins: 10000 },
        'CENTRAL50': { gems: 50, coins: 3000 }
      };

      if (cleanCode in fallbacks) {
        const reward = fallbacks[cleanCode];
        
        // Check duplicate fallback redeems
        let localRedeemed: string[] = [];
        try {
          localRedeemed = JSON.parse(localStorage.getItem('pkxd_redeemed_fallbacks') || '[]');
        } catch (_) {}

        if (localRedeemed.includes(cleanCode)) {
          setRedeemResult({ 
            success: false, 
            msg: `⚠️ Você já resgatou o cupom "${cleanCode}" nesta conta!` 
          });
          return;
        }

        // Save to duplicate checklist
        localRedeemed.push(cleanCode);
        localStorage.setItem('pkxd_redeemed_fallbacks', JSON.stringify(localRedeemed));

        // Trigger resource update event
        window.dispatchEvent(new CustomEvent('pkxd_add_gems_coins', {
          detail: { gems: reward.gems, coins: reward.coins }
        }));

        playSuccessSound();
        setRedeemResult({
          success: true,
          msg: `🎉 Cupom Especial resgatado! Você ganhou +${reward.gems} Joias 💎 e +${reward.coins} Moedas 🪙!`
        });
        setCodeText('');
        return;
      }

      // 3. Fallback to not found
      setRedeemResult({ 
        success: false, 
        msg: `❌ Cupom "${cleanCode}" inválido ou expirado! Siga os criadores abaixo para encontrar novos cupons ativos.` 
      });

    } catch (err: any) {
      console.error("Erro no resgate do cupom:", err);
      setRedeemResult({ 
        success: false, 
        msg: `❌ Ocorreu um erro ao processar o resgate: ${err.message}` 
      });
    } finally {
      setIsRedeeming(false);
    }
  };
  
  const handleRedeemClick = () => {
    playTapSound();
    window.open('https://app.playpkxd.com/promo-code', '_blank', 'noreferrer');
  };

  const handleWatchClick = (url: string) => {
    playTapSound();
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank', 'noreferrer');
    } else {
      window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(url)}`, '_blank', 'noreferrer');
    }
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

  const handleScroll = (direction: 'left' | 'right') => {
    playTapSound();
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollAmount = clientWidth * 0.85;
      scrollRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div 
      id="promo-code-redeemer-box"
      className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 sm:p-8 space-y-6 text-left relative overflow-hidden"
    >
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full filter blur-2xl pointer-events-none animate-pulse" />
      
      <div className="relative z-10 space-y-6">
        
        {/* Main Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-2xl shadow-[0_0_15px_rgba(245,158,11,0.15)]">
              <Ticket className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-sans font-black text-xl tracking-tight text-white uppercase flex items-center gap-1.5">
                PRÓXIMOS VÍDEOS/LIVES COM CÓDIGOS ⚡
              </h3>
              <p className="font-sans text-xs text-amber-200/90 leading-relaxed">
                Acompanhe os próximos vídeos e transmissões para garantir seus cupons oficiais e novos códigos!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center">
            {videos.length > 0 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleScroll('left')}
                  className="p-1.5 bg-zinc-950 hover:bg-zinc-900 text-gray-300 hover:text-white rounded-lg border border-white/5 active:scale-95 transition-all cursor-pointer"
                  title="Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleScroll('right')}
                  className="p-1.5 bg-zinc-950 hover:bg-zinc-900 text-gray-300 hover:text-white rounded-lg border border-white/5 active:scale-95 transition-all cursor-pointer"
                  title="Próximo"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
              <span className="font-mono text-xs text-amber-300 font-bold">
                {videos.length} VÍDEO(S) LISTADO(S)
              </span>
            </div>
          </div>
        </div>

        {/* IN-APP CODE REDEEMER FORM */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 shadow-inner">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider">Área de Resgate Direct-Glow 🎟️</h4>
          </div>
          
          <p className="text-[11px] text-gray-300 font-sans leading-relaxed">
            Tem um código de criador ou um código promocional ativo? Digite-o abaixo para receber instantaneamente suas Joias e Moedas em seu perfil! (Experimente os códigos iniciais de Boas-vindas: <strong className="text-amber-400">WELCOME</strong> ou <strong className="text-purple-400">ROXOGLASS</strong>!)
          </p>

          <form onSubmit={handleRedeemCode} className="flex flex-col sm:flex-row gap-3">
            <input 
              type="text"
              value={codeText}
              onChange={(e) => setCodeText(e.target.value)}
              placeholder="Digite o código aqui (Ex: ROXOGLASS)"
              className="flex-1 bg-black/60 border border-white/10 hover:border-white/20 rounded-xl px-4 py-3 text-xs font-mono font-black uppercase tracking-widest text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 text-center sm:text-left"
              disabled={isRedeeming}
            />
            <button
              type="submit"
              disabled={isRedeeming}
              className="px-6 py-3 bg-amber-400 hover:bg-amber-300 disabled:bg-zinc-800 text-black font-sans font-black text-xs uppercase rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              {isRedeeming ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                  <span>PROCESSANDO...</span>
                </>
              ) : (
                <>
                  <Ticket className="w-3.5 h-3.5 fill-black" />
                  <span>RESGATAR COIN/GEMA ⚡</span>
                </>
              )}
            </button>
          </form>

          {/* Feedback message */}
          {redeemResult && (
            <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs font-sans leading-relaxed transition-all ${
              redeemResult.success 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' 
                : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
            }`}>
              {redeemResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              )}
              <span>{redeemResult.msg}</span>
            </div>
          )}
        </div>

        {/* Info Card / Explainer */}
        <div className="bg-amber-950/25 border border-amber-500/10 p-4 rounded-2xl flex items-start gap-3">
          <AlertCircle className="text-amber-400 w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="font-sans text-xs text-gray-300 leading-relaxed">
            <strong className="text-amber-300">Como obter códigos neste painel?</strong> Nós não divulgamos os cupons prontos em formato de texto! Em vez disso, acompanhe os criadores listados abaixo que receberam códigos oficiais da desenvolvedora para distribuir em seus vídeos e lives. Assista aos conteúdos para pegá-los!
          </p>
        </div>

        {/* Videos with High Premium Highlight Border & Horizontal Carousel */}
        <div className="relative">
          {videos.length === 0 ? (
            <div className="bg-black/20 border border-dashed border-white/5 p-8 rounded-2xl text-center space-y-3">
              <span className="text-2xl block animate-pulse">🔮</span>
              <h5 className="font-sans font-black text-sm text-gray-300 uppercase tracking-wider">
                AGUARDANDO PRÓXIMAS LIVES & VÍDEOS!
              </h5>
              <p className="font-sans text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
                Nenhum criador está com vídeo de códigos novos listado agora. Ative as notificações no canal do WhatsApp e fique atento para quando os links forem adicionados!
              </p>
            </div>
          ) : (
            <div 
              ref={scrollRef}
              className="flex gap-6 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scroll-smooth scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {videos.map((item) => {
                const embedId = getYoutubeEmbedId(item.content);
                const thumbnailUrl = embedId ? `https://img.youtube.com/vi/${embedId}/0.jpg` : null;

                return (
                  <div 
                    key={item.id}
                    className="snap-start w-[290px] sm:w-[320px] flex-shrink-0 relative p-[2px] rounded-2xl bg-gradient-to-br from-amber-500/80 via-amber-400/20 to-amber-600 shadow-[0_4px_15px_rgba(245,158,11,0.08)] hover:shadow-[0_8px_25px_rgba(245,158,11,0.22)] hover:-translate-y-1 transition-all duration-300 group"
                  >
                    <div className="bg-zinc-950 p-4.5 rounded-[14px] flex flex-col justify-between h-full space-y-3">
                      
                      <div className="space-y-2">
                        {/* Video Thumbnail */}
                        {thumbnailUrl ? (
                          <div 
                            onClick={() => handleWatchClick(item.content)}
                            className="relative aspect-video rounded-xl overflow-hidden bg-black/40 border border-white/5 mb-3 cursor-pointer group-hover:border-amber-400/40 transition-colors"
                          >
                            <img 
                              src={thumbnailUrl} 
                              alt={item.title} 
                              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-90 group-hover:opacity-100 transition-opacity">
                              <div className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:bg-rose-500 transition-all duration-200">
                                <Play className="w-4 h-4 fill-white translate-x-[1px]" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="aspect-video rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-white/5 flex items-center justify-center mb-3">
                            <Video className="w-8 h-8 text-zinc-700 animate-pulse" />
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                              item.date?.includes('Ao Vivo') 
                                ? 'text-red-400 bg-red-500/15 border-red-500/20 animate-pulse'
                                : item.date?.includes('Estreia')
                                ? 'text-purple-400 bg-purple-500/15 border-purple-500/20 font-black'
                                : item.date?.includes('Agendado') || item.date?.includes('Próxima')
                                ? 'text-sky-400 bg-sky-500/15 border-sky-500/20'
                                : 'text-amber-400 bg-amber-500/15 border-amber-500/20'
                            }`}>
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>{item.date || 'CÓDIGO ATIVO'}</span>
                            </span>

                            {item.scheduledAt && (
                              <span className="text-[9px] font-mono text-zinc-300 bg-zinc-800/60 px-2 py-0.5 rounded-md border border-white/5 font-bold">
                                ⏰ {(() => {
                                  try {
                                    if (item.scheduledAt.includes('T')) {
                                      const [datePart, timePart] = item.scheduledAt.split('T');
                                      const [year, month, day] = datePart.split('-');
                                      const [hour, min] = timePart.split(':');
                                      return `${day}/${month} às ${hour}:${min}`;
                                    }
                                    return item.scheduledAt;
                                  } catch (e) {
                                    return item.scheduledAt;
                                  }
                                })()}
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] font-sans text-gray-400 truncate max-w-[120px]">
                            Por: <strong className="text-gray-300">@{item.author.replace('@', '')}</strong>
                          </span>
                        </div>

                        <h4 className="font-sans font-black text-xs text-white group-hover:text-amber-300 transition-colors line-clamp-2 leading-snug">
                          {item.title}
                        </h4>
                        
                        <p className="font-sans text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
                          {item.excerpt}
                        </p>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-white/5">
                        <button
                          onClick={() => handleWatchClick(item.content)}
                          className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-sans text-[11px] font-black tracking-wide uppercase transition-all duration-150 flex items-center justify-center gap-1.5 border border-rose-500/20 cursor-pointer shadow-md active:scale-95"
                        >
                          <Play className="w-3 h-3 fill-white" />
                          <span>ASSISTIR & PEGAR CÓDIGO 🍿</span>
                        </button>

                        {isAdmin && (
                          <div className="flex gap-2 justify-end pt-1">
                            <button
                              onClick={() => {
                                playTapSound();
                                onEditVideo(item);
                              }}
                              className="p-1 px-2.5 bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-400 rounded-lg border border-yellow-400/20 transition-colors text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Edit2 className="w-2.5 h-2.5" />
                              <span>Editar</span>
                            </button>
                            <button
                              onClick={() => {
                                playTapSound();
                                onDeleteVideo(item.id);
                              }}
                              className="p-1 px-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition-colors text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                              <span>Excluir</span>
                            </button>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Master Portal Redemption CTA Button */}
        <div className="pt-3 text-center border-t border-white/5">
          <button
            onClick={handleRedeemClick}
            className="w-full sm:w-auto px-5 py-3.5 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-black font-sans font-black text-xs rounded-xl shadow-[0_4px_15px_rgba(245,158,11,0.2)] hover:shadow-[0_6px_20px_rgba(245,158,11,0.3)] hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center gap-2 mx-auto transition-all"
          >
            <Ticket className="w-4 h-4 fill-black flex-shrink-0 animate-pulse" />
            <span className="tracking-wide">IR PARA O PORTAL DE RESGATE OFICIAL PK XD 🌟</span>
            <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
          </button>
        </div>

      </div>
    </div>
  );
}
