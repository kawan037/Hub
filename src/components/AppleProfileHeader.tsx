import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, ShoppingBag, Trophy, Sparkles, Plus, 
  Smile, Edit2, Sun, Moon, Camera, Upload, Store, 
  Coins, Gift, PlusCircle, Check, CreditCard, Trash2, Heart
} from 'lucide-react';
import { 
  collection, doc, setDoc, deleteDoc, onSnapshot, 
  query, orderBy, limit 
} from 'firebase/firestore';
import { db } from '../firebase';

interface AppleProfileHeaderProps {
  user: any;
  fanLevel: number;
  fanXP: number;
  soundEnabled: boolean;
  triggerAudio: (type: 'tap' | 'success' | 'levelUp') => void;
  showAdminPanel: boolean;
  setShowAdminPanel: (show: boolean) => void;
}

interface CustomAvatar {
  id: string;
  name: string;
  imageUrl: string;
  priceGems: number;
  priceCoins: number;
  creatorName: string;
  createdAt: number;
}

export default function AppleProfileHeader({
  user,
  fanLevel,
  fanXP,
  soundEnabled,
  triggerAudio,
  showAdminPanel,
  setShowAdminPanel
}: AppleProfileHeaderProps) {
  // Theme state: light or dark (default to light for the pristine Apple vibe, switchable)
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('pkxd_theme_mode') as 'light' | 'dark') || 'light';
  });

  // Nickname, Bio and Instagram states
  const [nickname, setNickname] = useState(() => {
    return localStorage.getItem('pkxd_username_nickname') || 'Koosh';
  });
  const [bio, setBio] = useState(() => {
    return localStorage.getItem('pkxd_user_bio') || 'Olá 👋 (entendedores entenderam)';
  });
  const [instagram, setInstagram] = useState(() => {
    return localStorage.getItem('pkxd_user_instagram') || '';
  });

  // Custom Profile Picture (image URL or base64)
  const [customProfileImage, setCustomProfileImage] = useState(() => {
    return localStorage.getItem('pkxd_custom_profile_image') || '';
  });

  // Balance States (Nem todos terão 3 gemas - let's offer claiming)
  const [gems, setGems] = useState(() => {
    const saved = localStorage.getItem('pkxd_gems_count');
    return saved ? parseInt(saved, 10) : 3058;
  });
  const [coins, setCoins] = useState(() => {
    const saved = localStorage.getItem('pkxd_coins_count');
    return saved ? parseInt(saved, 10) : 12500;
  });

  // Owned/Unlocked avatar IDs
  const [ownedAvatars, setOwnedAvatars] = useState<string[]>(() => {
    const saved = localStorage.getItem('pkxd_owned_avatars');
    return saved ? JSON.parse(saved) : ['koosh', 'pipoca', 'admin', 'kitty'];
  });

  const [activeAvatarId, setActiveAvatarId] = useState(() => {
    return localStorage.getItem('pkxd_active_avatar_id') || 'koosh';
  });

  // Firestore custom avatars list (appears for everyone!)
  const [shopAvatars, setShopAvatars] = useState<CustomAvatar[]>([]);

  // Local/UI states
  const [isEditing, setIsEditing] = useState(false);
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [isCreateAvatarOpen, setIsCreateAvatarOpen] = useState(false);
  
  // Profile edit form fields
  const [editName, setEditName] = useState(nickname);
  const [editBio, setEditBio] = useState(bio);
  const [editInsta, setEditInsta] = useState(instagram);
  const [editCustomPic, setEditCustomPic] = useState(customProfileImage);

  // Create Custom Avatar Form fields
  const [newAvatarName, setNewAvatarName] = useState('');
  const [newAvatarUrl, setNewAvatarUrl] = useState('');
  const [newAvatarPriceGems, setNewAvatarPriceGems] = useState(10);
  const [newAvatarPriceCoins, setNewAvatarPriceCoins] = useState(500);
  const [newAvatarBase64, setNewAvatarBase64] = useState('');

  const [notif, setNotif] = useState<string | null>(null);

  // Avatar Presets
  const avatarPresets = [
    { id: 'koosh', emoji: '🥤', label: 'Koosh (Copo)', color: 'bg-indigo-100 border-indigo-300' },
    { id: 'pipoca', emoji: '🍿', label: 'Pipoca (Coroa)', color: 'bg-pink-100 border-pink-300' },
    { id: 'admin', emoji: '🤖', label: 'Admin (Visor)', color: 'bg-rose-100 border-rose-300' },
    { id: 'kitty', emoji: '🐱', label: 'Kitty (Fofa)', color: 'bg-amber-100 border-amber-300' }
  ];

  // Apply theme class to root
  useEffect(() => {
    const root = document.getElementById('pkxd-app-root');
    if (root) {
      if (themeMode === 'dark') {
        root.classList.add('theme-dark');
        root.classList.remove('theme-light', 'theme-neutral');
      } else {
        root.classList.add('theme-light');
        root.classList.remove('theme-dark', 'theme-neutral');
      }
    }
    localStorage.setItem('pkxd_theme_mode', themeMode);
  }, [themeMode]);

  // Fetch Firestore Custom Avatars
  useEffect(() => {
    const q = query(collection(db, 'custom_avatars'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: CustomAvatar[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as CustomAvatar);
      });
      setShopAvatars(list);
    });
    return () => unsubscribe();
  }, []);

  // Sync balances to localStorage
  useEffect(() => {
    localStorage.setItem('pkxd_username_nickname', nickname);
  }, [nickname]);

  useEffect(() => {
    localStorage.setItem('pkxd_user_bio', bio);
  }, [bio]);

  useEffect(() => {
    localStorage.setItem('pkxd_user_instagram', instagram);
  }, [instagram]);

  useEffect(() => {
    localStorage.setItem('pkxd_active_avatar_id', activeAvatarId);
  }, [activeAvatarId]);

  useEffect(() => {
    localStorage.setItem('pkxd_custom_profile_image', customProfileImage);
  }, [customProfileImage]);

  useEffect(() => {
    localStorage.setItem('pkxd_gems_count', gems.toString());
  }, [gems]);

  useEffect(() => {
    localStorage.setItem('pkxd_coins_count', coins.toString());
  }, [coins]);

  useEffect(() => {
    localStorage.setItem('pkxd_owned_avatars', JSON.stringify(ownedAvatars));
  }, [ownedAvatars]);

  // Alert system
  const showAlert = (msg: string) => {
    setNotif(msg);
    setTimeout(() => setNotif(null), 4000);
  };

  // Claim Daily reward (Since "nem todos terão 3 gemas", users can click to earn free Gems/Coins!)
  const handleClaimFreeReward = () => {
    triggerAudio('success');
    setGems(prev => prev + 1000);
    setCoins(prev => prev + 5000);
    showAlert("🎁 Incrível! Você resgatou +1.000 Joias 💎 e +5.000 Moedas 🪙 grátis!");
  };

  // Save profile updates
  const handleSaveProfile = () => {
    triggerAudio('success');
    const cleanedName = editName.trim().replace(/\s+/g, '_');
    if (cleanedName.length === 0) {
      showAlert("⚠️ Por favor, digite um nome válido!");
      return;
    }
    setNickname(cleanedName);
    setBio(editBio.trim() || 'Fã de PK XD Central!');
    setInstagram(editInsta.trim());
    setCustomProfileImage(editCustomPic.trim());
    setIsEditing(false);
    showAlert("✨ Seu perfil público foi atualizado!");
    
    // Dispatch state change event
    window.dispatchEvent(new Event('storage'));
  };

  // File Upload handler for Profile photo
  const handleProfilePicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showAlert("⚠️ Imagem muito pesada! Escolha uma menor que 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditCustomPic(reader.result as string);
        showAlert("📸 Imagem carregada com sucesso!");
      };
      reader.readAsDataURL(file);
    }
  };

  // File Upload handler for Custom Avatar creation
  const handleAvatarPicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showAlert("⚠️ Imagem muito pesada! Escolha uma menor que 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewAvatarBase64(reader.result as string);
        showAlert("🎨 Imagem do avatar carregada!");
      };
      reader.readAsDataURL(file);
    }
  };

  // Create Avatar and upload to Firestore ("aparece pra todos como disponível para compra")
  const handleCreateAvatar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAvatarName.trim()) {
      showAlert("⚠️ Dê um nome para o seu avatar!");
      return;
    }
    
    const finalImageUrl = newAvatarBase64 || newAvatarUrl.trim();
    if (!finalImageUrl) {
      showAlert("⚠️ Envie uma foto ou cole um link de imagem do avatar!");
      return;
    }

    triggerAudio('success');
    const avatarId = 'custom_' + Date.now();
    const newAvatar: CustomAvatar = {
      id: avatarId,
      name: newAvatarName.trim(),
      imageUrl: finalImageUrl,
      priceGems: Number(newAvatarPriceGems) || 0,
      priceCoins: Number(newAvatarPriceCoins) || 0,
      creatorName: nickname,
      createdAt: Date.now()
    };

    try {
      await setDoc(doc(db, 'custom_avatars', avatarId), newAvatar);
      
      // Auto-unlock/own the avatar you created!
      setOwnedAvatars(prev => [...prev, avatarId]);
      
      // Reset form fields
      setNewAvatarName('');
      setNewAvatarUrl('');
      setNewAvatarBase64('');
      setIsCreateAvatarOpen(false);
      showAlert(`✨ Avatar "${newAvatar.name}" criado e publicado na Loja para TODOS! 🚀`);
    } catch (err) {
      console.error(err);
      showAlert("⚠️ Erro ao salvar o avatar na nuvem!");
    }
  };

  // Delete/Remove custom avatar (only if they are the creator)
  const handleDeleteAvatar = async (avatar: CustomAvatar) => {
    if (window.confirm(`Quer mesmo excluir o avatar "${avatar.name}"?`)) {
      triggerAudio('tap');
      try {
        await deleteDoc(doc(db, 'custom_avatars', avatar.id));
        showAlert("🗑️ Avatar removido da loja.");
      } catch (err) {
        showAlert("⚠️ Erro ao deletar o avatar!");
      }
    }
  };

  // Buy custom avatar from store
  const handleBuyAvatar = (avatar: CustomAvatar) => {
    if (ownedAvatars.includes(avatar.id)) {
      showAlert("🎨 Você já tem esse avatar!");
      return;
    }

    // Check purchase options
    const canBuyGems = avatar.priceGems > 0 && gems >= avatar.priceGems;
    const canBuyCoins = avatar.priceCoins > 0 && coins >= avatar.priceCoins;

    if (!canBuyGems && !canBuyCoins) {
      showAlert("❌ Saldo insuficiente! Resgate moedas/gemas grátis no botão de presentes! 🎁");
      return;
    }

    triggerAudio('success');
    
    // Deduct from best balance (prefer coins if possible, otherwise gems)
    if (canBuyCoins) {
      setCoins(prev => prev - avatar.priceCoins);
      showAlert(`🎉 Compra realizada! Você gastou ${avatar.priceCoins} moedas.`);
    } else {
      setGems(prev => prev - avatar.priceGems);
      showAlert(`🎉 Compra realizada! Você gastou ${avatar.priceGems} joias.`);
    }

    setOwnedAvatars(prev => [...prev, avatar.id]);
  };

  const getAvatarDisplay = () => {
    if (customProfileImage) {
      return (
        <img 
          src={customProfileImage} 
          alt="Foto de Perfil" 
          className="w-full h-full rounded-full object-cover shadow-inner"
          referrerPolicy="no-referrer"
        />
      );
    }

    // Is preset avatar?
    const foundPreset = avatarPresets.find(p => p.id === activeAvatarId);
    if (foundPreset) {
      return <span className="text-4xl select-none">{foundPreset.emoji}</span>;
    }

    // Is custom avatar?
    const foundCustom = shopAvatars.find(a => a.id === activeAvatarId);
    if (foundCustom) {
      return (
        <img 
          src={foundCustom.imageUrl} 
          alt={foundCustom.name} 
          className="w-full h-full rounded-full object-cover shadow-inner"
          referrerPolicy="no-referrer"
        />
      );
    }

    return <span className="text-4xl select-none">🥤</span>;
  };

  const getAvatarColorClass = () => {
    if (customProfileImage) return 'bg-white';
    const found = avatarPresets.find(p => p.id === activeAvatarId);
    return found ? found.color : 'bg-purple-100';
  };

  return (
    <div id="apple-profile-header-root" className="max-w-4xl mx-auto space-y-5 select-none animate-fade-in relative z-20 text-left">
      
      {/* ==========================================================================
         1. APPLE PREMIUM GLASS ACCESSORY BAR & THEME CONTROL
         ========================================================================== */}
      <div className="bg-white/60 border border-white/40 rounded-2xl p-3 px-4 flex items-center justify-between shadow-sm backdrop-blur-md">
        
        {/* Left: Quick Access & Theme Mode Control */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Light/Dark Mode Switcher */}
          <button
            onClick={() => {
              triggerAudio('tap');
              setThemeMode(themeMode === 'light' ? 'dark' : 'light');
            }}
            className="p-2 bg-neutral-100/50 hover:bg-neutral-200/50 dark:bg-neutral-800/40 dark:hover:bg-neutral-700/40 rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            title={themeMode === 'light' ? 'Mudar para Modo Escuro' : 'Mudar para Modo Claro'}
          >
            {themeMode === 'light' ? (
              <>
                <Moon className="w-4 h-4 text-purple-600" />
                <span className="text-[10px] font-bold text-neutral-600 hidden sm:inline">Modo Escuro</span>
              </>
            ) : (
              <>
                <Sun className="w-4 h-4 text-amber-500 animate-spin-slow" />
                <span className="text-[10px] font-bold text-amber-500 hidden sm:inline">Modo Claro</span>
              </>
            )}
          </button>

          {/* Admin Panel toggle */}
          <button
            onClick={() => {
              triggerAudio('tap');
              setShowAdminPanel(!showAdminPanel);
            }}
            className={`p-2 rounded-xl transition-all hover:bg-neutral-200/50 dark:hover:bg-neutral-700/40 text-neutral-500 active:scale-95 cursor-pointer flex items-center gap-1.5 ${showAdminPanel ? 'bg-purple-100 dark:bg-purple-950/50 text-purple-600' : ''}`}
            title="Ajustes de Admin"
          >
            <Settings className={`w-4 h-4 ${showAdminPanel ? 'animate-spin' : ''}`} />
            <span className="text-[10px] font-bold hidden md:inline">Admin</span>
          </button>

          {/* Claim Reward Button */}
          <button
            onClick={handleClaimFreeReward}
            className="p-2 bg-pink-50 hover:bg-pink-100 dark:bg-pink-950/30 dark:hover:bg-pink-950/60 rounded-xl transition-all active:scale-95 cursor-pointer text-pink-600 flex items-center gap-1.5 font-bold"
            title="Ganhar Gemas/Moedas Grátis"
          >
            <Gift className="w-4 h-4 text-pink-500 animate-bounce" />
            <span className="text-[10px] uppercase tracking-wider hidden sm:inline">Grátis 🎁</span>
          </button>
        </div>

        {/* Center: System Status */}
        <div className="hidden lg:flex items-center gap-2 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>PKXD Central • Glass UI v2.0</span>
        </div>

        {/* Right: Currency Indicator Box */}
        <div className="flex items-center gap-2.5">
          {/* Coins Display */}
          <div className="bg-amber-50/70 border border-amber-200/50 rounded-full py-1.5 px-3 flex items-center gap-1.5 shadow-inner">
            <span className="text-sm">🪙</span>
            <span className="text-xs sm:text-sm font-extrabold text-amber-700 font-mono tracking-tight leading-none">
              {coins.toLocaleString('pt-BR')}
            </span>
          </div>

          {/* Gems Display */}
          <div className="bg-purple-50/70 border border-purple-200/50 rounded-full py-1.5 px-3 flex items-center gap-1.5 shadow-inner">
            <span className="text-sm">💎</span>
            <span className="text-xs sm:text-sm font-extrabold text-purple-700 font-mono tracking-tight leading-none">
              {gems.toLocaleString('pt-BR')}
            </span>
            <button
              onClick={() => {
                triggerAudio('tap');
                handleClaimFreeReward();
              }}
              className="w-5 h-5 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center font-bold text-xs transition-transform active:scale-90 cursor-pointer shadow-sm"
              title="Ganhar mais Joias"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ==========================================================================
         2. CORE PROFILE PANEL (GLASSMORPHIC ARTISTRY)
         ========================================================================== */}
      <div className="bg-white/65 dark:bg-neutral-900/50 border border-white/50 dark:border-white/10 rounded-3xl p-5 sm:p-6 shadow-md relative overflow-hidden backdrop-blur-xl">
        {/* Soft background aesthetic glow spots */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-purple-400/10 dark:bg-purple-600/10 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-32 h-32 bg-pink-400/5 dark:bg-pink-600/5 blur-2xl rounded-full pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5 relative z-10">
          
          {/* Profile Picture Block */}
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5">
            {/* Round photo with Instagram-style gradient border */}
            <div className="relative flex-shrink-0 select-none group">
              <div className="w-24 h-24 rounded-full p-[3px] bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 shadow-md">
                <button
                  onClick={() => {
                    triggerAudio('tap');
                    setIsEditing(true);
                  }}
                  className={`w-full h-full rounded-full flex items-center justify-center overflow-hidden shadow-inner cursor-pointer transition-transform hover:scale-102 ${getAvatarColorClass()}`}
                  title="Alterar foto de perfil"
                >
                  {getAvatarDisplay()}
                </button>
              </div>
              
              {/* Camera Icon Overlay on Hover */}
              <div className="absolute inset-0 bg-black/45 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <Camera className="w-6 h-6 text-white" />
              </div>

              {/* Online Green Indicator Badge */}
              <span className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 border-3 border-white dark:border-neutral-900 rounded-full shadow-md" title="Jogador Online" />
            </div>

            {/* Profile Info Texts */}
            <div className="space-y-1.5 text-center sm:text-left min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
                <h2 className="font-sans font-black text-xl sm:text-2xl text-neutral-900 dark:text-white leading-tight">
                  {nickname}
                </h2>
                
                {/* Official Certified Badge */}
                <span className="inline-flex items-center justify-center bg-sky-500 text-white rounded-full text-[9px] font-black w-4.5 h-4.5 shadow-sm select-none" title="Fã Verificado Oficial">
                  ✓
                </span>
                
                <span className="text-xs font-semibold font-mono text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800/60 px-2 py-0.5 rounded-md">
                  #{nickname.toLowerCase()}
                </span>
              </div>

              {/* Editable Biography Section */}
              <p className="font-sans text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed font-medium whitespace-pre-line max-w-lg">
                {bio}
              </p>

              {/* Profile Controls */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                {/* Adjust Status */}
                <button
                  onClick={() => {
                    triggerAudio('tap');
                    setIsEditing(!isEditing);
                    setEditName(nickname);
                    setEditBio(bio);
                    setEditInsta(instagram);
                    setEditCustomPic(customProfileImage);
                  }}
                  className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-neutral-100/70 hover:bg-neutral-200/70 dark:bg-neutral-800/40 dark:hover:bg-neutral-700/40 border border-neutral-200/50 dark:border-neutral-700/50 rounded-full transition-all text-[11px] font-bold text-neutral-700 dark:text-neutral-200 active:scale-95 cursor-pointer shadow-sm"
                >
                  <Edit2 className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Ajustar Perfil</span>
                </button>

                {/* Marketplace button */}
                <button
                  onClick={() => {
                    triggerAudio('tap');
                    setIsStoreOpen(!isStoreOpen);
                  }}
                  className={`inline-flex items-center gap-1.5 py-1.5 px-3 border rounded-full transition-all text-[11px] font-bold active:scale-95 cursor-pointer shadow-sm ${
                    isStoreOpen 
                      ? 'bg-purple-100 border-purple-200 text-purple-700 dark:bg-purple-950/40 dark:border-purple-800 dark:text-purple-300' 
                      : 'bg-neutral-100/70 hover:bg-neutral-200/70 dark:bg-neutral-800/40 dark:hover:bg-neutral-700/40 border-neutral-200/50 dark:border-neutral-700/50 text-neutral-700 dark:text-neutral-200'
                  }`}
                >
                  <Store className="w-3.5 h-3.5 text-purple-500" />
                  <span>Loja de Avatares</span>
                  {shopAvatars.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Level Tracker Badge */}
          <div className="bg-neutral-100/60 dark:bg-neutral-800/30 border border-neutral-200/45 dark:border-neutral-700/40 p-3 sm:p-4 rounded-2xl text-center space-y-1 min-w-[110px] shadow-inner self-center sm:self-start">
            <div className="text-[9px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider leading-none">Nível Fã</div>
            <div className="text-3xl font-black text-purple-600 dark:text-purple-400 font-mono leading-none">{fanLevel}</div>
            <div className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 font-mono">{fanXP}% XP</div>
          </div>

        </div>

        {/* ==========================================================================
           3. PROFILE EDITING CONTAINER (INLINE GLASSFORM)
           ========================================================================== */}
        <AnimatePresence>
          {isEditing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden border-t border-neutral-200/50 dark:border-neutral-800/60 mt-5 pt-4 text-left"
            >
              <div className="space-y-4 max-w-xl">
                <h4 className="text-xs font-black text-neutral-700 dark:text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Edit2 className="w-3.5 h-3.5 text-purple-500" />
                  <span>Personalizar Perfil Público</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Name field */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-neutral-400 uppercase">Apelido de Fã</label>
                    <input
                      type="text"
                      maxLength={15}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Ex: Koosh"
                      className="w-full rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  {/* Photo URL field */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-neutral-400 uppercase">Link de Imagem Externa (Opcional)</label>
                    <input
                      type="text"
                      value={editCustomPic}
                      onChange={(e) => setEditCustomPic(e.target.value)}
                      placeholder="Cole um link https://..."
                      className="w-full rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Biography field */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-neutral-400 uppercase">Minha Biografia</label>
                  <textarea
                    rows={2}
                    maxLength={100}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Fale um pouco sobre você..."
                    className="w-full rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                {/* Instagram field */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-neutral-400 uppercase">Instagram Link</label>
                    <input
                      type="text"
                      maxLength={30}
                      value={editInsta}
                      onChange={(e) => setEditInsta(e.target.value)}
                      placeholder="@seu_instagram"
                      className="w-full rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  {/* Upload Profile Pic Local */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-neutral-400 uppercase block">Enviar foto do Computador/Celular</label>
                    <label className="w-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors border border-dashed border-neutral-300 dark:border-neutral-600 rounded-xl px-3 py-2 flex items-center justify-center gap-1.5 cursor-pointer text-xs font-bold text-neutral-600 dark:text-neutral-300">
                      <Upload className="w-3.5 h-3.5 text-neutral-500" />
                      <span>Upload de Foto</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleProfilePicUpload} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                </div>

                {/* Avatar Preset Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-neutral-400 uppercase block">Ou escolha um Avatar Desbloqueado</label>
                  <div className="flex flex-wrap gap-2">
                    {/* Presets */}
                    {avatarPresets.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          triggerAudio('tap');
                          setActiveAvatarId(p.id);
                          setEditCustomPic(''); // clear custom image to use avatar preset
                        }}
                        className={`p-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          activeAvatarId === p.id && !editCustomPic
                            ? 'bg-purple-600 border-purple-600 text-white shadow-sm'
                            : 'bg-neutral-100/60 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-700/50 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                        }`}
                      >
                        <span className="text-base">{p.emoji}</span>
                        <span>{p.label}</span>
                      </button>
                    ))}

                    {/* Bought custom avatars */}
                    {shopAvatars.filter(a => ownedAvatars.includes(a.id)).map((avatar) => (
                      <button
                        key={avatar.id}
                        onClick={() => {
                          triggerAudio('tap');
                          setActiveAvatarId(avatar.id);
                          setEditCustomPic(''); // clear custom image to use this avatar
                        }}
                        className={`p-1.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                          activeAvatarId === avatar.id && !editCustomPic
                            ? 'bg-purple-600 border-purple-600 text-white shadow-sm'
                            : 'bg-neutral-100/60 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-700/50 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                        }`}
                      >
                        <img src={avatar.imageUrl} alt={avatar.name} className="w-5 h-5 rounded-full object-cover" />
                        <span>{avatar.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSaveProfile}
                    className="px-4 py-2 bg-neutral-900 dark:bg-purple-600 text-white text-xs font-black uppercase rounded-xl cursor-pointer"
                  >
                    Salvar Alterações
                  </button>
                  <button
                    onClick={() => {
                      triggerAudio('tap');
                      setIsEditing(false);
                    }}
                    className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-xs font-black uppercase rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ==========================================================================
           4. AVATAR STORE / SHOP ("disponível para compra para todos")
           ========================================================================== */}
        <AnimatePresence>
          {isStoreOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden border-t border-neutral-200/50 dark:border-neutral-800/60 mt-5 pt-4 text-left"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Store className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <div>
                      <h3 className="text-sm font-black text-neutral-900 dark:text-white uppercase">Loja de Avatares da Comunidade</h3>
                      <p className="text-[10px] text-neutral-400">Todos podem criar avatares e publicar para todos comprarem! ✨</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      triggerAudio('tap');
                      setIsCreateAvatarOpen(!isCreateAvatarOpen);
                    }}
                    className="flex items-center gap-1 py-1 px-3 bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-black uppercase rounded-xl cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Criar Novo</span>
                  </button>
                </div>

                {/* Form to CREATE new Avatar */}
                {isCreateAvatarOpen && (
                  <motion.form
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onSubmit={handleCreateAvatar}
                    className="p-4 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/50 rounded-2xl space-y-3"
                  >
                    <h4 className="text-xs font-extrabold text-purple-700 dark:text-purple-300 uppercase">Novo Avatar para Vender</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-extrabold uppercase text-purple-600 dark:text-purple-400">Nome do Avatar</label>
                        <input
                          type="text"
                          required
                          value={newAvatarName}
                          onChange={(e) => setNewAvatarName(e.target.value)}
                          placeholder="Ex: Koosh Supremo"
                          className="w-full rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-purple-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-extrabold uppercase text-purple-600 dark:text-purple-400">Foto do Computador/Celular</label>
                        <label className="w-full bg-white dark:bg-neutral-900 transition-colors border border-dashed border-purple-200 dark:border-purple-900 rounded-xl px-3 py-1.5 flex items-center justify-center gap-1.5 cursor-pointer text-xs font-bold text-neutral-600 dark:text-neutral-300">
                          <Upload className="w-3.5 h-3.5 text-purple-500" />
                          <span>{newAvatarBase64 ? "📸 Foto Carregada!" : "Upload de Foto"}</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleAvatarPicUpload} 
                            className="hidden" 
                          />
                        </label>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-extrabold uppercase text-purple-600 dark:text-purple-400">Ou link da imagem externa (URL)</label>
                      <input
                        type="text"
                        value={newAvatarUrl}
                        onChange={(e) => setNewAvatarUrl(e.target.value)}
                        placeholder="Ex: https://playpkxd.com/avatar.png"
                        className="w-full rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-extrabold uppercase text-purple-600 dark:text-purple-400">Preço em Joias 💎</label>
                        <input
                          type="number"
                          min={0}
                          value={newAvatarPriceGems}
                          onChange={(e) => setNewAvatarPriceGems(Number(e.target.value))}
                          className="w-full rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-purple-500 font-mono font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-extrabold uppercase text-purple-600 dark:text-purple-400">Preço em Moedas 🪙</label>
                        <input
                          type="number"
                          min={0}
                          value={newAvatarPriceCoins}
                          onChange={(e) => setNewAvatarPriceCoins(Number(e.target.value))}
                          className="w-full rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-purple-500 font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-black uppercase rounded-xl cursor-pointer"
                      >
                        Publicar Avatar
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCreateAvatarOpen(false)}
                        className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-[10px] font-black uppercase rounded-xl cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </motion.form>
                )}

                {/* Grid of Avatars available for purchase */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Presets */}
                  {avatarPresets.map((preset) => (
                    <div 
                      key={preset.id}
                      className="p-3 bg-neutral-100/50 dark:bg-neutral-800/30 border border-neutral-200/50 dark:border-neutral-700/30 rounded-2xl flex flex-col items-center text-center space-y-2"
                    >
                      <div className="w-12 h-12 rounded-full bg-white dark:bg-neutral-700 flex items-center justify-center text-2xl shadow-sm">
                        {preset.emoji}
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-neutral-800 dark:text-white">{preset.label.split(' ')[0]}</div>
                        <div className="text-[9px] text-neutral-400">Grátis (Padrão)</div>
                      </div>
                      <div className="w-full bg-neutral-100 dark:bg-neutral-800 text-[10px] font-black text-emerald-500 dark:text-emerald-400 py-1 rounded-xl">
                        Desbloqueado ✓
                      </div>
                    </div>
                  ))}

                  {/* Firestore Avatars */}
                  {shopAvatars.map((avatar) => {
                    const isOwned = ownedAvatars.includes(avatar.id);
                    return (
                      <div 
                        key={avatar.id}
                        className="p-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl flex flex-col items-center text-center justify-between space-y-2 relative group"
                      >
                        {/* Avatar Image */}
                        <div className="w-12 h-12 rounded-full overflow-hidden shadow-sm bg-neutral-100">
                          <img 
                            src={avatar.imageUrl} 
                            alt={avatar.name} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-neutral-800 dark:text-white truncate max-w-[110px]">{avatar.name}</div>
                          <div className="text-[8px] text-neutral-400">Por: {avatar.creatorName}</div>
                        </div>

                        {/* Prices row */}
                        {!isOwned && (
                          <div className="flex items-center gap-1.5 text-[10px] font-extrabold font-mono text-neutral-600 dark:text-neutral-300">
                            {avatar.priceGems > 0 && (
                              <span className="flex items-center gap-0.5" title={`${avatar.priceGems} Joias`}>
                                💎{avatar.priceGems}
                              </span>
                            )}
                            {avatar.priceCoins > 0 && (
                              <span className="flex items-center gap-0.5" title={`${avatar.priceCoins} Moedas`}>
                                🪙{avatar.priceCoins}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Buy / Equipped button */}
                        {isOwned ? (
                          <button
                            onClick={() => {
                              triggerAudio('tap');
                              setActiveAvatarId(avatar.id);
                              setCustomProfileImage(''); // clear custom pic URL to use this
                              showAlert(`🎨 Avatar "${avatar.name}" equipado!`);
                            }}
                            className={`w-full py-1 rounded-xl text-[10px] font-bold cursor-pointer flex items-center justify-center gap-1 ${
                              activeAvatarId === avatar.id && !customProfileImage
                                ? 'bg-purple-600 text-white'
                                : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200'
                            }`}
                          >
                            {activeAvatarId === avatar.id && !customProfileImage ? "Equipado" : "Equipar"}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBuyAvatar(avatar)}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-1 rounded-xl text-[10px] font-extrabold cursor-pointer flex items-center justify-center gap-0.5"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>Comprar</span>
                          </button>
                        )}

                        {/* Delete button (only creator can delete) */}
                        {avatar.creatorName === nickname && (
                          <button
                            onClick={() => handleDeleteAvatar(avatar)}
                            className="absolute top-1 right-1 p-1 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Deletar Avatar"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating System Notification */}
      <AnimatePresence>
        {notif && (
          <motion.div
            initial={{ opacity: 0, y: -25, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -25, scale: 0.95 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-neutral-900/90 dark:bg-neutral-850/95 backdrop-blur-md text-white text-xs font-bold p-3 px-5 rounded-full shadow-xl border border-neutral-800 flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
            <span>{notif}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
