import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { ArtAsset } from '../types';
import { 
  Download, 
  Copy, 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  Tag, 
  Check, 
  Heart, 
  Sparkles, 
  ExternalLink,
  X
} from 'lucide-react';

interface ArtesSectionProps {
  isAdmin: boolean;
  triggerAudio: (sound: string) => void;
  soundEnabled: boolean;
}

const DEFAULT_ARTES: Omit<ArtAsset, 'id'>[] = [
  {
    title: "Logo Oficial PK XD Central",
    description: "Logo oficial do canal com fundo transparente em alta definição. Perfeito para capas de vídeo e overlays!",
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600",
    downloadUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200",
    category: "Logos",
    createdAt: Date.now() - 50000
  },
  {
    title: "Koosh Render 3D - Gamer",
    description: "Koosh fofo com fone de ouvido gamer e pose de vitória! Render oficial transparente de alta qualidade.",
    imageUrl: "https://images.unsplash.com/photo-1566577134770-3d85bb3a9cc4?auto=format&fit=crop&q=80&w=600",
    downloadUrl: "https://images.unsplash.com/photo-1566577134770-3d85bb3a9cc4?auto=format&fit=crop&q=80&w=1200",
    category: "Renders",
    createdAt: Date.now() - 40000
  },
  {
    title: "Background Espacial Fofo (Pastel)",
    description: "Fundo espacial estelar com nuvens lilás, planetas e foguinhos fofos. Lindo para usar atrás de sua webcam!",
    imageUrl: "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&q=80&w=600",
    downloadUrl: "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&q=80&w=1200",
    category: "Fundos",
    createdAt: Date.now() - 30000
  },
  {
    title: "Borda de Câmera PKXD Fofa",
    description: "Moldura de webcam temática rosa e roxa com detalhes de patinhas e corações animados. Transparente!",
    imageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=600",
    downloadUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=1200",
    category: "Overlays",
    createdAt: Date.now() - 20000
  },
  {
    title: "Adesivo 'Inscreva-se' Estilo PKXD",
    description: "Botão fofo de se inscrever e deixar o like decorado com os emoticons icônicos do PK XD. Pronto para usar!",
    imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=600",
    downloadUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=1200",
    category: "Overlays",
    createdAt: Date.now() - 10000
  }
];

