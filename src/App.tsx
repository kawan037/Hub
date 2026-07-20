import React, { useState, useEffect, useRef } from 'react';
import { INITIAL_NEWS } from './components/initialNews';
import { NewsItem, FeaturedVideo, Theory, ShortItem, PastSpoiler, AppNotification } from './types';
import CountdownWidget from './components/CountdownWidget';
import GiftCountdown from './components/GiftCountdown';
import WhatsAppPromo from './components/WhatsAppPromo';
import PartnerChannelPromo from './components/PartnerChannelPromo';
import AdminPanel from './components/AdminPanel';
import PromoCodeRedeemer from './components/PromoCodeRedeemer';
import FeaturedVideos from './components/FeaturedVideos';
import TheoriesSection from './components/TheoriesSection';
import BestShorts from './components/BestShorts';
import FanLevelSection from './components/FanLevelSection';
import PastSpoilersSection from './components/PastSpoilersSection';
import ApplicationsSection from './components/ApplicationsSection';
import SocialSection from './components/SocialSection';
import MissionsSection from './components/MissionsSection';
import AppleProfileHeader from './components/AppleProfileHeader';
import ArtesSection from './components/ArtesSection';
import PollsSection from './components/PollsSection';
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
  AlertTriangle,
  Trash2,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { playTapSound, playLevelUpSound, playSuccessSound } from './utils/audio';
