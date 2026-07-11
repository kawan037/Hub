import React, { useState, useEffect } from 'react';
import { Trophy, Flame, Star, Sparkles, CheckCircle2, User, Edit2, Check, Award, Instagram, Lock } from 'lucide-react';
import { playTapSound, playSuccessSound, playLevelUpSound } from '../utils/audio';
import { collection, doc, setDoc, getDoc, getDocs, onSnapshot, query, limit, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

const maskEmail = (email?: string | null): string => {
  if (!email) return '';
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const local = parts[0];
  const domain = parts[1];
  if (local.length <= 3) {
    return `${local.slice(0, 1)}***@${domain}`;
  }
  return `${local.slice(0, 3)}***@${domain}`;
};

interface FanLevelSectionProps {
  level: number;
  xp: number;
  onAddXP: (amount: number, reason: string) => void;
  onLevelUp: () => void;
  soundEnabled: boolean;
  user?: any;
  onLogin?: () => void;
  onLoginRedirect?: () => void;
  onLogout?: () => void;
  onEmailLogin?: (email: string, pass: string) => void;
  onEmailRegister?: (email: string, pass: string, nickname: string) => void;
  authError?: string | null;
  isAdmin?: boolean;
  setFanLevel?: (level: number) => void;
  setFanXP?: (xp: number) => void;
}

interface RankedPlayer {
  id: string;
  name: string;
  level: number;
  xp: number;
  flames: number;
  isCurrentUser?: boolean;
  instagram?: string;
  instagramPublic?: boolean;
  photoUrl?: string;
}

export default function FanLevelSection({ 
  level, 
  xp,
  onAddXP,
  onLevelUp, 
  soundEnabled, 
  user,
  onLogin,
  onLoginRedirect,
  onLogout,
  onEmailLogin,
  onEmailRegister,
  authError: outerAuthError,
  isAdmin = false,
  setFanLevel,
  setFanXP
}: FanLevelSectionProps) {

  // Daily claim state
  const [hasClaimedDaily, setHasClaimedDaily] = useState(() => {
    try {
      const lastClaim = localStorage.getItem('pkxd_last_claim_date');
      if (!lastClaim) return false;
      const today = new Date().toDateString();
      return lastClaim === today;
    } catch (e) {
      return false;
    }
  });

  // Flame / Fire streak counter ("foguinho")
  const [fireStreak, setFireStreak] = useState(() => {
    try {
      const saved = localStorage.getItem('pkxd_fire_streak');
      if (saved) {
        const parsed = parseInt(saved, 10);
        return isNaN(parsed) ? 1 : parsed;
      }
    } catch (e) {
      console.warn(e);
    }
    return 1; // Start with 1 on first use
  });

  // User's custom nickname
  const [nickname, setNickname] = useState(() => {
    try {
      const saved = localStorage.getItem('pkxd_username_nickname');
      return saved || 'Jogador_Convidado';
    } catch (e) {
      return 'Jogador_Convidado';
    }
  });
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nickInput, setNickInput] = useState(nickname);

  // Instagram profile local & form states as requested
  const [instagram, setInstagram] = useState(() => {
    try {
      return localStorage.getItem('pkxd_user_instagram') || '';
    } catch {
      return '';
    }
  });
  const [instagramPublic, setInstagramPublic] = useState(() => {
    try {
      const saved = localStorage.getItem('pkxd_user_instagram_public');
      return saved === 'false' ? false : true;
    } catch {
      return true;
    }
  });

  const [instagramForm, setInstagramForm] = useState('');
  const [instagramPublicForm, setInstagramPublicForm] = useState(true);

  const [instaInput, setInstaInput] = useState('');
  const [instaPublicInput, setInstaPublicInput] = useState(true);

  const [notif, setNotif] = useState<string | null>(null);
  
  // Email and Password Login / Registration states
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [emailForm, setEmailForm] = useState('');
  const [passwordForm, setPasswordForm] = useState('');
  const [nicknameForm, setNicknameForm] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);

  // Generate or load a unique browser/device client ID
  const [clientId] = useState(() => {
    try {
      let saved = localStorage.getItem('pkxd_user_clientId');
      if (!saved) {
        saved = 'u_' + Math.random().toString(36).substring(2, 11);
        localStorage.setItem('pkxd_user_clientId', saved);
      }
      return saved;
    } catch (e) {
      return 'u_fallback_' + Math.random().toString(36).substring(2, 5);
    }
  });

  const activePlayerId = user?.uid || clientId;

  // Real database players
  const [dbPlayers, setDbPlayers] = useState<RankedPlayer[]>([]);
  const [leaderboard, setLeaderboard] = useState<RankedPlayer[]>([]);
  const [localPhotoUrl, setLocalPhotoUrl] = useState(() => localStorage.getItem('pkxd_custom_profile_image') || '');

  useEffect(() => {
    const handleStorageChange = () => {
      setLocalPhotoUrl(localStorage.getItem('pkxd_custom_profile_image') || '');
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Monthly Winner State
  interface MonthlyWinner {
    winnerName: string;
    winnerLevel: number;
    winnerFlames: number;
    winnerXp: number;
    lastCheckedMonth: number;
    lastCheckedYear: number;
    recordedAt: number;
  }
  const [monthlyWinner, setMonthlyWinner] = useState<MonthlyWinner | null>(null);

  // ==========================================
  // NEW INTERACTIVE XP GAINING METHODS STATES
  // ==========================================
  const [activeXpTab, setActiveXpTab] = useState<'daily' | 'wheel' | 'chest'>('daily');

  // A. Lucky Wheel States
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelResult, setWheelResult] = useState<{ amount: number; message: string } | null>(null);
  const [wheelCooldown, setWheelCooldown] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('pkxd_next_wheel_spin');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });
  const [wheelTimeLeft, setWheelTimeLeft] = useState(0);

  useEffect(() => {
    if (wheelCooldown <= 0) return;
    const updateTimer = () => {
      const now = Date.now();
      const difference = Math.max(0, Math.ceil((wheelCooldown - now) / 1000));
      setWheelTimeLeft(difference);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [wheelCooldown]);

  // Spin Lucky Wheel algorithm
  const handleSpinWheel = () => {
    if (isSpinning || wheelTimeLeft > 0) return;
    setIsSpinning(true);
    setWheelResult(null);
    if (soundEnabled) playTapSound();

    setTimeout(() => {
      const rewards = [
        { amount: 150, text: "⭐ Super Sorte" },
        { amount: 250, text: "🔥 Brilho de Fogo" },
        { amount: 100, text: "⚡ Gíria Cósmica" },
        { amount: 300, text: "👑 Baú Lendário!" },
        { amount: 150, text: "🔮 Orbe Divino" },
        { amount: 200, text: "🛸 Nave do Admin" }
      ];
      const selected = rewards[Math.floor(Math.random() * rewards.length)];
      setWheelResult({ amount: selected.amount, message: selected.text });
      setIsSpinning(false);

      // Award XP
      addXP(selected.amount, `${selected.text} da Roleta! 🎡`);

      // Set 3-hour cooldown
      const nextSpinTime = Date.now() + 3 * 60 * 60 * 1000;
      setWheelCooldown(nextSpinTime);
      try {
        localStorage.setItem('pkxd_next_wheel_spin', nextSpinTime.toString());
      } catch {}
    }, 2400);
  };

  // B. PK XD Secret Mystery Chest States
  const [chestTaps, setChestTaps] = useState(0);
  const [chestMaxTaps] = useState(8);
  const [isChestBroken, setIsChestBroken] = useState(false);
  const [chestReward, setChestReward] = useState<{ amount: number; name: string; rarity: string } | null>(null);
  const [chestCooldown, setChestCooldown] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('pkxd_next_chest_hunt');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });
  const [chestTimeLeft, setChestTimeLeft] = useState(0);

  useEffect(() => {
    if (chestCooldown <= 0) return;
    const updateTimer = () => {
      const now = Date.now();
      const difference = Math.max(0, Math.ceil((chestCooldown - now) / 1000));
      setChestTimeLeft(difference);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [chestCooldown]);

  const handleTapChest = () => {
    if (isChestBroken || chestTimeLeft > 0) return;
    
    const nextTaps = chestTaps + 1;
    setChestTaps(nextTaps);
    if (soundEnabled) playTapSound();

    if (nextTaps >= chestMaxTaps) {
      setIsChestBroken(true);
      if (soundEnabled) playSuccessSound();

      const standardLoot = [
        { amount: 150, name: "⚡ Super Gema Verde", rarity: "Raro" },
        { amount: 200, name: "🛸 Turbina de Gravidade Zero", rarity: "Épico" },
        { amount: 250, name: "🕶️ Óculos Retro-Tech do Admin", rarity: "Lendário" },
        { amount: 150, name: "🎒 Mochila Foguete de Neon", rarity: "Raro" },
        { amount: 300, name: "⭐ Armadura Suprema PK XD", rarity: "Lendário" },
        { amount: 200, name: "🐲 Drone Companheiro Fantasma", rarity: "Épico" }
      ];
      const selected = standardLoot[Math.floor(Math.random() * standardLoot.length)];
      setChestReward(selected);

      // Award XP
      addXP(selected.amount, `Abriu Baú Secreto: encontrou ${selected.name}! 🎁`);

      // Set 10-minute cooldown
      const nextChestTime = Date.now() + 10 * 60 * 1000;
      setChestCooldown(nextChestTime);
      try {
        localStorage.setItem('pkxd_next_chest_hunt', nextChestTime.toString());
      } catch {}
    }
  };

  const handleResetChest = () => {
    setChestTaps(0);
    setIsChestBroken(false);
    setChestReward(null);
    if (soundEnabled) playTapSound();
  };

  // Load returning player profile from Firestore on login to avoid losing level resets
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.uid) {
        // If not authenticated, we reset state to empty / guest defaults
        setNickname('Jogador_Convidado');
        setNickInput('Jogador_Convidado');
        setFireStreak(1);
        setInstagram('');
        setInstagramPublic(true);
        return;
      }

      setIsLoadingProfile(true);
      const cleanedId = user.uid.trim();
      const userDocRef = doc(db, 'leaderboard', cleanedId);
      
      try {
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const dbName = data.name || 'Fã Secreto';
          const dbLevel = Number(data.level) || 1;
          const dbXp = Number(data.xp) || 0;
          const dbFlames = Number(data.flames) || 1;
          const dbInsta = data.instagram || '';
          const dbInstaPublic = data.instagramPublic !== false;

          // Sync into states
          setNickname(dbName);
          setNickInput(dbName);
          setFireStreak(dbFlames);
          setInstagram(dbInsta);
          setInstagramPublic(dbInstaPublic);

          // Sync into localStorage
          localStorage.setItem('pkxd_username_nickname', dbName);
          localStorage.setItem('pkxd_fire_streak', String(dbFlames));
          localStorage.setItem('pkxd_user_instagram', dbInsta);
          localStorage.setItem('pkxd_user_instagram_public', String(dbInstaPublic));
          localStorage.setItem('pkxd_fan_level', String(dbLevel));
          localStorage.setItem('pkxd_fan_xp', String(dbXp));

          // Notify App.tsx of the correct level & xp
          setFanLevel?.(dbLevel);
          setFanXP?.(dbXp);
        } else {
          // If completely new registered user, sync guest state so they don't lose progress on signup!
          const payload: any = {
            id: cleanedId,
            name: nickname === 'Jogador_Convidado' ? (user.displayName || 'Jogador_Convidado') : nickname,
            level: Number(level) || 1,
            xp: Number(xp) || 0,
            flames: Number(fireStreak) || 1,
            instagram: instagram || '',
            instagramPublic: instagramPublic !== false,
            photoUrl: localPhotoUrl || user.photoURL || '',
            updatedAt: Date.now()
          };

          if (user.uid === 'admin_fallback') {
            payload.admin_secret = "pkxd2026_super_secret_admin_key";
          }

          await setDoc(userDocRef, payload);

          const finalName = payload.name;
          setNickname(finalName);
          setNickInput(finalName);
          localStorage.setItem('pkxd_username_nickname', finalName);
        }
      } catch (err) {
        console.warn("Could not retrieve/set cloud user file:", err);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    loadProfile();
  }, [user]);

  useEffect(() => {
    if (isLoadingProfile) return;
    localStorage.setItem('pkxd_fire_streak', fireStreak.toString());
  }, [fireStreak, isLoadingProfile]);

  useEffect(() => {
    if (isLoadingProfile) return;
    localStorage.setItem('pkxd_username_nickname', nickname);
  }, [nickname, isLoadingProfile]);

  // Sync current player stats to database
  useEffect(() => {
    const syncToDB = async () => {
      if (isLoadingProfile) return; // Wait until retrieve finishes
      // ONLY sync real authenticated profiles to direct database to prevent duplicates/spoofing
      if (!user?.uid) return;

      const cleanedId = user.uid.trim();
      if (!cleanedId || cleanedId.length === 0) return;

      const userDoc = doc(db, 'leaderboard', cleanedId);
      try {
        const payload: any = {
          id: cleanedId,
          name: nickname,
          level: Number(level) || 1,
          xp: Number(xp) || 0,
          flames: Number(fireStreak) || 0,
          instagram: instagram || '',
          instagramPublic: instagramPublic !== false,
          photoUrl: localPhotoUrl || user.photoURL || '',
          updatedAt: Date.now()
        };

        if (user.uid === 'admin_fallback') {
          payload.admin_secret = "pkxd2026_super_secret_admin_key";
        }

        await setDoc(userDoc, payload);
      } catch (err) {
        console.warn("Could not sync leaderboard stats:", err);
      }
    };

    const timer = setTimeout(() => {
      syncToDB();
    }, 1500);

    return () => clearTimeout(timer);
  }, [user, nickname, level, xp, fireStreak, instagram, instagramPublic, localPhotoUrl, isLoadingProfile]);

  // Listen to top players from Firestore collection
  useEffect(() => {
    // Top users query
    const q = query(collection(db, 'leaderboard'), limit(40));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const players: RankedPlayer[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Fully exclude any legacy local/guest ID files (prefix u_) to guarantee real, true leaderboard listing
        if (data && data.id && !data.id.startsWith('u_')) {
          players.push({
            id: data.id,
            name: data.name || 'Fã Secreto',
            level: Number(data.level) || 1,
            xp: Number(data.xp) || 0,
            flames: Number(data.flames) || 0,
            instagram: data.instagram || '',
            instagramPublic: data.instagramPublic !== false,
            photoUrl: data.photoUrl || ''
          });
        }
      });
      setDbPlayers(players);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'leaderboard');
    });

    return () => unsubscribe();
  }, []);

  // Real-time listener for monthly winner and auto-rollover
  useEffect(() => {
    const winnerRef = doc(db, 'settings', 'monthly_winner');
    const unsubscribe = onSnapshot(winnerRef, async (snapshot) => {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      if (snapshot.exists()) {
        const data = snapshot.data() as MonthlyWinner;
        setMonthlyWinner(data);

        // Check if month has changed/rolled over compared to the last recorded winner
        if (data.lastCheckedMonth !== currentMonth || data.lastCheckedYear !== currentYear) {
          try {
            const q = query(collection(db, 'leaderboard'));
            const querySnapshot = await getDocs(q);
            const players: any[] = [];
            querySnapshot.forEach((docSnap) => {
              const pData = docSnap.data();
              if (pData && pData.id && !pData.id.startsWith('u_')) {
                players.push(pData);
              }
            });

            if (players.length > 0) {
              const computeScore = (p: any) => {
                return (Number(p.level || 1) * 10000) + (Number(p.flames || 0) * 100) + Number(p.xp || 0);
              };
              players.sort((a, b) => computeScore(b) - computeScore(a));
              const topPlayer = players[0];

              const newWinner: MonthlyWinner = {
                winnerName: topPlayer.name || 'Fã Secreto',
                winnerLevel: Number(topPlayer.level) || 1,
                winnerFlames: Number(topPlayer.flames) || 0,
                winnerXp: Number(topPlayer.xp) || 0,
                lastCheckedMonth: currentMonth,
                lastCheckedYear: currentYear,
                recordedAt: Date.now()
              };

              await setDoc(winnerRef, newWinner);
              setMonthlyWinner(newWinner);
            }
          } catch (err) {
            console.error("Erro ao registrar vencedor mensal:", err);
          }
        }
      } else {
        try {
          const q = query(collection(db, 'leaderboard'));
          const querySnapshot = await getDocs(q);
          const players: any[] = [];
          querySnapshot.forEach((docSnap) => {
            const pData = docSnap.data();
            if (pData && pData.id && !pData.id.startsWith('u_')) {
              players.push(pData);
            }
          });

          let winnerName = 'Ainda nenhum';
          let winnerLevel = 1;
          let winnerFlames = 0;
          let winnerXp = 0;

          if (players.length > 0) {
            const computeScore = (p: any) => {
              return (Number(p.level || 1) * 10000) + (Number(p.flames || 0) * 100) + Number(p.xp || 0);
            };
            players.sort((a, b) => computeScore(b) - computeScore(a));
            const topPlayer = players[0];
            winnerName = topPlayer.name || 'Fã Secreto';
            winnerLevel = Number(topPlayer.level) || 1;
            winnerFlames = Number(topPlayer.flames) || 0;
            winnerXp = Number(topPlayer.xp) || 0;
          }

          const initWinner: MonthlyWinner = {
            winnerName,
            winnerLevel,
            winnerFlames,
            winnerXp,
            lastCheckedMonth: currentMonth,
            lastCheckedYear: currentYear,
            recordedAt: Date.now()
          };

          await setDoc(winnerRef, initWinner);
          setMonthlyWinner(initWinner);
        } catch (err) {
          console.error("Erro ao inicializar vencedor mensal:", err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Merge database players with user's latest stats - Only show authenticated users on Leaderboard to prevent guest duplicates
  useEffect(() => {
    let combined = [...dbPlayers];

    // ONLY append/display personal rank slot if logged in to avoid guest duplicates
    if (!user?.uid) {
      const computeScore = (p: RankedPlayer) => {
        return (p.level * 10000) + (p.flames * 100) + p.xp;
      };
      combined.sort((a, b) => computeScore(b) - computeScore(a));
      setLeaderboard(combined);
      return;
    }

    const activePlayerId = user.uid;
    const hasMe = combined.some(p => p.id === activePlayerId);
    
    if (!hasMe) {
      combined.push({
        id: activePlayerId,
        name: nickname,
        level: level,
        xp: xp,
        flames: fireStreak,
        isCurrentUser: true,
        instagram: instagram,
        instagramPublic: instagramPublic
      });
    } else {
      combined = combined.map(p => {
        if (p.id === activePlayerId) {
          return {
            ...p,
            name: nickname,
            level: level,
            xp: xp,
            flames: fireStreak,
            isCurrentUser: true,
            instagram: instagram,
            instagramPublic: instagramPublic
          };
        }
        return p;
      });
    }

    // Sort scoring algorithm: level has highest weight, then flames, then xp progress
    const computeScore = (p: RankedPlayer) => {
      return (p.level * 10000) + (p.flames * 100) + p.xp;
    };

    combined.sort((a, b) => computeScore(b) - computeScore(a));
    setLeaderboard(combined);
  }, [dbPlayers, user, clientId, nickname, level, xp, fireStreak, instagram, instagramPublic]);

  const addXP = (amount: number, reason: string) => {
    if (soundEnabled) playSuccessSound();
    setNotif(`+${amount} XP: ${reason}! ⚡`);
    setTimeout(() => setNotif(null), 3000);
    onAddXP(amount, reason);
  };

  const handleClaimDaily = () => {
    playTapSound();
    if (hasClaimedDaily) return;

    const today = new Date().toDateString();
    localStorage.setItem('pkxd_last_claim_date', today);
    setHasClaimedDaily(true);
    
    // Increment fire streak ("foguinho") when claimed!
    const newStreak = fireStreak + 1;
    setFireStreak(newStreak);

    addXP(500, "Coleta Diária 🔥 +1 FOGUINHO!");
  };

  const handleDeletePlayer = async (playerId: string, playerName: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o fã "${playerName}" do ranking?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'leaderboard', playerId));
      setNotif(`Fã ${playerName} excluído do ranking! 🗑️`);
      if (soundEnabled) playTapSound();
      setTimeout(() => setNotif(null), 3000);
    } catch (err) {
      console.error("Erro ao excluir fã:", err);
      setNotif(`❌ Erro ao excluir fã.`);
      setTimeout(() => setNotif(null), 3000);
    }
  };

  const saveNickname = () => {
    playTapSound();
    const clean = nickInput.trim().replace(/\s+/g, '_');
    if (clean.length > 0) {
      const isDuplicate = dbPlayers.some(
        p => p.id !== activePlayerId && p.name.trim().toLowerCase() === clean.trim().toLowerCase()
      );
      if (isDuplicate) {
        setNotif(`❌ Apelido "${clean}" já está em uso! Escolha outro.`);
        setTimeout(() => setNotif(null), 3500);
        return;
      }

      setNickname(clean);
      setIsEditingNickname(false);
      setNotif(`Apelido alterado para ${clean}! 👤`);
      setTimeout(() => setNotif(null), 2500);
    }
  };

  return (
    <section id="fan-level-dashboard" className="bg-zinc-900 border border-white/5 rounded-3xl p-6 sm:p-8 space-y-8 text-left relative overflow-hidden transform-gpu">

      {/* Dynamic Gaining Alert Alert */}
      {notif && (
        <div className="fixed top-20 right-6 z-50 bg-gradient-to-r from-orange-500 to-yellow-400 text-black font-black px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border-2 border-white animate-bounce text-xs sm:text-sm">
          <Flame className="w-5 h-5 text-indigo-950 animate-pulse fill-red-650" />
          <span>{notif}</span>
        </div>
      )}

      {/* Main Header Row */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border-b border-white/5 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-orange-400 font-extrabold text-xs uppercase tracking-wider">
            <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
            <span>PKXD Hub • Sequência de Fogos</span>
          </div>
          <h3 className="font-sans font-black text-2xl tracking-tight text-white uppercase">
            🔥 Central do Foguinho & XP Diário
          </h3>
          <p className="font-sans text-xs text-gray-400">
            Resgate sua energia diária para acumular fogos, subir de nível e liderar o ranking oficial dos maiores fãs!
          </p>
        </div>

        {/* Current User Quick Stats Widget */}
        <div className="bg-zinc-950 p-4 rounded-2xl border border-white/5 w-full lg:w-96 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Round status badge */}
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-orange-500 to-yellow-400 p-0.5 flex items-center justify-center relative">
              <div className="w-full h-full bg-zinc-950 rounded-full flex flex-col items-center justify-center">
                <span className="text-[12px] font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-300 leading-none">Lv {level}</span>
              </div>
            </div>
            
            {/* Nickname / Edit component */}
            <div className="space-y-0.5">
              {isEditingNickname ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={nickInput}
                      onChange={(e) => setNickInput(e.target.value)}
                      className="bg-zinc-800 text-white text-xs px-2 py-1 rounded border border-white/20 w-32 focus:outline-none focus:border-orange-500 font-sans"
                      maxLength={15}
                      placeholder="Apelido..."
                    />
                  </div>
                  
                  {/* Let them edit Instagram handle */}
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={instaInput}
                      onChange={(e) => setInstaInput(e.target.value)}
                      className="bg-zinc-850 text-white text-[10px] px-2 py-1.5 rounded border border-white/10 w-full focus:outline-none focus:border-orange-500 font-mono"
                      placeholder="Instagram (Link ou @user)"
                    />
                    <label className="flex items-center gap-1.5 text-[9px] text-gray-400 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={instaPublicInput}
                        onChange={(e) => setInstaPublicInput(e.target.checked)}
                        className="rounded border-white/10 bg-zinc-950 text-orange-500 focus:ring-0 cursor-pointer"
                      />
                      <span>Instagram Público no Ranking</span>
                    </label>
                  </div>

                  <div className="flex gap-1.5 pt-1">
                    <button 
                      onClick={() => {
                        playTapSound();
                        const clean = nickInput.trim().replace(/\s+/g, '_');
                        if (clean.length > 0) {
                          const isDuplicate = dbPlayers.some(
                            p => p.id !== activePlayerId && p.name.trim().toLowerCase() === clean.trim().toLowerCase()
                          );
                          if (isDuplicate) {
                            setNotif(`❌ Apelido "${clean}" já está em uso! Escolha outro.`);
                            setTimeout(() => setNotif(null), 3500);
                            return;
                          }
                          setNickname(clean);
                        }
                        
                        const cleanInsta = instaInput.trim();
                        localStorage.setItem('pkxd_user_instagram', cleanInsta);
                        localStorage.setItem('pkxd_user_instagram_public', String(instaPublicInput));
                        setInstagram(cleanInsta);
                        setInstagramPublic(instaPublicInput);
                        
                        setIsEditingNickname(false);
                        setNotif(`Perfil atualizado com sucesso! 👤`);
                        setTimeout(() => setNotif(null), 2500);
                      }} 
                      className="px-2.5 py-1.5 bg-emerald-500 text-black text-[10px] font-black uppercase rounded hover:bg-emerald-400 cursor-pointer flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Salvar</span>
                    </button>
                    <button 
                      onClick={() => setIsEditingNickname(false)} 
                      className="px-2.5 py-1.5 bg-zinc-700 text-white text-[10px] font-black uppercase rounded hover:bg-zinc-650 cursor-pointer"
                    >
                      <span>Voltar</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-white truncate max-w-[120px] font-mono">{nickname}</span>
                  <button 
                    onClick={() => { 
                      playTapSound(); 
                      setIsEditingNickname(true); 
                      setNickInput(nickname);
                      setInstaInput(instagram);
                      setInstaPublicInput(instagramPublic);
                    }}
                    className="p-1 text-gray-400 hover:text-white transition-all cursor-pointer"
                    title="Mudar Apelido"
                  >
                    <Edit2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-[10px] text-orange-400 font-black">
                <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-600 animate-pulse" />
                <span>{fireStreak} Fogos Conquistados</span>
              </div>
            </div>
          </div>

          <div className="text-right space-y-1">
            <div className="text-[11px] font-bold text-gray-400 font-mono">XP: <span className="text-yellow-300">{xp}/100</span></div>
            {/* Tiny progress bar */}
            <div className="w-24 h-1.5 bg-zinc-850 rounded-full overflow-hidden p-0.5 border border-white/5">
              <div className="h-full bg-gradient-to-r from-orange-500 to-yellow-400 rounded-full" style={{ width: `${xp}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Connection/Login Banner for Fans */}
      {!user || user.uid === 'admin_fallback' ? (
        <div className="bg-gradient-to-b from-indigo-950/40 via-zinc-900/40 to-transparent border-2 border-indigo-500/30 rounded-3xl p-6 space-y-6 shadow-2xl text-left font-sans">
          <div className="space-y-1">
            <h4 className="text-base sm:text-lg font-sans font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-5.5 h-5.5 text-yellow-300 animate-pulse fill-yellow-500/20" />
              <span>Conecte sua Conta para entrar no Ranking Real! 🏆</span>
            </h4>
            <p className="text-xs text-gray-300 leading-normal max-w-3xl">
              Seu perfil atual é temporário como <strong className="text-orange-400 font-mono font-black">{nickname}</strong>. Faça login rápido ou crie uma conta usando seu e-mail e senha abaixo para salvar seu fã-level, streak de fogo diário, e aparecer para todo mundo!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch pt-2">
            
            {/* Left Column: Google Sign-in */}
            <div className="bg-zinc-950/60 p-5 rounded-2xl border border-white/5 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <h5 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  <span>Opção 1: CONEXÃO COM GOOGLE</span>
                </h5>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Conecte estantaneamente com sua conta Google existente se os popups estiverem ativos no seu navegador.
                </p>
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => {
                    if (soundEnabled) playSuccessSound();
                    if (onLogin) onLogin();
                  }}
                  className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-550 active:scale-[0.98] text-white font-sans font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-yellow-200 animate-spin" />
                  <span>Entrar com Google (Popup)</span>
                </button>
                <button
                  onClick={() => {
                    if (soundEnabled) playTapSound();
                    if (onLoginRedirect) onLoginRedirect();
                  }}
                  className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] text-gray-300 font-sans font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer border border-zinc-750 transition-all flex items-center justify-center gap-1"
                  title="Use se o Popup do Google estiver bloqueado no celular"
                >
                  <span>Redirecionar Celular 📱</span>
                </button>
              </div>
            </div>

            {/* Right Column: Email / Password login */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (soundEnabled) playTapSound();
                if (!emailForm || !passwordForm) {
                  setAuthError('Preencha os campos de e-mail e senha!');
                  return;
                }
                setAuthError(null);
                if (authTab === 'register') {
                  // Password complexity validation
                  if (passwordForm.length < 8) {
                    setAuthError('A senha cadastrada precisa de no mínimo 8 caracteres para ser segura!');
                    return;
                  }
                  if (!/\d/.test(passwordForm)) {
                    setAuthError('Sua senha é muito fácil! Ela deve conter pelo menos um número.');
                    return;
                  }
                  if (!/[A-Za-z]/.test(passwordForm)) {
                    setAuthError('Sua senha é muito fácil! Ela deve conter letras e números.');
                    return;
                  }
                  const simplePasswords = ['123456', '12345678', 'senha123', 'admin123', 'pkxd123', 'pkxd2026', 'password'];
                  if (simplePasswords.some(sw => passwordForm.toLowerCase().includes(sw))) {
                    setAuthError('Esta senha é muito óbvia e vulnerável. Por favor, escolha outra combinação.');
                    return;
                  }

                  const pickNickname = nicknameForm.trim() || nickname;
                  const clean = pickNickname.trim().replace(/\s+/g, '_');
                  const isDuplicate = dbPlayers.some(
                    p => p.id !== activePlayerId && p.name.trim().toLowerCase() === clean.trim().toLowerCase()
                  );
                  if (isDuplicate) {
                    setAuthError(`O Apelido "${clean}" já está em uso! Escolha outro nome.`);
                    return;
                  }

                  // Save Instagram state on register
                  const cleanInsta = instagramForm.trim();
                  localStorage.setItem('pkxd_user_instagram', cleanInsta);
                  localStorage.setItem('pkxd_user_instagram_public', String(instagramPublicForm));
                  setInstagram(cleanInsta);
                  setInstagramPublic(instagramPublicForm);

                  if (onEmailRegister) onEmailRegister(emailForm, passwordForm, clean);
                } else {
                  if (onEmailLogin) onEmailLogin(emailForm, passwordForm);
                }
              }}
              className="bg-zinc-950/60 p-5 rounded-2xl border border-white/5 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                {/* Auth Mode Toggle */}
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-xs font-black text-violet-400 uppercase tracking-widest">
                    Opção 2: E-MAIL E SENHA (100% GARANTIDO)
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (soundEnabled) playTapSound();
                        setAuthTab('login');
                        setAuthError(null);
                      }}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        authTab === 'login' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      Entrar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (soundEnabled) playSuccessSound();
                        setAuthTab('register');
                        setAuthError(null);
                        setNicknameForm(nickname);
                      }}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        authTab === 'register' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      Cadastrar
                    </button>
                  </div>
                </div>

                {/* Form fields */}
                <div className="space-y-2.5">
                  <div>
                    <input
                      type="email"
                      required
                      placeholder="Seu e-mail (ex: fã@email.com)"
                      value={emailForm}
                      onChange={(e) => setEmailForm(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-all font-mono"
                    />
                  </div>

                  <div>
                    <input
                      type="password"
                      required
                      minLength={8}
                      placeholder="Sua senha (mínimo 8 dígitos com letras e nrs)"
                      value={passwordForm}
                      onChange={(e) => setPasswordForm(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-all font-mono"
                    />
                  </div>

                  {authTab === 'register' && (
                    <div className="space-y-2.5 pt-1">
                      <div>
                        <label className="block text-[10px] text-zinc-400 uppercase tracking-widest mb-1 pl-0.5 leading-none font-sans font-bold">
                          Nickname Oficial no Site:
                        </label>
                        <input
                          type="text"
                          placeholder="Nome de Fã"
                          value={nicknameForm}
                          onChange={(e) => setNicknameForm(e.target.value)}
                          className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-all font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-zinc-400 uppercase tracking-widest mb-1 pl-0.5 leading-none font-sans font-bold">
                          Seu Instagram (Link ou @user):
                        </label>
                        <input
                          type="text"
                          placeholder="ex: @pkxd_explorer ou link"
                          value={instagramForm}
                          onChange={(e) => setInstagramForm(e.target.value)}
                          className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-all font-mono"
                        />
                      </div>

                      <div className="pt-1 select-none">
                        <label className="flex items-center gap-2 text-[10px] sm:text-xs text-zinc-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={instagramPublicForm}
                            onChange={(e) => setInstagramPublicForm(e.target.checked)}
                            className="rounded border-white/15 bg-zinc-900 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
                          />
                          <span>Mostrar meu Instagram no Ranking Público</span>
                        </label>
                        <p className="text-[9px] text-zinc-500 leading-normal pl-5 mt-0.5">
                          Se desativado, seu contato ficará seguro e só aparecerá para a Administração do fã-clube.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {(authError || outerAuthError) && (
                  <p className="text-[11px] text-red-400 bg-red-950/20 border border-red-500/10 p-2.5 rounded-xl whitespace-pre-line leading-relaxed font-sans">
                    ⚠️ {authError || outerAuthError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 bg-zinc-800 hover:bg-violet-600 hover:text-white text-zinc-300 font-sans font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer border border-zinc-750 hover:border-violet-500 transition-all flex items-center justify-center gap-1.5"
              >
                <span>{authTab === 'register' ? 'CRIAR MINHA CONTA DE FÃ 🚀' : 'ENTRAR NA CONTA E SINCRONIZAR 🔓'}</span>
              </button>
            </form>

          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-emerald-600/20 to-transparent border-2 border-emerald-500/30 rounded-3xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg font-sans">
          <div className="space-y-1 text-left">
            <h4 className="text-sm sm:text-base font-sans font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-pulse" />
              <span>Sua conta de fã está ativa! ✅</span>
            </h4>
            <p className="text-xs text-gray-300 leading-normal">
              Autenticado com sucesso como <strong className="text-emerald-300 font-mono underline">{maskEmail(user.email)}</strong>. Suas conquistas, níveis e fogo diário diário estão sincronizados em tempo real do fã-clube.
            </p>
          </div>
          <button
            onClick={() => {
              if (soundEnabled) playTapSound();
              if (onLogout) onLogout();
            }}
            className="px-4 py-2.5 bg-zinc-800 hover:bg-red-950/40 text-gray-300 hover:text-red-200 font-sans font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer border border-zinc-700 transition-all flex items-center justify-center whitespace-nowrap"
          >
            Desconectar
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* LEFT COLUMN: The Interactive XP Playground Tabs (Spans 5 columns) */}
        <div className="lg:col-span-5 bg-gradient-to-b from-zinc-950 to-zinc-900 border border-white/5 p-5 rounded-2xl flex flex-col justify-between space-y-4 relative overflow-hidden min-h-[460px]">
          {/* Tabs Switcher Row */}
          <div className="flex border-b border-white/5 pb-2.5 gap-1.5 relative z-10 select-none">
            <button
              type="button"
              onClick={() => { setActiveXpTab('daily'); if(soundEnabled) playTapSound(); }}
              className={`flex-1 py-1.5 rounded-xl text-[10px] sm:text-xs font-black uppercase text-center transition-all cursor-pointer ${
                activeXpTab === 'daily' 
                  ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20 font-black' 
                  : 'text-zinc-400 hover:text-white bg-white/5'
              }`}
            >
              🔥 Fogo
            </button>
            <button
              type="button"
              onClick={() => { setActiveXpTab('wheel'); if(soundEnabled) playTapSound(); }}
              className={`flex-1 py-1.5 rounded-xl text-[10px] sm:text-xs font-black uppercase text-center transition-all cursor-pointer ${
                activeXpTab === 'wheel' 
                  ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20 font-black' 
                  : 'text-zinc-400 hover:text-white bg-white/5'
              }`}
            >
              🎡 Roleta
            </button>
            <button
              type="button"
              onClick={() => { setActiveXpTab('chest'); if(soundEnabled) playTapSound(); }}
              className={`flex-1 py-1.5 rounded-xl text-[10px] sm:text-xs font-black uppercase text-center transition-all cursor-pointer ${
                activeXpTab === 'chest' 
                  ? 'bg-purple-650 text-white shadow-lg shadow-purple-650/20 font-black' 
                  : 'text-zinc-400 hover:text-white bg-white/5'
              }`}
            >
              📦 Baú
            </button>
          </div>

          {/* Tab 1: FOGO (Classic Daily Check-in) */}
          {activeXpTab === 'daily' && (
            <div className="space-y-4 flex flex-col justify-between h-full relative z-10">
              <div className="space-y-2">
                <span className="text-[9px] font-bold bg-orange-500/10 text-orange-400 p-1 px-2.5 rounded-full uppercase tracking-wider font-mono">
                  Fogueira Diária de Energia
                </span>
                <div className="space-y-1">
                  <h4 className="font-sans font-black text-sm text-white uppercase tracking-normal">
                    Faça o seu check-in e acenda a chama!
                  </h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Cada clique diário confere ao seu perfil <strong className="text-yellow-400">+500 XP</strong> de fã level e aumenta sua sequência consecutiva de <strong className="text-orange-400">🔥 Fogos</strong>!
                  </p>
                </div>
              </div>

              {/* Interactive Flame Orb container */}
              <div className="flex flex-col items-center justify-center p-4 bg-black/30 rounded-2xl border border-white/5 space-y-2 select-none my-1">
                {/* The Fire Visual */}
                <div className="relative">
                  <div className="absolute inset-[-8px] rounded-full bg-orange-600/20 blur-xl animate-pulse" />
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-t from-red-600 via-orange-500 to-amber-300 shadow-[0_0_20px_rgba(234,88,12,0.4)] p-0.5 transition-all duration-300 ${hasClaimedDaily ? 'grayscale-[40%] scale-95 opacity-80' : 'hover:scale-105'}`}>
                    <div className="w-full h-full bg-zinc-950 rounded-full flex flex-col items-center justify-center text-center">
                      <Flame className={`w-8 h-8 text-orange-400 fill-orange-500 drop-shadow-[0_2px_6px_rgba(234,88,12,0.5)] ${hasClaimedDaily ? 'animate-pulse' : 'animate-bounce'}`} />
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-xs font-black text-white flex items-center justify-center gap-1">
                    <span>🔥 Sequência de Fogos:</span>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-300 font-mono text-xs font-black">{fireStreak} Dias</span>
                  </div>
                  <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mt-0.5">
                    {hasClaimedDaily ? "Você está brilhando no topo hoje!" : "O fogo está aguardando você hoje!"}
                  </p>
                </div>
              </div>

              <div className="pt-1">
                {hasClaimedDaily ? (
                  <div className="w-full bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase text-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Colete diário garantido! (+500 XP) 🔥</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleClaimDaily}
                    className="w-full py-3 bg-gradient-to-r from-orange-500 via-red-500 to-amber-500 hover:brightness-110 text-black font-sans font-black text-xs uppercase tracking-wider rounded-xl border-b-4 border-red-800 active:border-b-0 cursor-pointer shadow-[0_4px_15px_rgba(234,88,12,0.25)] active:translate-y-1 transition-all text-center flex items-center justify-center gap-2"
                  >
                    <Flame className="w-3.5 h-3.5 fill-black text-black animate-pulse" />
                    <span>Coletar XP Diário (+500 XP)</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: WHEEL (Lucky XP Wheel) */}
          {activeXpTab === 'wheel' && (
            <div className="space-y-4 flex flex-col justify-between h-full relative z-10">
              <div className="space-y-2">
                <span className="text-[9px] font-bold bg-pink-500/10 text-pink-400 p-1 px-2.5 rounded-full uppercase tracking-wider font-mono">
                  Giro da Sorte Diário
                </span>
                <div className="space-y-1">
                  <h4 className="font-sans font-black text-sm text-white uppercase">
                    Roleta de XP Cósmico
                  </h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                    Gire a roleta a cada <strong className="text-pink-400">3 horas</strong> para reivindicar de 100 a 300 XP de bônus!
                  </p>
                </div>
              </div>

              {/* The Spinning Plate */}
              <div className="flex flex-col items-center justify-center py-2 select-none">
                <div className="relative flex flex-col items-center">
                  {/* Arrow pin */}
                  <div className="absolute -top-3 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[12px] border-b-pink-500 z-20 animate-pulse" />
                  
                  <div className="relative">
                    <div className="absolute inset-[-6px] rounded-full bg-pink-500/15 blur-md" />
                    <div className={`relative w-24 h-24 rounded-full border-4 border-pink-500/60 bg-gradient-to-tr from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center shadow-2xl transition-all duration-[2400ms] ${isSpinning ? 'animate-spin' : ''}`}>
                      <div className="absolute inset-0 rounded-full border-r-2 border-b-2 border-yellow-400/40 pointer-events-none" />
                      <div className="absolute inset-1.5 rounded-full border-l-2 border-t-2 border-pink-500/40 pointer-events-none" />
                      
                      <div className="text-center z-10 p-1">
                        {isSpinning ? (
                          <span className="text-xl block animate-bounce">🌀</span>
                        ) : wheelResult ? (
                          <div className="space-y-0.5">
                            <span className="text-[8px] uppercase font-black tracking-widest text-pink-400 block truncate max-w-[80px]">{wheelResult.message}</span>
                            <span className="text-[11px] font-mono font-black text-yellow-300 block">+{wheelResult.amount} XP</span>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="text-[11px] font-black text-white uppercase block leading-none">ROLETA</span>
                            <span className="text-[8px] font-black text-yellow-400 block leading-none">GIRAR</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Spin Button */}
              <div>
                {wheelTimeLeft > 0 ? (
                  <div className="w-full bg-black/40 border border-zinc-900 p-2.5 rounded-xl text-center">
                    <p className="text-[9px] text-zinc-500 uppercase font-black font-mono leading-none mb-1">Próximo Giro Disponível em:</p>
                    <span className="text-xs font-mono font-black text-pink-300">
                      {Math.floor(wheelTimeLeft / 3600).toString().padStart(2, '0')}:
                      {Math.floor((wheelTimeLeft % 3600) / 60).toString().padStart(2, '0')}:
                      {(wheelTimeLeft % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isSpinning}
                    onClick={handleSpinWheel}
                    className="w-full py-3 bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:brightness-110 text-white font-sans font-black text-xs uppercase tracking-wider rounded-xl border-b-4 border-pink-800 active:border-b-0 cursor-pointer shadow-[0_4px_15px_rgba(236,72,153,0.25)] active:translate-y-1 transition-all text-center flex items-center justify-center gap-2"
                  >
                    <span>{isSpinning ? "Girando a Sorte..." : "Girar Roleta da Sorte"}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Tab 3: CHEST (Secret Mystery Chest Clicker) */}
          {activeXpTab === 'chest' && (
            <div className="space-y-4 flex flex-col justify-between h-full relative z-10">
              <div className="space-y-1.5 flex-col flex text-left">
                <span className="text-[9px] font-bold bg-purple-500/10 text-purple-400 p-1 px-2.5 rounded-full uppercase tracking-wider font-mono w-fit">
                  Caça ao Baú Secreto
                </span>
                <div className="space-y-1">
                  <h4 className="font-sans font-black text-sm text-white uppercase">
                    Desvende o Baú Cósmico
                  </h4>
                  <p className="text-[11px] text-gray-405 leading-relaxed">
                    Clique repetidamente no baú secreto para quebrar o lacre de segurança e reivindicar um prêmio aleatório de XP de fã!
                  </p>
                </div>
              </div>

              {/* Chest visual panel */}
              <div className="p-3 bg-black/45 rounded-2xl border border-white/5 flex flex-col items-center justify-center min-h-[170px] select-none my-1">
                {chestTimeLeft > 0 ? (
                  <div className="text-center space-y-2 py-4">
                    <span className="text-2xl block animate-pulse">🔒</span>
                    <h5 className="font-bold text-[10px] text-purple-400 uppercase pb-0.5">Baú Trancado</h5>
                    <p className="text-[9px] text-zinc-400 max-w-[200px] mx-auto leading-relaxed">
                      O sistema está gerando um novo baú secreto. Volte em breve!
                    </p>
                    <div className="text-xs font-mono font-black text-purple-350 bg-purple-950/40 p-1.5 px-3 rounded-xl border border-purple-500/20 inline-block mt-1">
                      {Math.floor(chestTimeLeft / 60).toString().padStart(2, '0')}:{(chestTimeLeft % 60).toString().padStart(2, '0')} min
                    </div>
                  </div>
                ) : isChestBroken ? (
                  <div className="text-center space-y-2.5 py-1">
                    <span className="text-3xl block animate-bounce">🎁</span>
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-black tracking-wider bg-yellow-500/10 text-yellow-500 p-0.5 px-2 rounded-full inline-block">
                        Loot {chestReward?.rarity}!
                      </span>
                      <h5 className="font-black text-xs text-white uppercase tracking-tight leading-snug">{chestReward?.name}</h5>
                      <span className="text-xs font-mono font-black text-yellow-400 block">+{chestReward?.amount} XP Adicionados!</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetChest}
                      className="text-[9px] font-black text-white hover:underline bg-white/5 py-1 px-3 rounded-full uppercase cursor-pointer"
                    >
                      Achar Outro Baú
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 flex flex-col items-center w-full">
                    {/* The Tappable Chest Visual */}
                    <button
                      type="button"
                      onClick={handleTapChest}
                      className="group relative focus:outline-none transition-transform active:scale-90"
                    >
                      {/* Aura pulsing behind */}
                      <div className="absolute inset-[-12px] rounded-full bg-purple-600/10 blur-xl animate-pulse" />
                      
                      <div className={`text-4xl transition-all duration-75 relative select-none leading-none ${chestTaps > 0 ? "scale-110 rotate-3" : "hover:scale-105"}`}>
                        📦
                      </div>
                      
                      {/* Indicator of clicks left */}
                      <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-black text-[9px] font-black font-mono w-5 h-5 flex items-center justify-center rounded-full shadow-lg border border-yellow-300">
                        {chestMaxTaps - chestTaps}
                      </div>
                    </button>

                    {/* Progress lock-breaking bar */}
                    <div className="w-full max-w-[180px] space-y-1">
                      <div className="flex justify-between text-[8px] font-bold text-zinc-400 uppercase">
                        <span>Lacre do Baú</span>
                        <span className="text-purple-400">{Math.round((chestTaps / chestMaxTaps) * 100)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-600 via-pink-500 to-yellow-400 transition-all duration-150"
                          style={{ width: `${(chestTaps / chestMaxTaps) * 100}%` }}
                        />
                      </div>
                    </div>

                    <p className="text-[8px] text-zinc-500 uppercase tracking-wider font-black font-sans">
                      Dê tap no baú para abrir!
                    </p>
                  </div>
                )}
              </div>

              {/* Decorative note */}
              <div className="text-[9px] text-zinc-500 bg-white/5 rounded-xl p-2 text-center border border-white/5 font-sans leading-relaxed">
                💡 O Baú Secreto do Admin pode conceder até <strong className="text-yellow-400">300 XP</strong> instantâneo! Ele reaparece a cada 10 minutos.
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Real-time Dynamic Leaderboard System (Spans 7 columns) */}
        <div className="lg:col-span-7 bg-black/35 border border-white/5 p-6 rounded-2xl flex flex-col justify-between space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <h4 className="font-sans font-black text-sm text-white uppercase tracking-wider flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span>Ranking Oficial de PKXDoidos</span>
              </h4>
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-black">
                Top PKXDoidos & Ativos
              </span>
            </div>
            <p className="text-xs text-gray-300 leading-normal">
              O ranking é reorganizado instantaneamente conforme você decola seus níveis de XP e soma mais dias seguidos de foguinhos 🔥 acessados!
            </p>

            {/* Monthly Reset & Dynamic Prize Banner */}
            <div className="bg-gradient-to-r from-yellow-400/15 via-amber-500/5 to-transparent border-l-4 border-yellow-400 p-2.5 rounded-r-xl text-left space-y-1 my-2 animate-pulse">
              <h5 className="font-sans font-black text-[11px] text-yellow-300 uppercase tracking-widest flex items-center gap-1.5">
                ⭐ DINÂMICA COMPLETA: PRÊMIO TODO MÊS!
              </h5>
              <p className="font-sans text-[10px] text-zinc-300 leading-relaxed">
                Atenção, fã-clube! <strong>O ranking de fãs virtual é atualizado e reiniciado todo início de mês</strong> de forma automática. O jogador que ficar em <strong>🥇 1º Lugar (Primeiro Lugar)</strong> no final do mês garantirá um prêmio físico ou digital exclusivo do PKXD Hub! Comece a subir de nível! 🚀
              </p>
            </div>

            {/* Monthly Winner Coronation Card */}
            {new Date().getDate() <= 3 && monthlyWinner && (
              <div className="bg-gradient-to-r from-amber-500/20 via-yellow-500/25 to-amber-600/15 border-2 border-yellow-400/60 p-4 rounded-2xl text-left space-y-2.5 relative overflow-hidden shadow-[0_0_15px_rgba(245,158,11,0.25)] my-3">
                {/* Glowing element */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-400/10 rounded-full filter blur-xl pointer-events-none" />
                <div className="absolute -bottom-5 -left-5 w-20 h-20 bg-amber-400/10 rounded-full filter blur-xl pointer-events-none" />
                
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-yellow-400 text-black rounded-xl shadow-lg flex-shrink-0">
                    <Trophy className="w-5 h-5 fill-current" />
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-mono font-black text-yellow-300 tracking-widest block leading-none">TEMPORADA ANTERIOR</span>
                    <h5 className="font-sans font-black text-[13px] text-white uppercase tracking-wider">
                      👑 GRANDE VENCEDOR COROADO! 👑
                    </h5>
                  </div>
                </div>

                <p className="font-sans text-xs text-gray-100 leading-relaxed">
                  O mês rodou e o fã supremo da última temporada foi definido! Parabéns ao lendário fã-clube oficial de <strong className="text-yellow-300 font-black">@{monthlyWinner.winnerName}</strong>, que alcançou o prestigiado <strong className="text-amber-400 font-bold">Nível {monthlyWinner.winnerLevel}</strong> e manteve <strong className="text-orange-400 font-bold">{monthlyWinner.winnerFlames} 🔥 dias de streak</strong>! 🎉
                </p>

                <div className="flex items-center justify-between border-t border-white/10 pt-2 text-[10px] font-mono text-yellow-200">
                  <span className="font-black flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" /> REALEZA DO PKXD HUB
                  </span>
                  <span className="bg-black/40 px-2 py-0.5 rounded-md text-gray-400 border border-white/5">
                    Exibido por mais 3 dias
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Leaders List */}
          <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1 no-scrollbar flex-grow">
            {leaderboard.map((player, index) => {
              const rank = index + 1;
              const isUser = player.isCurrentUser;

              let medalBadge = '';
              if (rank === 1) medalBadge = '🥇';
              else if (rank === 2) medalBadge = '🥈';
              else if (rank === 3) medalBadge = '🥉';

              return (
                <div 
                  key={player.id} 
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${
                    isUser 
                      ? 'bg-gradient-to-r from-orange-500/10 via-yellow-500/5 to-transparent border-orange-500/40 shadow-inner scale-[1.01]' 
                      : 'bg-zinc-900/30 border-white/5 hover:bg-zinc-900/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Rank indicator */}
                    <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center font-black text-xs text-mono text-gray-400">
                      {medalBadge ? (
                        <span className="text-base">{medalBadge}</span>
                      ) : (
                        <span>#{rank}</span>
                      )}
                    </div>

                    {/* Round photo or simple avatar icon */}
                    <div className="relative w-8 h-8 flex-shrink-0">
                      {player.photoUrl ? (
                        <img 
                          src={player.photoUrl} 
                          alt={player.name}
                          className="w-8 h-8 rounded-full object-cover border border-white/10"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isUser ? 'bg-orange-500 text-black' : 'bg-zinc-800 text-gray-400'}`}>
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    {/* Player Details */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-xs font-bold truncate ${isUser ? 'text-orange-400 font-black' : 'text-zinc-200'}`}>
                          {player.name}
                        </span>
                        {isUser && (
                          <span className="text-[8px] bg-amber-400/15 border border-amber-400/20 text-amber-300 px-1 rounded uppercase font-black tracking-wide flex-shrink-0">
                            VOCÊ
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5 mt-0.5">
                        <span className="text-[10px] text-gray-400 font-semibold font-mono">
                          Nível de Explorador: <span className="text-yellow-400 font-bold">Fã Lvl {player.level}</span>
                        </span>
                        {/* Instagram display block */}
                        {player.instagram && (player.instagramPublic || isAdmin) && (
                          <div className="flex items-center gap-1.5 text-[9px] md:text-[10px] text-pink-400 font-semibold font-sans mt-0.5 flex-wrap">
                            <Instagram className="w-3 h-3 text-pink-500 flex-shrink-0" />
                            {player.instagram.startsWith('http') ? (
                              <a 
                                href={player.instagram}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline hover:text-pink-300 transition-colors truncate max-w-[150px]"
                              >
                                {player.instagram.substring(0, 24)}{player.instagram.length > 24 ? '...' : ''}
                              </a>
                            ) : (
                              <a 
                                href={`https://instagram.com/${player.instagram.replace('@', '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline hover:text-pink-300 transition-colors"
                              >
                                {player.instagram.startsWith('@') ? player.instagram : `@${player.instagram}`}
                              </a>
                            )}
                            {!player.instagramPublic && isAdmin && (
                              <span className="flex items-center gap-0.5 text-[8px] text-yellow-500 bg-yellow-500/10 px-1 py-0.2 rounded border border-yellow-500/20 uppercase font-black ml-1 flex-shrink-0" title="Instagram configurado como privado. Visível apenas para administradores!">
                                <Lock className="w-2 h-2 text-yellow-500" />
                                <span>Privado</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Flames/XP Score Badge */}
                  <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                    {/* Fire count */}
                    <div className="flex items-center gap-1 text-xs font-black font-mono text-orange-400 bg-orange-500/5 p-1 px-2 rounded-lg border border-orange-500/20">
                      <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500 animate-pulse" />
                      <span>{player.flames}</span>
                    </div>

                    {/* Progress details */}
                    <div className="text-right hidden sm:block">
                      <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Metas</div>
                      <div className="text-[10px] text-yellow-300 font-mono font-black">{player.xp}/100 XP</div>
                    </div>

                    {/* Admin Delete/Exclude Button */}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePlayer(player.id, player.name);
                        }}
                        className="py-1 px-2 bg-red-650 hover:bg-red-600 text-white border border-red-500/20 font-mono text-[9px] font-black uppercase rounded-lg active:scale-95 transition-all cursor-pointer"
                        title="Excluir Jogador do Ranking por Nome Impróprio"
                      >
                        Excluir
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>

          <div className="text-right pt-2 text-[10px] text-gray-500 font-bold font-mono">
            {leaderboard.length} fã-clubes oficiais listados na temporada
          </div>
        </div>

      </div>

      {/* Guide/How to earn XP */}
      <div className="p-4 bg-zinc-950/40 rounded-2xl border border-white/5 space-y-2.5">
        <h5 className="text-[11px] font-black uppercase text-gray-300 tracking-wider flex items-center gap-1.5 font-sans">
          <Award className="w-4 h-4 text-orange-400 animate-pulse" />
          Como ganhar XP e evoluir seu Nível de Explorador?
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-300">
          <div className="space-y-1 bg-black/10 p-2.5 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 text-[11px] font-black text-yellow-400">
              <span>⭐ Avaliar Novidades & Spoilers (+150 XP)</span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Avalie os spoilers com notas de 1 a 5 estrelas no modo imersivo para expandir seus pontos!
            </p>
          </div>
          <div className="space-y-1 bg-black/10 p-2.5 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 text-[11px] font-black text-pink-400">
              <span>🔮 Concordar com Teorias (+80 XP)</span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Dê opiniões ou concorde com as teorias dos fãs registradas para levantar novos bônus.
            </p>
          </div>
          <div className="space-y-1 bg-black/10 p-2.5 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 text-[11px] font-black text-emerald-400">
              <span>🟢 Seguir Canal do WhatsApp (+250 XP)</span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Acesse nosso canal oficial para acompanhar spoilers em tempo real e reivindicar mais pontos!
            </p>
          </div>
        </div>
      </div>

    </section>
  );
}
