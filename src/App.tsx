import React, { useState, useEffect, useRef } from 'react';
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
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, User, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';

export const maskEmail = (email?: string | null): string => {
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
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminAuthTab, setAdminAuthTab] = useState<'email' | 'google' | 'pin'>('pin');

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

  const [fanXP, setFanXP] = useState(() => {
    try {
      const saved = localStorage.getItem('pkxd_fan_xp');
      if (saved) {
        const parsed = parseInt(saved, 10);
        return isNaN(parsed) ? 0 : parsed;
      }
    } catch (e) {
      console.warn(e);
    }
    return 0;
  });
  
  const [newsToEdit, setNewsToEdit] = useState<NewsItem | null>(null);
  const [notifMessage, setNotifMessage] = useState<string | null>(null);

  // Dynamic scroll position state to make alert notifications scroll position responsive!
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  // Session tracking to avoid clock drift issues on real-time notifications
  const initialNotifIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);

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

  // Capture Google login Redirect results (Resolves popup-closed errors on mobile)
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          triggerAudio('success');
          
          // Check if this redirect was specifically for connecting Gmail
          let isGmailPending = false;
          try {
            isGmailPending = localStorage.getItem('pending_gmail_connect') === 'true';
          } catch (e) {}
          
          const credential = GoogleAuthProvider.credentialFromResult(result);
          if (isGmailPending && credential?.accessToken) {
            try {
              localStorage.setItem('pkxd_gmail_token', credential.accessToken);
              localStorage.removeItem('pending_gmail_connect');
            } catch (e) {}
            setNotifMessage(`🔌 Gmail do Admin conectado com sucesso via redirecionamento! 🎉`);
          } else {
            setNotifMessage(`Bem-vindo, ${result.user.displayName || 'Admin'}! 🎉`);
          }
          
          setTimeout(() => setNotifMessage(null), 4000);
        }
      })
      .catch((error: any) => {
        console.error("Redirect login failed:", error);
        const rawMsg = error?.message || String(error);
        const errorMsgLower = rawMsg.toLowerCase();
        const codeLower = (error?.code || '').toLowerCase();
        
        let errorMsg = rawMsg;
        if (codeLower === 'auth/unauthorized-domain' || errorMsgLower.includes('unauthorized-domain') || errorMsgLower.includes('domain-not-authorized')) {
          errorMsg = `⚠️ DOMÍNIO NÃO AUTORIZADO NO FIREBASE! O domínio atual do seu site ("${window.location.hostname}") não está cadastrado ou autorizado no seu projeto do Firebase. Você precisa adicionar "${window.location.hostname}" na lista de Domínios Autorizados no seu Firebase Console (Authentication > Configurações > Domínios Autorizados) para liberar o login com o Google!`;
        } else if (codeLower === 'auth/operation-not-allowed' || errorMsgLower.includes('operation-not-allowed')) {
          errorMsg = `⚠️ MÉTODO DE LOGIN GOOGLE DESATIVADO!\n\nEste erro acontece porque o login com o Google não está ativado no Authentication do seu Firebase. Siga esses passos rápidos para ativar:\n\n1️⃣ Acesse o console: https://console.firebase.google.com e entre no seu projeto "pkxd-e817c".\n2️⃣ No menu esquerdo, acesse "Compilação" (Build) > "Authentication".\n3️⃣ Clique na aba "Sign-in method" (Método de login) no topo.\n4️⃣ Clique no botão "Adicionar novo provedor" (Add new provider) e selecione "Google".\n5️⃣ Ative o interruptor de ativação (Enable) no topo.\n6️⃣ Configure o e-mail de suporte e clique em "Salvar" (Save).\n\nProntinho! Após salvar, atualize esta página e clique em conectar! 🚀`;
        }
        setGoogleAuthError(errorMsg);
      });
  }, []);

  // Favicon dynamic injection removed as requested by user

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
        
        // Safeguard partial updates: only alter local states when those specific fields are present in the snapshot
        if (data.spoilerTitle !== undefined && data.spoilerTitle !== null) {
          setSpoilerTitle(data.spoilerTitle);
          localStorage.setItem('pkxd_spoiler_title', data.spoilerTitle);
        }

        if (data.spoilerDesc !== undefined && data.spoilerDesc !== null) {
          setSpoilerDesc(data.spoilerDesc);
          localStorage.setItem('pkxd_spoiler_desc', data.spoilerDesc);
        }

        if (data.spoilerImageUrl !== undefined && data.spoilerImageUrl !== null) {
          setSpoilerImage(data.spoilerImageUrl);
          localStorage.setItem('pkxd_spoiler_image', data.spoilerImageUrl);
        }

        if (data.logoUrl !== undefined && data.logoUrl !== null) {
          setSiteLogoUrl(data.logoUrl);
          localStorage.setItem('pkxd_site_logo_url', data.logoUrl);
        }

        if (data.forceReveal !== undefined && data.forceReveal !== null) {
          const forceVal = data.forceReveal;
          setForceReveal(forceVal);
          localStorage.setItem('pkxd_force_reveal', forceVal ? 'true' : 'false');
        }

        if (data.revealedAt !== undefined && data.revealedAt !== null) {
          const revealedVal = data.revealedAt;
          setRevealedAt(revealedVal);
          localStorage.setItem('pkxd_spoiler_revealed_at', String(revealedVal));
        }

        if (data.extraCountdownTitle !== undefined && data.extraCountdownTitle !== null) {
          setExtraCountdownTitle(data.extraCountdownTitle);
        }

        if (data.extraCountdownDate !== undefined && data.extraCountdownDate !== null) {
          setExtraCountdownDate(data.extraCountdownDate);
        }

        if (data.extraCountdownEnabled !== undefined && data.extraCountdownEnabled !== null) {
          setExtraCountdownEnabled(data.extraCountdownEnabled);
        }

        if (data.isDelayed !== undefined && data.isDelayed !== null) {
          setIsDelayed(data.isDelayed);
        }

        if (data.delayMessage !== undefined && data.delayMessage !== null) {
          setDelayMessage(data.delayMessage);
        }
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

      if (isFirstLoadRef.current) {
        // Collect existing notification IDs to prevent alerting on page load
        snapshot.forEach(doc => {
          initialNotifIdsRef.current.add(doc.id);
        });
        isFirstLoadRef.current = false;
        return;
      }

      // Check for newly added items since page subscription started
      let newNotif: AppNotification | null = null;
      for (const item of list) {
        if (!initialNotifIdsRef.current.has(item.id)) {
          // It's a new notification! Let's alert.
          newNotif = item;
          // Add to seen set so we don't alert again
          initialNotifIdsRef.current.add(item.id);
          break; // alert only the most recent new one
        }
      }

      if (newNotif) {
        triggerAudio('success');
        // Let's set the message text
        setNotifMessage(`📢 ${newNotif.title.toUpperCase()}: ${newNotif.body}`);

        // Trigger native system notification if allowed on mobile or computer browsers
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(newNotif.title, {
              body: newNotif.body,
              tag: newNotif.id,
              icon: 'https://img.icons8.com/color/96/000000/bell.png'
            });
          } catch (err) {
            console.warn("Could not dispatch native browser notification:", err);
          }
        }

        // Auto clear after 8 seconds
        setTimeout(() => setNotifMessage(null), 8000);
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
                createdAt: Date.now(),
                admin_secret: "pkxd2026_super_secret_admin_key"
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
      const rawMsg = error?.message || String(error);
      const errorMsgLower = rawMsg.toLowerCase();
      const codeLower = (error?.code || '').toLowerCase();
      
      let errorMsg = rawMsg;
      if (codeLower === 'auth/unauthorized-domain' || errorMsgLower.includes('unauthorized-domain') || errorMsgLower.includes('domain-not-authorized')) {
        errorMsg = `⚠️ DOMÍNIO NÃO AUTORIZADO NO FIREBASE! O domínio atual do seu site ("${window.location.hostname}") não está cadastrado ou autorizado no seu projeto do Firebase. Você precisa adicionar "${window.location.hostname}" na lista de Domínios Autorizados nas configurações do seu Firebase Console (Authentication > Configurações > Domínios Autorizados) para liberar o login com o Google!`;
      } else if (codeLower === 'auth/operation-not-allowed' || errorMsgLower.includes('operation-not-allowed')) {
        errorMsg = `⚠️ MÉTODO DE LOGIN GOOGLE DESATIVADO!\n\nEste erro acontece porque o login com o Google não está ativado no Authentication do seu Firebase. Siga esses passos rápidos para ativar:\n\n1️⃣ Acesse o console: https://console.firebase.google.com e entre no seu projeto "pkxd-e817c".\n2️⃣ No menu esquerdo, acesse "Compilação" (Build) > "Authentication".\n3️⃣ Clique na aba "Sign-in method" (Método de login) no topo.\n4️⃣ Clique no botão "Adicionar novo provedor" (Add new provider) e selecione "Google".\n5️⃣ Ative o interruptor de ativação (Enable) no topo.\n6️⃣ Configure o e-mail de suporte e clique em "Salvar" (Save).\n\nProntinho! Após salvar, atualize esta página e clique em conectar! 🚀`;
      }
      setGoogleAuthError(errorMsg);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLoginRedirect = async () => {
    setIsAuthenticating(true);
    setGoogleAuthError(null);
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (error: any) {
      console.error("Redirect login failed:", error);
      const rawMsg = error?.message || String(error);
      const errorMsgLower = rawMsg.toLowerCase();
      const codeLower = (error?.code || '').toLowerCase();
      
      let errorMsg = rawMsg;
      if (codeLower === 'auth/unauthorized-domain' || errorMsgLower.includes('unauthorized-domain') || errorMsgLower.includes('domain-not-authorized')) {
        errorMsg = `⚠️ DOMÍNIO NÃO AUTORIZADO NO FIREBASE! O domínio atual do seu site ("${window.location.hostname}") não está cadastrado ou autorizado no seu projeto do Firebase. Você precisa adicionar "${window.location.hostname}" na lista de Domínios Autorizados nas configurações do seu Firebase Console (Authentication > Configurações > Domínios Autorizados) para liberar o login com o Google!`;
      } else if (codeLower === 'auth/operation-not-allowed' || errorMsgLower.includes('operation-not-allowed')) {
        errorMsg = `⚠️ MÉTODO DE LOGIN GOOGLE DESATIVADO!\n\nEste erro acontece porque o login com o Google não está ativado no Authentication do seu Firebase. Siga esses passos rápidos para ativar:\n\n1️⃣ Acesse o console: https://console.firebase.google.com e entre no seu projeto "pkxd-e817c".\n2️⃣ No menu esquerdo, acesse "Compilação" (Build) > "Authentication".\n3️⃣ Clique na aba "Sign-in method" (Método de login) no topo.\n4️⃣ Clique no botão "Adicionar novo provedor" (Add new provider) e selecione "Google".\n5️⃣ Ative o interruptor de ativação (Enable) no topo.\n6️⃣ Configure o e-mail de suporte e clique em "Salvar" (Save).\n\nProntinho! Após salvar, atualize esta página e clique em conectar! 🚀`;
      }
      setGoogleAuthError(errorMsg);
      setIsAuthenticating(false);
    }
  };

  const handleEmailLogin = async (email: string, pass: string) => {
    setIsAuthenticating(true);
    setGoogleAuthError(null);
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), pass);
      triggerAudio('success');
      setNotifMessage(`Bem-vindo de volta! 🎉`);
      setTimeout(() => setNotifMessage(null), 4000);
    } catch (error: any) {
      console.error("Email login failed:", error);
      let errMsg = error?.message || String(error);
      if (error?.code === 'auth/wrong-password' || error?.code === 'auth/invalid-login-credentials' || error?.message?.includes('invalid-credential') || error?.code === 'auth/invalid-credential') {
        errMsg = 'Senha incorreta ou e-mail inválido! Verifique seus dados.';
      } else if (error?.code === 'auth/user-not-found') {
        errMsg = 'E-mail não cadastrado. Cadastre-se grátis para entrar no Ranking!';
      } else if (error?.code === 'auth/invalid-email') {
        errMsg = 'Formato de e-mail inválido!';
      } else if (error?.code === 'auth/too-many-requests') {
        errMsg = 'Muitas tentativas malsucedidas. Tente novamente mais tarde ou redefina sua senha.';
      }
      setGoogleAuthError(`Erro de Login: ${errMsg}`);
      setNotifMessage(`❌ Erro de Login: ${errMsg}`);
      setTimeout(() => setNotifMessage(null), 8000);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleEmailRegister = async (email: string, pass: string, nickname: string) => {
    setIsAuthenticating(true);
    setGoogleAuthError(null);
    try {
      const result = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: nickname.trim() || 'Fã Secreto'
        });
      }
      triggerAudio('levelUp');
      setNotifMessage(`Sua conta de fã foi criada com sucesso como ${nickname}! 🚀`);
      setTimeout(() => setNotifMessage(null), 4500);
    } catch (error: any) {
      console.error("Email register failed:", error);
      let errMsg = error?.message || String(error);
      if (error?.code === 'auth/email-already-in-use') {
        errMsg = 'Este e-mail já está sendo usado por outro fã! Tente fazer login ou use outro.';
      } else if (error?.code === 'auth/weak-password') {
        errMsg = 'A senha informada é muito fraca. Digite pelo menos 6 caracteres!';
      } else if (error?.code === 'auth/invalid-email') {
        errMsg = 'Endereço de e-mail inválido!';
      } else if (error?.code === 'auth/operation-not-allowed') {
        errMsg = 'O login com E-mail e Senha não está ativado nas configurações do Authentication (Sign-in methods) do seu Firebase Console. Por favor, ative-o lá!';
      }
      setGoogleAuthError(`Erro ao criar conta: ${errMsg}`);
      setNotifMessage(`❌ Erro ao criar conta: ${errMsg}`);
      setTimeout(() => setNotifMessage(null), 8500);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handlePasscodeLogin = () => {
    // Strengthened security passcodes as requested to avoid simple brute-force logins
    const validPasscodes = ['pkxdcentral2026_portal_admin', 'kawanyuri_adm_seguro_99', 'central_pkxd_super_acesso_real'];
    if (validPasscodes.includes(inputPasscode.trim())) {
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

  const checkAdminWritePermission = (): boolean => {
    if (!user) {
      triggerAudio('tap');
      setNotifMessage("⚠️ ERRO: Conecte-se com sua senha de administrador ou conta.");
      setTimeout(() => setNotifMessage(null), 6000);
      return false;
    }
    return true;
  };

  // Create news
  const handleAddNews = async (newPost: Omit<NewsItem, 'id'>) => {
    if (!checkAdminWritePermission()) return;
    const docId = Date.now().toString();
    const fresh = {
      ...newPost,
      id: docId,
      admin_secret: "pkxd2026_super_secret_admin_key"
    };
    try {
      const docRef = doc(db, 'news', docId);
      await setDoc(docRef, fresh);
      triggerAudio('success');
      setNotifMessage("✅ Publicado com sucesso na nuvem! 🌐");
      setTimeout(() => setNotifMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
      setNotifMessage(`❌ Erro de publicação: ${err?.message || String(err)}`);
      setTimeout(() => setNotifMessage(null), 8000);
    }
  };

  // Edit existing news
  const handleEditNewsRequest = (item: NewsItem) => {
    setNewsToEdit(item);
    // Scroll smoothly to admin panel
    document.getElementById('admin-panel')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSaveEdit = async (updatedItem: NewsItem) => {
    if (!checkAdminWritePermission()) return;
    const fresh = {
      ...updatedItem,
      admin_secret: "pkxd2026_super_secret_admin_key"
    };
    try {
      const docRef = doc(db, 'news', updatedItem.id);
      await setDoc(docRef, fresh);
      setNewsToEdit(null);
      triggerAudio('success');
      setNotifMessage("✅ Código atualizado com sucesso! 🌐");
      setTimeout(() => setNotifMessage(null), 4500);
    } catch (err: any) {
      console.error(err);
      setNotifMessage(`❌ Erro ao atualizar código: ${err?.message || String(err)}`);
      setTimeout(() => setNotifMessage(null), 8000);
    }
  };

  // Delete news
  const handleDeleteNews = async (id: string) => {
    if (!checkAdminWritePermission()) return;
    try {
      const docRef = doc(db, 'news', id);
      await deleteDoc(docRef);
      triggerAudio('tap');
      setNotifMessage("🗑️ Item removido com sucesso!");
      setTimeout(() => setNotifMessage(null), 3000);
    } catch (err: any) {
      console.error(err);
      setNotifMessage(`❌ Erro ao remover: ${err?.message || String(err)}`);
      setTimeout(() => setNotifMessage(null), 8000);
    }
  };

  // Update spoiler settings and add to history
  const handleUpdateSpoilerSettings = async (title: string, desc: string, imageUrl?: string, forceRevealActive: boolean = false) => {
    if (!checkAdminWritePermission()) return;
    try {
      const docRef = doc(db, 'settings', 'app');
      await setDoc(docRef, {
        spoilerTitle: title,
        spoilerDesc: desc,
        spoilerImageUrl: imageUrl || '',
        forceReveal: forceRevealActive,
        revealedAt: Date.now(),
        admin_secret: "pkxd2026_super_secret_admin_key"
      }, { merge: true });

      // Save a copy to history so it doesn't get lost as we change further spoilers
      const pastId = Date.now().toString();
      const pastRef = doc(db, 'past_spoilers', pastId);
      await setDoc(pastRef, {
        id: pastId,
        title,
        description: desc,
        imageUrl: imageUrl || '',
        createdAt: Date.now(),
        admin_secret: "pkxd2026_super_secret_admin_key"
      });

      // Automatically send a push notification document for the new spoiler/story publication!
      const notifId = Date.now().toString();
      const notifRef = doc(db, 'notifications', notifId);
      await setDoc(notifRef, {
        id: notifId,
        title: forceRevealActive ? '⚡ NOVO SPOILER LIBERADO AGORA!' : '🔮 AGENDAMENTO DE NOVO SPOILER!',
        body: `Confira já os novos spoilers oficiais: ${title}`,
        type: 'story_published',
        createdAt: Date.now(),
        admin_secret: "pkxd2026_super_secret_admin_key"
      });

      triggerAudio('success');
      setNotifMessage("✅ Spoiler atualizado e publicado com sucesso!");
      setTimeout(() => setNotifMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
      setNotifMessage(`❌ Erro ao atualizar spoiler: ${err?.message || String(err)}`);
      setTimeout(() => setNotifMessage(null), 8000);
    }
  };

  // Direct insert to past spoilers archive without touching main active spoiler
  const handleDirectArchivePastSpoiler = async (title: string, desc: string, imageUrl?: string) => {
    if (!checkAdminWritePermission()) return;
    try {
      const pastId = Date.now().toString();
      const pastRef = doc(db, 'past_spoilers', pastId);
      await setDoc(pastRef, {
        id: pastId,
        title,
        description: desc,
        imageUrl: imageUrl || '',
        createdAt: Date.now(),
        admin_secret: "pkxd2026_super_secret_admin_key"
      });
      triggerAudio('success');
      setNotifMessage("✅ Spoiler arquivado com sucesso diretamente em Spoilers Anteriores! 🔮");
      setTimeout(() => setNotifMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
      setNotifMessage(`❌ Erro ao arquivar spoiler: ${err?.message || String(err)}`);
      setTimeout(() => setNotifMessage(null), 8000);
    }
  };

  // Move current active spotlight spoiler to past archives and clear it
  const handleArchiveAndClearActiveSpoiler = async (title: string, desc: string, imageUrl: string) => {
    if (!checkAdminWritePermission()) return;
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
        createdAt: Date.now(),
        admin_secret: "pkxd2026_super_secret_admin_key"
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
        revealedAt: 0,
        admin_secret: "pkxd2026_super_secret_admin_key"
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
      setNotifMessage("✅ Destaque arquivado com sucesso e limpo do site! 📦");
      setTimeout(() => setNotifMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
      setNotifMessage(`❌ Erro ao arquivar destaque: ${err?.message || String(err)}`);
      setTimeout(() => setNotifMessage(null), 8000);
    }
  };

  // Delete active spoiler directly from the site without archiving it
  const handleDeleteActiveSpoiler = async () => {
    if (!checkAdminWritePermission()) return;
    try {
      const defaultTitle = 'Aguardando Próximos Spoilers! 🔮';
      const defaultDesc = 'Ainda não temos spoilers ativos para esta semana. Fique atento ao nosso canal no WhatsApp para novidades e acompanhe a contagem regressiva toda segunda às 17h30!';
      const docRef = doc(db, 'settings', 'app');
      await setDoc(docRef, {
        spoilerTitle: defaultTitle,
        spoilerDesc: defaultDesc,
        spoilerImageUrl: '',
        forceReveal: false,
        revealedAt: 0,
        admin_secret: "pkxd2026_super_secret_admin_key"
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
      setNotifMessage("✅ Spoiler atual excluído e limpo com sucesso do site! ❌");
      setTimeout(() => setNotifMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
      setNotifMessage(`❌ Erro ao limpar spoiler: ${err?.message || String(err)}`);
      setTimeout(() => setNotifMessage(null), 8000);
    }
  };

  // Update spoiler delayed status
  const handleUpdateDelay = async (delayed: boolean, message: string) => {
    if (!checkAdminWritePermission()) return;
    try {
      const docRef = doc(db, 'settings', 'app');
      await setDoc(docRef, {
        isDelayed: delayed,
        delayMessage: message,
        admin_secret: "pkxd2026_super_secret_admin_key"
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
          createdAt: Date.now(),
          admin_secret: "pkxd2026_super_secret_admin_key"
        });
      }

      triggerAudio('success');
      setNotifMessage("✅ Status de atraso atualizado com sucesso!");
      setTimeout(() => setNotifMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
      setNotifMessage(`❌ Erro ao atualizar status de atraso: ${err?.message || String(err)}`);
      setTimeout(() => setNotifMessage(null), 8000);
    }
  };

  // Disparar notificação manual para celular
  const handleSendCustomNotification = async (title: string, body: string, type: 'story_published' | 'countdown_alert' | 'custom_push' | 'delayed_alert') => {
    if (!checkAdminWritePermission()) return;
    const notifId = Date.now().toString();
    try {
      const notifRef = doc(db, 'notifications', notifId);
      await setDoc(notifRef, {
        id: notifId,
        title,
        body,
        type,
        createdAt: Date.now(),
        admin_secret: "pkxd2026_super_secret_admin_key"
      });
      triggerAudio('success');
      setNotifMessage("✅ Notificação enviada para todos os fãs cadastrados! 📢");
      setTimeout(() => setNotifMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
      setNotifMessage(`❌ Erro ao disparar notificação: ${err?.message || String(err)}`);
      setTimeout(() => setNotifMessage(null), 8000);
    }
  };

  // Save edits of past archive spoilers
  const handleSaveEditPastSpoiler = async (id: string, title: string, desc: string, imageUrl?: string) => {
    if (!checkAdminWritePermission()) return;
    try {
      const docRef = doc(db, 'past_spoilers', id);
      await setDoc(docRef, {
        id,
        title,
        description: desc,
        imageUrl: imageUrl || '',
        admin_secret: "pkxd2026_super_secret_admin_key"
      }, { merge: true });
      
      setPastSpoilerToEdit(null);
      triggerAudio('success');
      setNotifMessage("✅ Alterações no spoiler antigo arquivadas!");
      setTimeout(() => setNotifMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
      setNotifMessage(`❌ Erro ao salvar alterações do spoiler antigo: ${err?.message || String(err)}`);
      setTimeout(() => setNotifMessage(null), 8000);
    }
  };

  // Delete past spoiler
  const handleDeletePastSpoiler = async (id: string) => {
    if (!checkAdminWritePermission()) return;
    try {
      const docRef = doc(db, 'past_spoilers', id);
      await deleteDoc(docRef);
      triggerAudio('tap');
      setNotifMessage("✅ Spoiler antigo deletado com sucesso!");
      setTimeout(() => setNotifMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
      setNotifMessage(`❌ Erro ao deletar spoiler antigo: ${err?.message || String(err)}`);
      setTimeout(() => setNotifMessage(null), 8000);
    }
  };

  // Update logo url
  const handleUpdateLogoSettings = async (url: string) => {
    if (!checkAdminWritePermission()) return;
    try {
      const docRef = doc(db, 'settings', 'app');
      await setDoc(docRef, {
        logoUrl: url,
        admin_secret: "pkxd2026_super_secret_admin_key"
      }, { merge: true });
      triggerAudio('success');
      setNotifMessage("✅ Logo da Central PK XD atualizada! 🤩");
      setTimeout(() => setNotifMessage(null), 3000);
    } catch (err: any) {
      console.error(err);
      setNotifMessage(`❌ Erro ao atualizar logo: ${err?.message || String(err)}`);
      setTimeout(() => setNotifMessage(null), 8500);
    }
  };

  // Featured video handlers
  const handleAddFeaturedVideo = async (video: Omit<FeaturedVideo, 'id' | 'createdAt'>) => {
    if (!checkAdminWritePermission()) return;
    const id = Date.now().toString();
    try {
      const docRef = doc(db, 'featured_videos', id);
      await setDoc(docRef, { ...video, id, createdAt: Date.now(), admin_secret: "pkxd2026_super_secret_admin_key" });
      triggerAudio('success');
      setNotifMessage("✅ Vídeo em Destaque adicionado com sucesso!");
      setTimeout(() => setNotifMessage(null), 4050);
    } catch (err: any) {
      console.error("Error adding featured video:", err);
      setNotifMessage(`❌ Erro ao adicionar vídeo: ${err?.message || String(err)}`);
      setTimeout(() => setNotifMessage(null), 8000);
    }
  };

  const handleDeleteFeaturedVideo = async (id: string) => {
    if (!checkAdminWritePermission()) return;
    try {
      await deleteDoc(doc(db, 'featured_videos', id));
      triggerAudio('tap');
      setNotifMessage("✅ Vídeo em Destaque removido!");
      setTimeout(() => setNotifMessage(null), 3000);
    } catch (err: any) {
      console.error("Error deleting featured video:", err);
      setNotifMessage(`❌ Erro ao remover vídeo: ${err?.message || String(err)}`);
      setTimeout(() => setNotifMessage(null), 8000);
    }
  };

  // Theory handlers
  const handleAddTheory = async (theory: Omit<Theory, 'id' | 'likes' | 'createdAt'>) => {
    if (!checkAdminWritePermission()) return;
    const id = Date.now().toString();
    try {
      const docRef = doc(db, 'theories', id);
      await setDoc(docRef, { ...theory, id, likes: 0, createdAt: Date.now(), admin_secret: "pkxd2026_super_secret_admin_key" });
      triggerAudio('success');
      setNotifMessage("✅ Teoria cadastrada com sucesso!");
      setTimeout(() => setNotifMessage(null), 4000);
    } catch (err: any) {
      console.error("Error adding theory:", err);
      setNotifMessage(`❌ Erro ao cadastrar teoria: ${err?.message || String(err)}`);
      setTimeout(() => setNotifMessage(null), 8000);
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
    if (!checkAdminWritePermission()) return;
    try {
      await deleteDoc(doc(db, 'theories', id));
      triggerAudio('tap');
      setNotifMessage("✅ Teoria removida!");
      setTimeout(() => setNotifMessage(null), 3000);
    } catch (err: any) {
      console.error("Error deleting theory:", err);
      setNotifMessage(`❌ Erro ao remover teoria: ${err?.message || String(err)}`);
      setTimeout(() => setNotifMessage(null), 8000);
    }
  };

  // Curated Shorts handlers
  const handleAddShort = async (short: Omit<ShortItem, 'id' | 'createdAt'>) => {
    if (!checkAdminWritePermission()) return;
    const id = Date.now().toString();
    try {
      const docRef = doc(db, 'shorts', id);
      await setDoc(docRef, { ...short, id, createdAt: Date.now(), admin_secret: "pkxd2026_super_secret_admin_key" });
      triggerAudio('success');
      setNotifMessage("✅ Vídeo curto (Short) adicionado!");
      setTimeout(() => setNotifMessage(null), 3500);
    } catch (err: any) {
      console.error("Error adding short:", err);
      setNotifMessage(`❌ Erro ao adicionar short: ${err?.message || String(err)}`);
      setTimeout(() => setNotifMessage(null), 8000);
    }
  };

  const handleDeleteShort = async (id: string) => {
    if (!checkAdminWritePermission()) return;
    try {
      await deleteDoc(doc(db, 'shorts', id));
      triggerAudio('tap');
      setNotifMessage("✅ Short removido!");
      setTimeout(() => setNotifMessage(null), 3000);
    } catch (err: any) {
      console.error("Error deleting short:", err);
      setNotifMessage(`❌ Erro ao remover short: ${err?.message || String(err)}`);
      setTimeout(() => setNotifMessage(null), 8000);
    }
  };

  // Extra timer details handler
  const handleUpdateExtraCountdown = async (title: string, date: string, enabled: boolean) => {
    if (!checkAdminWritePermission()) return;
    try {
      const docRef = doc(db, 'settings', 'app');
      await setDoc(docRef, {
        extraCountdownTitle: title,
        extraCountdownDate: date,
        extraCountdownEnabled: enabled,
        admin_secret: "pkxd2026_super_secret_admin_key"
      }, { merge: true });
      triggerAudio('success');
      setNotifMessage("✅ Contagem regressiva personalizada atualizada!");
      setTimeout(() => setNotifMessage(null), 3000);
    } catch (err: any) {
      console.error("Error updating extra countdown:", err);
      setNotifMessage(`❌ Erro ao atualizar contagem: ${err?.message || String(err)}`);
      setTimeout(() => setNotifMessage(null), 8000);
    }
  };

  // Clear / restore default backup list
  const handleResetToDefaults = async () => {
    if (!checkAdminWritePermission()) return;
    try {
      // Restore Cloud configuration setting defaults
      const docRef = doc(db, 'settings', 'app');
      await setDoc(docRef, {
        logoUrl: '',
        spoilerTitle: 'Aguardando Próximos Spoilers! 🔮',
        spoilerDesc: 'Ainda não temos spoilers ativos para esta semana. Fique atento ao nosso canal no WhatsApp para novidades e acompanhe a contagem regressiva toda segunda às 17h30!',
        spoilerImageUrl: '',
        forceReveal: false,
        revealedAt: 0,
        admin_secret: "pkxd2026_super_secret_admin_key"
      }, { merge: true });

      // For news, empty or add default items to DB
      for (const item of INITIAL_NEWS) {
        await setDoc(doc(db, 'news', item.id), {
          ...item,
          admin_secret: "pkxd2026_super_secret_admin_key"
        });
      }

      setNewsToEdit(null);
      triggerAudio('levelUp');
      setNotifMessage("✅ CONFIGURAÇÕES DE FÁBRICA RESTAURADAS NO BANCO DE DADOS! 🌐");
      setTimeout(() => setNotifMessage(null), 4500);
    } catch (err: any) {
      console.error("Error resetting defaults:", err);
      setNotifMessage(`❌ Erro ao resetar dados: ${err?.message || String(err)}`);
      setTimeout(() => setNotifMessage(null), 8000);
    }
  };

  // Interactive leveling feature
  const handleLevelUpCallback = () => {
    const nextLevel = fanLevel + 1;
    setFanLevel(nextLevel);
    localStorage.setItem('pkxd_fan_level', nextLevel.toString());
    triggerAudio('levelUp');
    setNotifMessage(`LEVEL UP! Você subiu para o Nível de Fã ${nextLevel}! 🌟`);
    setTimeout(() => setNotifMessage(null), 4000);
  };

  const handleAddFanXP = (amount: number, reason: string) => {
    let nextXp = fanXP + amount;
    setNotifMessage(`+${amount} XP ganho: ${reason}! ⚡`);
    setTimeout(() => setNotifMessage(null), 4000);

    if (nextXp >= 100) {
      nextXp = nextXp - 100;
      handleLevelUpCallback();
    } else {
      triggerAudio('success');
    }
    setFanXP(nextXp);
    localStorage.setItem('pkxd_fan_xp', nextXp.toString());
  };

  const handleRatePastSpoiler = async (id: string, rating: number) => {
    try {
      const target = pastSpoilers.find(s => s.id === id);
      if (!target) return;

      const currentSum = target.ratingSum || 0;
      const currentCount = target.ratingCount || 0;

      const nextSum = currentSum + rating;
      const nextCount = currentCount + 1;

      // Sync to Firestore
      const spoilerRef = doc(db, 'past_spoilers', id);
      await setDoc(spoilerRef, {
        ratingSum: nextSum,
        ratingCount: nextCount
      }, { merge: true });

      // Add XP for rating
      handleAddFanXP(15, 'Avaliação de Spoiler 🔮');
    } catch (err: any) {
      console.warn("Erro ao registrar avaliação base:", err);
      handleFirestoreError(err, OperationType.WRITE, 'past_spoilers');
    }
  };

  const handleReactPastSpoiler = async (id: string, emoji: string) => {
    try {
      const target = pastSpoilers.find(s => s.id === id);
      if (!target) return;

      const currentReactions = target.reactions || {};
      const nextReactionCount = (currentReactions[emoji] || 0) + 1;

      const updatedReactions = {
        ...currentReactions,
        [emoji]: nextReactionCount
      };

      const spoilerRef = doc(db, 'past_spoilers', id);
      await setDoc(spoilerRef, {
        reactions: updatedReactions
      }, { merge: true });

      handleAddFanXP(5, `Reação ${emoji} a Spoiler 🔮`);
    } catch (err: any) {
      console.warn("Erro ao registrar reação ao spoiler:", err);
      handleFirestoreError(err, OperationType.WRITE, 'past_spoilers');
    }
  };

  return (
    <div id="pkxd-app-root" className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-yellow-400 selection:text-black pb-16 relative overflow-x-hidden bg-pkxd-texture">
      
      {/* Premium ambient space backdrop glows */}
      <div className="absolute top-1/4 right-[10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full filter blur-[120px] pointer-events-none select-none" />
      <div className="absolute bottom-1/3 left-[5%] w-[450px] h-[450px] bg-pink-500/10 rounded-full filter blur-[150px] pointer-events-none select-none" />
      <div className="absolute top-[80%] right-[5%] w-[400px] h-[400px] bg-cyan-400/10 rounded-full filter blur-[140px] pointer-events-none select-none" />

      {/* Upper Micro banner for System Alerts/Gamer Levels */}
      <div className="bg-gradient-to-r from-purple-800 via-pink-600 to-purple-900 py-2.5 px-4 text-center text-white text-xs font-bold leading-tight flex flex-wrap items-center justify-center gap-3 shadow-md relative z-30 select-none border-b-2 border-white/10">
        <span className="flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-yellow-300 fill-yellow-300" />
          Nível de Explorador: <strong className="text-yellow-300">Fã Lvl {fanLevel}</strong>
          <span className="text-zinc-300 px-1.5 py-0.5 rounded-md bg-black/30 font-mono text-[10px]">
            {fanXP}% XP
          </span>
        </span>
        <span className="opacity-40 font-mono hidden md:inline">|</span>
        <span className="hidden md:inline text-[11px] font-mono text-pink-100">
          Notícias atualizadas em tempo real para fãs do PK XD
        </span>
      </div>

      {/* Floating interactive alerts display (Completely redesigned for scroll-responsive UI/UX as requested!) */}
      {notifMessage && (
        <div 
          id="floating-celebration" 
          className={`fixed left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md bg-zinc-950/95 border-2 backdrop-blur-md text-white p-4 rounded-2xl transition-all duration-300 text-left flex items-start gap-3 relative overflow-hidden ${
            scrollY > 400 
              ? 'bottom-24 border-pink-500/85 shadow-[0_-12px_35px_rgba(236,72,153,0.35)] animate-slide-up' 
              : 'top-24 border-cyan-400/85 shadow-[0_12px_35px_rgba(34,211,238,0.25)] animate-scale-up'
          }`}
        >
          {/* Neon side indicator */}
          <div className={`absolute top-0 bottom-0 left-0 w-1.5 rounded-l-md bg-gradient-to-b ${
            scrollY > 400 
              ? 'from-pink-500 via-rose-500 to-yellow-300' 
              : 'from-cyan-400 via-pink-500 to-yellow-300'
          }`} />
          
          <div className={`p-1.5 border rounded-xl flex-shrink-0 animate-pulse ${
            scrollY > 400 
              ? 'bg-pink-500/10 text-pink-400 border-pink-500/20' 
              : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
          }`}>
            <BellRing className="w-5 h-5 animate-swing" />
          </div>
          <div className="flex-1 space-y-0.5 text-left pl-1">
            <h5 className={`text-[10px] sm:text-[11px] font-mono tracking-widest font-extrabold uppercase flex items-center justify-between ${
              scrollY > 400 ? 'text-pink-400' : 'text-cyan-300'
            }`}>
              <span>ALERTA CENTRAL PK XD</span>
              <span className="text-[9px] text-gray-500 font-normal">AGORA</span>
            </h5>
            <p className="text-xs sm:text-xs font-sans font-black text-gray-150 leading-relaxed">{notifMessage}</p>
          </div>
          <button 
            onClick={() => setNotifMessage(null)}
            className="text-gray-400 hover:text-white text-xs pl-1.5 cursor-pointer font-bold active:scale-95 flex-shrink-0"
            title="Fechar Notificação"
          >
            ✕
          </button>
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
          
          {/* Brand Name - Site icon removed as requested & changed to PKXD Hub */}
          <div>
            <h1 className="font-sans font-black text-xl sm:text-2xl tracking-tighter text-white uppercase drop-shadow-[0_2px_0_rgba(0,0,0,0.4)] transform skew-x-[-2deg]">
              PKXD <span className="text-yellow-300">Hub</span>
            </h1>
            <p className="font-sans text-[9px] sm:text-[10px] text-purple-200 font-extrabold uppercase tracking-widest leading-none">
              Notícias, Spoilers e Códigos!
            </p>
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
            Seja bem-vindo ao portal fan-hub do <strong>PKXD Hub</strong>! Fique ligado nas datas, resgate as joias secretas, junte-se à nossa gigante comunidade do WhatsApp e veja as revelações de spoilers toda segunda-feira.
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
                {user?.uid === 'admin_fallback' ? (
                  <div className="bg-emerald-500/10 border-2 border-emerald-500/30 p-4 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 text-left shadow-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black animate-pulse">
                        PIN
                      </div>
                      <div>
                        <h4 className="font-sans font-black text-emerald-400 text-sm sm:text-base uppercase tracking-wide flex items-center gap-1.5">
                          ⚡ PORTAL ADMIN SINCRONIZADO (MODO PIN)
                        </h4>
                        <p className="font-sans text-[11px] text-zinc-300 leading-normal max-w-2xl">
                          Você acessou usando o Código PIN de emergência. Seus posts, códigos de vídeos e spoilers criados aqui <strong>são sincronizados e gravados na nuvem do Firestore em tempo real</strong> para todos os jogadores do PK XD! 🚀
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-1.5 px-4 py-2 bg-red-400/20 hover:bg-red-400/30 text-red-350 hover:text-white rounded-xl text-xs font-black uppercase transition-all tracking-wider border border-red-500/30 cursor-pointer whitespace-nowrap"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sair do PIN</span>
                    </button>
                  </div>
                ) : (
                  <div className="bg-emerald-500/10 border-2 border-emerald-500/30 p-4 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 text-left shadow-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
                        OK
                      </div>
                      <div>
                        <h4 className="font-sans font-black text-white text-sm sm:text-base uppercase tracking-wide">
                          PAINEL DE CONTROLE CENTRAL ATIVO (NUVEM REAL)
                        </h4>
                        <p className="font-sans text-[11px] text-emerald-300">
                          Acesso autorizado via Login Google! Suas publicações estão sincronizadas em tempo real com todo o fã-clube.
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
                )}

                <AdminPanel 
                  user={user}
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
                        Você está autenticado como leitor de email <span className="font-mono text-white underline">{maskEmail(user.email)}</span>, mas seu usuário não possui permissão de escrita de administrador no sistema. 
                      </p>
                      <p className="text-gray-400">
                        Se você for o proprietário deste portal, por favor faça login com o endereço de email do Administrador do PKXD Hub correspondente.
                      </p>
                    </div>
                  ) : (
                    <p className="font-sans text-xs text-gray-400 leading-relaxed">
                      Clique no botão para fazer login seguro com a conta Google PK XD oficial para gerenciar spoilers, shorts, novidades de transmissão e as teorias da semana!
                    </p>
                  )}

                  <div className="pt-2 w-full max-w-2xl mx-auto space-y-5">
                    {user ? (
                      <button
                        onClick={handleLogout}
                        className="w-full sm:w-auto px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-sans font-black text-xs uppercase tracking-wider cursor-pointer border border-zinc-700"
                      >
                        Sair da Conta (Logout)
                      </button>
                    ) : (
                      <div className="w-full space-y-4">
                        {/* Selector Tabs */}
                        <div className="flex bg-zinc-950/80 p-1 rounded-2xl border border-white/5 max-w-md mx-auto">
                          <button
                            type="button"
                            onClick={() => {
                              triggerAudio('tap');
                              setAdminAuthTab('email');
                              setGoogleAuthError(null);
                            }}
                            className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                              adminAuthTab === 'email' ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
                            }`}
                          >
                            🔐 E-mail & Senha
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              triggerAudio('tap');
                              setAdminAuthTab('google');
                              setGoogleAuthError(null);
                            }}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                              adminAuthTab === 'google' ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
                            }`}
                          >
                            🌐 Google
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              triggerAudio('tap');
                              setAdminAuthTab('pin');
                              setGoogleAuthError(null);
                            }}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                              adminAuthTab === 'pin' ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
                            }`}
                          >
                            🔑 PIN
                          </button>
                        </div>

                        {/* Rendering active tab form */}
                        {adminAuthTab === 'email' && (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleEmailLogin(adminEmail, adminPassword);
                            }}
                            className="bg-zinc-950/60 p-5 rounded-2xl border border-white/5 space-y-4 text-left max-w-md mx-auto"
                          >
                            <div className="space-y-1">
                              <h5 className="text-[11px] font-black text-indigo-400 uppercase tracking-widest pl-0.5">
                                LOGIN COM CONTA ADMINISTRADORA REAL
                              </h5>
                              <p className="text-[10px] text-zinc-400 leading-normal pl-0.5">
                                Conecte-se com seu e-mail do Firebase para obter token real. Isso habilita sincronização na nuvem oficial para todo fã-clube!
                              </p>
                            </div>
                            <div className="space-y-2.5">
                              <input
                                type="email"
                                required
                                placeholder="E-mail do Administrador"
                                value={adminEmail}
                                onChange={(e) => setAdminEmail(e.target.value)}
                                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-indigo-500 transition-all font-mono"
                              />
                              <input
                                type="password"
                                required
                                minLength={6}
                                placeholder="Senha da Conta"
                                value={adminPassword}
                                onChange={(e) => setAdminPassword(e.target.value)}
                                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-indigo-500 transition-all font-mono"
                              />
                            </div>
                            
                            <button
                              type="submit"
                              disabled={isAuthenticating}
                              className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-550 active:scale-[0.98] text-white font-sans font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-md transition-all flex items-center justify-center gap-1.5"
                            >
                              <span>{isAuthenticating ? 'CONECTANDO...' : 'ENTRAR COMO PORTAL ADMIN CLOUD 🔓'}</span>
                            </button>
                          </form>
                        )}

                        {adminAuthTab === 'google' && (
                          <div className="bg-zinc-950/60 p-5 rounded-2xl border border-white/5 space-y-4 max-w-md mx-auto text-center">
                            <p className="text-xs text-zinc-300">
                              Entre com sua conta Google oficial como administrador.
                            </p>
                            <div className="flex flex-col gap-2.5">
                              <button
                                onClick={handleLogin}
                                disabled={isAuthenticating}
                                className="w-full px-5 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-sans font-black text-xs sm:text-sm rounded-xl border-b-4 border-indigo-900 active:border-b-0 cursor-pointer shadow-lg transition-all flex items-center justify-center gap-2"
                              >
                                <Lock className="w-4 h-4" />
                                <span>{isAuthenticating ? 'ENTRANDO...' : '🔐 LOGIN VIA POPUP'}</span>
                              </button>

                              <button
                                onClick={handleLoginRedirect}
                                disabled={isAuthenticating}
                                className="w-full px-5 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-sans font-black text-xs sm:text-sm rounded-xl border-b-4 border-cyan-900 active:border-b-0 cursor-pointer shadow-lg transition-all flex items-center justify-center gap-2"
                              >
                                <ExternalLink className="w-4 h-4" />
                                <span>{isAuthenticating ? 'ENTRANDO...' : '📱 LOGIN REDIRECIONAR (CELULAR)'}</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {adminAuthTab === 'pin' && (
                          <div className="bg-zinc-950/60 p-5 rounded-2xl border border-white/5 space-y-3 max-w-md mx-auto text-left">
                            <p className="text-zinc-350 text-[11px] font-sans">
                              ✅ <strong>Modo PIN Sincronizado:</strong> O login por PIN de backup agora <strong>suporta sincronização total na nuvem real</strong>. Posts e configurações que você criar aqui atualizarão instantaneamente em tempo real para os outros aparelhos! 🚀
                            </p>
                            <div className="flex gap-2 pt-1">
                              <input
                                type="password"
                                placeholder="Senha PIN de admin"
                                value={inputPasscode}
                                onChange={(e) => setInputPasscode(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handlePasscodeLogin();
                                }}
                                className="bg-zinc-900 text-white placeholder-zinc-650 text-xs px-3 py-2 rounded-xl border border-white/10 focus:outline-none focus:border-indigo-500 w-full font-mono"
                              />
                              <button
                                onClick={handlePasscodeLogin}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold font-sans cursor-pointer whitespace-nowrap"
                              >
                                Entrar PIN
                              </button>
                            </div>
                            {passcodeError && (
                              <p className="text-red-400 text-[11px] font-sans pr-1">{passcodeError}</p>
                            )}
                          </div>
                        )}

                        {googleAuthError && (
                          <div className="max-w-md mx-auto p-4 bg-red-950/40 border border-red-500/30 rounded-2xl text-left space-y-2">
                            <div className="flex items-center gap-2 text-red-400 font-extrabold text-xs uppercase">
                              <AlertTriangle className="w-4 h-4" />
                              <span>Erro de Conexão</span>
                            </div>
                            <p className="text-gray-300 text-xs font-sans leading-relaxed whitespace-pre-wrap bg-black/40 border border-red-500/10 p-3 rounded-xl">
                              {googleAuthError}
                            </p>
                            <p className="text-[11px] text-indigo-400 font-sans leading-relaxed mt-1">
                              💡 <strong>Caso use E-mail/Senha:</strong> Registre-se primeiro no formulário na seção <strong>"Fã Level"</strong> abaixo usando seu e-mail de admin cadastrado. Depois, faça o login dele aqui no painel usando e-mail e senha correspondentes!
                            </p>
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
                  onRate={handleRatePastSpoiler}
                  onReact={handleReactPastSpoiler}
                />
              </div>

              {/* CANDIDATAR-SE A ADMIN BANNER - Placed exactly below the spoiler section as requested */}
              <div className="max-w-4xl mx-auto mt-8 mb-6 px-4 sm:px-0" id="admin-application-banner-under-spoilers">
                <div className="bg-gradient-to-r from-purple-900/60 via-indigo-950/70 to-zinc-900 border-2 border-purple-500/30 rounded-2xl p-6 shadow-[0_4px_25px_rgba(139,92,246,0.15)] hover:shadow-[0_4px_35px_rgba(139,92,246,0.25)] hover:border-purple-500/50 transition-all duration-300 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                  {/* Glowing neon side effect */}
                  <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-pink-500 to-purple-600" />
                  
                  <div className="space-y-2 text-center md:text-left">
                    <h4 className="font-sans font-black text-lg text-white uppercase tracking-tight flex items-center gap-2 justify-center md:justify-start font-bold">
                      <span>✨ Quer fazer parte da equipe PKXD Hub?</span>
                    </h4>
                    <p className="font-sans text-xs text-gray-300 max-w-xl leading-relaxed">
                      Estamos recrutando novos administradores focados, criativos e cheios de energia! Se você ama o PK XD, quer ajudar a organizar spoilers, posts de novidades e gerenciar o fã-clube oficial do site, inscreva-se agora mesmo!
                    </p>
                  </div>

                  <a 
                    href="https://forms.gle/LGDPe1SrsTdcwNZCA"
                    target="_blank" 
                    rel="noreferrer"
                    onClick={() => triggerAudio('tap')}
                    className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-650 hover:from-pink-400 hover:to-indigo-550 active:scale-[0.98] text-white font-sans font-black text-xs uppercase tracking-wider rounded-xl shadow-lg border border-white/20 cursor-pointer flex items-center justify-center gap-2 transition-all flex-shrink-0 animate-pulse hover:animate-none"
                  >
                    <span>🔐 Candidatar para Admin 🌟</span>
                  </a>
                </div>
              </div>
            </>
          );
        })()}

        {/* Fan Level section */}
        <div className="max-w-4xl mx-auto" id="fan-level-section-wrapper">
          <FanLevelSection 
            level={fanLevel}
            xp={fanXP}
            onAddXP={handleAddFanXP}
            onLevelUp={handleLevelUpCallback}
            soundEnabled={soundEnabled}
            user={user}
            onLogin={handleLogin}
            onLoginRedirect={handleLoginRedirect}
            onLogout={handleLogout}
            onEmailLogin={handleEmailLogin}
            onEmailRegister={handleEmailRegister}
            authError={googleAuthError}
            isAdmin={isAdmin}
          />
        </div>

        {/* Promo Code Redeemer Panel with 7-Day Expirations */}
        <div className="max-w-4xl mx-auto" id="promo-code-redeemer-section-wrapper">
          <PromoCodeRedeemer 
            videos={newsList.filter(item => {
              if (item.id === '1' || item.id === '2') return false;
              const timestamp = parseInt(item.id);
              if (isNaN(timestamp)) return true;
              // Ignore filtering for static fallback default contents (low ID integer markers)
              if (timestamp < 100000) return true;
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
            onAddXP={handleAddFanXP}
          />
        </div>

        {/* WhatsApp Channel Promo Feature banner */}
        <WhatsAppPromo channelUrl={WHATSAPP_CHANNEL_URL} onAddXP={handleAddFanXP} />

        {/* Extra Information: FAQ/Guide cards */}
        <div className="bg-zinc-900/40 rounded-3xl border border-white/5 p-6 sm:p-8 space-y-6 text-left select-none">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-300 fill-yellow-300" />
            <h3 className="font-sans font-black text-xl text-white uppercase tracking-wide">
              Sobre o PKXD Hub
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
          
          {/* Logo brand - Removed site icon and updated title for PKXD Hub */}
          <div className="flex items-center gap-2">
            <strong className="font-sans text-sm text-gray-300 uppercase tracking-wider">
              PKXD Hub • 2026
            </strong>
          </div>

          <p className="font-sans text-[11px] text-gray-500 max-w-sm sm:text-right">
            Este site é um portal independente mantido por fãs de PK XD. PK XD é uma marca registrada de suas respectivas publicadoras. Todas as mídias pertencem a seus legítimos donos.
          </p>

        </div>
      </footer>

      {/* FLOATING SECTIONS MENU BUTTON - Redesigned to be delicate, small and beautiful as requested */}
      <div className="fixed bottom-6 right-6 z-45">
        <button 
          onClick={() => {
            setIsNavMenuOpen(!isNavMenuOpen);
            triggerAudio('tap');
          }}
          className="w-12 h-12 bg-zinc-950/95 hover:bg-purple-950 text-cyan-300 hover:text-yellow-300 rounded-full shadow-[0_4px_15px_rgba(236,72,153,0.3)] hover:shadow-[0_4px_25px_rgba(34,211,238,0.55)] border-2 border-cyan-400/60 active:scale-90 transition-all duration-200 cursor-pointer flex items-center justify-center group relative"
          title="Navegar pelas Seções"
          id="floating-navigation-compass-trigger"
        >
          {/* Subtle neon pulse background */}
          <span className="absolute -inset-1 rounded-full bg-cyan-400/10 blur-sm pointer-events-none group-hover:bg-cyan-400/25 transition-all duration-300" />
          <span className="absolute inset-0 rounded-full bg-cyan-500/10 animate-ping pointer-events-none" />
          
          <Compass className="w-5 h-5 animate-spin-slow group-hover:rotate-45 duration-500 text-cyan-400 group-hover:text-yellow-300" />
          
          <span className="absolute -top-1 -right-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow border border-white/20 uppercase tracking-widest">
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
                      { id: 'theories-section-wrapper', title: '📜 Teorias PKXD Hub', desc: 'Discussões semanais feitas pelos fãs' },
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
                <div className="p-6 border-t border-white/10 bg-black/40 text-center space-y-2.5">
                  <span className="text-[10px] text-gray-500 block">ADMINISTRAÇÃO & COMUNICADOS</span>
                  
                  {/* Candidate to Admin Form button */}
                  <a 
                    href="https://forms.gle/LGDPe1SrsTdcwNZCA"
                    target="_blank" 
                    rel="noreferrer"
                    onClick={() => triggerAudio('tap')}
                    className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-sans font-black text-xs uppercase tracking-wide rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md border border-indigo-500/30 cursor-pointer hover:scale-[1.01]"
                  >
                    <span>🔐 Candidatar a Admin 🌟</span>
                  </a>

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
                        new Notification('Portal PKXD Hub 🔔', {
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