import { motion, AnimatePresence } from 'motion/react';

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

  // State for gift countdown release timer
  const [giftCountdownTitle, setGiftCountdownTitle] = useState('🎁 PRESENTE SURPRESA!');
  const [giftCountdownDate, setGiftCountdownDate] = useState('');
  const [giftCountdownEnabled, setGiftCountdownEnabled] = useState(false);
  const [giftCountdownContent, setGiftCountdownContent] = useState('');

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
  const [activeTab, setActiveTab] = useState<'inicio' | 'comunidade' | 'missoes' | 'artes'>('inicio');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isAuthInitializing, setIsAuthInitializing] = useState(true);
  const [continuedAsGuest, setContinuedAsGuest] = useState(false);

  // Entry login modal states
  const [modalAuthTab, setModalAuthTab] = useState<'register' | 'login'>('register');
  const [modalEmail, setModalEmail] = useState('');
  const [modalPassword, setModalPassword] = useState('');
  const [modalNickname, setModalNickname] = useState('');
  const [modalAuthError, setModalAuthError] = useState<string | null>(null);

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

  // Simple robust state-based path router supporting browser navigation and deep linking (pathname + hash + search fallback)
  const [currentPath, setCurrentPath] = useState(() => {
    try {
      const path = decodeURIComponent(window.location.pathname);
      const hash = decodeURIComponent(window.location.hash);
      const search = decodeURIComponent(window.location.search);
      return `${path} ${hash} ${search}`;
    } catch (e) {
      return `${window.location.pathname} ${window.location.hash} ${window.location.search}`;
    }
  });

  const navigateTo = (path: string) => {
    try {
      const isGitHubPages = window.location.hostname.includes('github.io');
      let targetPath = path;
      const hashMatch = path.match(/#\w+$/);
      const hashSuffix = hashMatch ? hashMatch[0] : '';

      if (isGitHubPages) {
        // On GitHub Pages, let's preserve the repository prefix subdirectory to prevent global root 404s
        const segments = window.location.pathname.split('/');
        const base = segments[1]; // E.g., repo name
        
        if (path.toLowerCase().includes('admin')) {
          if (base && base !== 'admin' && base !== 'Admin') {
            targetPath = `/${base}/admin/${hashSuffix}`;
          } else {
            targetPath = `/admin/${hashSuffix}`;
          }
        } else if (path.toLowerCase().includes('inscric') || path.toLowerCase().includes('inscricao')) {
          // Use the replicated directory that contains index.html
          if (base && base !== 'inscricoes' && base !== 'Inscricoes' && base !== 'Inscrições') {
            targetPath = `/${base}/inscricoes/${hashSuffix}`;
          } else {
            targetPath = `/inscricoes/${hashSuffix}`;
          }
        } else {
          // Back to main index
          if (base && base !== 'inscricoes' && base !== 'Inscricoes' && base !== 'Inscrições' && base !== 'admin' && base !== 'Admin') {
            targetPath = `/${base}/${hashSuffix}`;
          } else {
            targetPath = `/${hashSuffix}`;
          }
        }
      } else {
        // Standard environments
        if (path.toLowerCase().includes('admin')) {
          targetPath = `/admin${hashSuffix}`;
        } else if (path.toLowerCase().includes('inscric') || path.toLowerCase().includes('inscricao')) {
          targetPath = `/inscricoes/${hashSuffix}`;
        } else {
          targetPath = `/${hashSuffix}`;
        }
      }

      window.history.pushState({}, '', targetPath);
      
      try {
        const p = decodeURIComponent(window.location.pathname);
        const h = decodeURIComponent(window.location.hash);
        const s = decodeURIComponent(window.location.search);
        setCurrentPath(`${p} ${h} ${s}`);
      } catch (e) {
        setCurrentPath(`${window.location.pathname} ${window.location.hash} ${window.location.search}`);
      }

      // scroll to top smoothly
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      console.error(e);
    }
  };

  const isAdminRoute = currentPath.toLowerCase().includes('/admin') || 
                        currentPath.toLowerCase().includes('admin');
  const showAdminPanel = isAdminRoute;
  const setShowAdminPanel = (show: boolean) => {
    if (show) {
      navigateTo('/admin');
    } else {
      navigateTo('/');
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      try {
        const p = decodeURIComponent(window.location.pathname);
        const h = decodeURIComponent(window.location.hash);
        const s = decodeURIComponent(window.location.search);
        setCurrentPath(`${p} ${h} ${s}`);
      } catch (e) {
        setCurrentPath(`${window.location.pathname} ${window.location.hash} ${window.location.search}`);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Register Service Worker for Web Push on mount
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('PKXD Central Service Worker registered successfully:', reg);
        })
        .catch((err) => {
          console.error('PKXD Central Service Worker registration failed:', err);
        });
    }
  }, []);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsAppInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsAppInstalled(true);
    }
    setDeferredPrompt(null);
  };
  
  const [newsToEdit, setNewsToEdit] = useState<NewsItem | null>(null);
  const [notifMessage, setNotifMessage] = useState<string | null>(null);

  // Dynamic scroll position state to make alert notifications scroll position responsive!
  const [scrollY, setScrollY] = useState(0);
  const isApplicationsRoute = currentPath.toLowerCase().includes('inscric') || 
                               currentPath.toLowerCase().includes('inscriç') || 
                               currentPath.toLowerCase().includes('inscricao');

  useEffect(() => {
    try {
      if (isAdminRoute) {
        document.title = "PKXD Central - Painel Admin";
      } else if (isApplicationsRoute) {
        document.title = "PKXD Central - Inscrições";
      } else {
        document.title = "PKXD Central";
      }
    } catch (e) {
      console.warn(e);
    }
  }, [isAdminRoute, isApplicationsRoute]);
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
  const [notificationReactions, setNotificationReactions] = useState<Record<string, 'like' | 'dislike'>>(() => {
    try {
      const saved = localStorage.getItem('pkxd_notif_reactions');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const handleNotificationReaction = (notifId: string, type: 'like' | 'dislike') => {
    triggerAudio('tap');
    setNotificationReactions(prev => {
      const current = prev[notifId];
      let updated: Record<string, 'like' | 'dislike'>;
      if (current === type) {
        // undo reaction
        const copy = { ...prev };
        delete copy[notifId];
        updated = copy;
      } else {
        updated = { ...prev, [notifId]: type };
      }
      try {
        localStorage.setItem('pkxd_notif_reactions', JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });
  };
  const [isNotifOverlayOpen, setIsNotifOverlayOpen] = useState(false);
  const [seenNotifIds, setSeenNotifIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('seen_notification_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [hasNotificationPermission, setHasNotificationPermission] = useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission === 'granted';
    }
    return false;
  });

  // Helper utility to convert base64 VAPID public key to Uint8Array
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Reusable function to subscribe the client to Web Push notifications
  const subscribeUserToPush = async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Web Push is not fully supported in this browser.');
      return;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      
      const keyRes = await fetch('/api/vapid-public-key');
      if (!keyRes.ok) throw new Error('Falha ao obter chave pública de push');
      const { publicKey: publicVapidKey } = await keyRes.json();
      
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
      });

      console.log('PKXD Central subscription generated:', subscription);

      // Secure serialization using .toJSON() to prevent empty object bugs in some browsers
      const serializedSubscription = subscription.toJSON();

      // Send subscription object to the server
      await fetch('/api/push-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serializedSubscription)
      });
    } catch (err) {
      console.error('Falha ao registrar push no servidor:', err);
    }
  };

  // Automatically attempt push subscription sync if permission is granted
  useEffect(() => {
    if (hasNotificationPermission) {
      subscribeUserToPush();
    }
  }, [hasNotificationPermission]);

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
          if (email === 'kawanyuri35@gmail.com' || email === 'eukoosh@gmail.com' || email === 'sg4924603@gmail.com') {
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
            setIsAuthInitializing(false);
            return;
          }
        } catch (e) {}

        setIsAdmin(false);
        setUser(null);
      }
      setIsAuthInitializing(false);
    });
    return () => unsubscribe();
  }, []);

  // Ensure authenticated user profile and email are ALWAYS successfully synced to Firestore cloud database
  useEffect(() => {
    const ensureUserProfileSynced = async () => {
      if (!user || user.uid === 'guest' || user.uid === 'guest_temp') return;
      
      const cleanedId = user.uid.trim();
      if (!cleanedId) return;

      const userDocRef = doc(db, 'leaderboard', cleanedId);
      try {
        // Read current progress from localStorage as fallback/initial values
        let currentLevel = 1;
        let currentXp = 0;
        let currentFlames = 1;
        let currentInstagram = '';
        let currentInstagramPublic = true;
        
        try {
          currentLevel = Number(localStorage.getItem('pkxd_fan_level')) || 1;
          currentXp = Number(localStorage.getItem('pkxd_fan_xp')) || 0;
          currentFlames = Number(localStorage.getItem('pkxd_fire_streak')) || 1;
          currentInstagram = localStorage.getItem('pkxd_user_instagram') || '';
          currentInstagramPublic = localStorage.getItem('pkxd_user_instagram_public') !== 'false';
        } catch (e) {}

        const payload: any = {
          id: cleanedId,
          email: user.email || '',
          name: user.displayName || localStorage.getItem('pkxd_username_nickname') || 'Fã Secreto',
          level: currentLevel,
          xp: currentXp,
          flames: currentFlames,
          instagram: currentInstagram,
          instagramPublic: currentInstagramPublic,
          photoUrl: user.photoURL || '',
          updatedAt: Date.now()
        };

        if (cleanedId === 'admin_fallback') {
          payload.admin_secret = "pkxd2026_super_secret_admin_key";
        }

        // We use setDoc with merge to ensure we don't overwrite any newer XP/level progress
        // if they already have one in Firestore, but we always write their email and ID!
        await setDoc(userDocRef, {
          id: cleanedId,
          email: user.email || '',
          name: payload.name,
          updatedAt: Date.now()
        }, { merge: true });

        console.log("Successfully ensured user profile and email are synced to cloud:", user.email);
      } catch (err) {
        console.warn("Could not ensure cloud user file is synchronized:", err);
      }
    };

    ensureUserProfileSynced();
  }, [user]);

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

  // Register service worker for mobile notifications support & restore favicon dynamic updates as requested
  useEffect(() => {
    let logoIconUrl = siteLogoUrl;
    if (!logoIconUrl || logoIconUrl.includes("photos.app.goo.gl") || logoIconUrl.includes("google.com/photos")) {
      logoIconUrl = "./favicon.svg";
    }
    
    if (logoIconUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = logoIconUrl;
      if (logoIconUrl.endsWith('.svg')) {
        link.setAttribute('type', 'image/svg+xml');
      } else {
        link.removeAttribute('type');
      }
    }
  }, [siteLogoUrl]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('Service Worker registered successfully:', reg.scope);
        })
        .catch((err) => {
          console.error('Service Worker registration failed:', err);
        });
    }
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

        if (data.giftCountdownTitle !== undefined && data.giftCountdownTitle !== null) {
          setGiftCountdownTitle(data.giftCountdownTitle);
        }

        if (data.giftCountdownDate !== undefined && data.giftCountdownDate !== null) {
          setGiftCountdownDate(data.giftCountdownDate);
        }

        if (data.giftCountdownEnabled !== undefined && data.giftCountdownEnabled !== null) {
          setGiftCountdownEnabled(data.giftCountdownEnabled);
        }

        if (data.giftCountdownContent !== undefined && data.giftCountdownContent !== null) {
          setGiftCountdownContent(data.giftCountdownContent);
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
        setGiftCountdownTitle('🎁 PRESENTE SURPRESA!');
        setGiftCountdownDate('');
        setGiftCountdownEnabled(false);
        setGiftCountdownContent('');
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
      list.sort((a, b) => {
        const timeA = a.createdAt || parseInt(a.id) || 0;
        const timeB = b.createdAt || parseInt(b.id) || 0;
        return timeB - timeA;
      });
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

        // Trigger native system notification (using service worker wrapper for mobile compatibility!)
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            const notifTitle = newNotif.title;
            const notifOptions = {
              body: newNotif.body,
              tag: newNotif.id,
              icon: 'https://img.icons8.com/color/96/000000/bell.png',
              badge: '/favicon.svg',
              vibrate: [100, 50, 100]
            };

            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.ready.then((reg) => {
                reg.showNotification(notifTitle, notifOptions);
              }).catch(() => {
                new Notification(notifTitle, notifOptions);
              });
            } else {
              new Notification(notifTitle, notifOptions);
            }
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
      list.sort((a, b) => {
        const timeA = a.createdAt || parseInt(a.id) || 0;
        const timeB = b.createdAt || parseInt(b.id) || 0;
        return timeB - timeA;
      });
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
      list.sort((a, b) => {
        const timeA = a.createdAt || parseInt(a.id) || 0;
        const timeB = b.createdAt || parseInt(b.id) || 0;
        return timeB - timeA;
      });
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
      list.sort((a, b) => {
        const timeA = a.createdAt || parseInt(a.id) || 0;
        const timeB = b.createdAt || parseInt(b.id) || 0;
        return timeB - timeA;
      });
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
      list.sort((a, b) => {
        const timeA = a.createdAt || parseInt(a.id) || 0;
        const timeB = b.createdAt || parseInt(b.id) || 0;
        return timeB - timeA;
      });
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
    const validPasscodes = ['pkxdcentral2026_portal_admin', 'kawanyuri_adm_seguro_99', 'central_pkxd_super_acesso_real', 'bela12@!', '19810314'];
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
      setContinuedAsGuest(false);
      try {
        sessionStorage.removeItem('pkxd_continued_as_guest');
      } catch (e) {}

      // Reset the local stats and localStorage key defaults to completely isolate anonymous sessions from authenticated sessions
      setFanLevel(1);
      setFanXP(0);
      try {
        localStorage.setItem('pkxd_fan_level', '1');
        localStorage.setItem('pkxd_fan_xp', '0');
        localStorage.setItem('pkxd_fire_streak', '1');
        localStorage.setItem('pkxd_gems_count', '150');
        localStorage.setItem('pkxd_coins_count', '1000');
        const randomNum = String(Math.floor(10 + Math.random() * 980)).padStart(2, '0');
        localStorage.setItem('pkxd_username_nickname', `Convidado_${randomNum}`);
        localStorage.removeItem('pkxd_user_instagram');
        localStorage.setItem('pkxd_user_instagram_public', 'true');
        
        // Regenerate unique clientId for a clean slate anonymous session
        const newClientId = 'u_' + Math.random().toString(36).substring(2, 11);
        localStorage.setItem('pkxd_user_clientId', newClientId);
      } catch (e) {}

      triggerAudio('tap');
      setNotifMessage("Você deslogou com sucesso!");
      setTimeout(() => setNotifMessage(null), 4000);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleSwitchTab = (tab: 'register' | 'login') => {
    triggerAudio('tap');
    setModalAuthTab(tab);
    setGoogleAuthError(null);
    setModalAuthError(null);
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

  // Helper to compress a single base64 image on the client side
  const compressBase64Image = (base64Str: string, maxDimension = 900, quality = 0.72): Promise<string> => {
    return new Promise((resolve) => {
      if (!base64Str || !base64Str.startsWith('data:image/')) {
        resolve(base64Str);
        return;
      }
      if (base64Str.length < 25000) {
        resolve(base64Str);
        return;
      }
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', quality);
            resolve(compressed);
          } else {
            resolve(base64Str);
          }
        } catch (err) {
          console.warn("Compression failed, using original", err);
          resolve(base64Str);
        }
      };
      img.onerror = () => {
        resolve(base64Str);
      };
      img.src = base64Str;
    });
  };

  // Helper to scan a text block (like description markdown) and compress any embedded base64 images
  const compressAllBase64InText = async (text: string): Promise<string> => {
    if (!text || !text.includes('data:image/')) return text;
    const regex = /data:image\/[a-zA-Z+.-]+;base64,[a-zA-Z0-9+/=]+/g;
    const matches = text.match(regex);
    if (!matches) return text;

    let result = text;
    const uniqueMatches = Array.from(new Set(matches));
    for (const match of uniqueMatches) {
      try {
        if (match.length > 30000) { // Only compress if over ~30KB
          const compressed = await compressBase64Image(match, 900, 0.72);
          result = result.split(match).join(compressed);
        }
      } catch (err) {
        console.warn("Failed to compress embedded base64:", err);
      }
    }
    return result;
  };

  // Update spoiler settings and add to history
  const handleUpdateSpoilerSettings = async (title: string, desc: string, imageUrl?: string, forceRevealActive: boolean = false) => {
    if (!checkAdminWritePermission()) return;
    try {
      let finalDesc = desc;
      let finalImageUrl = imageUrl || '';

      if (finalDesc.includes('data:image/')) {
        finalDesc = await compressAllBase64InText(finalDesc);
      }
      if (finalImageUrl.startsWith('data:image/')) {
        finalImageUrl = await compressBase64Image(finalImageUrl, 900, 0.72);
      }

      const docRef = doc(db, 'settings', 'app');
      await setDoc(docRef, {
        spoilerTitle: title,
        spoilerDesc: finalDesc,
        spoilerImageUrl: finalImageUrl,
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
        description: finalDesc,
        imageUrl: finalImageUrl,
        createdAt: Date.now(),
        admin_secret: "pkxd2026_super_secret_admin_key"
      });

      // Automatically send a push notification document for the new spoiler/story publication!
      const notifId = Date.now().toString();
      const notifRef = doc(db, 'notifications', notifId);
      const notifTitle = forceRevealActive ? '⚡ NOVO SPOILER LIBERADO AGORA!' : '🔮 AGENDAMENTO DE NOVO SPOILER!';
      const notifBody = `Confira já os novos spoilers oficiais: ${title}`;
      
      await setDoc(notifRef, {
        id: notifId,
        title: notifTitle,
        body: notifBody,
        type: 'story_published',
        createdAt: Date.now(),
        admin_secret: "pkxd2026_super_secret_admin_key"
      });

      // Fetch our secure and robust API route to broadcast immediately
      fetch('/api/send-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: notifTitle,
          body: notifBody,
          admin_secret: "pkxd2026_super_secret_admin_key",
          url: '/'
        })
      }).catch(err => console.error("Error broadcasting push:", err));

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
      let finalDesc = desc;
      let finalImageUrl = imageUrl || '';

      if (finalDesc.includes('data:image/')) {
        finalDesc = await compressAllBase64InText(finalDesc);
      }
      if (finalImageUrl.startsWith('data:image/')) {
        finalImageUrl = await compressBase64Image(finalImageUrl, 900, 0.72);
      }

      const pastId = Date.now().toString();
      const pastRef = doc(db, 'past_spoilers', pastId);
      await setDoc(pastRef, {
        id: pastId,
        title,
        description: finalDesc,
        imageUrl: finalImageUrl,
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
        const notifTitle = '⚠️ ALERT: SPOILERS ADIADOS!';
        const notifBody = message || 'Os spoilers oficiais do PK XD atrasaram um pouquinho do cronograma original.';
        
        await setDoc(notifRef, {
          id: notifId,
          title: notifTitle,
          body: notifBody,
          type: 'delayed_alert',
          createdAt: Date.now(),
          admin_secret: "pkxd2026_super_secret_admin_key"
        });

        // Fetch our secure and robust API route to broadcast immediately
        fetch('/api/send-push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: notifTitle,
            body: notifBody,
            admin_secret: "pkxd2026_super_secret_admin_key",
            url: '/'
          })
        }).catch(err => console.error("Error broadcasting delayed push:", err));
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

      // Fetch our secure and robust API route to broadcast immediately
      fetch('/api/send-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body,
          admin_secret: "pkxd2026_super_secret_admin_key",
          url: '/'
        })
      }).catch(err => console.error("Error broadcasting custom push:", err));

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
      let finalDesc = desc;
      let finalImageUrl = imageUrl || '';

      if (finalDesc.includes('data:image/')) {
        finalDesc = await compressAllBase64InText(finalDesc);
      }
      if (finalImageUrl.startsWith('data:image/')) {
        finalImageUrl = await compressBase64Image(finalImageUrl, 900, 0.72);
      }

      const docRef = doc(db, 'past_spoilers', id);
      await setDoc(docRef, {
        id,
        title,
        description: finalDesc,
        imageUrl: finalImageUrl,
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

  // Gift countdown handler
  const handleUpdateGiftCountdown = async (title: string, date: string, enabled: boolean, content: string) => {
    if (!checkAdminWritePermission()) return;
    try {
      const docRef = doc(db, 'settings', 'app');
      await setDoc(docRef, {
        giftCountdownTitle: title,
        giftCountdownDate: date,
        giftCountdownEnabled: enabled,
        giftCountdownContent: content,
        admin_secret: "pkxd2026_super_secret_admin_key"
      }, { merge: true });
      triggerAudio('success');
      setNotifMessage("✅ Contagem regressiva de Presente/Código salva com sucesso! 🎁");
      setTimeout(() => setNotifMessage(null), 3500);

      // Trigger automatic global push notification to let everyone know about the release!
      const notifId = Date.now().toString();
      const notifRef = doc(db, 'notifications', notifId);
      await setDoc(notifRef, {
        id: notifId,
        title: title || '🎁 PRESENTE REVELADO!',
        body: enabled 
          ? `Uma nova contagem regressiva para presentear a comunidade foi iniciada! Liberação em: ${new Date(date).toLocaleString('pt-BR')}`
          : `O cronômetro de presentes foi alterado pelo administrador.`,
        type: 'countdown_alert',
        createdAt: Date.now()
      });
    } catch (err: any) {
      console.error("Error updating gift countdown:", err);
      setNotifMessage(`❌ Erro ao atualizar presente: ${err?.message || String(err)}`);
      setTimeout(() => setNotifMessage(null), 8000);
    }
  };

  // Delete notification handler (admin exclusive)
  const handleDeleteNotification = async (id: string) => {
    if (!checkAdminWritePermission()) return;
    try {
      await deleteDoc(doc(db, 'notifications', id));
      triggerAudio('success');
      setNotifMessage("✅ Notificação apagada do banco com sucesso! 🗑️");
      setTimeout(() => setNotifMessage(null), 3500);
    } catch (err: any) {
      console.error("Error deleting notification:", err);
      setNotifMessage(`❌ Erro ao apagar notificação: ${err?.message || String(err)}`);
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

    let levelsGained = 0;
    while (nextXp >= 100) {
      nextXp -= 100;
      levelsGained++;
    }

    if (levelsGained > 0) {
      const finalLevel = fanLevel + levelsGained;
      setFanLevel(finalLevel);
      localStorage.setItem('pkxd_fan_level', finalLevel.toString());
      triggerAudio('levelUp');
      setNotifMessage(`LEVEL UP x${levelsGained}! Você subiu para o Nível de Fã ${finalLevel}! 🌟`);
      setTimeout(() => setNotifMessage(null), 4000);
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
      handleAddFanXP(150, 'Avaliação de Spoiler 🔮');
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

      handleAddFanXP(50, `Reação ${emoji} a Spoiler 🔮`);
    } catch (err: any) {
      console.warn("Erro ao registrar reação ao spoiler:", err);
      handleFirestoreError(err, OperationType.WRITE, 'past_spoilers');
    }
  };

  const unreadNotifications = notificationList.filter(n => !seenNotifIds.includes(n.id));
  const unreadCount = unreadNotifications.length;

  return (
    <div id="pkxd-app-root" className="theme-dark min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-yellow-400 selection:text-black pb-16 relative overflow-x-hidden bg-pkxd-texture">
      
      {/* Entry Auth & Guest Modal Overlay */}
      <AnimatePresence>
        {!isAuthInitializing && !user && !continuedAsGuest && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl overflow-y-auto">
            {/* Ambient glows behind the modal */}
            <div className="absolute top-1/4 left-1/4 w-60 h-60 bg-pink-500/10 rounded-full filter blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-60 h-60 bg-indigo-500/10 rounded-full filter blur-3xl pointer-events-none" />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="bg-zinc-900 border border-pink-500/30 rounded-3xl w-full max-w-md p-6 sm:p-8 relative shadow-[0_10px_50px_rgba(219,39,119,0.2)] space-y-6 text-center select-none my-8"
            >
              {/* Header Icon */}
              <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400 shadow-[0_0_20px_rgba(236,72,153,0.35)] animate-pulse">
                <Gamepad2 className="w-8 h-8 fill-pink-400" />
              </div>

              {/* Title Block */}
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 bg-pink-500/10 border border-pink-500/30 px-3 py-1 rounded-full text-pink-400 font-mono text-[10px] font-extrabold uppercase tracking-widest">
                  <Sparkles className="w-3 h-3 text-pink-400" />
                  Portal PK XD Central
                </div>
                <h3 className="font-sans font-black text-2xl text-white uppercase tracking-wider leading-none pt-2">
                  Seja Bem-vindo! 🔮
                </h3>
                <p className="font-sans text-[11px] text-zinc-400 leading-normal">
                  Crie sua conta de fã para subir no Ranking, mudar seu apelido e salvar suas conquistas!
                </p>
              </div>

              {/* Auth Mode Tabs Selector */}
              <div className="flex bg-zinc-950/80 p-1 rounded-2xl border border-white/5">
                <button
                  type="button"
                  onClick={() => handleSwitchTab('register')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    modalAuthTab === 'register' ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  🚀 Criar Conta
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchTab('login')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    modalAuthTab === 'login' ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  🔑 Já tenho Conta
                </button>
              </div>

              {/* Error messages block */}
              {(googleAuthError || modalAuthError) && (
                <div className="bg-red-500/15 border border-red-500/30 p-3.5 rounded-2xl text-left flex gap-2.5 items-start text-xs text-red-200">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="leading-relaxed font-sans text-[11px]">
                    {modalAuthError || googleAuthError}
                  </p>
                </div>
              )}

              {/* Form Render */}
              {modalAuthTab === 'register' ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setModalAuthError(null);
                    if (!modalNickname.trim()) {
                      setModalAuthError('⚠️ Por favor, escolha um apelido fofo!');
                      return;
                    }
                    if (modalPassword.length < 6) {
                      setModalAuthError('⚠️ A senha precisa ter pelo menos 6 caracteres!');
                      return;
                    }
                    handleEmailRegister(modalEmail, modalPassword, modalNickname);
                  }}
                  className="space-y-4 text-left"
                >
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-black text-pink-400 uppercase tracking-widest mb-1 ml-0.5">
                        Apelido no Ranking (Nickname)
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={15}
                        placeholder="Ex: Gamer_PK"
                        value={modalNickname}
                        onChange={(e) => setModalNickname(e.target.value)}
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-pink-400 uppercase tracking-widest mb-1 ml-0.5">
                        E-mail
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="seuemail@exemplo.com"
                        value={modalEmail}
                        onChange={(e) => setModalEmail(e.target.value)}
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-pink-400 uppercase tracking-widest mb-1 ml-0.5">
                        Senha Secreta
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="Mínimo 6 caracteres"
                        value={modalPassword}
                        onChange={(e) => setModalPassword(e.target.value)}
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isAuthenticating}
                    className="w-full py-3 mt-2 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl font-sans font-black text-xs uppercase tracking-wider transition-all duration-150 cursor-pointer shadow-lg hover:scale-[1.01]"
                  >
                    {isAuthenticating ? 'Criando Conta... 🚀' : 'Criar Minha Conta Grátis! 🚀'}
                  </button>
                </form>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setModalAuthError(null);
                    handleEmailLogin(modalEmail, modalPassword);
                  }}
                  className="space-y-4 text-left"
                >
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-black text-pink-400 uppercase tracking-widest mb-1 ml-0.5">
                        E-mail
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="seuemail@exemplo.com"
                        value={modalEmail}
                        onChange={(e) => setModalEmail(e.target.value)}
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-pink-400 uppercase tracking-widest mb-1 ml-0.5">
                        Senha Secreta
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="Digite sua senha"
                        value={modalPassword}
                        onChange={(e) => setModalPassword(e.target.value)}
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isAuthenticating}
                    className="w-full py-3 mt-2 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl font-sans font-black text-xs uppercase tracking-wider transition-all duration-150 cursor-pointer shadow-lg hover:scale-[1.01]"
                  >
                    {isAuthenticating ? 'Entrando... 🔑' : 'Entrar no meu Perfil! 🔑'}
                  </button>

                  <div className="relative py-2 flex items-center justify-center">
                    <span className="absolute bg-zinc-900 px-3 text-[10px] font-black text-zinc-500 uppercase tracking-widest">OU</span>
                    <hr className="w-full border-white/5" />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      triggerAudio('tap');
                      handleLogin();
                    }}
                    disabled={isAuthenticating}
                    className="w-full py-3 bg-white hover:bg-zinc-100 text-zinc-900 rounded-xl font-sans font-black text-xs uppercase tracking-wider transition-all duration-150 cursor-pointer flex items-center justify-center gap-2 border border-white/10"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.9h6.6c-.28 1.5-1.11 2.76-2.39 3.62v3h3.86c2.26-2.08 3.67-5.14 3.67-8.45z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A11.99 11.99 0 0 0 12 24z"/>
                      <path fill="#FBBC05" d="M5.27 14.29a7.18 7.18 0 0 1 0-4.58V6.6H1.29a11.99 11.99 0 0 0 0 10.79l3.98-3.1z"/>
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A11.99 11.99 0 0 0 1.29 6.6l3.98 3.1c.95-2.85 3.6-4.95 6.73-4.95z"/>
                    </svg>
                    Entrar com o Google
                  </button>
                </form>
              )}

              {/* Bottom Guest Option */}
              <div className="border-t border-white/5 pt-4 space-y-2">
                <p className="text-[10px] text-zinc-500 font-bold">
                  Quer apenas dar uma olhadinha no portal antes?
                </p>
                <button
                  type="button"
                  onClick={() => {
                    triggerAudio('success');
                    sessionStorage.setItem('pkxd_continued_as_guest', 'true');
                    setContinuedAsGuest(true);
                  }}
                  className="w-full py-2.5 bg-zinc-800/60 hover:bg-zinc-800 border border-white/5 hover:border-white/10 text-zinc-400 hover:text-zinc-200 font-sans text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer hover:scale-[1.01]"
                >
                  Continuar como Convidado 💬
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Premium ambient space backdrop glows */}
      <div className="absolute top-1/4 right-[10%] w-[500px] h-[500px] pointer-events-none select-none rounded-full" style={{ backgroundImage: 'radial-gradient(circle, var(--glow-1) 0%, transparent 70%)' }} />
      <div className="absolute bottom-1/3 left-[5%] w-[450px] h-[450px] pointer-events-none select-none rounded-full" style={{ backgroundImage: 'radial-gradient(circle, var(--glow-2) 0%, transparent 70%)' }} />
      <div className="absolute top-[80%] right-[5%] w-[400px] h-[400px] pointer-events-none select-none rounded-full" style={{ backgroundImage: 'radial-gradient(circle, var(--glow-3) 0%, transparent 70%)' }} />

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

      {/* Floating interactive alerts display (Positioned cleanly at bottom without scroll-dependent jumping bugs!) */}
      {notifMessage && (
        <div 
          id="floating-celebration" 
          className="fixed bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:right-6 md:translate-x-0 z-50 w-[92%] max-w-md bg-zinc-950/95 border-2 border-pink-500/85 shadow-[0_8px_30px_rgba(236,72,153,0.3)] backdrop-blur-md text-white p-4 rounded-2xl transition-all duration-300 text-left flex items-start gap-3 overflow-hidden animate-slide-up animate-fade-in"
        >
          {/* Neon side indicator */}
          <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-gradient-to-b from-pink-500 via-rose-500 to-yellow-300" />
          
          <div className="p-1.5 border rounded-xl flex-shrink-0 animate-pulse bg-pink-500/10 text-pink-400 border-pink-500/20">
            <BellRing className="w-5 h-5 animate-swing" />
          </div>
          <div className="flex-1 space-y-0.5 text-left pl-1">
            <h5 className="text-[10px] sm:text-[11px] font-mono tracking-widest font-extrabold uppercase flex items-center justify-between text-pink-400">
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
          
          {/* Brand Name - Site icon removed as requested & changed to PKXD Central */}
          <div>
            <h1 className="font-sans font-black text-xl sm:text-2xl tracking-tighter text-white uppercase drop-shadow-[0_2px_0_rgba(0,0,0,0.4)] transform skew-x-[-2deg]">
              PKXD <span className="text-yellow-300">Central</span>
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
                const nextState = !isNotifOverlayOpen;
                setIsNotifOverlayOpen(nextState);
                if (nextState) {
                  // Mark all current notifications as seen!
                  const currentIds = notificationList.map(n => n.id);
                  setSeenNotifIds(prev => {
                    const unique = Array.from(new Set([...prev, ...currentIds]));
                    try {
                      localStorage.setItem('seen_notification_ids', JSON.stringify(unique));
                    } catch (e) {}
                    return unique;
                  });
                }
              }}
              className="bg-purple-800 border-2 border-purple-500/50 p-2.5 px-3 rounded-2xl text-yellow-300 hover:bg-purple-900 transition-all cursor-pointer relative flex items-center gap-1.5 text-[11px] font-extrabold shadow-md"
              title="Central de Notificações Recentes"
            >
              <BellRing className="w-3.5 h-3.5 animate-swing" />
              {unreadCount > 0 && (
                <span className="bg-pink-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full border border-purple-950">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Page navigation tab */}
            <button
              onClick={() => {
                triggerAudio('tap');
                if (isApplicationsRoute) {
                  navigateTo('/Hub/');
                } else {
                  navigateTo('/inscricoes');
                }
              }}
              className={`p-2.5 px-3 sm:px-4 rounded-2xl border font-sans text-[11px] font-black tracking-wide uppercase transition-all duration-150 cursor-pointer flex items-center gap-1.5 shadow-md ${
                isApplicationsRoute
                  ? 'bg-gradient-to-r from-cyan-400 to-teal-400 text-purple-950 border-cyan-300 hover:brightness-110'
                  : 'bg-gradient-to-r from-pink-500 to-purple-600 text-white border-pink-400 hover:brightness-110'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>{isApplicationsRoute ? 'Voltar à Central' : 'Inscrições 📝'}</span>
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
      {!isApplicationsRoute && !isAdminRoute && (
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
      )}

      {/* Main Grid Area */}
      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8 pt-4">
        
        {/* Apple Style Premium Profile Header */}
        {!isAdminRoute && (
          <AppleProfileHeader
            user={user}
            fanLevel={fanLevel}
            fanXP={fanXP}
            soundEnabled={soundEnabled}
            triggerAudio={triggerAudio}
            showAdminPanel={showAdminPanel}
            setShowAdminPanel={setShowAdminPanel}
            isAdmin={isAdmin}
          />
        )}
        
        {/* Admin Panel / Google Login Area */}
        {showAdminPanel && (
          <div className="animate-scale-up duration-150" id="admin-panel">
            {isAdminRoute && (
              <div className="mb-6 flex flex-col md:flex-row items-center justify-between gap-4 bg-purple-950/45 p-6 rounded-3xl border-2 border-purple-500/40 shadow-xl">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="p-1.5 bg-yellow-400/10 border border-yellow-400/30 rounded-xl">
                      <Settings className="w-5 h-5 text-yellow-400 animate-spin-slow" />
                    </span>
                    Painel Administrativo PKXD Central
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Espaço reservado para gerenciamento oficial de novidades, spoilers, teorias e fã-clube.
                  </p>
                </div>
                <button
                  onClick={() => {
                    triggerAudio('tap');
                    navigateTo('/');
                  }}
                  className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:brightness-110 active:scale-95 text-white font-sans font-black text-[11px] uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer border border-pink-400 flex items-center gap-1.5"
                >
                  ← Voltar ao Hub
                </button>
              </div>
            )}
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
                  // Gift countdown support
                  activeGiftCountdownTitle={giftCountdownTitle}
                  activeGiftCountdownDate={giftCountdownDate}
                  activeGiftCountdownEnabled={giftCountdownEnabled}
                  activeGiftCountdownContent={giftCountdownContent}
                  onUpdateGiftCountdown={handleUpdateGiftCountdown}
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
                        Se você for o proprietário deste portal, por favor faça login com o endereço de email do Administrador do PKXD Central correspondente.
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

        {isAdminRoute ? null : isApplicationsRoute ? (
          <ApplicationsSection 
            onBackToHub={() => navigateTo('/Hub/')}
            onAddXP={handleAddFanXP}
            soundEnabled={soundEnabled}
            user={user}
            isAdmin={isAdmin}
            onAddNews={handleAddNews}
            onAddShort={handleAddShort}
            onAddTheory={handleAddTheory}
            onAddFeaturedVideo={handleAddFeaturedVideo}
          />
        ) : (
          <>
            {/* Visual Navigation Tab Bar for "New Phase" - Neutral Elegant & Formal styling */}
            <div className="max-w-4xl mx-auto mb-8 bg-zinc-900/90 p-2 sm:p-2.5 rounded-3xl border-2 border-purple-500/40 flex items-center justify-between gap-1 sm:gap-2 shadow-[0_4px_25px_rgba(139,92,246,0.2)] select-none">
              <button
                onClick={() => {
                  triggerAudio('tap');
                  setActiveTab('inicio');
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-3 px-2 sm:px-4 rounded-2xl font-sans text-[11px] sm:text-xs md:text-sm font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  activeTab === 'inicio'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md border-2 border-purple-400'
                    : 'text-gray-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <span>🏠</span>
                <span>Início</span>
              </button>
              
              <button
                onClick={() => {
                  triggerAudio('tap');
                  setActiveTab('comunidade');
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-3 px-2 sm:px-4 rounded-2xl font-sans text-[11px] sm:text-xs md:text-sm font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  activeTab === 'comunidade'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md border-2 border-purple-400'
                    : 'text-gray-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <span>👥</span>
                <span>Mural</span>
              </button>

              <button
                onClick={() => {
                  triggerAudio('tap');
                  setActiveTab('missoes');
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-3 px-2 sm:px-4 rounded-2xl font-sans text-[11px] sm:text-xs md:text-sm font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  activeTab === 'missoes'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md border-2 border-purple-400'
                    : 'text-gray-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <span>🎯</span>
                <span>Missões</span>
              </button>

              <button
                onClick={() => {
                  triggerAudio('tap');
                  setActiveTab('artes');
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-3 px-2 sm:px-4 rounded-2xl font-sans text-[11px] sm:text-xs md:text-sm font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  activeTab === 'artes'
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md border-2 border-pink-400'
                    : 'text-gray-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <span>🎨</span>
                <span>Artes</span>
              </button>
            </div>

            {activeTab === 'inicio' && (
              <div className="space-y-12 animate-fade-in">
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
                      {giftCountdownEnabled && (
                        <GiftCountdown 
                          title={giftCountdownTitle}
                          targetDate={giftCountdownDate}
                          enabled={giftCountdownEnabled}
                          giftContent={giftCountdownContent}
                        />
                      )}

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

                      {/* Featured YouTube Videos Section - Placed exactly under the spoilers section */}
                      <div className="max-w-4xl mx-auto" id="featured-videos-section-wrapper">
                        <FeaturedVideos 
                          videos={featuredList}
                          isAdmin={isAdmin}
                          currentUser={user}
                          onDelete={handleDeleteFeaturedVideo}
                          onAddXP={handleAddFanXP}
                          onNavigate={navigateTo}
                        />
                      </div>

                      {/* CANDIDATAR-SE A ADMIN BANNER - Placed exactly below the spoiler and featured videos section */}
                      <div className="max-w-4xl mx-auto mt-8 mb-6 px-4 sm:px-0" id="admin-application-banner-under-spoilers">
                        <div className="bg-gradient-to-r from-purple-900/60 via-indigo-950/70 to-zinc-900 border-2 border-purple-500/30 rounded-2xl p-6 shadow-[0_4px_25px_rgba(139,92,246,0.15)] hover:shadow-[0_4px_35px_rgba(139,92,246,0.25)] hover:border-purple-500/50 transition-all duration-300 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                          {/* Glowing neon side effect */}
                          <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-pink-500 to-purple-600" />
                          
                          <div className="space-y-2 text-center md:text-left">
                            <h4 className="font-sans font-black text-lg text-white uppercase tracking-tight flex items-center gap-2 justify-center md:justify-start font-bold">
                              <span>✨ Quer fazer parte da equipe PKXD Central?</span>
                            </h4>
                            <p className="font-sans text-xs text-gray-300 max-w-xl leading-relaxed">
                              Estamos recrutando novos administradores focados, criativos e cheios de energia! Se você ama o PK XD, quer ajudar a organizar spoilers, posts de novidades e gerenciar o fã-clube oficial do site, inscreva-se agora mesmo!
                            </p>
                          </div>

                          <button 
                            onClick={() => {
                              triggerAudio('tap');
                              navigateTo('/inscricoes#admin');
                            }}
                            className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-650 hover:from-pink-400 hover:to-indigo-550 active:scale-[0.98] text-white font-sans font-black text-xs uppercase tracking-wider rounded-xl shadow-lg border border-white/20 cursor-pointer flex items-center justify-center gap-2 transition-all flex-shrink-0 animate-pulse hover:animate-none"
                          >
                            <span>🔐 Candidatar para Admin 🌟</span>
                          </button>
                        </div>
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

                      {/* Best Shorts of the Week Section */}
                      <div className="max-w-4xl mx-auto" id="best-shorts-section-wrapper">
                        <BestShorts 
                          shorts={shortsList}
                          isAdmin={isAdmin}
                          onDelete={handleDeleteShort}
                          onNavigate={navigateTo}
                        />
                      </div>

                      {/* Theories & PK XD News Publication Area */}
                      <div className="max-w-4xl mx-auto" id="theories-section-wrapper">
                        <TheoriesSection 
                          theories={theoriesList}
                          isAdmin={isAdmin}
                          currentUser={user}
                          onDelete={handleDeleteTheory}
                          onLike={handleLikeTheory}
                          onAddXP={handleAddFanXP}
                          onNavigate={navigateTo}
                        />
                      </div>

                      {/* WhatsApp Channel Promo Feature banner */}
                      <WhatsAppPromo channelUrl={WHATSAPP_CHANNEL_URL} onAddXP={handleAddFanXP} />

                      {/* Official Partner Channel Area - Alertas PK XD */}
                      <PartnerChannelPromo onAddXP={handleAddFanXP} />
                    </>
                  );
                })()}
              </div>
            )}

            {activeTab === 'comunidade' && (
              <div className="max-w-4xl mx-auto space-y-8 animate-fade-in" id="social-feed-section-wrapper">
                <PollsSection 
                  onAddXP={handleAddFanXP}
                  isAdmin={isAdmin}
                />

                <SocialSection 
                  currentUser={user}
                  isAdmin={isAdmin}
                  onAddXP={handleAddFanXP}
                  soundEnabled={soundEnabled}
                  triggerAudio={triggerAudio}
                  onLoginRedirect={handleLoginRedirect}
                />
              </div>
            )}

            {activeTab === 'missoes' && (
              <div className="max-w-4xl mx-auto space-y-12 animate-fade-in" id="missions-section-wrapper">
                <MissionsSection 
                  fanLevel={fanLevel}
                  fanXP={fanXP}
                  onAddXP={handleAddFanXP}
                  triggerAudio={triggerAudio}
                  soundEnabled={soundEnabled}
                />
                
                {/* Fan Level section inside the Missions panel */}
                <div id="fan-level-section-wrapper">
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
                    setFanLevel={setFanLevel}
                    setFanXP={setFanXP}
                  />
                </div>
              </div>
            )}

            {activeTab === 'artes' && (
              <div className="max-w-4xl mx-auto animate-fade-in" id="artes-section-wrapper">
                <ArtesSection 
                  isAdmin={isAdmin}
                  soundEnabled={soundEnabled}
                  triggerAudio={triggerAudio}
                />
              </div>
            )}

            {/* Extra Information: FAQ/Guide cards */}
            <div className="bg-zinc-900/40 rounded-3xl border border-white/5 p-6 sm:p-8 space-y-6 text-left select-none">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                <h3 className="font-sans font-black text-xl text-white uppercase tracking-wide">
                  Sobre o PKXD Central
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
                    Mais do que apenas um site, somos uma central parceira focada em unir os jogadores de PK XD. Venha debater teorias e trocar itens virtuais com a gente!
                  </p>
                </div>

              </div>
            </div>
          </>
        )}

      </main>

      {/* Footer Area */}
      <footer id="main-footer" className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 mt-8 select-none border-t border-white/10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          
          {/* Logo brand - Removed site icon and updated title for PKXD Central */}
          <div className="flex items-center gap-2">
            <strong className="font-sans text-sm text-gray-300 uppercase tracking-wider">
              PKXD Central • 2026
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
      <AnimatePresence>
        {isNavMenuOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden" id="navigation-sidebar-drawer">
            {/* Translucent Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity" 
              onClick={() => {
                setIsNavMenuOpen(false);
                triggerAudio('tap');
              }}
            />

            <div className="absolute inset-y-0 right-0 max-w-full flex pl-4">
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                className="w-screen max-w-xs sm:max-w-md h-full"
              >
                <div className="h-full flex flex-col bg-gradient-to-b from-[#0a051b] via-[#0d0726] to-[#04020a] border-l-2 border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.15)] relative overflow-y-auto">
                  
                  {/* Drawer Header */}
                  <div className="p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-slate-950 to-indigo-950/60 relative">
                    {/* Glowing background header effect */}
                    <div className="absolute top-0 right-1/4 w-32 h-12 bg-cyan-500/10 blur-xl rounded-full pointer-events-none" />
                    
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-400/20 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                        <Compass className="w-5 h-5 text-cyan-400 animate-spin-slow" />
                      </div>
                      <div>
                        <h3 className="font-sans font-black text-sm uppercase tracking-widest text-white flex items-center gap-1.5">
                          <span className="bg-gradient-to-r from-cyan-400 via-pink-400 to-yellow-300 bg-clip-text text-transparent">
                            Portal PKXD
                          </span>
                          <span className="text-[10px] bg-yellow-400 text-black px-1.5 py-0.5 rounded-md font-black tracking-normal uppercase">
                            Central
                          </span>
                        </h3>
                        <p className="text-[9px] text-cyan-400 font-mono tracking-wider">GUIA DE ATALHOS RÁPIDOS</p>
                      </div>
                    </div>
                    
                    <motion.button 
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        setIsNavMenuOpen(false);
                        triggerAudio('tap');
                      }}
                      className="w-9 h-9 rounded-full bg-white/[0.04] hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/30 border border-white/10 text-gray-400 transition-all duration-150 cursor-pointer flex items-center justify-center font-bold text-base"
                      title="Fechar Menu"
                    >
                      ✕
                    </motion.button>
                  </div>

                  {/* Navigation Links list */}
                  <div className="flex-1 p-5 sm:p-6 space-y-5 overflow-y-auto custom-scrollbar">
                    <div className="flex items-center justify-between">
                      <p className="font-sans text-[10px] text-gray-400 uppercase tracking-widest font-black flex items-center gap-1">
                        <span>🎯</span> SEÇÕES DISPONÍVEIS:
                      </p>
                      <span className="text-[9px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-gray-400 font-mono">
                        7 Áreas
                      </span>
                    </div>
                    
                    <nav className="space-y-3">
                      {[
                        { 
                          id: 'countdown-card-root', 
                          title: 'Spoilers Semanais', 
                          desc: 'Contagem regressiva e spoilers oficiais em vigor', 
                          badge: '⏱️ Ativo', 
                          badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                          glowColor: 'group-hover:border-emerald-500/40 group-hover:bg-emerald-500/[0.02]',
                          sideColor: 'bg-emerald-500'
                        },
                        { 
                          id: 'past-spoilers-history-section-wrapper', 
                          title: 'Spoilers Antigos', 
                          desc: 'Bandeja histórica de spoilers e histórias arquivadas', 
                          badge: '🔮 Histórico', 
                          badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                          glowColor: 'group-hover:border-purple-500/40 group-hover:bg-purple-500/[0.02]',
                          sideColor: 'bg-purple-500'
                        },
                        { 
                          id: 'fan-level-section-wrapper', 
                          title: 'Nível de Fã Extra', 
                          desc: 'Subir de nível e coletar insígnias oficiais de fã', 
                          badge: '🏆 Desafios', 
                          badgeColor: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
                          glowColor: 'group-hover:border-pink-500/40 group-hover:bg-pink-500/[0.02]',
                          sideColor: 'bg-pink-500'
                        },
                        { 
                          id: 'promo-code-redeemer-section-wrapper', 
                          title: 'Resgatar Códigos', 
                          desc: 'Promo codes ativos nos últimos 7 dias', 
                          badge: '🎟️ Ativos', 
                          badgeColor: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
                          glowColor: 'group-hover:border-yellow-500/40 group-hover:bg-yellow-500/[0.02]',
                          sideColor: 'bg-yellow-400'
                        },
                        { 
                          id: 'featured-videos-section-wrapper', 
                          title: 'Vídeos Destaques', 
                          desc: 'Tutoriais de moedas e gameplays recomendadas', 
                          badge: '🎥 Vídeos', 
                          badgeColor: 'bg-red-500/10 text-red-400 border-red-500/20',
                          glowColor: 'group-hover:border-red-500/40 group-hover:bg-red-500/[0.02]',
                          sideColor: 'bg-red-500'
                        },
                        { 
                          id: 'best-shorts-section-wrapper', 
                          title: 'Shorts Virais', 
                          desc: 'Vídeos curtos e engraçados da comunidade', 
                          badge: '📱 Shorts', 
                          badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
                          glowColor: 'group-hover:border-cyan-500/40 group-hover:bg-cyan-500/[0.02]',
                          sideColor: 'bg-cyan-400'
                        },
                        { 
                          id: 'theories-section-wrapper', 
                          title: 'Teorias dos Fãs', 
                          desc: 'Segredos ocultos e suposições da atualização', 
                          badge: '📜 Fórum', 
                          badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                          glowColor: 'group-hover:border-amber-500/40 group-hover:bg-amber-500/[0.02]',
                          sideColor: 'bg-amber-500'
                        },
                      ].map((section) => (
                        <motion.button
                          key={section.id}
                          type="button"
                          whileHover={{ scale: 1.02, x: 6 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setIsNavMenuOpen(false);
                            triggerAudio('tap');
                            // Smooth scroll targeting center
                            setTimeout(() => {
                              document.getElementById(section.id)?.scrollIntoView({
                                behavior: 'smooth',
                                block: 'center',
                              });
                            }, 120);
                          }}
                          className={`w-full text-left p-3.5 rounded-2xl border border-white/5 bg-white/[0.02] ${section.glowColor} transition-all duration-200 flex items-center justify-between group cursor-pointer hover:shadow-[0_4px_12px_rgba(0,0,0,0.5)] relative overflow-hidden`}
                        >
                          {/* Elegant side tag border indicator */}
                          <div className={`absolute left-0 inset-y-0 w-[4px] ${section.sideColor} opacity-0 group-hover:opacity-100 transition-opacity duration-200`} />
                          
                          <div className="space-y-1 pl-1.5 pr-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-sans font-black text-xs sm:text-sm text-gray-100 group-hover:text-cyan-300 transition-colors">
                                {section.title}
                              </span>
                              <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${section.badgeColor}`}>
                                {section.badge}
                              </span>
                            </div>
                            <span className="block font-sans text-[10.5px] text-gray-400 leading-snug group-hover:text-gray-300 transition-colors">
                              {section.desc}
                            </span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-cyan-400 transition-all transform group-hover:translate-x-1.5 flex-shrink-0" />
                        </motion.button>
                      ))}
                    </nav>
                  </div>

                  {/* Quick Info footer inside drawer */}
                  <div className="p-5 sm:p-6 border-t border-white/10 bg-slate-950/80 backdrop-blur-md space-y-3 relative">
                    <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
                    
                    <div className="flex items-center justify-center gap-1.5 text-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      <span className="text-[9px] font-black text-gray-400 tracking-widest uppercase">ADMINISTRAÇÃO & COMUNICADOS</span>
                    </div>
                    
                    {/* Candidate to Admin Form button */}
                    <motion.button 
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { triggerAudio('tap'); navigateTo('/inscricoes#admin'); }}
                      className="w-full py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:via-indigo-500 hover:to-cyan-500 text-white font-sans font-black text-[10px] sm:text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-[0_0_15px_rgba(168,85,247,0.2)] hover:shadow-[0_0_25px_rgba(168,85,247,0.4)] border border-indigo-500/30 cursor-pointer"
                    >
                      <span>🔐 CANDIDATAR A ADMIN 🌟</span>
                    </motion.button>

                    <motion.a 
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      href={WHATSAPP_CHANNEL_URL} 
                      target="_blank" 
                      rel="noreferrer"
                      className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black font-sans font-black text-[10px] sm:text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer text-center"
                    >
                      <MessageCircle className="w-3.5 h-3.5 fill-black" />
                      <span>ENTRAR NO CANAL WHATSAPP</span>
                    </motion.a>

                    <p className="text-[8.5px] text-gray-500 text-center pt-2 font-mono leading-normal">
                      PKXD Central © 2026 • Comunidade Oficial de Fãs
                    </p>
                  </div>

                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

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
        <div 
          className="fixed inset-0 z-50 overflow-y-auto flex items-start sm:items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-fade-in cursor-pointer" 
          id="notifications-list-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsNotifOverlayOpen(false);
              triggerAudio('tap');
            }
          }}
        >
          <div className="bg-neutral-900 border-2 border-cyan-400 rounded-3xl p-5 sm:p-8 w-full max-w-2xl relative shadow-[0_0_30px_rgba(34,211,238,0.2)] my-4 sm:my-8 text-left cursor-default">
            
            {/* Top Close Controls */}
            <button
              onClick={() => {
                setIsNotifOverlayOpen(false);
                triggerAudio('tap');
              }}
              className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 active:scale-95 text-white font-sans font-black text-xs uppercase px-4 py-3 rounded-xl border border-red-400/20 transition-all cursor-pointer shadow-md duration-150 z-10 flex items-center justify-center min-h-[44px]"
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
                        
                        // Immediately register subscription on current browser session to guarantee it
                        setTimeout(() => {
                          subscribeUserToPush();
                        }, 200);

                        const welcomeTitle = 'Portal PKXD Central 🔔';
                        const welcomeOptions = {
                          body: 'Notificações ativas com sucesso! Você receberá alertas de novos spoilers e códigos.',
                          icon: '/favicon.svg',
                          badge: '/favicon.svg',
                        };

                        if ('serviceWorker' in navigator) {
                          navigator.serviceWorker.ready.then((reg) => {
                            reg.showNotification(welcomeTitle, welcomeOptions);
                          }).catch(() => {
                            new Notification(welcomeTitle, welcomeOptions);
                          });
                        } else {
                          new Notification(welcomeTitle, welcomeOptions);
                        }
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

                  const userReaction = notificationReactions[notif.id];
                  // Stable pseudo-random base counts so cards have realistic numbers of likes/dislikes
                  const baseLikes = (notif.createdAt % 29) + 8;
                  const baseDislikes = (notif.createdAt % 7);
                  
                  const displayLikes = baseLikes + (userReaction === 'like' ? 1 : 0);
                  const displayDislikes = baseDislikes + (userReaction === 'dislike' ? 1 : 0);

                  return (
                    <div 
                      key={notif.id}
                      className="p-4 bg-neutral-950/60 border border-white/10 rounded-2xl flex items-start gap-3 hover:border-white/20 transition-all shadow-inner relative group"
                    >
                      <span className="text-xl leading-none select-none p-1.5 bg-white/5 rounded-xl block">
                        {icon}
                      </span>
                      <div className="flex-1 space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="font-sans font-extrabold text-white text-xs sm:text-sm">
                            {notif.title}
                          </h4>
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeColors}`}>
                              {notif.type.replace('_', ' ')}
                            </span>
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteNotification(notif.id)}
                                title="Apagar Notificação"
                                className="p-1.5 text-red-400 hover:text-white bg-red-500/10 hover:bg-red-600 rounded-lg transition-all cursor-pointer flex items-center justify-center"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="font-sans text-xs text-gray-300 leading-relaxed">
                          {notif.body}
                        </p>
                        <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-white/5 mt-2.5">
                          <span className="block font-mono text-[9px] text-gray-500">
                            Enviado em: {new Date(notif.createdAt).toLocaleString('pt-BR')}
                          </span>
                          
                          {/* Interações de Gostei/Não Gostei */}
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleNotificationReaction(notif.id, 'like')}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer select-none active:scale-95 ${
                                userReaction === 'like'
                                  ? 'bg-emerald-500/20 text-emerald-350 border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                                  : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white'
                              }`}
                              title="Gostei"
                            >
                              <ThumbsUp className={`w-3 h-3 ${userReaction === 'like' ? 'fill-emerald-350' : ''}`} />
                              <span>{displayLikes}</span>
                            </button>

                            <button
                              onClick={() => handleNotificationReaction(notif.id, 'dislike')}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer select-none active:scale-95 ${
                                userReaction === 'dislike'
                                  ? 'bg-rose-500/20 text-rose-350 border-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.2)]'
                                  : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white'
                              }`}
                              title="Não gostei"
                            >
                              <ThumbsDown className={`w-3 h-3 ${userReaction === 'dislike' ? 'fill-rose-350' : ''}`} />
                              <span>{displayDislikes}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick footer action info */}
            <div className="mt-6 pt-4 border-t border-white/10 text-center">
              <button
                onClick={() => {
                  setIsNotifOverlayOpen(false);
                  triggerAudio('tap');
                }}
                className="w-full py-3.5 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 active:scale-95 text-white font-sans font-black text-xs uppercase tracking-widest rounded-2xl border border-red-500/20 transition-all cursor-pointer shadow-lg flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                Fechar Central de Alertas ✕
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
