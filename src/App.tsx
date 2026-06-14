import React, { useState, useEffect } from 'react';
import { INITIAL_NEWS } from './components/initialNews';
import { NewsItem, FeaturedVideo, Theory, ShortItem, PastSpoiler, AppNotification } from './types';
import CountdownWidget from './components/CountdownWidget';
import WhatsAppPromo from './components/WhatsAppPromo';
import AdminPanel from './components/AdminPanel';
import PromoCodeRedeemer from './components/PromoCodeRedeemer';
import FeaturedVideos from './components/FeaturedVideos';
import TheoriesSection from './components/TheoriesSection';
import BestShorts from './components/BestShorts';
import FanLevelSection from './components/FanLevelSection';
import PastSpoilersSection from './components/PastSpoilersSection';
import { 
  Sparkles, 
  Settings, 
  MessageCircle, 
  ExternalLink, 
  Gamepad2, 
  Volume2, 
  VolumeX, 
  Star, 
  Info, 
  Trophy, 
  Users,
  BellRing,
  Lock,
  LogOut,
  Flame,
  Award,
  Compass,
  Menu,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { playTapSound, playLevelUpSound, playSuccessSound } from './utils/audio';

// Import Firebase config & helpers
import { auth, db, googleProvider, OperationType, handleFirestoreError } from './firebase';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';

export default function App() {
  const [newsList, setNewsList] = useState<NewsItem[]>(() => {
    try {
      const saved = localStorage.getItem('pkxd_central_news');
      if (saved && saved !== 'undefined') {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn("Error reading pkxd_central_news from localStorage:", e);
    }
    return INITIAL_NEWS;
  });

  const [spoilerTitle, setSpoilerTitle] = useState(() => {
    try {
      return localStorage.getItem('pkxd_spoiler_title') || 'Aguardando Próximos Spoilers! 🔮';
    } catch (e) {
      return 'Aguardando Próximos Spoilers! 🔮';
    }
  });

  const [spoilerDesc, setSpoilerDesc] = useState(() => {
    try {
      return localStorage.getItem('pkxd_spoiler_desc') || 'Ainda não temos spoilers ativos para esta semana. Fique atento ao nosso canal no WhatsApp para novidades e acompanhe a contagem regressiva toda segunda às 17h30!';
    } catch (e) {
      return 'Ainda não temos spoilers ativos para esta semana. Fique atento ao nosso canal no WhatsApp para novidades e acompanhe a contagem regressiva toda segunda às 17h30!';
    }
  });

  const [spoilerImage, setSpoilerImage] = useState(() => {
    try {
      return localStorage.getItem('pkxd_spoiler_image') || '';
    } catch (e) {
      return '';
    }
  });

  const [pastSpoilers, setPastSpoilers] = useState<PastSpoiler[]>([]);

  const [siteLogoUrl, setSiteLogoUrl] = useState(() => {
    try {
      return localStorage.getItem('pkxd_site_logo_url') || '';
    } catch (e) {
      return '';
    }
  });

  const [forceReveal, setForceReveal] = useState(() => {
    try {
      return localStorage.getItem('pkxd_force_reveal') === 'true';
    } catch (e) {
      return false;
    }
  });

  const [revealedAt, setRevealedAt] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('pkxd_spoiler_revealed_at');
      if (saved) {
        const parsed = parseInt(saved, 10);
        return isNaN(parsed) ? 0 : parsed;
      }
    } catch (e) {
      console.warn(e);
    }
    return 0;
  });

  const [pastSpoilerToEdit, setPastSpoilerToEdit] = useState<PastSpoiler | null>(null);
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);

  // State hooks for new components
  const [featuredList, setFeaturedList] = useState<FeaturedVideo[]>([]);
  const [theoriesList, setTheoriesList] = useState<Theory[]>([]);
  const [shortsList, setShortsList] = useState<ShortItem[]>([]);

  // State for alternative/extra countdown timer
  const [extraCountdownTitle, setExtraCountdownTitle] = useState('Spoiler Surpresa! 🔥');
  const [extraCountdownDate, setExtraCountdownDate] = useState('');
  const [extraCountdownEnabled, setExtraCountdownEnabled] = useState(false);

  // Authentication & Admin levels
  const [user, setUser] = useState<User | null>(() => {
    try {
      if (localStorage.getItem('pkxd_fallback_admin_logged') === 'true') {
        return {
          uid: 'admin_fallback',
          email: 'kawanyuri35@gmail.com',
          displayName: 'Kawanyuri (Admin)',
        } as any;
      }
    } catch (e) {}
    return null;
  });
  const [isAdmin, setIsAdmin] = useState(() => {
    try {
      if (localStorage.getItem('pkxd_fallback_admin_logged') === 'true') {
        return true;
      }
    } catch (e) {}
    return false;
  });
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Fallback passcode login states
  const [useBackupPasscode, setUseBackupPasscode] = useState(false);
  const [inputPasscode, setInputPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [googleAuthError, setGoogleAuthError] = useState<string | null>(null);

  const [soundEnabled, setSoundEnabled] = useState(false);
  const [fanLevel, setFanLevel] = useState(() => {
    try {
      const saved = localStorage.getItem('pkxd_fan_level');
      if (saved) {
        const parsed = parseInt(saved, 10);
        return isNaN(parsed) ? 1 : parsed;
      }
    } catch (e) {
      console.warn(e);
    }
    return 1;
  });
  
  const [newsToEdit, setNewsToEdit] = useState<NewsItem | null>(null);
  const [notifMessage, setNotifMessage] = useState<string | null>(null);

  // New delay & notification states
  const [isDelayed, setIsDelayed] = useState(false);
  const [delayMessage, setDelayMessage] = useState('');
  const [notificationList, setNotificationList] = useState<AppNotification[]>([]);
  const [isNotifOverlayOpen, setIsNotifOverlayOpen] = useState(false);
  const [hasNotificationPermission, setHasNotificationPermission] = useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission === 'granted';
    }
    return false;
  });

  // Fullscreen spoiler overlay state
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [fullscreenData, setFullscreenData] = useState<{title: string, desc: string, imageUrl?: string} | null>(null);

  // Sync auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        if (currentUser.email) {
          const email = currentUser.email.toLowerCase();
          if (email === 'kawanyuri35@gmail.com' || email === 'eukoosh@gmail.com') {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        } else {
          setIsAdmin(false);
        }
      } else {
        // If not authenticated via Google, check if we have fallback admin session in localStorage
        try {
          if (localStorage.getItem('pkxd_fallback_admin_logged') === 'true') {
            setIsAdmin(true);
            setUser({
              uid: 'admin_fallback',
              email: 'kawanyuri35@gmail.com',
              displayName: 'Kawanyuri (Admin)',
            } as any);
            return;
          }
        } catch (e) {}

        setIsAdmin(false);
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Realtime Firebase news listener
  useEffect(() => {
    const newsRef = collection(db, 'news');
    const unsubscribe = onSnapshot(newsRef, (snapshot) => {
      let list: NewsItem[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as NewsItem);
      });
      
      // Memory sort by id descending
      list.sort((a, b) => {
        const numA = parseInt(a.id);
        const numB = parseInt(b.id);
        if (!isNaN(numA) && !isNaN(numB)) {
          return numB - numA;
        }
        return b.id.localeCompare(a.id);
      });

      if (list.length > 0) {
        setNewsList(list);
        localStorage.setItem('pkxd_central_news', JSON.stringify(list));
      } else {
        // Fallback to defaults
        setNewsList(INITIAL_NEWS);
      }
    }, (error) => {
      console.warn("Could not fetch real-time news:", error);
    });

    return () => unsubscribe();
  }, []);

  // Realtime Firebase settings listener
  useEffect(() => {
    const settingsRef = doc(db, 'settings', 'app');
    const unsubscribe = onSnapshot(settingsRef, (snapshot) => {
      const defaultTitle = 'Aguardando Próximos Spoilers! 🔮';
      const defaultDesc = 'Ainda não temos spoilers ativos para esta semana. Fique atento ao nosso canal no WhatsApp para novidades e acompanhe a contagem regressiva toda segunda às 17h30!';

      if (snapshot.exists()) {
        const data = snapshot.data();
        
        // Use default if undefined/null/empty string to avoid getting stuck in a falsy stale local state
        const titleVal = (data.spoilerTitle !== undefined && data.spoilerTitle !== null) ? data.spoilerTitle : defaultTitle;
        setSpoilerTitle(titleVal);
        localStorage.setItem('pkxd_spoiler_title', titleVal);

        const descVal = (data.spoilerDesc !== undefined && data.spoilerDesc !== null) ? data.spoilerDesc : defaultDesc;
        setSpoilerDesc(descVal);
        localStorage.setItem('pkxd_spoiler_desc', descVal);

        const imgVal = (data.spoilerImageUrl !== undefined && data.spoilerImageUrl !== null) ? data.spoilerImageUrl : '';
        setSpoilerImage(imgVal);
        localStorage.setItem('pkxd_spoiler_image', imgVal);

        const logoVal = data.logoUrl !== undefined ? data.logoUrl : '';
        setSiteLogoUrl(logoVal);
        localStorage.setItem('pkxd_site_logo_url', logoVal);

        const forceVal = data.forceReveal !== undefined ? data.forceReveal : false;
        setForceReveal(forceVal);
        localStorage.setItem('pkxd_force_reveal', forceVal ? 'true' : 'false');

        const revealedVal = data.revealedAt !== undefined ? data.revealedAt : 0;
        setRevealedAt(revealedVal);
        localStorage.setItem('pkxd_spoiler_revealed_at', String(revealedVal));

        // Extra/Alternative Countdown
        setExtraCountdownTitle(data.extraCountdownTitle !== undefined ? data.extraCountdownTitle : '');
        setExtraCountdownDate(data.extraCountdownDate !== undefined ? data.extraCountdownDate : '');
        setExtraCountdownEnabled(data.extraCountdownEnabled !== undefined ? data.extraCountdownEnabled : false);

        // Delayed Alerts
        setIsDelayed(data.isDelayed !== undefined ? data.isDelayed : false);
        setDelayMessage(data.delayMessage !== undefined ? data.delayMessage : '');
      } else {
        // Document does not exist or has been deleted - fallback to defaults immediately
        setSpoilerTitle(defaultTitle);
        localStorage.setItem('pkxd_spoiler_title', defaultTitle);
        setSpoilerDesc(defaultDesc);
        localStorage.setItem('pkxd_spoiler_desc', defaultDesc);
        setSpoilerImage('');
        localStorage.setItem('pkxd_spoiler_image', '');
        setSiteLogoUrl('');
        localStorage.setItem('pkxd_site_logo_url', '');
        setForceReveal(false);
        localStorage.setItem('pkxd_force_reveal', 'false');
        setRevealedAt(0);
        localStorage.setItem('pkxd_spoiler_revealed_at', '0');
        setExtraCountdownTitle('');
        setExtraCountdownDate('');
        setExtraCountdownEnabled(false);
        setIsDelayed(false);
        setDelayMessage('');
      }
    }, (error) => {
      console.warn("Could not fetch real-time settings:", error);
    });

    return () => unsubscribe();
  }, []);

  // Realtime Notifications subscription
  useEffect(() => {
    const ref = collection(db, 'notifications');
    const unsubscribe = onSnapshot(ref, (snapshot) => {
      const list: AppNotification[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as AppNotification);
      });
      list.sort((a, b) => b.createdAt - a.createdAt);
      setNotificationList(list);

      // Trigger automatic high-contrast alert toast only if new notification is very recent of the last 15 seconds
      if (list.length > 0) {
        const latest = list[0];
        const ageInMs = Date.now() - latest.createdAt;
        if (ageInMs < 15000) {
          triggerAudio('success');
          // Let's set the message text
          setNotifMessage(`📢 ${latest.title.toUpperCase()}: ${latest.body}`);

          // Trigger native system notification if allowed on mobile or computer browsers
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(latest.title, {
                body: latest.body,
                tag: latest.id,
                icon: 'https://img.icons8.com/color/96/000000/bell.png'
              });
            } catch (err) {
              console.warn("Could not dispatch native browser notification:", err);
            }
          }

          // Auto clear after 8 seconds
          setTimeout(() => setNotifMessage(null), 8000);
        }
      }
    }, (error) => {
      console.warn("Could not fetch notifications:", error);
    });
    return () => unsubscribe();
  }, []);

  // Periodic checkout alert triggers (for Monday countdown)
  useEffect(() => {
    const checkAndNotifyCountdown = async () => {
      // Calculate target next Monday at 17:30
      const now = new Date();
      const targetDate = new Date();
      targetDate.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7));
      targetDate.setHours(17, 30, 0, 0);
      
      // If today is Monday and already past 17:30, target is next Monday
      if (now.getDay() === 1 && (now.getHours() > 17 || (now.getHours() === 17 && now.getMinutes() >= 30))) {
        targetDate.setDate(targetDate.getDate() + 7);
      }

      const diffMs = targetDate.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      // We only notify if we are within certain intervals, say 24h, 3h, 1h, or 10m
      let notificationKey = '';
      let messageBody = '';

      if (diffHours > 0) {
        if (diffHours <= 0.16) { // < 10 mins
          notificationKey = 'countdown_10m';
          messageBody = '🚨 ATENÇÃO! Falta menos de 10 minutos para revelar os Spoilers PK XD! Fique atualizado!';
        } else if (diffHours <= 1.0) { // < 1 hour
          notificationKey = 'countdown_1h';
          messageBody = '⏰ FALTAM 60 MINUTOS! A carga de spoilers está quase completa! Entre no site para acompanhar.';
        } else if (diffHours <= 3.0) { // < 3 hours
          notificationKey = 'countdown_3h';
          messageBody = '🔥 SÓ MAIS 3 HORAS! Preparados para os novos itens e pacotes incríveis? Faltam 3h!';
        }
      }

      if (notificationKey && messageBody) {
        const lastSent = localStorage.getItem(`last_notif_${notificationKey}`);
        const todayStr = now.toDateString(); // only notify once per day of this bracket
        if (lastSent !== todayStr) {
          // If we are admin, let's auto-push this countdown alert!
          if (isAdmin) {
            try {
              const notifId = Date.now().toString();
              const notifRef = doc(db, 'notifications', notifId);
              await setDoc(notifRef, {
                id: notifId,
                title: '⏰ CONTAGEM REGRESSIVA!',
                body: messageBody,
                type: 'countdown_alert',
                createdAt: Date.now()
              });
              localStorage.setItem(`last_notif_${notificationKey}`, todayStr);
            } catch (e) {
              console.warn("Could not dispatch auto countdown:", e);
            }
          } else {
            // Local fallback alarm for regular users!
            triggerAudio('tap');
            setNotifMessage(`📢 ALERTA: ${messageBody}`);
            setTimeout(() => setNotifMessage(null), 8500);
            localStorage.setItem(`last_notif_${notificationKey}`, todayStr);
          }
        }
      }
    };

    // run on startup
    checkAndNotifyCountdown();

    // and check every 5 minutes
    const interval = setInterval(checkAndNotifyCountdown, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  // Realtime Featured Videos subscription
  useEffect(() => {
    const ref = collection(db, 'featured_videos');
    const unsubscribe = onSnapshot(ref, (snapshot) => {
      const list: FeaturedVideo[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as FeaturedVideo);
      });
      list.sort((a, b) => b.createdAt - a.createdAt);
      setFeaturedList(list);
    }, (error) => {
      console.warn("Could not fetch featured videos:", error);
    });
    return () => unsubscribe();
  }, []);

  // Realtime Theories subscription
  useEffect(() => {
    const ref = collection(db, 'theories');
    const unsubscribe = onSnapshot(ref, (snapshot) => {
      const list: Theory[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as Theory);
      });
      list.sort((a, b) => b.createdAt - a.createdAt);
      setTheoriesList(list);
    }, (error) => {
      console.warn("Could not fetch theories:", error);
    });
    return () => unsubscribe();
  }, []);

  // Realtime curated Shorts subscription
  useEffect(() => {
    const ref = collection(db, 'shorts');
    const unsubscribe = onSnapshot(ref, (snapshot) => {
      const list: ShortItem[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as ShortItem);
      });
      list.sort((a, b) => b.createdAt - a.createdAt);
      setShortsList(list);
    }, (error) => {
      console.warn("Could not fetch shorts:", error);
    });
    return () => unsubscribe();
  }, []);

  // Realtime Past Spoilers subscription
  useEffect(() => {
    const ref = collection(db, 'past_spoilers');
    const unsubscribe = onSnapshot(ref, (snapshot) => {
      const list: PastSpoiler[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as PastSpoiler);
      });
      list.sort((a, b) => b.createdAt - a.createdAt);
      setPastSpoilers(list);
    }, (error) => {
      console.warn("Could not fetch past spoilers:", error);
    });
    return () => unsubscribe();
  }, []);

  // Audio utility wrapper
  const triggerAudio = (type: 'tap' | 'success' | 'levelUp') => {
    if (!soundEnabled) return;
    if (type === 'tap') playTapSound();
    if (type === 'success') playSuccessSound();
    if (type === 'levelUp') playLevelUpSound();
  };

  // Channel constants
  const WHATSAPP_CHANNEL_URL = "https://whatsapp.com/channel/0029Vb8EhsU7j6fzZDRAup3Z";
  const LOGO_ORIGINAL_URL = "https://photos.app.goo.gl/DLW4xhJyQiprwdAQ7";

  // Sign in with Google
  const handleLogin = async () => {
    setIsAuthenticating(true);
    setGoogleAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      triggerAudio('success');
      setNotifMessage(`Bem-vindo, ${result.user.displayName || 'Admin'}! 🎉`);
      setTimeout(() => setNotifMessage(null), 4000);
    } catch (error: any) {
      console.error("Login failed:", error);
      let errorMsg = error?.message || String(error);
      if (error?.code === 'auth/unauthorized-domain' || errorMsg.includes('unauthorized-domain') || errorMsg.includes('domain-not-authorized')) {
        errorMsg = `⚠️ DOMÍNIO NÃO AUTORIZADO NO FIREBASE! O domínio atual do seu site ("${window.location.hostname}") não está cadastrado ou autorizado no seu projeto do Firebase. Você precisa adicionar "${window.location.hostname}" na lista de Domínios Autorizados nas configurações do seu Firebase Console (Authentication > Configurações > Domínios Autorizados) para liberar o login com o Google!`;
      }
      setGoogleAuthError(errorMsg);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handlePasscodeLogin = () => {
    const validPasscodes = ['pkxd2026', 'admincentral', 'kawanyuri', 'centralpkxd'];
    if (validPasscodes.includes(inputPasscode.trim().toLowerCase())) {
      try {
        localStorage.setItem('pkxd_fallback_admin_logged', 'true');
      } catch (e) {}
      setIsAdmin(true);
      setUser({
        uid: 'admin_fallback',
        email: 'kawanyuri35@gmail.com',
        displayName: 'Kawanyuri (Admin)',
      } as any);
      triggerAudio('success');
      setNotifMessage("Senha de Admin correta! Acesso liberado! 🎉");
      setInputPasscode('');
      setPasscodeError('');
      setUseBackupPasscode(false);
      setTimeout(() => setNotifMessage(null), 4000);
    } else {
      setPasscodeError("Código de acesso incorreto. Tente novamente!");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      try {
        localStorage.removeItem('pkxd_fallback_admin_logged');
      } catch (e) {}
      setUser(null);
      setIsAdmin(false);
      triggerAudio('tap');
      setNotifMessage("Você deslogou com sucesso!");
      setTimeout(() => setNotifMessage(null), 4000);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Create news
  const handleAddNews = async (newPost: Omit<NewsItem, 'id'>) => {
    const docId = Date.now().toString();
    const fresh: NewsItem = {
      ...newPost,
      id: docId
    };
    try {
      const docRef = doc(db, 'news', docId);
      await setDoc(docRef, fresh);
      triggerAudio('success');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `news/${docId}`);
    }
  };

  // Edit existing news
  const handleEditNewsRequest = (item: NewsItem) => {
    setNewsToEdit(item);
    // Scroll smoothly to admin panel
    document.getElementById('admin-panel')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSaveEdit = async (updatedItem: NewsItem) => {
    try {
      const docRef = doc(db, 'news', updatedItem.id);
      await setDoc(docRef, updatedItem);
      setNewsToEdit(null);
      triggerAudio('success');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `news/${updatedItem.id}`);
    }
  };

  // Delete news
  const handleDeleteNews = async (id: string) => {
    try {
      const docRef = doc(db, 'news', id);
      await deleteDoc(docRef);
      triggerAudio('tap');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `news/${id}`);
    }
  };

  // Update spoiler settings and add to history
  const handleUpdateSpoilerSettings = async (title: string, desc: string, imageUrl?: string, forceRevealActive: boolean = false) => {
    try {
      const docRef = doc(db, 'settings', 'app');
      await setDoc(docRef, {
        spoilerTitle: title,
        spoilerDesc: desc,
        spoilerImageUrl: imageUrl || '',
        forceReveal: forceRevealActive,
        revealedAt: Date.now()
      }, { merge: true });

      // Save a copy to history so it doesn't get lost as we change further spoilers
      const pastId = Date.now().toString();
      const pastRef = doc(db, 'past_spoilers', pastId);
      await setDoc(pastRef, {
        id: pastId,
        title,
        description: desc,
        imageUrl: imageUrl || '',
        createdAt: Date.now()
      });

      // Automatically send a push notification document for the new spoiler/story publication!
      const notifId = Date.now().toString();
      const notifRef = doc(db, 'notifications', notifId);
      await setDoc(notifRef, {
        id: notifId,
        title: forceRevealActive ? '⚡ NOVO SPOILER LIBERADO AGORA!' : '🔮 AGENDAMENTO DE NOVO SPOILER!',
        body: `Confira já os novos spoilers oficiais: ${title}`,
        type: 'story_published',
        createdAt: Date.now()
      });

      triggerAudio('success');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/app');
    }
  };

  // Direct insert to past spoilers archive without touching main active spoiler
  const handleDirectArchivePastSpoiler = async (title: string, desc: string, imageUrl?: string) => {
    try {
      const pastId = Date.now().toString();
      const pastRef = doc(db, 'past_spoilers', pastId);
      await setDoc(pastRef, {
        id: pastId,
        title,
        description: desc,
        imageUrl: imageUrl || '',
        createdAt: Date.now()
      });
      triggerAudio('success');
      setNotifMessage("Spoiler arquivado com sucesso diretamente em Spoilers Anteriores! 🔮");
      setTimeout(() => setNotifMessage(null), 4000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `past_spoilers/manual_${Date.now()}`);
    }
  };

  // Move current active spotlight spoiler to past archives and clear it
  const handleArchiveAndClearActiveSpoiler = async (title: string, desc: string, imageUrl: string) => {
    try {
      const isDefault = !title || 
        title === 'Aguardando Próximos Spoilers! 🔮' || 
        title.toLowerCase().includes('aguardando') ||
        title.toLowerCase().includes('sem spoiler') ||
        title.toLowerCase().includes('nenhum spoiler');

      if (isDefault) {
        setNotifMessage("Não há nenhum spoiler real ativo para arquivar no momento!");
        setTimeout(() => setNotifMessage(null), 4000);
        return;
      }

      // 1. Save to past spoilers
      const pastId = Date.now().toString();
      const pastRef = doc(db, 'past_spoilers', pastId);
      await setDoc(pastRef, {
        id: pastId,
        title: title,
        description: desc,
        imageUrl: imageUrl || '',
        createdAt: Date.now()
      });

      // 2. Clear active spoiler settings
      const defaultTitle = 'Aguardando Próximos Spoilers! 🔮';
      const defaultDesc = 'Ainda não temos spoilers ativos para esta semana. Fique atento ao nosso canal no WhatsApp para novidades e acompanhe a contagem regressiva toda segunda às 17h30!';
      const docRef = doc(db, 'settings', 'app');
      await setDoc(docRef, {
        spoilerTitle: defaultTitle,
        spoilerDesc: defaultDesc,
        spoilerImageUrl: '',
        forceReveal: false,
        revealedAt: 0
      }, { merge: true });

      // Update local states & storage
      setSpoilerTitle(defaultTitle);
      localStorage.setItem('pkxd_spoiler_title', defaultTitle);
      setSpoilerDesc(defaultDesc);
      localStorage.setItem('pkxd_spoiler_desc', defaultDesc);
      setSpoilerImage('');
      localStorage.setItem('pkxd_spoiler_image', '');
      setForceReveal(false);
      localStorage.setItem('pkxd_force_reveal', 'false');

      triggerAudio('success');
      setNotifMessage("Destaque arquivado com sucesso e limpo do site! 📦");
      setTimeout(() => setNotifMessage(null), 4000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'archive_and_clear_active_spoiler');
    }
  };

  // Delete active spoiler directly from the site without archiving it
  const handleDeleteActiveSpoiler = async () => {
    try {
      const defaultTitle = 'Aguardando Próximos Spoilers! 🔮';
      const defaultDesc = 'Ainda não temos spoilers ativos para esta semana. Fique atento ao nosso canal no WhatsApp para novidades e acompanhe a contagem regressiva toda segunda às 17h30!';
      const docRef = doc(db, 'settings', 'app');
      await setDoc(docRef, {
        spoilerTitle: defaultTitle,
        spoilerDesc: defaultDesc,
        spoilerImageUrl: '',
        forceReveal: false,
        revealedAt: 0
      }, { merge: true });

      // Clean local React state and storage
      setSpoilerTitle(defaultTitle);
      localStorage.setItem('pkxd_spoiler_title', defaultTitle);
      setSpoilerDesc(defaultDesc);
      localStorage.setItem('pkxd_spoiler_desc', defaultDesc);
      setSpoilerImage('');
      localStorage.setItem('pkxd_spoiler_image', '');
      setForceReveal(false);
      localStorage.setItem('pkxd_force_reveal', 'false');
      setRevealedAt(0);
      localStorage.setItem('pkxd_spoiler_revealed_at', '0');

      triggerAudio('success');
      setNotifMessage("Spoiler atual excluído e limpo com sucesso do site! ❌");
      setTimeout(() => setNotifMessage(null), 4000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'delete_active_spoiler');
    }
  };

  // Update spoiler delayed status
  const handleUpdateDelay = async (delayed: boolean, message: string) => {
    try {
      const docRef = doc(db, 'settings', 'app');
      await setDoc(docRef, {
        isDelayed: delayed,
        delayMessage: message
      }, { merge: true });

      // Automatically send alert notification if delayed is activated
      if (delayed) {
        const notifId = Date.now().toString();
        const notifRef = doc(db, 'notifications', notifId);
        await setDoc(notifRef, {
          id: notifId,
          title: '⚠️ ALERT: SPOILERS ADIADOS!',
          body: message || 'Os spoilers oficiais do PK XD atrasaram um pouquinho do cronograma original.',
          type: 'delayed_alert',
          createdAt: Date.now()
        });
      }

      triggerAudio('success');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/app');
    }
  };

  // Disparar notificação manual para celular
  const handleSendCustomNotification = async (title: string, body: string, type: 'story_published' | 'countdown_alert' | 'custom_push' | 'delayed_alert') => {
    const notifId = Date.now().toString();
    try {
      const notifRef = doc(db, 'notifications', notifId);
      await setDoc(notifRef, {
        id: notifId,
        title,
        body,
        type,
        createdAt: Date.now()
      });
      triggerAudio('success');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `notifications/${notifId}`);
    }
  };

  // Save edits of past archive spoilers
  const handleSaveEditPastSpoiler = async (id: string, title: string, desc: string, imageUrl?: string) => {
    try {
      const docRef = doc(db, 'past_spoilers', id);
      await setDoc(docRef, {
        id,
        title,
        description: desc,
        imageUrl: imageUrl || ''
      }, { merge: true });
      
      setPastSpoilerToEdit(null);
      triggerAudio('success');
      setNotifMessage("Alterações no spoiler antigo arquivadas!");
      setTimeout(() => setNotifMessage(null), 4000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `past_spoilers/${id}`);
    }
  };

  // Delete past spoiler
  const handleDeletePastSpoiler = async (id: string) => {
    try {
      const docRef = doc(db, 'past_spoilers', id);
      await deleteDoc(docRef);
      triggerAudio('tap');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `past_spoilers/${id}`);
    }
  };

  // Update logo url
  const handleUpdateLogoSettings = async (url: string) => {
    try {
      const docRef = doc(db, 'settings', 'app');
      await setDoc(docRef, {
        logoUrl: url
      }, { merge: true });
      triggerAudio('success');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/app');
    }
  };

  // Featured video handlers
  const handleAddFeaturedVideo = async (video: Omit<FeaturedVideo, 'id' | 'createdAt'>) => {
    const id = Date.now().toString();
    try {
      const docRef = doc(db, 'featured_videos', id);
      await setDoc(docRef, { ...video, id, createdAt: Date.now() });
      triggerAudio('success');
    } catch (err) {
      console.error("Error adding featured video:", err);
    }
  };

  const handleDeleteFeaturedVideo = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'featured_videos', id));
      triggerAudio('tap');
    } catch (err) {
      console.error("Error deleting featured video:", err);
    }
  };

  // Theory handlers
  const handleAddTheory = async (theory: Omit<Theory, 'id' | 'likes' | 'createdAt'>) => {
    const id = Date.now().toString();
    try {
      const docRef = doc(db, 'theories', id);
      await setDoc(docRef, { ...theory, id, likes: 0, createdAt: Date.now() });
      triggerAudio('success');
    } catch (err) {
      console.error("Error adding theory:", err);
    }
  };

  const handleLikeTheory = async (id: string) => {
    const theory = theoriesList.find(t => t.id === id);
    if (!theory) return;
    try {
      await setDoc(doc(db, 'theories', id), { likes: (theory.likes || 0) + 1 }, { merge: true });
    } catch (err) {
      console.error("Error liking theory:", err);
    }
  };

  const handleDeleteTheory = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'theories', id));
      triggerAudio('tap');
    } catch (err) {
      console.error("Error deleting theory:", err);
    }
  };

  // Curated Shorts handlers
  const handleAddShort = async (short: Omit<ShortItem, 'id' | 'createdAt'>) => {
    const id = Date.now().toString();
    try {
      const docRef = doc(db, 'shorts', id);
      await setDoc(docRef, { ...short, id, createdAt: Date.now() });
      triggerAudio('success');
    } catch (err) {
      console.error("Error adding short:", err);
    }
  };

  const handleDeleteShort = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'shorts', id));
      triggerAudio('tap');
    } catch (err) {
      console.error("Error deleting short:", err);
    }
  };

  // Extra timer details handler
  const handleUpdateExtraCountdown = async (title: string, date: string, enabled: boolean) => {
    try {
      const docRef = doc(db, 'settings', 'app');
      await setDoc(docRef, {
        extraCountdownTitle: title,
        extraCountdownDate: date,
        extraCountdownEnabled: enabled
      }, { merge: true });
      triggerAudio('success');
    } catch (err) {
      console.error("Error updating extra countdown:", err);
    }
  };

  // Clear / restore default backup list
  const handleResetToDefaults = async () => {
    try {
      // Restore Cloud configuration setting defaults
      const docRef = doc(db, 'settings', 'app');
      await setDoc(docRef, {
        logoUrl: '',
        spoilerTitle: 'Aguardando Próximos Spoilers! 🔮',
        spoilerDesc: 'Ainda não temos spoilers ativos para esta semana. Fique atento ao nosso canal no WhatsApp para novidades e acompanhe a contagem regressiva toda segunda às 17h30!',
        spoilerImageUrl: '',
        forceReveal: false,
        revealedAt: 0
      }, { merge: true });

      // For news, empty or add default items to DB
      for (const item of INITIAL_NEWS) {
        await setDoc(doc(db, 'news', item.id), item);
      }

      setNewsToEdit(null);
      triggerAudio('levelUp');
    } catch (err) {
      console.error("Error resetting defaults:", err);
    }
  };

  // Interactive leveling feature
  const handleUpgradeLevel = () => {
    const nextLevel = fanLevel + 1;
    setFanLevel(nextLevel);
    localStorage.setItem('pkxd_fan_level', nextLevel.toString());
    triggerAudio('levelUp');
    
    // Show high-quality flash notification
    setNotifMessage(`LEVEL UP! Você subiu para o Nível de Fã ${nextLevel}! 🌟`);
    setTimeout(() => setNotifMessage(null), 4000);
  };

  return (
    <div id="pkxd-app-root" className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-yellow-400 selection:text-black pb-16 relative overflow-x-hidden bg-pkxd-texture">
      
      {/* Premium ambient space backdrop glows */}
      <div className="absolute top-1/4 right-[10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full filter blur-[120px] pointer-events-none select-none" />
      <div className="absolute bottom-1/3 left-[5%] w-[450px] h-[450px] bg-pink-500/10 rounded-full filter blur-[150px] pointer-events-none select-none" />
      <div className="absolute top-[80%] right-[5%] w-[400px] h-[400px] bg-cyan-400/10 rounded-full filter blur-[140px] pointer-events-none select-none" />

      {/* Upper Micro banner for System Alerts/Gamer Levels */}
      <div className="bg-gradient-to-r from-purple-800 via-pink-600 to-purple-900 py-2.5 px-4 text-center text-white text-xs font-bold leading-tight flex flex-wrap items-center justify-center gap-3 shadow-md relative z-30 select-none border-b-2 border-white/10">
        <span className="flex items-center gap-1">
          <Trophy className="w-4 h-4 text-yellow-300 fill-yellow-300" />
          Nível de Explorador: <strong className="text-yellow-300">Fã Lvl {fanLevel}</strong>
        </span>
        <button 
          onClick={handleUpgradeLevel}
          className="bg-black/40 hover:bg-black/60 border border-white/20 active:scale-95 duration-100 p-1 px-3.5 rounded-full text-[10px] font-black uppercase tracking-wider text-yellow-300 hover:text-white cursor-pointer"
        >
          ⚡ Ganhar XP Grátis!
        </button>
        <span className="opacity-40 font-mono hidden md:inline">|</span>
        <span className="hidden md:inline text-[11px] font-mono text-pink-100">
          Notícias atualizadas em tempo real para fãs do PK XD
        </span>
      </div>

      {/* Floating interactive alerts display */}
      {notifMessage && (
        <div id="floating-celebration" className="fixed bottom-6 right-6 z-50 max-w-sm bg-gradient-to-br from-yellow-400 to-pink-500 text-black font-sans font-black p-4 rounded-2xl border-4 border-white shadow-[0_12px_24px_rgba(0,0,0,0.4)] animate-bounce text-left flex items-start gap-3">
          <BellRing className="w-6 h-6 flex-shrink-0 animate-swing text-purple-900" />
          <div>
            <h5 className="text-[11px] font-mono tracking-widest text-purple-950 uppercase">Conquista Central!</h5>
            <p className="text-sm text-purple-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)] leading-tight">{notifMessage}</p>
          </div>
        </div>
      )}

      {/* Floating Sound Controller Utility */}
      <div className="fixed bottom-6 left-6 z-40">
        <button 
          onClick={() => {
            setSoundEnabled(!soundEnabled);
            if (!soundEnabled) {
              // Immediately test audio if turning on
              try {
                const actx = new (window.AudioContext || (window as any).webkitAudioContext)();
                const osc = actx.createOscillator();
                osc.connect(actx.destination);
                osc.frequency.setValueAtTime(440, actx.currentTime);
                osc.start();
                osc.stop(actx.currentTime + 0.1);
              } catch(e) {}
            }
          }}
          className={`p-3 rounded-full hover:scale-105 active:scale-95 duration-100 transition-all shadow-xl cursor-pointer border-2 ${
            soundEnabled 
              ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-400' 
              : 'bg-purple-900 hover:bg-purple-950 text-purple-400 border-purple-800'
          }`}
          title={soundEnabled ? "Desativar efeitos sonoros" : "Ativar efeitos sonoros"}
        >
          {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation Header - Matches the gorgeous solid PK XD Purple brand header from screenshot */}
      <nav id="nav-header" className="sticky top-0 z-20 bg-purple-600 border-b-4 border-purple-800 select-none py-3.5 px-4 sm:px-6 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo representation */}
          <div className="flex items-center gap-3">
            {siteLogoUrl ? (
              <img 
                src={siteLogoUrl} 
                alt="Logo PK XD Central" 
                className="w-10 h-10 object-cover rounded-2xl border-2 border-white shadow-lg transform rotate-[-3deg] flex-shrink-0"
                onError={(e) => {
                  // Fallback if URL is broken or not direct
                  (e.target as any).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-500 to-yellow-450 border-2 border-white flex items-center justify-center font-sans font-black text-white text-lg tracking-wider shadow-lg transform rotate-[-3deg] flex-shrink-0">
                PC
              </div>
            )}
            <div>
              <h1 className="font-sans font-black text-xl sm:text-2xl tracking-tighter text-white uppercase drop-shadow-[0_2px_0_rgba(0,0,0,0.4)] transform skew-x-[-2deg]">
                PKXD <span className="text-yellow-300">Central</span>
              </h1>
              <p className="font-sans text-[9px] sm:text-[10px] text-purple-200 font-extrabold uppercase tracking-widest leading-none">
                Notícias, Spoilers e Códigos!
              </p>
            </div>
          </div>

          {/* Action Links */}
          <div className="flex items-center gap-2">
            {/* Notification center bell with badge! */}
            <button 
              type="button"
              onClick={() => {
                triggerAudio('tap');
                setIsNotifOverlayOpen(!isNotifOverlayOpen);
              }}
              className="bg-purple-800 border-2 border-purple-500/50 p-2.5 px-3 rounded-2xl text-yellow-300 hover:bg-purple-900 transition-all cursor-pointer relative flex items-center gap-1.5 text-[11px] font-extrabold shadow-md"
              title="Central de Notificações Recentes"
            >
              <BellRing className="w-3.5 h-3.5 animate-swing" />
              {notificationList.length > 0 && (
                <span className="bg-pink-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full border border-purple-950">
                  {notificationList.length}
                </span>
              )}
            </button>

            {/* Admin toggle Button design */}
            <button
              onClick={() => {
                triggerAudio('tap');
                setShowAdminPanel(!showAdminPanel);
              }}
              className={`p-2.5 px-3 sm:px-4.5 rounded-2xl border font-sans text-[11px] font-black tracking-wide uppercase transition-all duration-150 cursor-pointer flex items-center gap-1.5 shadow-md ${
                showAdminPanel 
                  ? 'bg-yellow-400 text-purple-950 border-yellow-250' 
                  : 'bg-purple-800 text-gray-150 border-purple-500/50 hover:bg-purple-900'
              }`}
            >
              <Settings className={`w-3.5 h-3.5 ${showAdminPanel ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{showAdminPanel ? 'Fechar Painel' : 'Modo Admin'}</span>
            </button>
          </div>

        </div>
      </nav>

      {/* Hero Header Area */}
      <header id="masthead-hero" className="relative overflow-hidden py-12 md:py-16 px-4 bg-gradient-to-b from-purple-800/45 via-slate-950/80 to-slate-950 select-none">
        
        {/* Neon Glow spots */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-72 h-72 bg-purple-500/20 rounded-full filter blur-3xl pointer-events-none" />
        
        <div className="max-w-3xl mx-auto text-center space-y-4 relative z-10">
          
          {/* Logo badge / Floating decoration */}
          <div className="inline-flex items-center gap-2 bg-pink-500/10 border-2 border-pink-500/40 px-4 py-1.5 rounded-full text-pink-400 font-mono text-[11px] font-extrabold uppercase tracking-widest animate-pulse">
            <Gamepad2 className="w-4 h-4 fill-pink-400" />
            Parceiro Fã Clube Oficial
          </div>

          {/* Headline Display */}
          <h2 className="font-sans font-black text-3xl sm:text-5xl md:text-6xl tracking-tight text-white uppercase leading-[1.1] drop-shadow-[0_2px_10px_rgba(34,211,238,0.2)]">
            O Universo de PK XD <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-pink-400 to-yellow-300">
              Na Velocidade Máxima!
            </span>
          </h2>

          {/* Subtitle description */}
          <p className="font-sans text-sm sm:text-base text-gray-300 leading-relaxed max-w-xl mx-auto">
            Seja bem-vindo ao portal fan-hub do <strong>PKXD Central</strong>! Fique ligado nas datas, resgate as joias secretas, junte-se à nossa gigante comunidade do WhatsApp e veja as revelações de spoilers toda segunda-feira.
          </p>

          {/* WhatsApp Direct CTA mini-badge */}
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <a 
              href={WHATSAPP_CHANNEL_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => triggerAudio('levelUp')}
              className="inline-flex items-center gap-2 bg-[#25D366]/20 border-2 border-[#25D366]/60 text-[#25D366] font-sans font-black text-xs p-2.5 px-5 rounded-full hover:scale-[1.03] transition-all cursor-pointer shadow-lg"
            >
              <MessageCircle className="w-4 h-4 fill-[#25D366]" />
              Acessar Canal no WhatsApp! 🚀
            </a>
          </div>

        </div>
      </header>

      {/* Main Grid Area */}
      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
        
        {/* Admin Panel / Google Login Area */}
        {showAdminPanel && (
          <div className="animate-scale-up duration-150" id="admin-panel">
            {isAdmin ? (
              <div className="space-y-4 text-left">
                {/* Admin Welcome Badge */}
                <div className="bg-emerald-500/10 border-2 border-emerald-500/30 p-4 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 text-left shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
                      A
                    </div>
                    <div>
                      <h4 className="font-sans font-black text-white text-sm sm:text-base uppercase tracking-wide">
                        PAINEL DE CONTROLE CENTRAL ATIVO
                      </h4>
                      <p className="font-sans text-[11px] text-emerald-300">
                        Acesso autorizado! Todas as suas publicações e configurações de spoilers serão atualizadas instantaneamente na nuvem em tempo real.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-400/20 hover:bg-red-400/30 text-red-300 hover:text-white rounded-xl text-xs font-black uppercase transition-all tracking-wider border border-red-500/30 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sair</span>
                  </button>
                </div>

                <AdminPanel 
                  onAddNews={handleAddNews}
                  onUpdateSpoiler={handleUpdateSpoilerSettings}
                  activeSpoilerTitle={spoilerTitle}
                  activeSpoilerDesc={spoilerDesc}
                  activeSpoilerImage={spoilerImage}
                  activeSpoilerForceReveal={forceReveal}
                  onResetToDefaults={handleResetToDefaults}
                  newsToEdit={newsToEdit}
                  onCancelEdit={() => setNewsToEdit(null)}
                  onSaveEdit={handleSaveEdit}
                  siteLogoUrl={siteLogoUrl}
                  onUpdateLogo={handleUpdateLogoSettings}
                  // Added features handlers
                  onAddFeaturedVideo={handleAddFeaturedVideo}
                  onAddTheory={handleAddTheory}
                  onAddShort={handleAddShort}
                  onUpdateExtraCountdown={handleUpdateExtraCountdown}
                  activeExtraCountdownTitle={extraCountdownTitle}
                  activeExtraCountdownDate={extraCountdownDate}
                  activeExtraCountdownEnabled={extraCountdownEnabled}
                  // Past spoiler editing support
                  pastSpoilerToEdit={pastSpoilerToEdit}
                  onSaveEditPastSpoiler={handleSaveEditPastSpoiler}
                  onCancelEditPastSpoiler={() => setPastSpoilerToEdit(null)}
                  // Delay & notification managers
                  isDelayed={isDelayed}
                  delayMessage={delayMessage}
                  onUpdateDelay={handleUpdateDelay}
                  onSendCustomNotification={handleSendCustomNotification}
                  onDirectArchivePastSpoiler={handleDirectArchivePastSpoiler}
                  onArchiveAndClearActiveSpoiler={handleArchiveAndClearActiveSpoiler}
                  onDeleteActiveSpoiler={handleDeleteActiveSpoiler}
                />
              </div>
            ) : (
              <div className="bg-zinc-900/90 border-2 border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 text-center relative overflow-hidden shadow-2xl text-left">
                {/* Light animations & neon decorations */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full filter blur-xl" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-500/10 rounded-full filter blur-xl" />

                <div className="relative z-10 space-y-5 max-w-xl mx-auto text-center">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-zinc-800 border border-white/10 flex items-center justify-center text-indigo-400 shadow-inner">
                    <Lock className="w-8 h-8 animate-pulse" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-sans font-black text-xl sm:text-2xl text-white uppercase tracking-wider">
                      🔑 MODO ADMINISTRADOR (CONEXÃO CLOUD)
                    </h3>
                  </div>

                  {user ? (
                    <div className="bg-red-500/15 border border-red-500/30 p-4 rounded-2xl text-left space-y-2 text-xs text-red-200">
                      <p className="font-bold">
                        ⚠️ Conta de Fã Detectada!
                      </p>
                      <p>
                        Você está autenticado como leitor de email <span className="font-mono text-white underline">{user.email}</span>, mas seu usuário não possui permissão de escrita de administrador no sistema. 
                      </p>
                      <p className="text-gray-400">
                        Se você for o proprietário deste portal, por favor faça login com o endereço de email do Administrador PK XD Central correspondente.
                      </p>
                    </div>
                  ) : (
                    <p className="font-sans text-xs text-gray-400 leading-relaxed">
                      Clique no botão para fazer login seguro com a conta Google PK XD oficial para gerenciar spoilers, shorts, novidades de transmissão e as teorias da semana!
                    </p>
                  )}

                  <div className="pt-2 flex flex-col items-center justify-center gap-4">
                    {user ? (
                      <button
                        onClick={handleLogout}
                        className="w-full sm:w-auto px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-sans font-black text-xs uppercase tracking-wider cursor-pointer border border-zinc-700"
                      >
                        Sair da Conta (Logout)
                      </button>
                    ) : (
                      <div className="w-full space-y-4">
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                          <button
                            onClick={handleLogin}
                            disabled={isAuthenticating}
                            className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-sans font-black text-xs sm:text-sm rounded-xl border-b-4 border-indigo-900 active:border-b-0 cursor-pointer shadow-lg transition-transform duration-100 flex items-center justify-center gap-2"
                          >
                            <Lock className="w-4 h-4" />
                            <span>{isAuthenticating ? 'ENTRANDO...' : 'LOGAR COM CONTA GOOGLE DO ADMIN'}</span>
                          </button>

                          <button
                            onClick={() => {
                              setUseBackupPasscode(!useBackupPasscode);
                              setPasscodeError('');
                            }}
                            className="w-full sm:w-auto px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-sans font-black text-xs uppercase tracking-wider cursor-pointer border border-zinc-700"
                          >
                            {useBackupPasscode ? 'Cancelar' : 'Entrar com Código PIN'}
                          </button>
                        </div>

                        {googleAuthError && (
                          <div className="max-w-md mx-auto p-4 bg-red-950/40 border border-red-500/30 rounded-2xl text-left space-y-2">
                            <div className="flex items-center gap-2 text-red-400 font-extrabold text-xs uppercase">
                              <AlertTriangle className="w-4 h-4" />
                              <span>Erro de Conexão</span>
                            </div>
                            <p className="text-gray-300 text-xs font-sans leading-relaxed">
                              {googleAuthError}
                            </p>
                            <p className="text-[11px] text-indigo-400 font-sans leading-relaxed mt-1">
                              💡 <strong>Dica:</strong> Se você estiver rodando em <strong>pkxdcentral.github.io</strong> ou em outro link customizado, siga o tutorial de **"Domínio Autorizado"** disponível na aba de Spoilers do seu Painel de Administrador (após logar usando o Código PIN) para resolver em 30 segundos!
                            </p>
                          </div>
                        )}

                        {useBackupPasscode && (
                          <div className="max-w-xs mx-auto p-4 bg-zinc-950/80 rounded-2xl border border-white/5 space-y-3">
                            <p className="text-zinc-400 text-[11px] font-sans">Digite um código PIN de administrador válido para conectar:</p>
                            <div className="flex gap-2">
                              <input
                                type="password"
                                placeholder="Código PIN de Admin"
                                value={inputPasscode}
                                onChange={(e) => setInputPasscode(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handlePasscodeLogin();
                                }}
                                className="bg-zinc-900 text-white placeholder-zinc-600 text-xs px-3 py-2 rounded-xl border border-white/10 focus:outline-none focus:border-indigo-500 w-full"
                              />
                              <button
                                onClick={handlePasscodeLogin}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold font-sans cursor-pointer"
                              >
                                Entrar
                              </button>
                            </div>
                            {passcodeError && (
                              <p className="text-red-400 text-[11px] font-sans text-left">{passcodeError}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dynamic Countdown clock Widget with optional alternative timer */}
        {(() => {
          // Check if the current spoiler highlight is active
          const isSpoilerActive = (() => {
            if (forceReveal) {
              if (revealedAt && Date.now() - revealedAt >= 60 * 60 * 1000) {
                return false;
              }
              return true;
            }

            const now = new Date();
            const mondayThisWeek = new Date(now);
            const dayOfWeek = now.getDay();
            const daysToMonday = (1 - dayOfWeek - 7) % 7;
            mondayThisWeek.setDate(now.getDate() + (dayOfWeek === 1 ? 0 : daysToMonday));
            mondayThisWeek.setHours(17, 30, 0, 0);

            const endWindow = new Date(mondayThisWeek);
            endWindow.setHours(18, 30, 0, 0); // exactly 1 hour window

            return now >= mondayThisWeek && now <= endWindow;
          })();

          // Do not filter out new/active spoilers so they appear instantly in Past Spoilers automatically
          const filteredPastSpoilers = pastSpoilers;

          return (
            <>
              <div className="max-w-4xl mx-auto" id="countdown-card-root">
                <CountdownWidget 
                  spoilerTitle={spoilerTitle}
                  spoilerDesc={spoilerDesc}
                  spoilerImageUrl={spoilerImage}
                  onReveal={() => triggerAudio('levelUp')}
                  extraCountdownTitle={extraCountdownTitle}
                  extraCountdownDate={extraCountdownDate}
                  extraCountdownEnabled={extraCountdownEnabled}
                  forceReveal={forceReveal}
                  revealedAt={revealedAt}
                  isDelayed={isDelayed}
                  delayMessage={delayMessage}
                  onOpenFullscreen={(title, desc, img) => {
                    setFullscreenData({ title, desc, imageUrl: img || '' });
                    setIsFullscreenOpen(true);
                  }}
                />
              </div>

              {/* Previous Spoilers Archive History list */}
              <div className="max-w-4xl mx-auto" id="past-spoilers-history-section-wrapper">
                <PastSpoilersSection 
                  spoilers={filteredPastSpoilers}
                  isAdmin={isAdmin}
                  onDelete={handleDeletePastSpoiler}
                  onEdit={(spoil) => {
                    setPastSpoilerToEdit(spoil);
                    // Scroll up to admin panel to see editing state
                    document.getElementById('admin-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                />
              </div>
            </>
          );
        })()}

        {/* Fan Level section */}
        <div className="max-w-4xl mx-auto" id="fan-level-section-wrapper">
          <FanLevelSection 
            level={fanLevel}
            onLevelUp={handleUpgradeLevel}
            soundEnabled={soundEnabled}
            user={user}
          />
        </div>

        {/* Promo Code Redeemer Panel with 7-Day Expirations */}
        <div className="max-w-4xl mx-auto" id="promo-code-redeemer-section-wrapper">
          <PromoCodeRedeemer 
            videos={newsList.filter(item => {
              const timestamp = parseInt(item.id);
              if (isNaN(timestamp)) return true;
              return Date.now() - timestamp < 7 * 24 * 60 * 60 * 1000;
            })}
            isAdmin={isAdmin}
            onDeleteVideo={handleDeleteNews}
            onEditVideo={handleEditNewsRequest}
          />
        </div>

        {/* Featured YouTube Videos Section */}
        <div className="max-w-4xl mx-auto" id="featured-videos-section-wrapper">
          <FeaturedVideos 
            videos={featuredList}
            isAdmin={isAdmin}
            onDelete={handleDeleteFeaturedVideo}
          />
        </div>

        {/* Best Shorts of the Week Section */}
        <div className="max-w-4xl mx-auto" id="best-shorts-section-wrapper">
          <BestShorts 
            shorts={shortsList}
            isAdmin={isAdmin}
            onDelete={handleDeleteShort}
          />
        </div>

        {/* Theories & PK XD News Publication Area */}
        <div className="max-w-4xl mx-auto" id="theories-section-wrapper">
          <TheoriesSection 
            theories={theoriesList}
            isAdmin={isAdmin}
            onDelete={handleDeleteTheory}
            onLike={handleLikeTheory}
          />
        </div>

        {/* WhatsApp Channel Promo Feature banner */}
        <WhatsAppPromo channelUrl={WHATSAPP_CHANNEL_URL} />

        {/* Extra Information: FAQ/Guide cards */}
        <div className="bg-zinc-900/40 rounded-3xl border border-white/5 p-6 sm:p-8 space-y-6 text-left select-none">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-300 fill-yellow-300" />
            <h3 className="font-sans font-black text-xl text-white uppercase tracking-wide">
              Sobre o PK XD Central
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
            
            <div className="space-y-1.5 p-4 rounded-xl bg-black/30 border border-white/5">
              <span className="text-xl">⚡</span>
              <h4 className="font-bold text-sm text-cyan-300">Notícias Oficiais</h4>
              <p className="text-xs text-gray-300 leading-relaxed">
                Nossa equipe monitora constantemente as redes oficiais do PK XD para entregar conteúdos confirmados aos leitores. Não divulgamos informações vazadas e nunca vasculhamos os arquivos internos do jogo.
              </p>
            </div>

            <div className="space-y-1.5 p-4 rounded-xl bg-black/30 border border-white/5">
              <span className="text-xl">📹</span>
              <h4 className="font-bold text-sm text-pink-300">Acompanhe as Lives e Canais</h4>
              <p className="text-xs text-gray-300 leading-relaxed">
                Nós não mostramos códigos já prontos! Em vez disso, nós divulgamos e direcionamos você para as lives, vídeos e posts do Instagram onde os códigos originais vão aparecer. Podem confiar de olhos fechados: todas as transmissões e mídias recomendadas aqui pertencem exclusivamente a Creators Oficiais parceiros do PK XD.
              </p>
            </div>

            <div className="space-y-1.5 p-4 rounded-xl bg-black/30 border border-white/5">
              <span className="text-xl">📈</span>
              <h4 className="font-bold text-sm text-yellow-300">Comunidade Viva</h4>
              <p className="text-xs text-gray-300 leading-relaxed">
                Mais do que apenas um site, somos um hub parceiro focado em unir os jogadores de PK XD. Venha debater teorias e trocar itens virtuais com a gente!
              </p>
            </div>

          </div>
        </div>

      </main>

      {/* Footer Area */}
      <footer id="main-footer" className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 mt-8 select-none border-t border-white/10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          
          {/* Logo brand */}
          <div className="flex items-center gap-2">
            {siteLogoUrl ? (
              <img 
                src={siteLogoUrl} 
                alt="Logo Rodapé PK XD Central" 
                className="w-7 h-7 object-cover rounded-lg border border-white/20"
                onError={(e) => { (e.target as any).style.display = 'none'; }}
              />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-pink-500 flex items-center justify-center font-sans font-extrabold text-white text-xs">
                PC
              </div>
            )}
            <strong className="font-sans text-sm text-gray-300 uppercase tracking-wider">
              PK XD Central • 2026
            </strong>
          </div>

          <p className="font-sans text-[11px] text-gray-500 max-w-sm sm:text-right">
            Este site é um portal independente mantido por fãs de PK XD. PK XD é uma marca registrada de suas respectivas publicadoras. Todas as mídias pertencem a seus legítimos donos.
          </p>

        </div>
      </footer>

      {/* FLOATING SECTIONS MENU BUTTON */}
      <div className="fixed bottom-6 right-6 z-40">
        <button 
          onClick={() => {
            setIsNavMenuOpen(!isNavMenuOpen);
            triggerAudio('tap');
          }}
          className="p-4 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-650 text-white rounded-full shadow-[0_0_20px_rgba(236,72,153,0.5)] hover:shadow-[0_0_35px_rgba(168,85,247,0.75)] border-2 border-white/35 active:scale-95 transition-all duration-200 cursor-pointer flex items-center gap-2 group font-sans text-xs font-black uppercase tracking-wider relative"
          title="🧭 Menu de Seções"
          id="floating-navigation-compass-trigger"
        >
          {/* Inner pulse ring */}
          <span className="absolute inset-0 rounded-full bg-pink-500/20 animate-ping pointer-events-none" />
          
          <Compass className="w-5 h-5 animate-spin-slow group-hover:rotate-90 duration-500 text-cyan-200 group-hover:text-yellow-300" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-out font-black text-[11px] tracking-widest text-[#fff]">
            Navegar Seções
          </span>
          <span className="absolute -top-1.5 -right-1.5 bg-yellow-400 text-purple-950 text-[9px] font-black px-2 py-0.5 rounded-full shadow-md animate-bounce border border-white/20">
            NAV
          </span>
        </button>
      </div>

      {/* COLLAPSIBLE SIDEBAR DRAWER SECTIONS NAVIGATOR */}
      {isNavMenuOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" id="navigation-sidebar-drawer">
          {/* Translucent Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" 
            onClick={() => {
              setIsNavMenuOpen(false);
              triggerAudio('tap');
            }}
          />

          <div className="absolute inset-y-0 right-0 max-w-full flex pl-4 sm:pl-10">
            <div className="w-screen max-w-xs sm:max-w-sm animate-slide-in">
              <div className="h-full flex flex-col bg-slate-900 border-l border-white/10 shadow-2xl relative overflow-y-auto">
                {/* Drawer Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-slate-900 to-indigo-950">
                  <div className="flex items-center gap-2 text-cyan-400">
                    <Compass className="w-6 h-6 animate-pulse" />
                    <h3 className="font-sans font-black text-sm uppercase tracking-widest text-white">
                      Explorar Central
                    </h3>
                  </div>
                  <button 
                    onClick={() => {
                      setIsNavMenuOpen(false);
                      triggerAudio('tap');
                    }}
                    className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer font-bold text-xs uppercase"
                  >
                    Fechar ✕
                  </button>
                </div>

                {/* Navigation Links list */}
                <div className="flex-1 p-6 space-y-4">
                  <p className="font-sans text-[11px] text-gray-400 uppercase tracking-widest font-bold">
                    Ir para Seção:
                  </p>
                  
                  <nav className="space-y-2">
                    {[
                      { id: 'countdown-card-root', title: '⏱️ Spoilers Semanais', desc: 'Contagem regressiva e spoilers em vigor' },
                      { id: 'past-spoilers-history-section-wrapper', title: '🔮 Spoilers Antigos', desc: 'Bandeja histórica de spoilers arquivados' },
                      { id: 'fan-level-section-wrapper', title: '🏆 Nível de Fã Extra', desc: 'Subir nível e habilitar emblemas exclusivos' },
                      { id: 'promo-code-redeemer-section-wrapper', title: '🎟️ Resgatar Códigos', desc: 'Promo codes oficiais ativos nos últimos 7 dias' },
                      { id: 'featured-videos-section-wrapper', title: '🎥 Vídeos Oficiais Destaques', desc: 'Gameplay e tutoriais importantes selecionados' },
                      { id: 'best-shorts-section-wrapper', title: '📱 Shorts Virais do PK XD', desc: 'Vídeos curtas e engraçados da comunidade' },
                      { id: 'theories-section-wrapper', title: '📜 Teorias PKXD Central', desc: 'Discussões semanais feitas pelos fãs' },
                    ].map((section) => (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => {
                          setIsNavMenuOpen(false);
                          triggerAudio('tap');
                          // Smooth scroll targeting center
                          setTimeout(() => {
                            document.getElementById(section.id)?.scrollIntoView({
                              behavior: 'smooth',
                              block: 'center',
                            });
                          }, 100);
                        }}
                        className="w-full text-left p-3 rounded-2xl border border-white/5 bg-slate-950/40 hover:bg-indigo-950/80 hover:border-indigo-500/30 transition-all duration-150 flex items-center justify-between group cursor-pointer"
                      >
                        <div className="space-y-0.5">
                          <span className="font-sans font-extrabold text-xs text-white group-hover:text-cyan-300 transition-colors">
                            {section.title}
                          </span>
                          <span className="block font-sans text-[10px] text-gray-400">
                            {section.desc}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-cyan-400 transition-all transform group-hover:translate-x-1" />
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Quick Info footer inside drawer */}
                <div className="p-6 border-t border-white/10 bg-black/40 text-center space-y-2">
                  <span className="text-[10px] text-gray-500 block">DÚVIDAS OU COMUNICADOS?</span>
                  <a 
                    href={WHATSAPP_CHANNEL_URL} 
                    target="_blank" 
                    rel="noreferrer"
                    className="w-full py-2 bg-[#25D366] hover:bg-[#20ba59] text-black font-sans font-black text-xs uppercase tracking-wide rounded-xl flex items-center justify-center gap-1.5 transition-all"
                  >
                    <MessageCircle className="w-3.5 h-3.5 fill-black" />
                    Canal do WhatsApp
                  </a>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN SPOILER MODAL OVERLAY */}
      {isFullscreenOpen && fullscreenData && (
        <div 
          onClick={() => {
            setIsFullscreenOpen(false);
            setFullscreenData(null);
            triggerAudio('tap');
          }}
          className="fixed inset-0 z-50 overflow-y-auto flex flex-col items-center justify-start p-3 sm:p-6 bg-black/98 backdrop-blur-3xl animate-fade-in cursor-zoom-out" 
          id="fullscreen-spoiler-overlay"
        >
          {/* Main content wrapper */}
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="w-full max-w-6xl my-auto py-6 sm:py-10 relative flex flex-col items-stretch text-left cursor-default space-y-5 sm:space-y-7"
          >
            
            {/* Top Close Circular Control */}
            <button
              onClick={() => {
                setIsFullscreenOpen(false);
                setFullscreenData(null);
                triggerAudio('tap');
              }}
              className="fixed top-4 right-4 sm:top-6 sm:right-6 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-pink-500 hover:scale-105 active:scale-95 text-white transition-all cursor-pointer border border-white/15 shadow-2xl duration-150 z-50 hover:shadow-pink-500/25"
              title="Fechar Foco Imersivo"
            >
              <span className="text-2xl font-light leading-none">✕</span>
            </button>

            {/* Title */}
            <h3 className="font-sans font-black text-3xl sm:text-5xl text-yellow-350 uppercase tracking-tight leading-tight text-center max-w-5xl mx-auto px-4 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
              {fullscreenData.title}
            </h3>

            {/* Immersive Spoiler Image - Now MUCH LARGER */}
            {fullscreenData.imageUrl && (
              <div className="rounded-3xl border-2 border-white/10 overflow-hidden bg-black/85 p-2.5 max-h-[78vh] flex items-center justify-center max-w-5xl w-full mx-auto shadow-[0_0_40px_rgba(236,72,153,0.15)] relative animate-fade-in">
                <img
                  src={fullscreenData.imageUrl}
                  alt={fullscreenData.title}
                  className="max-h-[74vh] w-full h-auto object-contain rounded-2xl select-none"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            {/* Spoilers details text block */}
            {fullscreenData.desc && (
              <div className="max-w-5xl w-full mx-auto bg-neutral-900/90 p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl overflow-y-auto max-h-[380px] custom-scrollbar">
                <div className="space-y-4 font-sans text-base sm:text-lg text-gray-150 leading-relaxed">
                  <CountdownWidget 
                    onlyContent={true}
                    spoilerTitle={fullscreenData.title}
                    spoilerDesc={fullscreenData.desc} 
                  />
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* CENTRAL DE NOTIFICAÇÕES OVERLAY */}
      {isNotifOverlayOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-fade-in" id="notifications-list-overlay">
          <div className="bg-neutral-900 border-2 border-cyan-400 rounded-3xl p-6 sm:p-8 w-full max-w-2xl relative shadow-[0_0_30px_rgba(34,211,238,0.2)] my-8 text-left">
            
            {/* Top Close Controls */}
            <button
              onClick={() => {
                setIsNotifOverlayOpen(false);
                triggerAudio('tap');
              }}
              className="absolute top-4 right-4 bg-white/10 hover:bg-white/15 text-white font-sans font-black text-xs uppercase p-2 py-2.5 rounded-lg border border-white/10 transition-all cursor-pointer shadow-md duration-150"
            >
              Fechar ✕
            </button>

            {/* Header Title */}
            <div className="flex items-center gap-2 text-cyan-400 mb-5 pb-3 border-b border-white/10 pr-16 sm:pr-0">
              <BellRing className="w-5 h-5 animate-swing text-cyan-400 fill-cyan-400 flex-shrink-0" />
              <h3 className="font-sans font-black text-sm sm:text-lg uppercase tracking-wide text-white">Central de Alertas</h3>
            </div>

            {/* Native browser/mobile alert toggle card */}
            <div className="mb-6 p-4 rounded-2xl bg-slate-950 border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="font-sans font-black text-xs uppercase tracking-wider text-pink-400">📲 Notificações no Celular / Navegador</h4>
                <p className="text-[11px] text-gray-400 leading-normal">
                  Ative para receber alertas sonoros e pop-ups direto na tela do seu celular ou PC toda vez que novos spoilers e códigos forem liberados!
                </p>
              </div>
              
              {hasNotificationPermission ? (
                <div className="flex-shrink-0 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 self-stretch sm:self-auto justify-center">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Ativado! 🟢
                </div>
              ) : (
                <button
                  onClick={async () => {
                    triggerAudio('tap');
                    if (!('Notification' in window)) {
                      setNotifMessage('Este navegador ou celular não suporta notificações de sistema.');
                      setTimeout(() => setNotifMessage(null), 5000);
                      return;
                    }
                    try {
                      const perm = await Notification.requestPermission();
                      setHasNotificationPermission(perm === 'granted');
                      if (perm === 'granted') {
                        triggerAudio('success');
                        new Notification('Portal PKXD Central 🔔', {
                          body: 'Notificações ativas com sucesso! Você receberá alertas de novos spoilers e códigos.',
                        });
                      }
                    } catch (err) {
                      console.warn(err);
                    }
                  }}
                  className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-sans font-extrabold uppercase text-[10px] tracking-wider rounded-xl cursor-pointer shadow-lg hover:shadow-pink-500/20 active:scale-95 transition-all text-center w-full sm:w-auto"
                >
                  🔔 ATIVAR ALERTAS
                </button>
              )}
            </div>

            {/* Notification logs list block */}
            <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2">
              {notificationList.length === 0 ? (
                <div className="py-12 text-center text-gray-500 space-y-2">
                  <p className="font-sans text-sm">Nenhuma notificação recebida recentemente.</p>
                  <p className="font-sans text-[11px] text-gray-600">Todas as novidades, alertas e alterações de cronograma aparecerão aqui!</p>
                </div>
              ) : (
                notificationList.map((notif) => {
                  let badgeColors = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
                  let icon = '📢';
                  if (notif.type === 'story_published') {
                    badgeColors = 'bg-pink-500/20 text-pink-300 border-pink-500/30';
                    icon = '⭐';
                  } else if (notif.type === 'delayed_alert') {
                    badgeColors = 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
                    icon = '⚠️';
                  } else if (notif.type === 'countdown_alert') {
                    badgeColors = 'bg-indigo-500/20 text-cyan-300 border-indigo-500/30';
                    icon = '⏰';
                  }

                  return (
                    <div 
                      key={notif.id}
                      className="p-4 bg-neutral-950/60 border border-white/10 rounded-2xl flex items-start gap-3 hover:border-white/20 transition-all shadow-inner"
                    >
                      <span className="text-xl leading-none select-none p-1.5 bg-white/5 rounded-xl block">
                        {icon}
                      </span>
                      <div className="flex-1 space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="font-sans font-extrabold text-white text-xs sm:text-sm">
                            {notif.title}
                          </h4>
                          <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeColors}`}>
                            {notif.type.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="font-sans text-xs text-gray-300 leading-relaxed">
                          {notif.body}
                        </p>
                        <span className="block font-mono text-[9px] text-gray-500">
                          Enviado em: {new Date(notif.createdAt).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick footer action info */}
            <div className="mt-6 pt-4 border-t border-white/10 text-center">
              <span className="font-sans text-[10px] text-gray-500 italic block">
                *Toda vez que o admin publica ou atrasa spoilers, uma notificação mundial é dispersada em tempo real!
              </span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