export default function ArtesSection({ isAdmin, triggerAudio, soundEnabled }: ArtesSectionProps) {
  const [artes, setArtes] = useState<ArtAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>("Todas");
  
  // Notification alert within section
  const [notif, setNotif] = useState<string | null>(null);
  const [notifType, setNotifType] = useState<'success' | 'info'>('success');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Admin states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newImgUrl, setNewImgUrl] = useState("");
  const [newDownloadUrl, setNewDownloadUrl] = useState("");
  const [newCategory, setNewCategory] = useState("Renders");
  const [isCustomCat, setIsCustomCat] = useState(false);
  const [customCategory, setCustomCategory] = useState("");

  // Show a temporal alert toast inside this section
  const showToast = (msg: string, type: 'success' | 'info' = 'success') => {
    setNotif(msg);
    setNotifType(type);
    setTimeout(() => {
      setNotif(null);
    }, 3500);
  };

  // Listen to Firestore real-time updates for art_assets
  useEffect(() => {
    const q = query(collection(db, 'art_assets'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: ArtAsset[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          title: data.title || '',
          description: data.description || '',
          imageUrl: data.imageUrl || '',
          downloadUrl: data.downloadUrl || '',
          category: data.category || 'Outros',
          createdAt: data.createdAt || Date.now()
        });
      });
      setArtes(list);
      setLoading(false);
    }, (error) => {
      console.error("Erro ao escutar artes:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Quick seed function for the administrator
  const handleSeedDefaultArtes = async () => {
    if (!isAdmin) return;
    try {
      triggerAudio('tap');
      setLoading(true);
      for (const item of DEFAULT_ARTES) {
        await addDoc(collection(db, 'art_assets'), {
          ...item,
          admin_secret: "pkxd2026_super_secret_admin_key"
        });
      }
      showToast("✨ Pacote de artes iniciais restaurado com sucesso! 🎨", "success");
      triggerAudio('success');
    } catch (err) {
      console.error("Erro ao restaurar artes:", err);
      showToast("❌ Erro ao restaurar artes", "info");
    } finally {
      setLoading(false);
    }
  };

  // Add a new art asset
  const handleAddArt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    if (!newTitle.trim() || !newImgUrl.trim()) {
      showToast("⚠️ Título e Link da Imagem são obrigatórios!", "info");
      triggerAudio('tap');
      return;
    }

    const finalCat = isCustomCat ? (customCategory.trim() || "Outros") : newCategory;

    try {
      triggerAudio('tap');
      const docRef = await addDoc(collection(db, 'art_assets'), {
        title: newTitle.trim(),
        description: newDesc.trim() || "Use livremente nos seus vídeos do YouTube e redes sociais! 🎬✨",
        imageUrl: newImgUrl.trim(),
        downloadUrl: newDownloadUrl.trim() || newImgUrl.trim(),
        category: finalCat,
        createdAt: Date.now(),
        admin_secret: "pkxd2026_super_secret_admin_key"
      });

      // Clear fields
      setNewTitle("");
      setNewDesc("");
      setNewImgUrl("");
      setNewDownloadUrl("");
      setNewCategory("Renders");
      setCustomCategory("");
      setIsCustomCat(false);
      setShowAddModal(false);

      showToast("🎉 Nova arte adicionada com sucesso! 🌟", "success");
      triggerAudio('success');
    } catch (err) {
      console.error("Erro ao adicionar arte:", err);
      showToast("❌ Erro ao salvar arte no banco de dados", "info");
    }
  };

  // Delete an art asset
  const handleDeleteArt = async (id: string, title: string) => {
    if (!isAdmin) return;
    if (!window.confirm(`Tem certeza que deseja excluir a arte "${title}" permanentemente?`)) {
      return;
    }

    try {
      triggerAudio('tap');
      await deleteDoc(doc(db, 'art_assets', id));
      showToast(`🗑️ Arte "${title}" removida com sucesso!`, "success");
      triggerAudio('success');
    } catch (err) {
      console.error("Erro ao remover arte:", err);
      showToast("❌ Erro ao excluir arte", "info");
    }
  };

  // Copy link handler
  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    triggerAudio('tap');
    setCopiedId(id);
    showToast("📋 Link copiado para a área de transferência!", "success");
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  // Categories list - dynamically includes any newly created categories by the admin
  const categories = React.useMemo(() => {
    const base = ["Todas", "Renders", "Logos", "Fundos", "Overlays", "Outros"];
    const uniqueFromDb = Array.from(new Set(artes.map(a => a.category).filter(Boolean))) as string[];
    // Add any unique category from database that isn't in base
    const extra = uniqueFromDb.filter(c => !base.includes(c) && c !== "Todas" && c !== "CUSTOM");
    return [...base, ...extra];
  }, [artes]);

  // Filtered list
  const filteredArtes = categoryFilter === "Todas" 
    ? artes 
    : artes.filter(a => a.category.toLowerCase() === categoryFilter.toLowerCase());

  return (
    <div className="w-full bg-zinc-950/80 backdrop-blur-md rounded-3xl p-5 sm:p-7 border border-pink-500/20 shadow-2xl relative overflow-hidden" id="artes-section-main">
      
      {/* Decorative fofa pastel blobs */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Internal floating alert notification */}
      {notif && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-black uppercase tracking-wider animate-bounce ${
          notifType === 'success' 
            ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/30' 
            : 'bg-purple-950/90 text-purple-300 border-purple-500/30'
        }`}>
          <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 animate-pulse" />
          <span>{notif}</span>
        </div>
      )}

      {/* Header Area */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-7 pb-4 border-b border-white/5">
        <div className="text-center md:text-left space-y-1">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <h2 className="text-xl sm:text-2xl font-black font-sans bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent uppercase tracking-wider">
              🎨 Central de Artes do Canal
            </h2>
            <span className="bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border border-pink-500/30">
              Youtubers 🎬
            </span>
          </div>
          <p className="text-xs text-neutral-400 max-w-xl leading-relaxed">
            Área oficial de criadores! Baixe renders transparentes, molduras de câmera, fundos fofos e logos exclusivas do PK XD Central para dar um toque profissional aos seus vídeos e lives! 🌟🚀
          </p>
        </div>

        {/* Admin Controls in the Header */}
        {isAdmin && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => {
                triggerAudio('tap');
                setShowAddModal(true);
              }}
              className="px-3.5 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-sans text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Arte</span>
            </button>

            {artes.length === 0 && (
              <button
                onClick={handleSeedDefaultArtes}
                className="px-3 py-2 bg-zinc-900 border border-white/10 text-gray-300 hover:text-white hover:bg-zinc-800 text-[10px] font-bold uppercase rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                title="Restaurar artes padrões recomendadas"
              >
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                <span>Restaurar Iniciais</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Category Tabs / Filters - Super cute rounded pills */}
      <div className="flex flex-wrap gap-1.5 mb-6 justify-center sm:justify-start bg-neutral-900/40 p-1.5 rounded-2xl border border-white/5 max-w-fit">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => {
              triggerAudio('tap');
              setCategoryFilter(cat);
            }}
            className={`px-3 py-1.5 rounded-xl font-sans text-xs font-bold transition-all cursor-pointer ${
              categoryFilter === cat
                ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-pink-500/20 border-t-pink-500 rounded-full animate-spin" />
          <p className="text-xs text-neutral-400 font-mono">Carregando catálogo de artes...</p>
        </div>
      ) : filteredArtes.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-white/5 rounded-3xl bg-neutral-900/20">
          <ImageIcon className="w-12 h-12 text-neutral-600 mx-auto mb-3.5" />
          <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-wider mb-1">
            Nenhuma arte encontrada
          </h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
            {categoryFilter === "Todas" 
              ? "Nenhuma arte foi cadastrada na central ainda. Se você for administrador, clique no botão para adicionar!" 
              : `Não existem artes cadastradas na categoria "${categoryFilter}" no momento.`}
          </p>
          {isAdmin && categoryFilter === "Todas" && (
            <button
              onClick={handleSeedDefaultArtes}
              className="mt-4 px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-black uppercase tracking-wider rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
              <span>Colocar artes demonstrativas</span>
            </button>
          )}
        </div>
      ) : (
        /* Cute Bento Grid of assets */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredArtes.map((art) => (
            <div 
              key={art.id}
              className="group bg-neutral-900/50 border border-white/5 hover:border-pink-500/30 rounded-2xl overflow-hidden transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-pink-950/10 flex flex-col relative"
            >
              {/* Category Pill Tag */}
              <span className="absolute top-2.5 left-2.5 z-10 bg-neutral-950/80 backdrop-blur-md text-pink-300 text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border border-pink-500/30 flex items-center gap-1 shadow-sm">
                <Tag className="w-2.5 h-2.5" />
                <span>{art.category}</span>
              </span>

              {/* Delete button (Admin exclusive) */}
              {isAdmin && (
                <button
                  onClick={() => handleDeleteArt(art.id, art.title)}
                  className="absolute top-2.5 right-2.5 z-10 p-1.5 bg-neutral-950/80 hover:bg-red-950/90 text-neutral-400 hover:text-red-400 border border-white/10 rounded-lg transition-all cursor-pointer shadow-sm"
                  title="Excluir Arte permanentemente"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Image Preview Container */}
              <div className="relative aspect-video w-full bg-neutral-950 overflow-hidden flex items-center justify-center group-hover:brightness-105 transition-all">
                <img 
                  src={art.imageUrl} 
                  alt={art.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as any).src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=400";
                  }}
                  referrerPolicy="no-referrer"
                />
                
                {/* Heart decoration in the center on hover (cute vibe) */}
                <div className="absolute inset-0 bg-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <Heart className="w-8 h-8 text-pink-400/30 animate-pulse fill-pink-400/10" />
                </div>
              </div>

              {/* Content area */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3.5">
                <div className="space-y-1">
                  <h3 className="font-sans font-black text-xs sm:text-sm text-white leading-tight uppercase tracking-wide group-hover:text-pink-300 transition-colors">
                    {art.title}
                  </h3>
                  <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                    {art.description}
                  </p>
                </div>

                {/* Bottom interactive buttons */}
                <div className="flex gap-2 pt-1 border-t border-white/5">
                  {/* Download button */}
                  <a 
                    href={art.downloadUrl || art.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => triggerAudio('tap')}
                    className="flex-1 py-1.5 px-3 bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/30 hover:border-pink-500/50 rounded-xl text-[10px] font-extrabold uppercase tracking-wider text-pink-300 hover:text-white text-center flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>

                  {/* Copy Link Button */}
                  <button
                    onClick={() => handleCopyLink(art.downloadUrl || art.imageUrl, art.id)}
                    className="p-2 bg-neutral-800/60 hover:bg-neutral-800 border border-white/5 rounded-xl transition-all cursor-pointer text-gray-400 hover:text-white"
                    title="Copiar Link de Download Direto"
                  >
                    {copiedId === art.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info footer block */}
      <div className="mt-8 p-4 bg-purple-950/15 border border-purple-500/10 rounded-2xl flex flex-col sm:flex-row items-center gap-3">
        <div className="p-2 bg-purple-500/10 rounded-xl">
          <Sparkles className="w-5 h-5 text-purple-300 animate-pulse" />
        </div>
        <div className="text-center sm:text-left space-y-0.5">
          <h4 className="text-xs font-black uppercase text-purple-300 tracking-wider">
            💜 Dica de Criação:
          </h4>
          <p className="text-[10px] text-neutral-400 leading-relaxed max-w-2xl">
            Sempre que for usar alguma arte, lembre-se de salvar em formato original PNG de alta qualidade clicando em Download. Adicione créditos do <strong>PK XD Central</strong> na descrição de seu vídeo para nos apoiar!
          </p>
        </div>
      </div>

      {/* Cute dialog modal for Adding assets */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-zinc-900 border border-pink-500/30 rounded-3xl w-full max-w-md p-6 relative shadow-2xl animate-scale-up">
            
            {/* Close button */}
            <button
              onClick={() => {
                triggerAudio('tap');
                setShowAddModal(false);
              }}
              className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-pink-500/15 rounded-xl border border-pink-500/20">
                <ImageIcon className="w-5 h-5 text-pink-400" />
              </div>
              <h3 className="text-md font-black font-sans text-white uppercase tracking-wider">
                Nova Arte do Canal 🎨
              </h3>
            </div>

            <form onSubmit={handleAddArt} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase text-neutral-400">Título da Arte</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Fundo de Nuvem Lilás"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-pink-500 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase text-neutral-400">Descrição</label>
                <textarea
                  rows={2}
                  placeholder="Explique do que se trata a imagem e onde os youtubers podem usar..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-pink-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase text-neutral-400">Link da Imagem (Visualização)</label>
                <input
                  type="url"
                  required
                  placeholder="https://exemplo.com/imagem.png"
                  value={newImgUrl}
                  onChange={(e) => setNewImgUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-pink-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase text-neutral-400">Link de Download Oficial (Opcional - se vazio usa imagem de visualização)</label>
                <input
                  type="url"
                  placeholder="https://exemplo.com/imagem-hd.png"
                  value={newDownloadUrl}
                  onChange={(e) => setNewDownloadUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-pink-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase text-neutral-400">Categoria</label>
                <select
                  value={newCategory}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewCategory(val);
                    if (val === "CUSTOM") {
                      setIsCustomCat(true);
                    } else {
                      setIsCustomCat(false);
                    }
                  }}
                  className="w-full px-3 py-1.5 bg-neutral-800 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-pink-500 font-bold cursor-pointer"
                >
                  <option value="Renders">Renders (Personagens)</option>
                  <option value="Logos">Logos</option>
                  <option value="Fundos">Fundos</option>
                  <option value="Overlays">Overlays / Borda de Cam</option>
                  <option value="Outros">Outros</option>
                  <option value="CUSTOM">➕ Criar Nova Categoria...</option>
                </select>
              </div>

              {isCustomCat && (
                <div className="space-y-1 animate-scale-up">
                  <label className="text-[10px] font-extrabold uppercase text-pink-400">Nome da Nova Categoria</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Miniaturas, Divisórias..."
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-pink-500/30 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-pink-500 font-bold"
                  />
                </div>
              )}

              <div className="text-[10px] text-zinc-400 bg-black/30 p-2.5 rounded-xl border border-white/5 leading-relaxed space-y-1">
                <p className="font-extrabold text-pink-400 uppercase tracking-wider">💡 Dica de Upload de Galeria:</p>
                <p>Você pode enviar qualquer imagem de sua galeria/computador para sites gratuitos como <a href="https://postimages.org/" target="_blank" rel="noreferrer" className="text-pink-400 underline">Postimages</a>, <a href="https://imgur.com/" target="_blank" rel="noreferrer" className="text-pink-400 underline">Imgur</a> ou pelo Discord, e colar o <strong>link direto da imagem</strong> (terminando em .png, .jpg) nos campos de links acima!</p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 bg-neutral-800 text-neutral-300 font-sans text-xs font-bold uppercase rounded-xl hover:bg-neutral-700 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-sans text-xs font-black uppercase tracking-wider rounded-xl hover:from-pink-600 hover:to-purple-700 transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Salvar Arte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
