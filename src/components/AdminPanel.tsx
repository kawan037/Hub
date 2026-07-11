import React, { useState, useEffect } from 'react';
import { NewsItem, FeaturedVideo, Theory, ShortItem, PastSpoiler, AppComment, GeneratedPromoCode } from '../types';
import { 
  PlusCircle, Save, Sparkles, RefreshCw, X, Image, ExternalLink, Video, 
  Smartphone, BookOpen, Clock, Wand2, Loader2, Play, BellRing, AlertTriangle, Globe,
  UserCheck, Trash2, CheckCircle, ShieldAlert, Check, MessageSquare
} from 'lucide-react';
import { playTapSound, playSuccessSound } from '../utils/audio';
import { auth, db } from '../firebase';
import { collection, getDocs, deleteDoc, doc, query, orderBy, onSnapshot, updateDoc, setDoc } from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

interface AdminPanelProps {
  user?: any;
  onAddNews: (item: Omit<NewsItem, 'id'>) => void;
  onUpdateSpoiler: (title: string, desc: string, imageUrl?: string, forceReveal?: boolean) => void;
  activeSpoilerTitle: string;
  activeSpoilerDesc: string;
  activeSpoilerImage?: string;
  activeSpoilerForceReveal?: boolean;
  onResetToDefaults: () => void;
  newsToEdit: NewsItem | null;
  onCancelEdit: () => void;
  onSaveEdit: (updated: NewsItem) => void;
  siteLogoUrl: string;
  onUpdateLogo: (url: string) => void;

  // New features props
  onAddFeaturedVideo: (video: Omit<FeaturedVideo, 'id' | 'createdAt'>) => void;
  onAddTheory: (theory: Omit<Theory, 'id' | 'likes' | 'createdAt'>) => void;
  onAddShort: (short: Omit<ShortItem, 'id' | 'createdAt'>) => void;
  onUpdateExtraCountdown: (title: string, date: string, enabled: boolean) => void;
  activeExtraCountdownTitle: string;
  activeExtraCountdownDate: string;
  activeExtraCountdownEnabled: boolean;

  // Past spoiler editing support
  pastSpoilerToEdit?: PastSpoiler | null;
  onSaveEditPastSpoiler?: (id: string, title: string, desc: string, imageUrl?: string) => void;
  onCancelEditPastSpoiler?: () => void;

  // New push notification and delay props
  isDelayed?: boolean;
  delayMessage?: string;
  onUpdateDelay?: (delayed: boolean, message: string) => void;
  onSendCustomNotification?: (title: string, body: string, type: 'story_published' | 'countdown_alert' | 'custom_push' | 'delayed_alert') => void;
  onDirectArchivePastSpoiler?: (title: string, desc: string, imageUrl?: string) => void;
  onArchiveAndClearActiveSpoiler?: (title: string, desc: string, imageUrl: string) => void;
  onDeleteActiveSpoiler?: () => void;

  // Gift countdown props
  activeGiftCountdownTitle?: string;
  activeGiftCountdownDate?: string;
  activeGiftCountdownEnabled?: boolean;
  activeGiftCountdownContent?: string;
  onUpdateGiftCountdown?: (title: string, date: string, enabled: boolean, content: string) => void;
}

type TabType = 'news' | 'spoiler' | 'featured' | 'theories' | 'shorts' | 'extratimer' | 'giftcountdown' | 'push' | 'logo' | 'applications' | 'moderation' | 'promocodes';

// Helper to parse standard **bold** markers into strong tags for previews
function parseBoldPreviewText(inputText: string): React.ReactNode {
  if (!inputText.includes('**')) return inputText;

  const parts = inputText.split('**');
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return (
        <strong key={index} className="font-sans font-black text-white">
          {part}
        </strong>
      );
    }
    return part;
  });
}

function parseAndRenderPreview(text: string) {
  if (!text) return null;

  // Split content into segments of media (images or base64 data) and text blocks
  const mediaRegex = /(!\[.*?\]\([^\)]+\)|<img\s+[^>]*src=["'](?:[^"']+)["'][^>]*>|(?:https?:\/\/[^\s]+?(?:\.png|\.jpg|\.jpeg|\.gif|\.webp|\.bmp)(?:\?[^\s]*)?))/gi;
  const parts = text.split(mediaRegex);

  return (
    <div className="space-y-2 text-left text-xs text-gray-300">
      {parts.map((part, partIdx) => {
        if (!part) return null;

        // Check for Markdown Image syntax: ![Alt](url)
        const mdMatched = part.match(/!\[(.*?)\]\((.*?)\)/i);
        if (mdMatched) {
          const altText = mdMatched[1] || 'Imagem do Spoiler';
          const imageUrl = mdMatched[2];
          return (
            <div key={`part-${partIdx}`} className="my-2 rounded-lg overflow-hidden border border-white/5 bg-black/40 p-1 text-center">
              <img src={imageUrl} alt={altText} className="max-h-40 object-contain mx-auto rounded" referrerPolicy="no-referrer" />
              {altText && altText !== 'Spoiler' && (
                <span className="text-[9px] text-gray-400 block pt-0.5">✦ {altText}</span>
              )}
            </div>
          );
        }

        // Check for HTML img tag syntax
        const htmlMatched = part.match(/<img\s+[^>]*src=["']([^"']+)["'][^>]*>/i);
        if (htmlMatched) {
          const imageUrl = htmlMatched[1];
          return (
            <div key={`part-${partIdx}`} className="my-2 rounded-lg overflow-hidden border border-white/5 bg-black/40 p-1 text-center">
              <img src={imageUrl} alt="HTML Image" className="max-h-40 object-contain mx-auto rounded" referrerPolicy="no-referrer" />
            </div>
          );
        }

        // Check for raw image URL match
        if (part.match(/^https?:\/\/[^\s]+?(?:\.png|\.jpg|\.jpeg|\.gif|\.webp|\.bmp)(?:\?[^\s]*)?$/i)) {
          return (
            <div key={`part-${partIdx}`} className="my-2 rounded-lg overflow-hidden border border-white/5 bg-black/40 p-1 text-center">
              <img src={part} alt="Raw URL Web Image" className="max-h-40 object-contain mx-auto rounded" referrerPolicy="no-referrer" />
            </div>
          );
        }

        // Otherwise, it's a plain text run. Standard line-by-line formatting follows.
        const lines = part.split('\n');
        return (
          <div key={`part-${partIdx}`} className="space-y-1">
            {lines.map((line, lineIdx) => {
              const trimmed = line.trim();
              if (!trimmed) return <div key={lineIdx} className="h-0.5" />;

              if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
                return (
                  <div key={lineIdx} className="flex items-start gap-1 text-gray-300 pl-1">
                    <span className="text-cyan-400 mt-0.5 flex-shrink-0">✧</span>
                    <span>{parseBoldPreviewText(trimmed.substring(1).trim())}</span>
                  </div>
                );
              }

              if (trimmed.startsWith('###')) {
                return <h5 key={lineIdx} className="font-sans font-extrabold text-xs text-cyan-400 uppercase tracking-wider pt-0.5">{parseBoldPreviewText(trimmed.replace('###', '').trim())}</h5>;
              }
              if (trimmed.startsWith('##')) {
                return <h4 key={lineIdx} className="font-sans font-black text-sm text-yellow-300 uppercase tracking-widest pt-0.5">{parseBoldPreviewText(trimmed.replace('##', '').trim())}</h4>;
              }
              if (trimmed.startsWith('#')) {
                return <h2 key={lineIdx} className="font-sans font-black text-base text-yellow-300 uppercase tracking-wide pt-1 pb-0.5 border-b border-white/5">{parseBoldPreviewText(trimmed.replace('#', '').trim())}</h2>;
              }

              return <p key={lineIdx} className="leading-normal">{parseBoldPreviewText(trimmed)}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

export default function AdminPanel({
  user,
  onAddNews,
  onUpdateSpoiler,
  activeSpoilerTitle,
  activeSpoilerDesc,
  activeSpoilerImage,
  activeSpoilerForceReveal = false,
  onResetToDefaults,
  newsToEdit,
  onCancelEdit,
  onSaveEdit,
  siteLogoUrl,
  onUpdateLogo,

  onAddFeaturedVideo,
  onAddTheory,
  onAddShort,
  onUpdateExtraCountdown,
  activeExtraCountdownTitle,
  activeExtraCountdownDate,
  activeExtraCountdownEnabled,

  pastSpoilerToEdit = null,
  onSaveEditPastSpoiler,
  onCancelEditPastSpoiler,

  isDelayed = false,
  delayMessage = '',
  onUpdateDelay,
  onSendCustomNotification,
  onDirectArchivePastSpoiler,
  onArchiveAndClearActiveSpoiler,
  onDeleteActiveSpoiler,

  activeGiftCountdownTitle,
  activeGiftCountdownDate,
  activeGiftCountdownEnabled,
  activeGiftCountdownContent,
  onUpdateGiftCountdown
}: AdminPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('news');

  // Promo codes state
  const [generatedCodes, setGeneratedCodes] = useState<GeneratedPromoCode[]>([]);
  const [newCodeName, setNewCodeName] = useState('');
  const [newCodeGems, setNewCodeGems] = useState(50);
  const [newCodeCoins, setNewCodeCoins] = useState(2000);
  const [newCodeMaxRedeems, setNewCodeMaxRedeems] = useState(50);
  const [codeSubmitLoading, setCodeSubmitLoading] = useState(false);

  // Comments review state
  const [allComments, setAllComments] = useState<AppComment[]>([]);
  const [modFilter, setModFilter] = useState<'all' | 'pending' | 'approved'>('pending');

  // Push / Delay notification states
  const [delayActive, setDelayActive] = useState(isDelayed);
  const [delayMsgText, setDelayMsgText] = useState(delayMessage || 'Hoje o spoiler foi adiado devido a melhorias visuais. Contamos com a paciência de vocês!');
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  const [pushType, setPushType] = useState<'story_published' | 'countdown_alert' | 'custom_push' | 'delayed_alert'>('custom_push');

  // Creator Video / Live state
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [videoStatus, setVideoStatus] = useState('Ao Vivo 🔴');
  const [scheduledTime, setScheduledTime] = useState('');
  
  // Custom spoiler state
  const [spoilerTitle, setSpoilerTitle] = useState(activeSpoilerTitle);
  const [spoilerDesc, setSpoilerDesc] = useState(activeSpoilerDesc);
  const [spoilerImage, setSpoilerImage] = useState(activeSpoilerImage || '');
  const [forceReveal, setForceReveal] = useState(activeSpoilerForceReveal);

  // Auto scrape URL state
  const [scrapUrl, setScrapUrl] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [scrapError, setScrapError] = useState('');

  // Featured Video State
  const [featTitle, setFeatTitle] = useState('');
  const [featUrl, setFeatUrl] = useState('');
  const [featType, setFeatType] = useState<'game_highlight' | 'panel_video'>('game_highlight');

  // Theory State
  const [theoryTitle, setTheoryTitle] = useState('');
  const [theoryContent, setTheoryContent] = useState('');
  const [theoryAuthor, setTheoryAuthor] = useState('');

  // Curated Short State
  const [shortTitle, setShortTitle] = useState('');
  const [shortUrl, setShortUrl] = useState('');

  // Extra Countdown Timer State
  const [extraTitle, setExtraTitle] = useState(activeExtraCountdownTitle || 'Spoiler Extra de Sexta! 🔥');
  const [extraDate, setExtraDate] = useState(activeExtraCountdownDate || '');
  const [extraEnabled, setExtraEnabled] = useState(activeExtraCountdownEnabled || false);

  // Gift Countdown States
  const [giftTitle, setGiftTitle] = useState(activeGiftCountdownTitle || '🎁 PRESENTE SURPRESA!');
  const [giftDate, setGiftDate] = useState(activeGiftCountdownDate || '');
  const [giftEnabled, setGiftEnabled] = useState(activeGiftCountdownEnabled || false);
  const [giftContent, setGiftContent] = useState(activeGiftCountdownContent || '');

  // Logo state
  const [tempLogoUrl, setTempLogoUrl] = useState(siteLogoUrl);

  // Status flags
  const [statusMsg, setStatusMsg] = useState('');
  const [showConfirmArchive, setShowConfirmArchive] = useState(false);

  // Express spoiler states
  const [useExpress, setUseExpress] = useState(true);
  const [expressTitle, setExpressTitle] = useState('NOVO SPOILER OFICIAL PK XD! 🔮');
  const [expressImage, setExpressImage] = useState('');
  const [expressDescAuto, setExpressDescAuto] = useState('🔥 ATENÇÃO! Novos SPOILERS oficiais enviados pela própria equipe do PK XD em primeira mão! Confira os detalhes da nova atualização que está por vir:');

  // Gmail integration states
  const [gmailToken, setGmailTokenState] = useState<string | null>(() => {
    try {
      return localStorage.getItem('pkxd_gmail_token') || null;
    } catch (e) {
      return null;
    }
  });

  const setGmailToken = (token: string | null) => {
    setGmailTokenState(token);
    try {
      if (token) {
        localStorage.setItem('pkxd_gmail_token', token);
      } else {
        localStorage.removeItem('pkxd_gmail_token');
      }
    } catch (e) {}
  };

  const [gmailEmails, setGmailEmails] = useState<any[]>([]);
  const [isGmailLoading, setIsGmailLoading] = useState(false);
  const [gmailQuery, setGmailQuery] = useState('subject:(spoiler OR PK XD OR news OR novidade OR vazamento)');
  const [gmailError, setGmailError] = useState<string | null>(null);
  const [importingGmailId, setImportingGmailId] = useState<string | null>(null);

  // Local Copy & Paste manual import alternative states
  const [showLocalImport, setShowLocalImport] = useState(false);
  const [localPasteTitle, setLocalPasteTitle] = useState('');
  const [localPasteContent, setLocalPasteContent] = useState('');
  const [localImportStatus, setLocalImportStatus] = useState<string | null>(null);

  // Applications list states
  const [appsPanel, setAppsPanel] = useState<any[]>([]);
  const [appsShorts, setAppsShorts] = useState<any[]>([]);
  const [appsTheories, setAppsTheories] = useState<any[]>([]);
  const [appsAdmin, setAppsAdmin] = useState<any[]>([]);
  const [isAppsLoading, setIsAppsLoading] = useState(false);

  const fetchAllApplications = async () => {
    setIsAppsLoading(true);
    try {
      const panelSnap = await getDocs(collection(db, 'applications_panel'));
      const panelList = panelSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAppsPanel(panelList);

      const shortsSnap = await getDocs(collection(db, 'applications_shorts'));
      const shortsList = shortsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAppsShorts(shortsList);

      const theoriesSnap = await getDocs(collection(db, 'applications_theories'));
      const theoriesList = theoriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAppsTheories(theoriesList);

      const adminSnap = await getDocs(collection(db, 'applications_admin'));
      const adminList = adminSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAppsAdmin(adminList);
    } catch (err) {
      console.error("Erro ao carregar inscrições no AdminPanel:", err);
    } finally {
      setIsAppsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'applications' && isOpen) {
      fetchAllApplications();
    }
  }, [activeTab, isOpen]);

  useEffect(() => {
    if (activeTab === 'moderation' && isOpen) {
      const commentsRef = collection(db, 'comments');
      const q = query(commentsRef, orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list: AppComment[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as AppComment);
        });
        setAllComments(list);
      }, (error) => {
        console.error("Error loading admin comments:", error);
      });
      return () => unsubscribe();
    }
  }, [activeTab, isOpen]);

  useEffect(() => {
    if (activeTab === 'promocodes' && isOpen) {
      const codesRef = collection(db, 'generated_promo_codes');
      const q = query(codesRef, orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list: GeneratedPromoCode[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as GeneratedPromoCode);
        });
        setGeneratedCodes(list);
      }, (error) => {
        console.error("Error loading generated codes in admin:", error);
      });
      return () => unsubscribe();
    }
  }, [activeTab, isOpen]);

  // Decode Base64URL to Unicode standard string safely
  const decodeBase64Url = (str: string): string => {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    try {
      const raw = window.atob(base64);
      return decodeURIComponent(escape(raw));
    } catch (e) {
      try {
        return window.atob(base64);
      } catch (err) {
        return '';
      }
    }
  };

  const formatDateString = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const extractMailData = (part: any): { text: string; html: string; attachments: any[] } => {
    let text = '';
    let html = '';
    let attachments: any[] = [];

    const headers = part.headers || [];
    const contentIdHeader = headers.find((h: any) => h.name.toLowerCase() === 'content-id');
    const contentId = contentIdHeader ? contentIdHeader.value.replace(/[<>]/g, '') : null;
    const xAttachmentIdHeader = headers.find((h: any) => h.name.toLowerCase() === 'x-attachment-id');
    const xAttachmentId = xAttachmentIdHeader ? xAttachmentIdHeader.value : null;

    const currentContentId = contentId || xAttachmentId;

    if (part.mimeType === 'text/plain' && part.body?.data) {
      text += decodeBase64Url(part.body.data);
    } else if (part.mimeType === 'text/html' && part.body?.data) {
      html += decodeBase64Url(part.body.data);
    }

    if (part.mimeType && (part.mimeType.startsWith('image/') || part.body?.attachmentId) && part.body?.attachmentId) {
      attachments.push({
        attachmentId: part.body.attachmentId,
        contentId: currentContentId ? currentContentId.trim().replace(/[<>]/g, '') : null,
        mimeType: part.mimeType,
        filename: part.filename || 'image.png'
      });
    }

    if (part.parts && part.parts.length > 0) {
      part.parts.forEach((subPart: any) => {
        const res = extractMailData(subPart);
        if (res.text) text += (text ? '\n' : '') + res.text;
        if (res.html) html += (html ? '\n' : '') + res.html;
        if (res.attachments.length > 0) {
          attachments = [...attachments, ...res.attachments];
        }
      });
    }

    return { text, html, attachments };
  };

  const convertHtmlToMarkdownWithCids = (htmlStr: string, imageMap: { [key: string]: string }): string => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlStr, 'text/html');
      
      const traverse = (node: Node): string => {
        if (node.nodeType === 3) { // Node.TEXT_NODE
          return node.textContent || '';
        }

        if (node.nodeType === 1) { // Node.ELEMENT_NODE
          const el = node as HTMLElement;
          const tagName = el.tagName.toLowerCase();
          
          let childrenContent = '';
          el.childNodes.forEach((child) => {
            childrenContent += traverse(child);
          });

          if (tagName === 'script' || tagName === 'style') {
            return '';
          }

          if (tagName === 'img') {
            let src = el.getAttribute('src') || '';
            if (src.startsWith('cid:')) {
              const cid = src.substring(4).trim().replace(/[<>]/g, '');
              if (imageMap[cid]) {
                src = imageMap[cid];
              }
            }
            return `\n\n![Spoiler Oficial](${src})\n\n`;
          }

          if (tagName === 'p') {
            return `\n\n${childrenContent.trim()}\n\n`;
          }

          if (tagName === 'br') {
            return '\n';
          }

          if (tagName === 'h1') {
            return `\n\n# ${childrenContent.trim()}\n\n`;
          }
          if (tagName === 'h2') {
            return `\n\n## ${childrenContent.trim()}\n\n`;
          }
          if (tagName === 'h3') {
            return `\n\n### ${childrenContent.trim()}\n\n`;
          }

          if (tagName === 'strong' || tagName === 'b') {
            const trimmed = childrenContent.trim();
            return trimmed ? ` **${trimmed}** ` : '';
          }

          if (tagName === 'em' || tagName === 'i') {
            const trimmed = childrenContent.trim();
            return trimmed ? ` *${trimmed}* ` : '';
          }

          if (tagName === 'li') {
            return `\n• ${childrenContent.trim()}`;
          }

          if (tagName === 'div') {
            return `\n${childrenContent.trim()}\n`;
          }

          return childrenContent;
        }

        return '';
      };

      let markdown = traverse(doc.body);
      markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();
      return markdown;
    } catch (err) {
      console.error("DOMParser conversion failed:", err);
      return htmlStr;
    }
  };

  const handleLocalPasteImport = () => {
    if (!localPasteContent.trim()) {
      setLocalImportStatus('⚠️ Por favor, cole o conteúdo (texto ou HTML) do e-mail de spoiler.');
      return;
    }

    try {
      setLocalImportStatus('⏳ Processando e convertendo...');
      
      let finalMarkdown = '';
      const content = localPasteContent.trim();
      const isHTML = /<[a-z][\s\S]*>/i.test(content);
      
      if (isHTML) {
        // Simple HTML parse & convert
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        
        let titleGuess = '';
        const titleEl = doc.querySelector('title') || doc.querySelector('h1') || doc.querySelector('h2');
        if (titleEl && titleEl.textContent && !localPasteTitle.trim()) {
          titleGuess = titleEl.textContent.trim();
        }
        
        finalMarkdown = convertHtmlToMarkdownWithCids(content, {});
        
        if (titleGuess && !localPasteTitle.trim()) {
          setLocalPasteTitle(titleGuess);
        }

        // Try to find image URLs
        const imgs = doc.getElementsByTagName('img');
        if (imgs.length > 0) {
          const firstImgSrc = imgs[0].src || imgs[0].getAttribute('src') || '';
          if (firstImgSrc && !firstImgSrc.startsWith('cid:')) {
            setExpressImage(firstImgSrc);
            setSpoilerImage(firstImgSrc);
          }
        }
      } else {
        // Plain text
        finalMarkdown = content;
      }
      
      const activeTitle = localPasteTitle.trim() || 'SPOILER REVELADO POR E-MAIL! 🔮';
      
      setExpressTitle(activeTitle);
      setExpressDescAuto(finalMarkdown);
      
      setSpoilerTitle(activeTitle);
      setSpoilerDesc(finalMarkdown);
      
      setLocalImportStatus(null);
      setLocalPasteContent('');
      setLocalPasteTitle('');
      setShowLocalImport(false);
      
      showStatus('✨ Conteúdo do e-mail importado e formatado no editor com sucesso! 🎉');
      playSuccessSound();
    } catch (err: any) {
      console.error(err);
      setLocalImportStatus(`❌ Erro ao converter o e-mail: ${err.message || String(err)}`);
    }
  };

  const connectGmail = async () => {
    try {
      setIsGmailLoading(true);
      setGmailError(null);
      
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
      // Forçar o seletor de contas para permitir trocar de e-mail facilmente!
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGmailToken(credential.accessToken);
        showStatus('🔌 Conectado ao Gmail com sucesso!');
        playSuccessSound();
        // Automatically fetch messages
        fetchGmailMessages(credential.accessToken);
      } else {
        throw new Error('Não foi possível obter o token de acesso do Gmail.');
      }
    } catch (err: any) {
      console.error('Error connecting to Gmail:', err);
      let customErr = err.message || 'Falha ao conectar com o Gmail.';
      
      // Specifically target Google blocked/popup cancellation errors
      if (err.code === 'auth/popup-closed-by-user' || err.message?.includes('popup-closed-by-user') || err.message?.includes('user closed')) {
        customErr = 'O processo foi fechado pelo usuário ou bloqueado. Se o Google exibiu a mensagem "Acesso bloqueado: o app não concluiu o processo de verificação", você PRECISA registrar seu e-mail kawan... ou eukoosh... como "Usuário de Teste" no console do Firebase / Google Cloud antes de conectar! Veja o tutorial passo a passo logo abaixo no painel. 👇';
      } else if (err.code === 'auth/cancelled-popup-request') {
        customErr = 'Uma tentativa de conexão já estava em andamento. Aguarde ou reinicie o aplicativo.';
      } else if (err.message?.includes('restricted') || err.message?.includes('verification')) {
        customErr = 'Acesso bloqueado por restrições de escopo do Gmail do Google. Siga o tutorial de "Usuários de Teste" abaixo para liberar o acesso imediatamente! 🔒';
      } else if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain') || err.message?.includes('domain-not-authorized')) {
        customErr = `⚠️ ERRO DE DOMÍNIO NÃO AUTORIZADO! O domínio atual do seu site ("${window.location.hostname}") não está cadastrado ou autorizado no seu projeto do Firebase. Você precisa adicionar "${window.location.hostname}" na lista de Domínios Autorizados no Firebase Console do seu app para liberar o login do e-mail! Siga as instruções no guia passo a passo logo abaixo para resolver super rápido! 🚀`;
      } else if ((err.code || '').toLowerCase() === 'auth/operation-not-allowed' || (err.message || '').toLowerCase().includes('operation-not-allowed') || customErr.toLowerCase().includes('operation-not-allowed')) {
        customErr = `⚠️ PROVEDOR GOOGLE DESATIVADO NO FIREBASE! No painel do seu Firebase (projeto - pkxd-e817c), clique em Authentication > Sign-in method > Adicionar Provedor > Selecione "Google", adicione o e-mail de suporte (ex: kawanyuri35@gmail.com) e salve para ativar o login com contas Google!`;
      }
      
      setGmailError(customErr);
    } finally {
      setIsGmailLoading(false);
    }
  };

  const connectGmailRedirect = async () => {
    try {
      setIsGmailLoading(true);
      setGmailError(null);
      
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      try {
        localStorage.setItem('pending_gmail_connect', 'true');
      } catch (e) {}
      
      await signInWithRedirect(auth, provider);
    } catch (err: any) {
      console.error('Error connecting to Gmail via redirect:', err);
      let customErr = err.message || 'Falha ao conectar com o Gmail por redirecionamento.';
      if (err.code === 'auth/operation-not-allowed' || err.message?.includes('operation-not-allowed') || customErr.includes('operation-not-allowed')) {
        customErr = `⚠️ PROVEDOR GOOGLE DESATIVADO NO FIREBASE! No painel do seu Firebase (projeto - pkxd-e817c), clique em Authentication > Sign-in method > Adicionar Provedor > Selecione "Google", adicione o e-mail de suporte (ex: kawanyuri35@gmail.com) e salve para ativar o login com contas Google!`;
      }
      setGmailError(customErr);
      setIsGmailLoading(false);
    }
  };

  const fetchGmailMessages = async (token: string) => {
    setIsGmailLoading(true);
    setGmailError(null);
    try {
      const q = encodeURIComponent(gmailQuery);
      const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=8&q=${q}`;
      const response = await fetch(listUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          setGmailToken(null);
          throw new Error('Sessão do Gmail expirada. Conecte novamente.');
        }
        
        let detailedError = "Erro ao listar e-mails do Gmail.";
        try {
          const errData = await response.json();
          if (errData?.error?.message) {
            detailedError = `Erro da API Google Gmail: ${errData.error.message}`;
            const msgLower = errData.error.message.toLowerCase();
            if (msgLower.includes('disabled') || msgLower.includes('has not been used')) {
              detailedError = `⚠️ API DO GMAIL DESATIVADA NO SEU GOOGLE CLOUD!\n\nPor favor, ative a API do Gmail seguindo os passos abaixo:\n\n1️⃣ Acesse o console do Google Cloud: https://console.cloud.google.com/apis/library/gmail.googleapis.com?project=${(firebaseConfig as any)?.projectId || 'pkxd-e817c'}\n2️⃣ Verifique se o projeto "${(firebaseConfig as any)?.projectId || 'pkxd-e817c'}" está selecionado no topo.\n3️⃣ Clique no botão azul "ATIVAR" (Enable).\n\nDepois de ativar, aguarde 30 segundos, volte aqui e tente conectar novamente! 🚀`;
            } else if (msgLower.includes('insufficient') || msgLower.includes('permission')) {
              detailedError = `⚠️ PERMISSÕES INSUFICIENTES!\n\nEste erro ocorre porque a sua conta Google não concedeu autorização completa ao aplicativo para ler os e-mails. Quando for selecionar sua conta para fazer login, certifique-se de marcar a caixinha que autoriza "Visualizar suas mensagens de e-mail e configurações do Gmail" (Gmail Readonly scope).`;
            }
          }
        } catch (_) {}
        
        throw new Error(detailedError);
      }
      
      const data = await response.json();
      if (!data.messages || data.messages.length === 0) {
        setGmailEmails([]);
        setIsGmailLoading(false);
        return;
      }
      
      const detailsPromises = data.messages.map(async (msg: { id: string }) => {
        const detailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`;
        const detailRes = await fetch(detailUrl, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!detailRes.ok) return null;
        return detailRes.json();
      });
      
      const detailsList = await Promise.all(detailsPromises);
      const parsedEmails = detailsList.filter(Boolean).map((mail: any) => {
        const headers = mail.payload.headers || [];
        const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '(Sem assunto)';
        const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || 'Desconhecido';
        const date = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || '';
        
        const bodyContent = extractMailData(mail.payload);
        
        return {
          id: mail.id,
          snippet: mail.snippet,
          subject,
          from,
          date: formatDateString(date),
          bodyText: bodyContent.text,
          bodyHtml: bodyContent.html,
          attachments: bodyContent.attachments,
          // Support legacy signature field
          imageAttachments: bodyContent.attachments.map(a => a.attachmentId),
          mailRawJson: mail
        };
      });
      
      setGmailEmails(parsedEmails);
    } catch (err: any) {
      console.error('Error fetching Gmail messages:', err);
      setGmailError(err.message || 'Erro ao carregar e-mails.');
    } finally {
      setIsGmailLoading(false);
    }
  };

  const fetchAttachmentData = async (messageId: string, attachmentId: string, mimeType: string, token: string): Promise<string | null> => {
    try {
      const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.data) {
        const standardBase64 = data.data.replace(/-/g, '+').replace(/_/g, '/');
        const finalMime = mimeType || 'image/jpeg';
        return `data:${finalMime};base64,${standardBase64}`;
      }
      return null;
    } catch (err) {
      console.warn("Failed to fetch attachment:", err);
      return null;
    }
  };

  const importGmailToEditor = async (mail: any) => {
    if (!gmailToken) return;
    setImportingGmailId(mail.id);
    showStatus('📥 Baixando dados e imagens em alta resolução do seu e-mail...');
    
    try {
      const imageMap: { [key: string]: string } = {};
      const usedCids = new Set<string>();

      if (mail.attachments && mail.attachments.length > 0) {
        showStatus(`📥 Baixando ${mail.attachments.length} imagens anexas e incorporadas de alta resolução...`);
        const fetchPromises = mail.attachments.map(async (att: any) => {
          const base64Data = await fetchAttachmentData(mail.id, att.attachmentId, att.mimeType, gmailToken);
          if (base64Data) {
            imageMap[att.attachmentId] = base64Data;
            if (att.contentId) {
              imageMap[att.contentId] = base64Data;
            }
          }
        });
        await Promise.all(fetchPromises);
      }

      let fullMarkdownBody = '';
      if (mail.bodyHtml) {
        // Track inline content id images
        const regex = /src=["']cid:([^"']+)["']/gi;
        let match;
        while ((match = regex.exec(mail.bodyHtml)) !== null) {
          const cid = match[1].trim().replace(/[<>]/g, '');
          usedCids.add(cid);
        }

        fullMarkdownBody = convertHtmlToMarkdownWithCids(mail.bodyHtml, imageMap);
      } else {
        fullMarkdownBody = mail.bodyText || '';
        mail.attachments.forEach((att: any) => {
          const base64 = imageMap[att.attachmentId];
          if (base64) {
            fullMarkdownBody += `\n\n![Imagem de Spoiler](${base64})`;
          }
        });
      }

      // Add any attachments that weren't inline
      let unusedCount = 0;
      mail.attachments.forEach((att: any) => {
        const isInline = att.contentId && usedCids.has(att.contentId);
        if (!isInline) {
          const base64 = imageMap[att.attachmentId];
          if (base64) {
            if (unusedCount === 0) {
              fullMarkdownBody += '\n\n### Outras Imagens do Fornecedor:';
            }
            fullMarkdownBody += `\n\n![Imagem Anexa ${att.filename || 'spoiler'}](${base64})`;
            unusedCount++;
          }
        }
      });

      // Cover preview choice
      let principalImage = '';
      mail.attachments.forEach((att: any) => {
        if (!principalImage && imageMap[att.attachmentId]) {
          principalImage = imageMap[att.attachmentId];
        }
      });

      const cleanSubject = mail.subject || 'SPOILER REVELADO POR E-MAIL! 🔮';

      setExpressTitle(cleanSubject);
      setExpressDescAuto(fullMarkdownBody);
      setExpressImage(principalImage);

      setSpoilerTitle(cleanSubject);
      setSpoilerDesc(fullMarkdownBody);
      setSpoilerImage(principalImage);

      showStatus('✨ INCRÍVEL! Texto e mídias do e-mail carregados mantendo as imagens exatamente entre as frases e parágrafos!');
      playSuccessSound();
    } catch (err) {
      console.error('Failed to fully import email:', err);
      showStatus('Erro ao descriptografar e processar imagens completas de spoilers.');
    } finally {
      setImportingGmailId(null);
    }
  };

  // Sync edits
  useEffect(() => {
    if (newsToEdit) {
      setTitle(newsToEdit.title);
      setAuthor(newsToEdit.author);
      setExcerpt(newsToEdit.excerpt);
      setContent(newsToEdit.content);
      setVideoStatus(newsToEdit.date || 'Ao Vivo 🔴');
      setScheduledTime(newsToEdit.scheduledAt || '');
      setActiveTab('news');
      setIsOpen(true);
    }
  }, [newsToEdit]);

  // Sync temp logo with prop change
  useEffect(() => {
    setTempLogoUrl(siteLogoUrl);
  }, [siteLogoUrl]);

  // Sync delays info with prop change
  useEffect(() => {
    setDelayActive(isDelayed);
    if (delayMessage) {
      setDelayMsgText(delayMessage);
    }
  }, [isDelayed, delayMessage]);

  // Handle direct file input choice and compress on-the-fly
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, target: 'desc' | 'cover' | 'express') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      alert("Por favor, escolha apenas arquivos de imagem/GIF.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Src = event.target?.result as string;
      if (!base64Src) return;

      try {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Compress to maximum size of 900px
            const MAX_SIZE = 900;
            if (width > MAX_SIZE || height > MAX_SIZE) {
              if (width > height) {
                height = Math.round((height * MAX_SIZE) / width);
                width = MAX_SIZE;
              } else {
                width = Math.round((width * MAX_SIZE) / height);
                height = MAX_SIZE;
              }
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              const compressedBase64 = canvas.toDataURL('image/jpeg', 0.72);
              
              if (target === 'express') {
                setExpressImage(compressedBase64);
              } else if (target === 'desc') {
                const textarea = document.getElementById('spoilerDescTextArea') as HTMLTextAreaElement;
                const startPos = textarea ? textarea.selectionStart : spoilerDesc.length;
                const endPos = textarea ? textarea.selectionEnd : spoilerDesc.length;
                const text = spoilerDesc;

                const markdownImage = `\n![Imagem de Spoiler](${compressedBase64})\n`;
                const newText = text.substring(0, startPos) + markdownImage + text.substring(endPos);
                setSpoilerDesc(newText);

                if (textarea) {
                  setTimeout(() => {
                    textarea.focus();
                    textarea.selectionStart = startPos + markdownImage.length;
                    textarea.selectionEnd = startPos + markdownImage.length;
                  }, 50);
                }
              } else {
                setSpoilerImage(compressedBase64);
              }
            } else {
              if (target === 'express') {
                setExpressImage(base64Src);
              } else if (target === 'desc') {
                setSpoilerDesc(prev => prev + `\n![Imagem de Spoiler](${base64Src})\n`);
              } else {
                setSpoilerImage(base64Src);
              }
            }
          } catch (err) {
            console.warn("Canvas compression failed:", err);
            if (target === 'express') {
              setExpressImage(base64Src);
            } else if (target === 'desc') {
              setSpoilerDesc(prev => prev + `\n![Imagem](${base64Src})\n`);
            } else {
              setSpoilerImage(base64Src);
            }
          }
        };
        img.src = base64Src;
      } catch (err) {
        if (target === 'express') {
          setExpressImage(base64Src);
        } else if (target === 'desc') {
          setSpoilerDesc(prev => prev + `\n![Imagem](${base64Src})\n`);
        } else {
          setSpoilerImage(base64Src);
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input
  };

  const handleExpressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expressTitle) {
      showStatus('Por favor, informe o título do spoiler express!');
      return;
    }

    // Auto generate active description
    const fullDesc = expressImage
      ? `${expressDescAuto.trim()}\n\n![Imagem do Spoiler](${expressImage})`
      : expressDescAuto.trim();

    // Post and reveal immediately (image parameter is optional, pass empty string if no image)
    onUpdateSpoiler(expressTitle, fullDesc, expressImage || '', true);

    // Send the real-time push alert
    if (onSendCustomNotification) {
      onSendCustomNotification(
        expressTitle, 
        "🔥 Novo spoiler oficial do PK XD enviado pela equipe central! Venha conferir agora de graça!", 
        'story_published'
      );
    }

    showStatus('🚀 EXCELENTE! Spoiler oficial publicado mundialmente em segundos!');
    playSuccessSound();

    // Reset fields
    setExpressImage('');
    setExpressTitle('NOVO SPOILER OFICIAL PK XD! 🔮');
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    // Helper to insert markdown in the exact cursor position
    const insertMarkdown = (markdownText: string) => {
      const textarea = e.currentTarget;
      const startPos = textarea.selectionStart || 0;
      const endPos = textarea.selectionEnd || 0;
      const text = textarea.value;

      const newText = text.substring(0, startPos) + markdownText + text.substring(endPos);
      setSpoilerDesc(newText);

      // Focus and set cursor exactly after the inserted segment
      setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = startPos + markdownText.length;
        textarea.selectionEnd = startPos + markdownText.length;
      }, 50);
    };

    // 1. Try to find a file in the clipboard files (e.g., screenshot paste, print-screen)
    let imageFile: File | null = null;
    if (clipboardData.files && clipboardData.files.length > 0) {
      for (let i = 0; i < clipboardData.files.length; i++) {
        const file = clipboardData.files[i];
        if (file.type && file.type.startsWith('image/')) {
          imageFile = file;
          break;
        }
      }
    }

    // 2. Try to find a file in the clipboard items
    if (!imageFile && clipboardData.items && clipboardData.items.length > 0) {
      for (let i = 0; i < clipboardData.items.length; i++) {
        const item = clipboardData.items[i];
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          imageFile = item.getAsFile();
          break;
        }
      }
    }

    // If we found an actual image file (binary screenshot or pasted file)
    if (imageFile) {
      e.preventDefault();
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Src = event.target?.result as string;
        if (!base64Src) return;

        try {
          // Use dynamic Image constructor safely
          const img = new Image();
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              let width = img.width;
              let height = img.height;

              // Max size 900px for spoilers to keep document size friendly
              const MAX_SIZE = 900;
              if (width > MAX_SIZE || height > MAX_SIZE) {
                if (width > height) {
                  height = Math.round((height * MAX_SIZE) / width);
                  width = MAX_SIZE;
                } else {
                  width = Math.round((width * MAX_SIZE) / height);
                  height = MAX_SIZE;
                }
              }

              canvas.width = width;
              canvas.height = height;

              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                insertMarkdown(`\n![Imagem de Spoiler](${compressedBase64})\n`);
              } else {
                // Fallback to original Base64 if canvas drawing is unavailable
                insertMarkdown(`\n![Imagem de Spoiler](${base64Src})\n`);
              }
            } catch (err) {
              console.warn("Canvas compression failed, falling back to raw data:", err);
              insertMarkdown(`\n![Imagem de Spoiler](${base64Src})\n`);
            }
          };
          img.onerror = () => {
            insertMarkdown(`\n![Imagem de Spoiler](${base64Src})\n`);
          };
          img.src = base64Src;
        } catch (err) {
          console.warn("Compression preparation failed, inserting raw data:", err);
          insertMarkdown(`\n![Imagem de Spoiler](${base64Src})\n`);
        }
      };
      reader.readAsDataURL(imageFile);
      return;
    }

    // 3. Try to extract an image from copied HTML content (e.g. copy image from another web page)
    const html = clipboardData.getData('text/html');
    if (html) {
      const imgMatch = html.match(/<img\s+[^>]*src=["']([^"']+)["']/i);
      if (imgMatch && imgMatch[1]) {
        e.preventDefault();
        const src = imgMatch[1];
        insertMarkdown(`\n![Imagem de Spoiler](${src})\n`);
        return;
      }
    }

    // 4. Try to find a plain text image URL
    const textStr = clipboardData.getData('text');
    if (textStr && textStr.trim().match(/^https?:\/\/[^\s]+?(?:\.png|\.jpg|\.jpeg|\.gif|\.webp|\.bmp)(?:\?[^\s]*)?$/i)) {
      e.preventDefault();
      insertMarkdown(`\n![Imagem de Spoiler](${textStr.trim()})\n`);
      return;
    }
  };

  // Sync spoiler input fields values when prop changes
  useEffect(() => {
    if (!pastSpoilerToEdit) {
      setSpoilerTitle(activeSpoilerTitle);
      setSpoilerDesc(activeSpoilerDesc);
      if (activeSpoilerImage !== undefined) {
        setSpoilerImage(activeSpoilerImage);
      }
      if (activeSpoilerForceReveal !== undefined) {
        setForceReveal(activeSpoilerForceReveal);
      }
    }
  }, [activeSpoilerTitle, activeSpoilerDesc, activeSpoilerImage, activeSpoilerForceReveal, pastSpoilerToEdit]);

  // Sync edits for past spoilers
  useEffect(() => {
    if (pastSpoilerToEdit) {
      setSpoilerTitle(pastSpoilerToEdit.title);
      setSpoilerDesc(pastSpoilerToEdit.description);
      setSpoilerImage(pastSpoilerToEdit.imageUrl || '');
      setActiveTab('spoiler');
      setIsOpen(true);
    }
  }, [pastSpoilerToEdit]);

  // Sync extra countdown sets
  useEffect(() => {
    setExtraTitle(activeExtraCountdownTitle);
    setExtraDate(activeExtraCountdownDate);
    setExtraEnabled(activeExtraCountdownEnabled);
  }, [activeExtraCountdownTitle, activeExtraCountdownDate, activeExtraCountdownEnabled]);

  // Sync gift countdown sets
  useEffect(() => {
    if (activeGiftCountdownTitle !== undefined) setGiftTitle(activeGiftCountdownTitle);
    if (activeGiftCountdownDate !== undefined) setGiftDate(activeGiftCountdownDate);
    if (activeGiftCountdownEnabled !== undefined) setGiftEnabled(activeGiftCountdownEnabled);
    if (activeGiftCountdownContent !== undefined) setGiftContent(activeGiftCountdownContent);
  }, [activeGiftCountdownTitle, activeGiftCountdownDate, activeGiftCountdownEnabled, activeGiftCountdownContent]);

  const handleGiftCountdownSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateGiftCountdown) {
      onUpdateGiftCountdown(giftTitle, giftDate, giftEnabled, giftContent);
      showStatus('Contagem regressiva de Presente/Código salva com sucesso! 🎁');
      playSuccessSound();
    }
  };

  const handleCreatePromoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = newCodeName.toUpperCase().trim().replace(/\s+/g, '');
    if (!cleanCode) {
      alert("⚠️ Por favor, digite um código válido!");
      return;
    }
    
    setCodeSubmitLoading(true);
    playTapSound();
    try {
      const codeRef = doc(db, 'generated_promo_codes', cleanCode);
      await setDoc(codeRef, {
        code: cleanCode,
        gems: Number(newCodeGems),
        coins: Number(newCodeCoins),
        maxRedeems: Number(newCodeMaxRedeems),
        currentRedeems: 0,
        createdAt: Date.now(),
        redeemedUsers: []
      });
      showStatus(`Cupom ${cleanCode} criado com sucesso! 🎉`);
      playSuccessSound();
      setNewCodeName('');
      setNewCodeGems(50);
      setNewCodeCoins(2000);
      setNewCodeMaxRedeems(50);
    } catch (err: any) {
      console.error("Erro ao criar código de resgate:", err);
      alert("Ocorreu um erro ao salvar o código: " + err.message);
    } finally {
      setCodeSubmitLoading(false);
    }
  };

  const showStatus = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(''), 4000);
  };

  // Automated Spoiler content extractor (Gemini 3.5-powered backend)
  const handleAutoScrape = async () => {
    if (!scrapUrl) {
      setScrapError("Por favor, cole um link válido para puxar!");
      return;
    }

    setScrapError('');
    setIsScraping(true);
    playTapSound();

    try {
      const response = await fetch('/api/scrape-spoiler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: scrapUrl })
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Ocorreu um erro ao extrair spoilers.');
      }

      const extracted = resData.data;
      if (extracted.title) {
        setSpoilerTitle(extracted.title);
      }
      if (extracted.description) {
        setSpoilerDesc(extracted.description);
      }

      if (resData.isFallbackRescue) {
        showStatus("Servidor ocupado. Dados principais recuperados via Modo de Resgate! 🔧");
      } else {
        showStatus("Spoilers extraídos e preenchidos automaticamente com IA! 🪄");
      }
      playSuccessSound();
      setScrapUrl('');
    } catch (err: any) {
      console.error(err);
      setScrapError(err.message || 'Erro ao comunicar com o servidor de IA de spoilers.');
    } finally {
      setIsScraping(false);
    }
  };

  const handleNewsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !excerpt || !content) {
      showStatus('Por favor, preencha todos os campos!');
      return;
    }

    if (newsToEdit) {
      const updated: NewsItem = {
        ...newsToEdit,
        title,
        category: 'codes',
        author: author || 'Criador Oficial',
        excerpt,
        content,
        date: videoStatus,
        scheduledAt: scheduledTime
      };
      onSaveEdit(updated);
      showStatus('Vídeo de código atualizado! ⚡');
    } else {
      onAddNews({
        title,
        category: 'codes',
        author: author || 'Criador Oficial',
        excerpt,
        content,
        imageUrl: '',
        date: videoStatus,
        scheduledAt: scheduledTime
      });
      showStatus('Vídeo/Live adicionado com sucesso! 🎬');
    }

    setTitle('');
    setExcerpt('');
    setContent('');
    setAuthor('');
    setVideoStatus('Ao Vivo 🔴');
    setScheduledTime('');
    playSuccessSound();
  };

  const handleSpoilerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!spoilerTitle || !spoilerDesc) {
      showStatus('Título e conteúdo de spoiler são obrigatórios!');
      return;
    }

    if (pastSpoilerToEdit && onSaveEditPastSpoiler) {
      onSaveEditPastSpoiler(pastSpoilerToEdit.id, spoilerTitle, spoilerDesc, spoilerImage);
      showStatus('Spoiler antigo no histórico atualizado com sucesso! 💎');
    } else {
      onUpdateSpoiler(spoilerTitle, spoilerDesc, spoilerImage, forceReveal);
      showStatus('Spoiler e histórico de transmissão atualizados! 🔮');
    }
    playSuccessSound();
  };

  const handleFeatVideoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!featTitle || !featUrl) {
      showStatus('Título do vídeo e URL são obrigatórios!');
      return;
    }

    onAddFeaturedVideo({
      title: featTitle,
      youtubeUrl: featUrl,
      type: featType,
      author: 'Staff PKXD Hub'
    });

    setFeatTitle('');
    setFeatUrl('');
    setFeatType('game_highlight');
    showStatus('Vídeo em destaque adicionado com sucesso! 💎');
    playSuccessSound();
  };

  const handleTheorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!theoryTitle || !theoryContent) {
      showStatus('Título e corpo da teoria são necessários!');
      return;
    }

    onAddTheory({
      title: theoryTitle,
      content: theoryContent,
      author: theoryAuthor || 'PKXD Hub'
    });

    setTheoryTitle('');
    setTheoryContent('');
    setTheoryAuthor('');
    showStatus('Teoria publicada com sucesso! 🔮');
    playSuccessSound();
  };

  const handleShortSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shortTitle || !shortUrl) {
      showStatus('Título e link do Short do YouTube são necessários!');
      return;
    }

    onAddShort({
      title: shortTitle,
      youtubeUrl: shortUrl
    });

    setShortTitle('');
    setShortUrl('');
    showStatus('Short do YouTube curado com sucesso! 📱');
    playSuccessSound();
  };

  const handleExtraTimerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateExtraCountdown(extraTitle, extraDate, extraEnabled);
    showStatus('Contagem alternativa salva e atualizada com sucesso! ⏰');
    playSuccessSound();
  };

  return (
    <div 
      id="admin-management-panel"
      className="bg-black/85 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl"
    >
      {/* Header toggle */}
      <button 
        type="button"
        onClick={() => { playTapSound(); setIsOpen(!isOpen); }}
        className="w-full bg-zinc-900 border-b border-zinc-800 text-gray-200 p-4 px-6 font-sans font-black flex items-center justify-between text-base sm:text-lg cursor-pointer tracking-wider"
      >
        <span className="flex items-center gap-2">
          ⚙️ Painel de Administração Gamer PKXD
          {newsToEdit && (
            <span className="bg-red-500 text-white font-mono text-[9px] px-2 py-0.5 rounded-full uppercase animate-pulse">
              Modificando Vídeo
            </span>
          )}
        </span>
        <div>
          {isOpen ? <X className="w-5 h-5 text-gray-400" /> : <Save className="w-5 h-5 text-yellow-400" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-6 space-y-6">
          {user?.uid === 'admin_fallback' && (
            <div className="p-4 bg-emerald-950/40 border-2 border-emerald-500/30 rounded-2xl text-left space-y-1.5 shadow-md">
              <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-xs uppercase tracking-wide">
                <Sparkles className="w-4.5 h-4.5 animate-pulse text-emerald-400" />
                <span>⚡ PORTAL SINCRONIZADO COM SUCESSO (MODO PIN)</span>
              </div>
              <p className="text-gray-300 text-xs font-sans leading-relaxed">
                Você acessou o sistema usando o de <strong>Código PIN de emergência</strong>. Seus posts, códigos de vídeos e spoilers criados aqui <strong>são sincronizados e gravados na nuvem do Firestore em tempo real</strong>!
              </p>
              <p className="text-xs font-sans text-emerald-300 font-bold leading-relaxed">
                🚀 Todos os jogadores e fãs do PK XD verão as atualizações do seu painel de forma instantaneamente global e segura.
              </p>
            </div>
          )}

          {/* Sub tabs navigation */}
          <div className="flex flex-wrap gap-2 border-b border-white/5 pb-4">
            <button
              type="button"
              onClick={() => { playTapSound(); setActiveTab('news'); }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all uppercase cursor-pointer ${
                activeTab === 'news' ? 'bg-yellow-400 text-black font-black' : 'bg-zinc-900 text-gray-300'
              }`}
            >
              📹 Códigos / Lives ({newsToEdit ? 'Editando' : 'Novo'})
            </button>
            <button
              type="button"
              onClick={() => { playTapSound(); setActiveTab('spoiler'); }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all uppercase cursor-pointer ${
                activeTab === 'spoiler' ? 'bg-yellow-400 text-black font-black' : 'bg-zinc-900 text-gray-300'
              }`}
            >
              🔮 Mudar Spoilers
            </button>
            <button
              type="button"
              onClick={() => { playTapSound(); setActiveTab('featured'); }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all uppercase cursor-pointer ${
                activeTab === 'featured' ? 'bg-yellow-400 text-black font-black' : 'bg-zinc-900 text-gray-300'
              }`}
            >
              🎬 Vídeos Destaque
            </button>
            <button
              type="button"
              onClick={() => { playTapSound(); setActiveTab('theories'); }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all uppercase cursor-pointer ${
                activeTab === 'theories' ? 'bg-yellow-400 text-black font-black' : 'bg-zinc-900 text-gray-300'
              }`}
            >
              💬 Publicar Teorias
            </button>
            <button
              type="button"
              onClick={() => { playTapSound(); setActiveTab('shorts'); }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all uppercase cursor-pointer ${
                activeTab === 'shorts' ? 'bg-yellow-400 text-black font-black' : 'bg-zinc-900 text-gray-300'
              }`}
            >
              📱 Shorts Curados
            </button>
            <button
              type="button"
              onClick={() => { playTapSound(); setActiveTab('extratimer'); }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all uppercase cursor-pointer ${
                activeTab === 'extratimer' ? 'bg-yellow-400 text-black font-black' : 'bg-zinc-900 text-gray-300'
              }`}
            >
              ⏰ Contagem Alternativa
            </button>
            <button
              type="button"
              onClick={() => { playTapSound(); setActiveTab('giftcountdown'); }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all uppercase cursor-pointer ${
                activeTab === 'giftcountdown' ? 'bg-yellow-400 text-black font-black' : 'bg-zinc-900 text-gray-300'
              }`}
            >
              🎁 Soltar Presente/Código
            </button>
            <button
              type="button"
              onClick={() => { playTapSound(); setActiveTab('push'); }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all uppercase cursor-pointer ${
                activeTab === 'push' ? 'bg-yellow-400 text-black font-black' : 'bg-zinc-900 text-gray-300'
              }`}
            >
              🔔 Notificar / Atrasar
            </button>
            <button
              type="button"
              onClick={() => { playTapSound(); setActiveTab('logo'); }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all uppercase cursor-pointer ${
                activeTab === 'logo' ? 'bg-yellow-400 text-black font-black' : 'bg-zinc-900 text-gray-300'
              }`}
            >
              🖼️ Logo
            </button>
            <button
              type="button"
              onClick={() => { playTapSound(); setActiveTab('applications'); }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all uppercase cursor-pointer relative ${
                activeTab === 'applications' ? 'bg-yellow-400 text-black font-black' : 'bg-zinc-900 text-gray-300'
              }`}
            >
              📝 Inscrições ({appsPanel.length + appsShorts.length + appsTheories.length + appsAdmin.length})
              {(appsPanel.length + appsShorts.length + appsTheories.length + appsAdmin.length) > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center animate-bounce">
                  {appsPanel.length + appsShorts.length + appsTheories.length + appsAdmin.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => { playTapSound(); setActiveTab('moderation'); }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all uppercase cursor-pointer relative ${
                activeTab === 'moderation' ? 'bg-yellow-400 text-black font-black' : 'bg-zinc-900 text-gray-300'
              }`}
            >
              🛡️ Moderação
              {allComments.filter(c => c.status === 'pending_review').length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-pink-500 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center animate-bounce">
                  {allComments.filter(c => c.status === 'pending_review').length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => { playTapSound(); setActiveTab('promocodes'); }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all uppercase cursor-pointer relative ${
                activeTab === 'promocodes' ? 'bg-yellow-400 text-black font-black' : 'bg-zinc-900 text-gray-300'
              }`}
            >
              🎟️ Criar Códigos
              {generatedCodes.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-amber-550 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full flex items-center justify-center">
                  {generatedCodes.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => { playTapSound(); onResetToDefaults(); showStatus('Restaurado para os links iniciais! 🪄'); }}
              className="ml-auto text-[10px] font-bold text-gray-400 hover:text-white uppercase flex items-center gap-1 cursor-pointer bg-zinc-900 px-2.5 py-1.5 rounded-xl border border-zinc-800"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restaurar Padrões</span>
            </button>
          </div>

          Status message notice
          {statusMsg && (
            <div className="bg-yellow-400/10 text-yellow-300 border border-yellow-400/20 p-3.5 rounded-xl text-xs font-semibold animate-pulse text-left">
              ✔ {statusMsg}
            </div>
          )}

          {/* TAB: Lives e Vídeos de códigos */}
          {activeTab === 'news' && (
            <form onSubmit={handleNewsSubmit} className="space-y-4 text-left font-sans">
              {newsToEdit && (
                <div className="flex justify-between items-center bg-zinc-900 p-3 rounded-lg text-xs text-gray-400 border border-white/5">
                  <span>Modificando vídeo existente na lista</span>
                  <button type="button" onClick={onCancelEdit} className="text-red-400 font-bold uppercase hover:underline">Cancelar</button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.55">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Título do Conteúdo *</label>
                  <input 
                    type="text" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    placeholder="Ex: Pegue Códigos Ativos na Live Oficial!"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm font-semibold text-white focus:outline-none focus:border-yellow-400"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Status / Distintivo *</label>
                    <select 
                      value={videoStatus} 
                      onChange={(e) => setVideoStatus(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs font-bold text-white focus:outline-none focus:border-yellow-400"
                    >
                      <option value="Ao Vivo 🔴">Ao Vivo 🔴</option>
                      <option value="Estreia 🍿">Estreia 🍿</option>
                      <option value="Agendado 📆">Agendado 📆</option>
                      <option value="Vídeo Novo 🎬">Vídeo Novo 🎬</option>
                      <option value="Próxima Live 📆">Próxima Live 📆</option>
                      <option value="Evento PK XD 🌟">Evento PK XD 🌟</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Data e Hora (Agendamento)</label>
                    <input 
                      type="datetime-local" 
                      value={scheduledTime} 
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-sm font-semibold text-white focus:outline-none focus:border-yellow-400"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Criador Canal</label>
                    <input 
                      type="text" 
                      value={author} 
                      onChange={(e) => setAuthor(e.target.value)} 
                      placeholder="Ex: Jess PK XD"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm font-semibold text-white focus:outline-none focus:border-yellow-400"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Resumo dos Prêmios do Código *</label>
                <input 
                  type="text" 
                  value={excerpt} 
                  onChange={(e) => setExcerpt(e.target.value)} 
                  placeholder="Ex: Contém 20 Gemas Verdes e Tênis Raro de Brinde!"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm font-semibold text-white focus:outline-none focus:border-yellow-400"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">URL / Link do Vídeo *</label>
                <input 
                  type="text" 
                  value={content} 
                  onChange={(e) => setContent(e.target.value)} 
                  placeholder="Ex: https://www.youtube.com/watch?v=..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm font-semibold text-white focus:outline-none focus:border-yellow-400"
                  required
                />
              </div>

              <button 
                type="submit" 
                className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-black font-sans font-black uppercase text-xs rounded-xl border-b-4 border-yellow-700 active:border-b-0 cursor-pointer border-0"
              >
                📹 {newsToEdit ? 'Salvar Edição' : 'Publicar Código/Live'}
              </button>
            </form>
          )}

          {/* TAB: Mudar Spoilers */}
          {activeTab === 'spoiler' && (
            <div className="space-y-6 text-left">
              {/* 📬 CONECTAR GMAIL CARD */}
              <div className="bg-zinc-900/70 border-2 border-dashed border-red-500/20 rounded-3xl p-5 space-y-4 font-sans shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-400 border border-red-500/20 shadow-inner">
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                        <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-sans font-black text-xs uppercase tracking-wider text-white flex items-center gap-1.5">
                        Importador de Spoilers do E-mail (Gmail) <span className="animate-pulse text-red-400">●</span>
                      </h4>
                      <p className="text-[10px] sm:text-xs text-gray-400">
                        Carregue textos e mídias das mensagens que você recebe em 1 clique
                      </p>
                    </div>
                  </div>
                  
                  {gmailToken ? (
                    <div className="flex items-center gap-2 justify-end sm:self-center">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-[10px] text-emerald-400 font-extrabold uppercase bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/15">Conectado</span>
                      <button 
                        onClick={() => { setGmailToken(null); setGmailEmails([]); playTapSound(); }}
                        className="ml-2 px-2.5 py-1 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 hover:border-zinc-500 rounded-lg text-[10px] font-black uppercase transition-all border border-zinc-700 cursor-pointer"
                      >
                        Sair ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 text-right w-full sm:w-auto">
                      <button
                        onClick={() => { setShowLocalImport(!showLocalImport); playTapSound(); }}
                        className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center gap-2 cursor-pointer shadow border border-zinc-700 shrink-0 active:scale-95"
                      >
                        📥 Copiar & Colar
                      </button>

                      <button
                        onClick={connectGmail}
                        className="px-3 py-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center gap-2 cursor-pointer shadow active:scale-95 border-0 hover:shadow-red-600/10 shrink-0"
                      >
                        🔌 Gmail (Popup)
                      </button>

                      <button
                        onClick={connectGmailRedirect}
                        className="px-3 py-2 bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center gap-2 cursor-pointer shadow active:scale-95 border-0 hover:shadow-pink-600/10 shrink-0"
                      >
                        📱 Gmail (Redirect)
                      </button>
                    </div>
                  )}
                </div>

                {/* LOCAL MANUAL COPY-PASTE IMPORT BOX */}
                {showLocalImport && (
                  <div className="bg-zinc-950/90 border-2 border-pink-500/30 rounded-2xl p-4.5 space-y-4 shadow-2xl animate-fade-in text-left">
                    <div className="flex items-start gap-2">
                      <span className="text-pink-400 text-lg">💡</span>
                      <div>
                        <h5 className="font-sans font-black text-xs text-pink-400 uppercase leading-none tracking-tight">
                          IMPORTADOR SEM LOGIN (Super Recomendador para Celular! 📱)
                        </h5>
                        <p className="text-[11px] text-gray-300 mt-1 leading-relaxed">
                          Se o login do Google estiver bloqueado por permissões de domínio ou erro corporativo, use este método! Basta abrir o e-mail de spoiler no seu aplicativo do Gmail, <strong>selecionar/copiar todo o texto ou código HTML</strong> e colar aqui abaixo:
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                          Título do Spoiler (Opcional - Buscaremos se colar HTML)
                        </label>
                        <input 
                          type="text"
                          value={localPasteTitle}
                          onChange={(e) => setLocalPasteTitle(e.target.value)}
                          placeholder="Ex: SPOILER REVELADO: Nova Atualização do PK XD!"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs font-semibold text-white focus:outline-none focus:border-pink-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                          Conteúdo Copiado do E-mail (Texto ou Código Fonte/HTML)
                        </label>
                        <textarea 
                          rows={4}
                          value={localPasteContent}
                          onChange={(e) => setLocalPasteContent(e.target.value)}
                          placeholder="Cole aqui todo o texto ou código HTML copiado de dentro do seu e-mail do Gmail recebido..."
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs font-sans text-gray-300 focus:outline-none focus:border-pink-500"
                        />
                      </div>

                      {localImportStatus && (
                        <div className={`p-3 rounded-xl text-xs font-sans ${
                          localImportStatus.startsWith('❌') 
                            ? 'bg-red-500/15 border border-red-500/20 text-red-300' 
                            : 'bg-emerald-500/15 border border-emerald-500/20 text-emerald-300 animate-pulse'
                        }`}>
                          {localImportStatus}
                        </div>
                      )}

                      <div className="flex gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={() => { setShowLocalImport(false); setLocalImportStatus(null); playTapSound(); }}
                          className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs uppercase font-black cursor-pointer border border-zinc-750 transition-colors"
                        >
                          Cancelar ✕
                        </button>
                        
                        <button
                          type="button"
                          onClick={handleLocalPasteImport}
                          className="flex-1 py-2 bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-400 hover:to-violet-500 text-white rounded-xl text-xs uppercase font-black cursor-pointer shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5"
                        >
                          📥 Importar & Formatar Texto para o Editor!
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Collapsible Step-by-Step Fix Guide for Gmail Verification Blocker */}
                {!gmailToken && (
                  <div className="space-y-3">
                    <div className="bg-red-950/20 border border-red-500/25 rounded-2xl p-4 text-left space-y-3">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="w-4.5 h-4.5 text-yellow-300 flex-shrink-0 mt-0.5" />
                        <div>
                          <h5 className="font-sans font-black text-xs text-yellow-300 uppercase leading-tight tracking-tight">
                            ⚠️ "ACESSO BLOQUEADO" ou "POPUP FECHADO" NO LOGIN?
                          </h5>
                          <p className="text-[11px] text-gray-300 mt-1 leading-relaxed">
                            O Gmail é altamente protegido pelo Google. Para permitir a conexão do e-mail <strong>eukoosh@gmail.com</strong> ou <strong>kawanyuri35@gmail.com</strong> no seu app privado <code>{(firebaseConfig as any)?.authDomain || `${(firebaseConfig as any)?.projectId || 'pkxd-e817c'}.firebaseapp.com`}</code>, siga as instruções abaixo:
                          </p>
                        </div>
                      </div>

                      <div className="bg-black/40 border border-white/5 p-3 rounded-xl space-y-2 text-[10.5px] font-sans text-gray-300 leading-relaxed max-h-[180px] overflow-y-auto font-sans">
                        <p>
                          <strong className="text-pink-400">Passo 1:</strong> Acesse o console do Google Cloud: <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-cyan-400 underline font-semibold hover:text-cyan-300">console.cloud.google.com</a> logado na mesma conta administradora do Firebase.
                        </p>
                        <p>
                          <strong className="text-pink-400">Passo 2:</strong> No menu superior (ao lado do logo do Google Cloud), clique no <strong className="text-white">Seletor de Projetos</strong> e certifique-se de abrir o projeto correto do seu app (ex: <code>{(firebaseConfig as any)?.projectId || 'pkxd-e817c'}</code>).
                        </p>
                        <p>
                          <strong className="text-pink-400">Passo 3:</strong> Abra o menu de navegação ☰ e vá em <strong className="text-emerald-400">APIs e Serviços</strong> &gt; <strong className="text-emerald-400">Tela de consentimento OAuth</strong>.
                        </p>
                        <p>
                          <strong className="text-pink-400">Passo 4:</strong> Role até o painel de <strong className="text-white">Usuários de teste</strong> (Test Users), clique no botão <strong className="text-yellow-300">+ ADD USERS</strong> e insira ambos os e-mails:
                        </p>
                        <div className="bg-zinc-950 p-2 rounded-lg font-mono text-[9.5px] border border-white/10 text-cyan-300 select-all space-y-0.5">
                          <div>kawanyuri35@gmail.com</div>
                          <div>eukoosh@gmail.com</div>
                        </div>
                        <p>
                          <strong className="text-pink-400">Passo 5:</strong> Clique em <strong className="text-white">Salvar / Confirmar</strong>. Prontinho! O Google vai habilitar o login de vocês. Ao clicar em Conectar acima, basta prosseguir clicando no link <strong className="text-yellow-300">"Configurações Avançadas" &gt; "Acessar (não seguro)"</strong> no alerta do Google.
                        </p>
                      </div>
                    </div>

                    <div className="bg-indigo-950/25 border border-indigo-500/25 rounded-2xl p-4 text-left space-y-3">
                      <div className="flex items-start gap-2.5">
                        <Globe className="w-4.5 h-4.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <h5 className="font-sans font-black text-xs text-indigo-300 uppercase leading-tight tracking-tight">
                            🌐 DOMÍNIO NÃO AUTORIZADO NO FIREBASE? (Passo a Passo)
                          </h5>
                          <p className="text-[11px] text-gray-300 mt-1 leading-relaxed">
                            O Google impede a conexão do e-mail até que o domínio correspondente seja adicionado como autorizado. Adicione os domínios abaixo em 30 segundos no seu console Firebase:
                          </p>
                        </div>
                      </div>

                      <div className="bg-black/40 border border-white/5 p-3 rounded-xl space-y-2 text-[10.5px] font-sans text-gray-300 leading-relaxed font-sans">
                        <p>
                          <strong className="text-indigo-400">Passo 1:</strong> Abra o console do Firebase em: <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-cyan-400 underline font-semibold hover:text-cyan-300 font-sans">console.firebase.google.com</a>.
                        </p>
                        <p>
                          <strong className="text-indigo-400">Passo 2:</strong> Clique no seu projeto <strong>{(firebaseConfig as any)?.projectId || 'pkxd-e817c'}</strong>.
                        </p>
                        <p>
                          <strong className="text-indigo-400">Passo 3:</strong> No menu lateral esquerdo, acesse <strong className="text-emerald-400">Compilação (Build)</strong> &gt; <strong className="text-emerald-400">Authentication</strong>.
                        </p>
                        <p>
                          <strong className="text-indigo-400">Passo 4:</strong> Clique na aba <strong className="text-white">Configurações (Settings)</strong> na parte superior da página.
                        </p>
                        <p>
                          <strong className="text-indigo-400">Passo 5:</strong> No menu vertical à esquerda, clique em <strong className="text-yellow-300">Domínios autorizados (Authorized domains)</strong>.
                        </p>
                        <p>
                          <strong className="text-indigo-400">Passo 6:</strong> Clique em <strong className="text-white">Adicionar domínio</strong> de cada um separadamente:
                        </p>
                        <div className="mt-2 pl-3 border-l-2 border-indigo-500 space-y-2.5">
                          <div>
                            <span className="text-[10px] text-gray-400 block uppercase font-bold">1️⃣ Domínio do Site Final:</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <code className="text-cyan-300 bg-zinc-950 px-2 py-1 rounded text-xs select-all font-mono font-bold">pkxdcentral.github.io</code>
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 block uppercase font-bold">2️⃣ Domínio de Testes Atual (Para testar agora):</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <code className="text-amber-300 bg-zinc-950 px-2 py-1 rounded text-xs select-all font-mono font-bold">{window.location.hostname}</code>
                            </div>
                          </div>
                        </div>
                        <p className="mt-3 text-red-400 font-semibold text-[10px] bg-red-950/20 p-2 rounded-lg border border-red-500/20">
                          ⚠️ ATENÇÃO: NÃO coloque "https://" nem barras "/" no final! Coloque somente o texto exato dos blocos acima (sem nada a mais), caso contrário o Firebase dará erro e não deixará salvar!
                        </p>
                        <p className="text-emerald-400 font-semibold mt-1.5 flex items-center gap-1">
                          ✨ Prontinho! A conexão de e-mail e login com o Google vão funcionar na hora sem dar erros de domínio!
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Display Emails when Connected */}
                {gmailToken && (
                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input 
                        type="text" 
                        value={gmailQuery}
                        onChange={(e) => setGmailQuery(e.target.value)}
                        placeholder="Filtro de busca (ex: subject:spoiler)"
                        className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs font-semibold text-white focus:outline-none focus:border-red-500"
                      />
                      <button
                        onClick={() => { fetchGmailMessages(gmailToken); playTapSound(); }}
                        disabled={isGmailLoading}
                        className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 hover:text-white text-zinc-300 rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 border border-zinc-700"
                      >
                        {isGmailLoading ? <Loader2 className="w-4 h-4 animate-spin text-red-400" /> : <RefreshCw className="w-4 h-4" />}
                        <span>Buscar</span>
                      </button>
                    </div>

                    {isGmailLoading ? (
                      <div className="p-10 text-center text-xs text-gray-400 font-medium space-y-3 bg-black/30 rounded-2xl border border-white/5">
                        <Loader2 className="w-7 h-7 animate-spin text-red-500 mx-auto" />
                        <p className="animate-pulse selection:bg-red-500/20">Varrendo seu inbox do Gmail atrás de novos spoilers oficiais do PK XD...</p>
                      </div>
                    ) : gmailError ? (
                      <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-300 rounded-2xl text-xs flex items-center gap-2.5">
                        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                        <span>{gmailError}</span>
                      </div>
                    ) : gmailEmails.length === 0 ? (
                      <div className="p-8 text-center text-xs text-zinc-500 italic bg-black/10 rounded-2xl border border-white/5">
                        Nenhum e-mail de spoiler encontrado com o filtro atual "{gmailQuery}".<br/>
                        Envie um e-mail com a palavra "spoiler" ou "novidade" ou mude o filtro acima!
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                        {gmailEmails.map((mail) => (
                          <div 
                            key={mail.id} 
                            className="bg-black/40 hover:bg-zinc-950/80 border border-white/5 hover:border-red-500/30 p-3.5 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-left transition-all relative group"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2.5">
                                <span className="text-[10px] text-zinc-400 font-mono bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-850">{mail.date}</span>
                                {mail.imageAttachments?.length > 0 && (
                                  <span className="text-[9px] bg-red-500/10 border border-red-500/20 text-red-300 px-2 py-0.5 rounded-md font-extrabold uppercase flex items-center gap-1">
                                    🖼️ {mail.imageAttachments.length} Imagens Anexas
                                  </span>
                                )}
                              </div>
                              <h5 className="font-sans font-black text-xs sm:text-sm text-gray-100 truncate mt-1.5 pr-2 group-hover:text-red-300 transition-colors">
                                {mail.subject}
                              </h5>
                              <p className="text-[10px] sm:text-xs text-gray-400 truncate leading-tight mt-1 line-clamp-1">
                                {mail.snippet}
                              </p>
                            </div>
                            <div className="flex items-center">
                              <button
                                onClick={() => { importGmailToEditor(mail); playTapSound(); }}
                                disabled={importingGmailId !== null}
                                className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white rounded-xl text-[11px] font-black uppercase transition-all whitespace-nowrap cursor-pointer hover:scale-[1.03] active:scale-95 disabled:opacity-50 border-0 flex items-center justify-center gap-1.5 shadow-md"
                              >
                                {importingGmailId === mail.id ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Baixando...</span>
                                  </>
                                ) : (
                                  <>
                                    <span>Importar e Editar</span>
                                    <span>📥</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 🚨 SPOILER EM DESTAQUE ATUAL NO SITE */}
              {onArchiveAndClearActiveSpoiler && activeSpoilerTitle && 
                activeSpoilerTitle !== 'Aguardando Próximos Spoilers! 🔮' && 
                !activeSpoilerTitle.toLowerCase().includes('aguardando') && 
                !activeSpoilerTitle.toLowerCase().includes('nenhum spoiler') && (
                <div className="bg-gradient-to-r from-red-950/40 via-purple-950/20 to-zinc-900 border border-purple-500/30 p-5 rounded-3xl space-y-3 shadow-xl">
                  <div className="flex items-center gap-2 text-purple-400">
                    <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
                    <span className="text-[10px] uppercase font-black tracking-widest font-sans">
                      Destaque Ativo Atualmente no Site
                    </span>
                  </div>
                  
                  <div className="bg-black/30 p-3.5 rounded-2xl flex items-center gap-4 border border-white/5">
                    {activeSpoilerImage && (
                      <div className="w-14 h-14 rounded-xl overflow-hidden border border-white/10 bg-black flex-shrink-0">
                        <img 
                          src={activeSpoilerImage} 
                          alt="Thumbnail Destaque" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    <div>
                      <h4 className="font-sans font-black text-xs text-yellow-300 uppercase leading-snug">
                        {activeSpoilerTitle}
                      </h4>
                      <p className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">
                        {activeSpoilerDesc}
                      </p>
                    </div>
                  </div>

                  {!showConfirmArchive ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof playTapSound === 'function') playTapSound();
                        setShowConfirmArchive(true);
                      }}
                      className="w-full py-3 rounded-2xl font-sans font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 border-0 bg-gradient-to-r from-red-650 to-purple-600 hover:from-red-600 hover:to-purple-500 text-white cursor-pointer hover:scale-[1.01] active:scale-95 transition-all shadow-md"
                    >
                      📦 ARQUIVAR DESTAQUE ATUAL E LIMPAR DO SITE
                    </button>
                  ) : (
                    <div className="bg-black/40 border border-red-500/30 p-4 rounded-2xl space-y-3.5">
                      <div className="text-center">
                        <p className="text-[11px] font-sans font-black uppercase text-yellow-400 tracking-wider">
                          ⚠️ DESTAQUE DO SITE SERÁ RESETADO COM SUCESSO
                        </p>
                        <p className="text-[10px] text-gray-300 leading-normal mt-1">
                          Você deseja mover este destaque atual para a lista de Spoilers Anteriores e desativar o painel atual do site?
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof playTapSound === 'function') playTapSound();
                            setShowConfirmArchive(false);
                          }}
                          className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-gray-300 hover:text-white font-sans font-black uppercase text-[10px] cursor-pointer transition-all border border-zinc-750"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof playTapSound === 'function') playTapSound();
                            onArchiveAndClearActiveSpoiler(activeSpoilerTitle, activeSpoilerDesc, activeSpoilerImage || '');
                            setShowConfirmArchive(false);
                          }}
                          className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-sans font-black uppercase text-[10px] cursor-pointer transition-all"
                        >
                          Sim, Arquivar! 📦
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {onDeleteActiveSpoiler && (
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof playTapSound === 'function') playTapSound();
                        if (confirm('Tem certeza absoluta de que deseja EXCLUIR E DELETAR o spoiler ativo atualmente? Isso resetará o site de volta para o modo contagem regressiva original imediatamente.')) {
                          onDeleteActiveSpoiler();
                        }
                      }}
                      className="w-full py-3 rounded-2xl font-sans font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 border border-red-500/30 bg-red-950/25 hover:bg-red-900/40 text-red-350 hover:text-white cursor-pointer hover:scale-[1.01] active:scale-95 transition-all shadow-sm"
                    >
                      ❌ DELETAR / EXCLUIR SPOILER ATIVO ATUAL
                    </button>
                  )}

                  <p className="text-[10px] text-zinc-500 text-center italic leading-tight">
                    *Moverá este spoiler para a lista de anteriores e resetará o timer/painel de revelações principal automaticamente!
                  </p>
                </div>
              )}

              {/* Toggler button for choosing between Express and Traditional Advanced editor */}
              <div className="flex bg-zinc-950 p-1.5 rounded-2xl border border-zinc-850 gap-1.5">
                <button
                  type="button"
                  onClick={() => { setUseExpress(true); playTapSound(); }}
                  className={`flex-1 py-3 text-center rounded-xl font-sans font-black text-[11px] uppercase tracking-wider transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 ${
                    useExpress 
                      ? 'bg-gradient-to-r from-pink-500 to-violet-600 text-white shadow-[0_0_15px_rgba(236,72,153,0.25)]' 
                      : 'text-zinc-400 hover:text-white bg-zinc-900/45 hover:bg-zinc-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" /> ⚡ PUBLICADOR EXPRESS (VAPT-VUPT!)
                </button>
                <button
                  type="button"
                  onClick={() => { setUseExpress(false); playTapSound(); }}
                  className={`flex-1 py-3 text-center rounded-xl font-sans font-black text-[11px] uppercase tracking-wider transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 ${
                    !useExpress 
                      ? 'bg-gradient-to-r from-gray-800 to-zinc-900 border border-zinc-700 text-white shadow-md' 
                      : 'text-zinc-400 hover:text-white bg-zinc-900/40 hover:bg-zinc-900'
                  }`}
                >
                  🛠️ EDITOR COMPLETO (AVANÇADO)
                </button>
              </div>

              {useExpress ? (
                /* ⚡ EXPRESS GENERATOR (VAPT-VUPT) */
                <div className="bg-gradient-to-b from-indigo-950/40 via-neutral-900/80 to-zinc-950 border-2 border-pink-500/20 p-5 sm:p-6 rounded-3xl space-y-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-pink-400 font-sans font-black text-[10px] uppercase tracking-widest animate-pulse">
                      <Sparkles className="w-4 h-4 text-pink-400 fill-pink-400" />
                      <span>GERADOR RÁPIDO VAPT-VUPT</span>
                    </div>
                    <h4 className="font-sans font-black text-lg text-white leading-tight">
                      Ganhou spoiler? Publique instantaneamente em segundos!
                    </h4>
                    <p className="text-xs text-gray-400 font-sans leading-relaxed">
                      Este painel foi criado para agilidade extrema. Selecione ou tire a foto, defina o título, e clique para postar de vez na tela de todos de forma compactada e otimizada!
                    </p>
                  </div>

                  <form onSubmit={handleExpressSubmit} className="space-y-5">
                    {/* Imagem File Dropzone */}
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black uppercase text-pink-300 tracking-wider">
                        1. Carregue uma Imagem/Print do Spoiler (Do Celular ou Computador) - OPCIONAL 📸
                      </label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <label className="flex-1 min-h-[120px] border-3 border-dashed border-pink-500/30 hover:border-pink-500 bg-pink-500/5 hover:bg-pink-500/10 p-4 rounded-2xl flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all duration-150 text-center select-none group">
                          <Image className="w-6 h-6 text-pink-400 group-hover:scale-110 transition-transform duration-150" />
                          <span className="font-sans font-black text-xs text-white">
                            📁 SELECIONAR FOTO O VALE CARREGAR (OPCIONAL) 📸
                          </span>
                          <span className="font-sans text-[10px] text-gray-400 max-w-sm">
                            Se preferir enviar apenas as informações por escrito, pule este passo!
                          </span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => handleImageSelect(e, 'express')} 
                          />
                        </label>
                      </div>
                    </div>

                    {/* Image Preview Container */}
                    {expressImage && (
                      <div className="p-4 bg-zinc-950 rounded-2xl border border-pink-500/20 text-center space-y-3">
                        <div className="flex items-center justify-center gap-1.5 text-pink-400">
                          <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                          <span className="text-[10px] uppercase font-black tracking-wider font-mono">
                            Print Carregado com Sucesso (Alta Resolução)
                          </span>
                        </div>
                        <div className="max-h-64 flex items-center justify-center p-1 bg-black/50 rounded-xl overflow-hidden border border-white/5">
                          <img 
                            src={expressImage} 
                            alt="Express Preview" 
                            className="max-h-60 rounded object-contain" 
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => { setExpressImage(''); playTapSound(); }}
                          className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white rounded-lg text-[9px] font-sans font-extrabold uppercase transition-all"
                        >
                          Remover Print / Enviar sem Imagem ✕
                        </button>
                      </div>
                    )}

                    {/* Title */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider">
                        2. Título chamativo para a Notificação *
                      </label>
                      <input 
                        type="text" 
                        value={expressTitle} 
                        onChange={(e) => setExpressTitle(e.target.value)} 
                        placeholder="Ex: NOVA ATUALIZAÇÃO DO PK XD REVELADA! 🔮"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm font-black text-yellow-300 focus:outline-none focus:border-pink-500"
                        required
                      />
                    </div>

                    {/* Auto descriptive message */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider">
                        3. Detalhes rápidos (Será postado de forma imediata)
                      </label>
                      <textarea
                        rows={3}
                        value={expressDescAuto}
                        onChange={(e) => setExpressDescAuto(e.target.value)}
                        placeholder="Mensagem rápida detalhando o novo spoiler oficial..."
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs font-semibold text-gray-300 focus:outline-none focus:border-pink-500 font-sans resize-y"
                      />
                    </div>

                    {/* Submit One-Click Pulsing Button */}
                    <div className="pt-2 flex flex-col sm:flex-row gap-3">
                      <button
                        type="submit"
                        className="flex-1 py-3.5 rounded-2xl font-sans font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 border-0 shadow-lg transition-all duration-150 bg-gradient-to-r from-pink-500 via-pink-600 to-violet-600 hover:from-pink-600 hover:to-violet-700 text-white cursor-pointer hover:scale-[1.01] active:scale-95 animate-pulse shadow-[0_0_20px_rgba(236,72,153,0.3)]"
                      >
                        🚀 PUBLICAR SPOILER PRINCIPAL (1 CLIQUE)
                      </button>
                      {onDirectArchivePastSpoiler && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!expressTitle) {
                              showStatus('Por favor, informe o título do spoiler express!');
                              return;
                            }
                            const fullDesc = expressImage
                              ? `${expressDescAuto.trim()}\n\n![Imagem do Spoiler](${expressImage})`
                              : expressDescAuto.trim();
                            onDirectArchivePastSpoiler(expressTitle, fullDesc, expressImage || '');
                            showStatus('Enviado diretamente aos spoilers anteriores! 🔮');
                            setExpressImage('');
                            setExpressTitle('NOVO SPOILER OFICIAL PK XD! 🔮');
                          }}
                          className="py-3.5 px-5 rounded-2xl font-sans font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 border border-pink-500/30 bg-pink-950/20 hover:bg-pink-500/10 text-pink-300 hover:text-white cursor-pointer hover:scale-[1.01] active:scale-95 transition-all text-center"
                        >
                          📦 MANDAR DIRETO PROS ANTERIORES
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              ) : (
                /* ⚙️ ADVANCED/TRADITIONAL MANUAL GENERATOR */
                <div className="space-y-6">
                  {/* Info banner for copying and pasting */}
                  <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-cyan-400">
                      <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
                      <h4 className="font-sans font-black text-xs uppercase tracking-wider">
                        Copiar e Colar Direto (Markdown & Mídia)! 📋
                      </h4>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed font-sans">
                      Você pode escrever livremente e também utilizar os botões de <strong>carregar arquivos do seu aparelho</strong> abaixo das caixas de entrada! O portal formata tudo automaticamente de forma ultra rápida! ⚡
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="bg-black/30 p-2 rounded-xl text-[10px] text-gray-400 font-mono">
                        <strong className="text-pink-400 font-sans block mb-0.5">📸 Inserir Imagens/GIFs em Markdown:</strong>
                        <code>{"![Fã](link_da_imagem)"}</code>
                      </div>
                      <div className="bg-black/30 p-2 rounded-xl text-[10px] text-gray-400 font-mono">
                        <strong className="text-yellow-400 font-sans block mb-0.5">🌐 Inserir Imagens em tags HTML:</strong>
                        <code>{"<img src=\"link_da_imagem\">"}</code>
                      </div>
                    </div>
                  </div>

                  {pastSpoilerToEdit && (
                    <div className="bg-yellow-400/15 border border-yellow-400/30 p-3 rounded-xl flex items-center justify-between text-xs text-yellow-350">
                      <span>✏️ <strong>EDITANDO REGISTRO HISTÓRICO:</strong> <span className="font-bold text-white underline">{pastSpoilerToEdit.title}</span></span>
                      <button 
                        type="button" 
                        onClick={onCancelEditPastSpoiler} 
                        className="text-red-400 hover:text-red-300 underline font-black uppercase cursor-pointer"
                      >
                        Cancelar Edição
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleSpoilerSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Título do Spoiler *</label>
                      <input 
                        type="text" 
                        value={spoilerTitle} 
                        onChange={(e) => setSpoilerTitle(e.target.value)} 
                        placeholder="Ex: Vazou o Novo Pet Unicórnio 🦄"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm font-semibold text-white focus:outline-none focus:border-yellow-400"
                        required
                      />
                    </div>

                    <div className="space-y-1.5 font-sans">
                      <div className="flex justify-between items-center">
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Detalhes do Spoiler (Suporta Markdown, Listas e Mídia) *</label>
                        <span className="text-[10px] text-pink-400 font-bold font-mono animate-pulse">📋 Cola print ou imagens com Ctrl+V!</span>
                      </div>
                      <textarea 
                        id="spoilerDescTextArea"
                        rows={7}
                        value={spoilerDesc} 
                        onChange={(e) => setSpoilerDesc(e.target.value)} 
                        onPaste={handlePaste}
                        placeholder="Descreva as funções, custos em gemas e emotes, ou cole imagens direto em markdown ![]() ou html <img>"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm font-semibold text-white focus:outline-none focus:border-yellow-400 font-sans resize-y transition-colors duration-150"
                        required
                      />
                      
                      {/* Upload button specifically for Inserting images directly into advanced details! */}
                      <div className="flex items-center gap-2 pt-1">
                        <label className="bg-zinc-900 border border-zinc-805 hover:bg-zinc-800 p-2 px-3 rounded-xl text-pink-400 hover:text-white text-[10px] font-extrabold flex items-center gap-1.5 cursor-pointer transition-all">
                          <Image className="w-3.5 h-3.5" />
                          <span>📁 Inserir Foto por Arquivo</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => handleImageSelect(e, 'desc')} 
                          />
                        </label>
                        <span className="text-[10px] text-gray-500 font-sans">
                          (Comprime e injeta como código Markdown no editor de detalhes acima!)
                        </span>
                      </div>
                    </div>

                    {/* Live Preview Panel within the admin form */}
                    {spoilerDesc && (
                      <div className="p-4 bg-zinc-900/40 border border-zinc-805 rounded-xl space-y-2">
                        <span className="text-[10px] uppercase font-black tracking-widest text-cyan-400 block border-b border-white/5 pb-1">✨ Pré-visualizador de Colagem em Tempo Real</span>
                        <div className="max-h-64 overflow-y-auto pr-1">
                          {parseAndRenderPreview(spoilerDesc)}
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Imagem de Capa / GIF Ilustrativo Principal (Opcional)</label>
                      <div className="flex gap-2">
                        <input 
                          type="url" 
                          value={spoilerImage} 
                          onChange={(e) => setSpoilerImage(e.target.value)} 
                          placeholder="Cole um link de imagem ou GIF (.gif, .png, .jpg)"
                          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm font-semibold text-white focus:outline-none focus:border-yellow-400"
                        />
                        <label className="bg-zinc-900 border border-zinc-805 hover:bg-zinc-800 p-2.5 px-3 rounded-xl text-yellow-400 hover:text-white text-[10px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all whitespace-nowrap">
                          <Image className="w-3.5 h-3.5" />
                          <span>📁 Carregar Arquivo</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => handleImageSelect(e, 'cover')} 
                          />
                        </label>
                      </div>
                    </div>

                    {spoilerImage && (
                      <div className="p-3 bg-zinc-900 border border-white/5 rounded-2xl flex items-center gap-3">
                        <img 
                          src={spoilerImage} 
                          alt="Preview do GIF/Imagem" 
                          className="w-16 h-16 rounded-xl object-cover border border-white/10" 
                          onError={(e) => { (e.target as any).style.display = 'none'; }}
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <span className="text-xs font-bold text-yellow-300 block">PRÉ-VISUALIZAÇÃO DA MÍDIA</span>
                          <span className="text-[10px] text-gray-400 leading-tight block">Gifs animados e imagens aparecem na revelação e no histórico!</span>
                        </div>
                      </div>
                    )}

                    {/* Force Reveal Setting Toggle for automatic instant posting bypassing Monday scheduling */}
                    {!pastSpoilerToEdit && (
                      <div className="flex items-center gap-3 bg-zinc-900 border border-white/5 p-4 rounded-xl">
                        <input 
                          type="checkbox" 
                          id="forceRevealActive"
                          checked={forceReveal} 
                          onChange={(e) => setForceReveal(e.target.checked)}
                          className="w-4.5 h-4.5 rounded cursor-pointer accent-yellow-400"
                        />
                        <label htmlFor="forceRevealActive" className="font-sans text-xs font-extrabold uppercase text-gray-200 cursor-pointer select-none">
                          🚀 Postar de uma vez! Revelar imediatamente no site (pular cronômetro de segunda)
                        </label>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3">
                      <button 
                        type="submit" 
                        className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-black font-sans font-black uppercase text-xs rounded-xl border-b-4 border-yellow-700 active:border-b-0 cursor-pointer border-0"
                      >
                        {pastSpoilerToEdit ? '💾 Salvar Edição no Histórico' : '🔮 Salvar e Publicar Spoiler'}
                      </button>

                      {!pastSpoilerToEdit && onDirectArchivePastSpoiler && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!spoilerTitle || !spoilerDesc) {
                              showStatus('Título e detalhes do spoiler são obrigatórios!');
                              return;
                            }
                            onDirectArchivePastSpoiler(spoilerTitle, spoilerDesc, spoilerImage);
                            showStatus('Enviado diretamente ao histórico anterior! 🔮');
                            setSpoilerTitle('');
                            setSpoilerDesc('');
                            setSpoilerImage('');
                          }}
                          className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-gray-300 hover:text-white font-sans font-black uppercase text-xs rounded-xl cursor-pointer"
                        >
                          📦 MANDAR DIRETO PROS ANTERIORES
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB: Vídeos em Destaque */}
          {activeTab === 'featured' && (
            <form onSubmit={handleFeatVideoSubmit} className="space-y-4 text-left">
              <h4 className="font-sans font-black text-sm text-yellow-400 uppercase tracking-wide flex items-center gap-1">
                <Video className="w-4 h-4" /> Cadastrar Vídeo Oficial em Destaque
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Título do Vídeo *</label>
                  <input 
                    type="text" 
                    value={featTitle} 
                    onChange={(e) => setFeatTitle(e.target.value)} 
                    placeholder="Ex: Como Conseguir a Nova Moto Cyber!"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm font-semibold text-white focus:outline-none focus:border-yellow-400"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Tipo de Destaque *</label>
                    <select
                      value={featType}
                      onChange={(e) => setFeatType(e.target.value as any)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs font-bold text-white focus:outline-none focus:border-yellow-400"
                    >
                      <option value="game_highlight">⭐ Destaques no Jogo</option>
                      <option value="panel_video">🖥️ Vídeos do Painel</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">URL do Vídeo no YouTube *</label>
                <input 
                  type="url" 
                  value={featUrl} 
                  onChange={(e) => setFeatUrl(e.target.value)} 
                  placeholder="Ex: https://www.youtube.com/watch?v=..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm font-semibold text-white focus:outline-none focus:border-yellow-400"
                  required
                />
              </div>

              <button 
                type="submit" 
                className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-black font-sans font-black uppercase text-xs rounded-xl border-b-4 border-yellow-700 active:border-b-0 cursor-pointer border-0"
              >
                🎬 Adicionar aos Vídeos Destaque
              </button>
            </form>
          )}

          {/* TAB: Teorias e Novidades */}
          {activeTab === 'theories' && (
            <form onSubmit={handleTheorySubmit} className="space-y-4 text-left">
              <h4 className="font-sans font-black text-sm text-yellow-400 uppercase tracking-wide flex items-center gap-1">
                <BookOpen className="w-4 h-4" /> Escrever Nova Teoria / Novidade
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Título / Tese da Teoria *</label>
                  <input 
                    type="text" 
                    value={theoryTitle} 
                    onChange={(e) => setTheoryTitle(e.target.value)} 
                    placeholder="Ex: O Retorno do Glitch Boss na Próxima Att!"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm font-semibold text-white focus:outline-none focus:border-yellow-400"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Autor da Teoria</label>
                  <input 
                    type="text" 
                    value={theoryAuthor} 
                    onChange={(e) => setTheoryAuthor(e.target.value)} 
                    placeholder="Ex: PKXD Hub"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm font-semibold text-white focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Explicação Detalhada do Assunto *</label>
                <textarea 
                  rows={4}
                  value={theoryContent} 
                  onChange={(e) => setTheoryContent(e.target.value)} 
                  placeholder="Explique os mistérios das caixas e teorize os próximos rumos que a Staff dará ao game..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm font-semibold text-white focus:outline-none focus:border-yellow-400 font-sans resize-y"
                  required
                />
              </div>

              <button 
                type="submit" 
                className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-black font-sans font-black uppercase text-xs rounded-xl border-b-4 border-yellow-700 active:border-b-0 cursor-pointer border-0"
              >
                🔮 Publicar Teoria Ativa
              </button>
            </form>
          )}

          {/* TAB: Curated Shorts de Vídeo */}
          {activeTab === 'shorts' && (
            <form onSubmit={handleShortSubmit} className="space-y-4 text-left">
              <h4 className="font-sans font-black text-sm text-yellow-400 uppercase tracking-wide flex items-center gap-1">
                <Smartphone className="w-4 h-4" /> Adicionar Shorts de Destaque da Semana
              </h4>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Título Chamativo do Short *</label>
                <input 
                  type="text" 
                  value={shortTitle} 
                  onChange={(e) => setShortTitle(e.target.value)} 
                  placeholder="Ex: Reação ao Revelar Caixa Secreta Especial!"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm font-semibold text-white focus:outline-none focus:border-yellow-400"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">URL do Short no YouTube *</label>
                <input 
                  type="url" 
                  value={shortUrl} 
                  onChange={(e) => setShortUrl(e.target.value)} 
                  placeholder="Ex: https://www.youtube.com/shorts/..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm font-semibold text-white focus:outline-none focus:border-yellow-400"
                  required
                />
              </div>

              <button 
                type="submit" 
                className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-black font-sans font-black uppercase text-xs rounded-xl border-b-4 border-yellow-700 active:border-b-0 cursor-pointer border-0"
              >
                📱 Publicá-lo na Grade de Shorts
              </button>
            </form>
          )}

          {/* TAB: Contagem Alternativa */}
          {activeTab === 'extratimer' && (
            <form onSubmit={handleExtraTimerSubmit} className="space-y-4 text-left">
              <h4 className="font-sans font-black text-sm text-yellow-400 uppercase tracking-wide flex items-center gap-1">
                <Clock className="w-4 h-4" /> Configurar Contagem Alternativa / Extra
              </h4>
              <p className="text-xs text-gray-300 leading-relaxed">
                Tem spoilers adicionais ou novidades surpresa chegando fora do cronograma normal? Configure um timer alternativo. O timer sumirá automaticamente de forma inteligente quando o prazo expirar!
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Título do Timer Extra *</label>
                  <input 
                    type="text" 
                    value={extraTitle} 
                    onChange={(e) => setExtraTitle(e.target.value)} 
                    placeholder="Ex: Spoiler Extra da Staff!"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm font-semibold text-white focus:outline-none focus:border-yellow-400"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Data e Hora Alvo *</label>
                  <input 
                    type="datetime-local" 
                    value={extraDate} 
                    onChange={(e) => setExtraDate(e.target.value)} 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm font-semibold text-white focus:outline-none focus:border-yellow-400"
                    required
                  />
                </div>
              </div>

              {/* Enabled toggle */}
              <div className="flex items-center gap-3 bg-zinc-900/60 p-4 rounded-xl border border-white/5">
                <input 
                  type="checkbox" 
                  id="extraEnabledBtn"
                  checked={extraEnabled} 
                  onChange={(e) => setExtraEnabled(e.target.checked)}
                  className="w-4.5 h-4.5 rounded cursor-pointer accent-yellow-400"
                />
                <label htmlFor="extraEnabledBtn" className="font-sans text-xs font-black uppercase text-gray-200 cursor-pointer">
                  Habilitar e exibir este cronograma alternativo no site
                </label>
              </div>

              <button 
                type="submit" 
                className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-black font-sans font-black uppercase text-xs rounded-xl border-b-4 border-yellow-700 active:border-b-0 cursor-pointer border-0"
              >
                ⏰ Salvar Configurações de Timer Extra
              </button>
            </form>
          )}

          {/* TAB: Contagem Regressiva de Presente/Código */}
          {activeTab === 'giftcountdown' && (
            <form onSubmit={handleGiftCountdownSubmit} className="space-y-4 text-left">
              <h4 className="font-sans font-black text-sm text-yellow-400 uppercase tracking-wide flex items-center gap-1.5">
                🎁 Configurar Liberação de Presente ou Código
              </h4>
              <p className="text-xs text-gray-300 leading-relaxed">
                Configure uma contagem regressiva especial para o topo do site. Quando o timer acabar, o código, cupom ou presente secreto será liberado automaticamente em tempo real com efeitos de comemoração neon!
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Título do Presente *</label>
                  <input 
                    type="text" 
                    value={giftTitle} 
                    onChange={(e) => setGiftTitle(e.target.value)} 
                    placeholder="Ex: 🎁 PRESENTE SECRETO DE GEMAS!"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm font-semibold text-white focus:outline-none focus:border-yellow-400"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Liberar em (Data e Hora Alvo) *</label>
                  <input 
                    type="datetime-local" 
                    value={giftDate} 
                    onChange={(e) => setGiftDate(e.target.value)} 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm font-semibold text-white focus:outline-none focus:border-yellow-400"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Conteúdo do Presente / Código Secreto (Revelado ao fim) *</label>
                <textarea 
                  value={giftContent} 
                  onChange={(e) => setGiftContent(e.target.value)} 
                  placeholder="Ex: CÓDIGO ATIVO: PKXDHUB2026 (ou coloque links de formulários, presentes, etc.)"
                  rows={3}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm font-semibold text-white focus:outline-none focus:border-yellow-400 custom-scrollbar font-mono"
                  required
                />
              </div>

              {/* Enabled toggle */}
              <div className="flex items-center gap-3 bg-zinc-900/60 p-4 rounded-xl border border-white/5">
                <input 
                  type="checkbox" 
                  id="giftEnabledBtn"
                  checked={giftEnabled} 
                  onChange={(e) => setGiftEnabled(e.target.checked)}
                  className="w-4.5 h-4.5 rounded cursor-pointer accent-yellow-400"
                />
                <label htmlFor="giftEnabledBtn" className="font-sans text-xs font-black uppercase text-gray-200 cursor-pointer select-none">
                  Habilitar e exibir este cronômetro de Presente no topo do site
                </label>
              </div>

              <button 
                type="submit" 
                className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-black font-sans font-black uppercase text-xs rounded-xl border-b-4 border-yellow-700 active:border-b-0 cursor-pointer border-0"
              >
                🎁 Salvar Configurações de Presente
              </button>
            </form>
          )}

          {/* TAB: Notificações / Atrasos */}
          {activeTab === 'push' && (
            <div className="space-y-6 text-left font-sans">
              
              {/* Box 1: Atrasar Spoilers Indicator */}
              <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 text-yellow-400">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 animate-pulse" />
                  <h4 className="font-sans font-black text-sm uppercase tracking-wider">
                    ⚠️ STATUS DE SPOILER ADIADO
                  </h4>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed font-sans">
                  Se os spoilers oficiais atrasarem ou forem adiados pelos criadores do PK XD, ative esta opção. Isso mostrará um aviso chamativo no cronômetro principal para acalmar a comunidade sobre o atraso.
                </p>

                <div className="flex items-center gap-3 bg-black/30 p-3 rounded-xl border border-white/5">
                  <input 
                    type="checkbox" 
                    id="delayActiveToggle"
                    checked={delayActive} 
                    onChange={(e) => setDelayActive(e.target.checked)}
                    className="w-4.5 h-4.5 rounded cursor-pointer accent-yellow-400"
                  />
                  <label htmlFor="delayActiveToggle" className="font-sans text-xs font-black uppercase text-white cursor-pointer select-none">
                    Ativar Modo: Spoilers Adiados / Atrasados ⚠️
                  </label>
                </div>

                {delayActive && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Mensagem de Justificativa para os Fãs:</label>
                    <textarea 
                      rows={2}
                      value={delayMsgText} 
                      onChange={(e) => setDelayMsgText(e.target.value)} 
                      placeholder="Ex: O e-mail semanal atrasou um pouco hoje. Fiquem calmos, assim que chegar nós postaremos tudo aqui!"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs font-semibold text-white focus:outline-none focus:border-yellow-400"
                    />
                  </div>
                )}

                <button 
                  type="button"
                  onClick={() => {
                    if (onUpdateDelay) {
                      onUpdateDelay(delayActive, delayMsgText);
                      showStatus('Status de atraso atualizado com sucesso! ⚠️');
                      playSuccessSound();
                    }
                  }}
                  className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-black font-sans font-black uppercase text-xs rounded-xl border-b-4 border-yellow-700 active:border-b-0 cursor-pointer border-0"
                >
                  Salvar Status de Atraso
                </button>
              </div>

              {/* Box 2: Manual Custom Notification trigger */}
              <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 text-cyan-400">
                  <BellRing className="w-5 h-5 text-cyan-400" />
                  <h4 className="font-sans font-black text-sm uppercase tracking-wider">
                    📲 DISPARAR NOTIFICAÇÃO MANUAL
                  </h4>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed font-sans">
                  Envie uma notificação personalizada que aparecerá instantaneamente nas telas de computadores e celulares de todos os jogadores logados no PKXD Hub, além de ficar salva na Central de Mensagens!
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Título da Mensagem *</label>
                    <input 
                      type="text" 
                      value={pushTitle} 
                      onChange={(e) => setPushTitle(e.target.value)} 
                      placeholder="Ex: 🎁 NOVO CÓDIGO DISPONÍVEL!"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm font-semibold text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Tipo de Alerta *</label>
                    <select
                      value={pushType}
                      onChange={(e) => setPushType(e.target.value as any)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs font-bold text-white focus:outline-none focus:border-cyan-405"
                    >
                      <option value="custom_push">📣 Mensagem Geral / Comunicado</option>
                      <option value="story_published">🔮 Novo Story Publicado</option>
                      <option value="countdown_alert">⏰ Alerta de Contagem Regressiva</option>
                      <option value="delayed_alert">⚠️ Alerta de Atraso de Spoilers</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Corpo da Mensagem / Alerta *</label>
                  <textarea 
                    rows={3}
                    value={pushBody} 
                    onChange={(e) => setPushBody(e.target.value)} 
                    placeholder="Ex: Corre no site que o admin liberou um código especial valendo 30 gemas grátis! Não perca o prazo!"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm font-semibold text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <button 
                  type="button"
                  onClick={() => {
                    if (!pushTitle || !pushBody) {
                      showStatus('Preencha título e corpo da notificação manual!');
                      return;
                    }
                    if (onSendCustomNotification) {
                      onSendCustomNotification(pushTitle, pushBody, pushType);
                      setPushTitle('');
                      setPushBody('');
                      showStatus('Notificação enviada com sucesso para todos os dispositivos! 📲');
                      playSuccessSound();
                    }
                  }}
                  className="px-5 py-2.5 bg-cyan-400 hover:bg-cyan-500 text-black font-sans font-black uppercase text-xs rounded-xl border-b-4 border-cyan-700 active:border-b-0 cursor-pointer border-0"
                >
                  🚀 Disparar Notificação para Celulares
                </button>
              </div>

            </div>
          )}

          {/* TAB: Mudar Logo */}
          {activeTab === 'logo' && (
            <div className="space-y-4 text-left">
              <p className="text-xs text-gray-300 leading-relaxed font-sans">
                Cole aqui uma URL direta para sua imagem de cabeçalho (.png ou .jpg) para substituir a padrão.
              </p>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">URL Direta do Logo:</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input 
                    type="url" 
                    placeholder="https://exemplo.com/sua-imagem-logo.png" 
                    value={tempLogoUrl} 
                    onChange={(e) => setTempLogoUrl(e.target.value)}
                    className="flex-grow bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm font-semibold text-white focus:outline-none focus:border-yellow-400"
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      onUpdateLogo(tempLogoUrl);
                      showStatus('Aparência e Logo atualizados com sucesso! 🎉');
                      playSuccessSound();
                    }}
                    className="px-6 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-black font-sans font-black uppercase text-xs rounded-xl border-b-4 border-yellow-700 active:border-b-0 cursor-pointer border-0"
                  >
                    SALVAR LOGO
                  </button>
                </div>
              </div>

              {tempLogoUrl && (
                <div className="p-4 bg-black/40 border border-zinc-800 rounded-xl flex items-center gap-3">
                  <div className="w-12 h-12 bg-zinc-900 rounded-xl overflow-hidden flex items-center justify-center border border-white/10 flex-shrink-0">
                    <img 
                      src={tempLogoUrl} 
                      alt="Logo Preview" 
                      className="w-full h-full object-cover" 
                      onError={(e) => { (e.target as any).style.display = 'none'; }}
                    />
                  </div>
                  <div>
                    <span className="font-sans font-bold text-xs text-gray-200 block">PRÉ-VISUALIZAÇÃO DO LOGO</span>
                    <span className="font-mono text-[9px] text-gray-400 leading-none">Verifique se está correto.</span>
                  </div>
                </div>
              )}

              {/* TUTORIAL GOOGLE ICON BRAND / FAVICON */}
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 mt-6 space-y-4">
                <h5 className="font-sans font-black text-xs text-yellow-300 uppercase leading-tight tracking-tight flex items-center gap-1.5">
                  🎨 COMO ADICIONAR SEU LOGO "PKXD HUB" NO GOOGLE E SITE
                </h5>
                
                <p className="text-[11px] text-gray-300 leading-relaxed font-sans mt-1">
                  Para que o seu logotipo personalizado <strong>"PKXD Hub"</strong> apareça no navegador como ícone do site (Favicon) e também na tela de login oficial do Google (OAuth), siga estes caminhos:
                </p>

                <div className="space-y-4 text-[10.5px] font-sans text-gray-350 leading-relaxed">
                  <div className="p-3 bg-zinc-950/80 rounded-xl border border-white/5 space-y-1">
                    <span className="text-yellow-400 font-bold uppercase text-[9.5px] block">🌐 1. COMO ALTERAR O LOGO E FAVICON DO SITE EM 1 CLIQUE:</span>
                    <p>
                      Basta pegar o link direto da imagem acima (pode ser o link de onde ela está hospedada ou do próprio Firebase Storage). Cole o link no campo <strong>"URL Direta do Logo"</strong> acima e clique em <strong>"Salvar Logo"</strong>. O site inteiro e o ícone da sua aba do navegador (Favicon) vão atualizar instantaneamente de forma dinâmica!
                    </p>
                  </div>

                  <div className="p-3 bg-zinc-950/80 rounded-xl border border-white/5 space-y-1">
                    <span className="text-cyan-400 font-bold uppercase text-[9.5px] block">🤖 2. INTEGRAR LOGO NA TELA DE LOGIN DO GOOGLE (OAUTH):</span>
                    <p>
                      Para colocar o logo na página de login do Google que aparece para seus usuários:
                    </p>
                    <ol className="list-decimal pl-4 mt-1 space-y-1 text-gray-400">
                      <li>Acesse o console do Google Cloud: <a href="https://console.cloud.google.com/apis/credentials/consent" target="_blank" rel="noreferrer" className="text-cyan-400 underline font-semibold hover:text-cyan-300 font-sans">console.cloud.google.com/apis/credentials/consent</a>.</li>
                      <li>Selecione seu projeto <strong>{(firebaseConfig as any)?.projectId || 'pkxd-e817c'}</strong> no topo.</li>
                      <li>Clique em <strong>Editar App</strong> (Edit App).</li>
                      <li>No campo <strong>Logotipo do App</strong> (App Logo), faça upload desta mesma imagem "PKXD Hub".</li>
                      <li>Role até o final da página e clique em <strong>Salvar e Continuar</strong>.</li>
                    </ol>
                    <p className="text-[9.5px] text-zinc-500 mt-1">
                      💡 Nota: O Google pode levar cerca de algumas horas para aprovar e aplicar o novo logotipo na tela de autenticação do Google, mas funcionará perfeitamente!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Inscrições do Usuário */}
          {activeTab === 'applications' && (
            <div className="space-y-6 text-left">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div>
                  <h4 className="font-sans font-black text-sm uppercase text-yellow-300">
                    📥 GERENCIAR INSCRIÇÕES DA COMUNIDADE
                  </h4>
                  <p className="text-[11px] text-gray-400 font-sans leading-relaxed">
                    Veja os pedidos de destaque de vídeos, shorts, teorias e candidaturas de novos administradores enviados pelos usuários.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isAppsLoading}
                  onClick={fetchAllApplications}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-gray-300 rounded-xl text-xs font-bold border border-white/5 cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAppsLoading ? 'animate-spin' : ''}`} />
                  <span>{isAppsLoading ? 'Atualizando...' : 'Atualizar'}</span>
                </button>
              </div>

              {isAppsLoading ? (
                <div className="py-12 text-center space-y-2">
                  <Loader2 className="w-8 h-8 text-yellow-400 mx-auto animate-spin" />
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-mono">Carregando inscrições de banco de dados...</p>
                </div>
              ) : (
                <div className="space-y-8">
                  
                  {/* Category 1: Destaque de Vídeo */}
                  <div className="space-y-3">
                    <h5 className="font-sans font-black text-xs text-purple-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-purple-500/10 pb-1.5">
                      <Video className="w-4 h-4" />
                      <span>Destaques no Painel de Vídeos ({appsPanel.length})</span>
                    </h5>
                    
                    {appsPanel.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">Nenhuma inscrição de destaque de vídeo pendente.</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-3.5">
                        {appsPanel.map((item) => (
                          <div key={item.id} className="bg-black/40 border border-zinc-850 p-4 rounded-xl space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                              <span className="font-bold text-gray-200">Criador: <strong className="text-purple-300">{item.creator}</strong></span>
                              <span className="text-[10px] text-gray-400 font-mono">Social: {item.social || 'Não informado'}</span>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] uppercase font-bold text-gray-400 block font-mono">Link do Conteúdo:</span>
                              <a href={item.url} target="_blank" rel="noreferrer" className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
                                {item.url} <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] uppercase font-bold text-gray-400 block font-mono">Descrição/Apresentação:</span>
                              <p className="text-xs text-gray-300 bg-zinc-950/50 p-2.5 rounded-lg leading-relaxed">{item.description}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 justify-end pt-1.5 border-t border-white/5">
                              <button
                                type="button"
                                onClick={async () => {
                                  playTapSound();
                                  try {
                                    onAddFeaturedVideo({
                                      title: item.description || `Destaque de ${item.creator}! 🎬`,
                                      youtubeUrl: item.url,
                                      type: 'game_highlight',
                                      author: item.creator
                                    });
                                    await deleteDoc(doc(db, 'applications_panel', item.id));
                                    showStatus('Vídeo aprovado no Painel de Criadores! 🌟');
                                    playSuccessSound();
                                    fetchAllApplications();
                                  } catch (err: any) {
                                    alert('Erro ao aprovar: ' + err.message);
                                  }
                                }}
                                className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 rounded-lg text-xs font-black border border-amber-500/30 flex items-center gap-1 cursor-pointer"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Aprovar no PAINEL 🌟</span>
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  playTapSound();
                                  try {
                                    onAddFeaturedVideo({
                                      title: item.description || `Vídeo de ${item.creator}! 🎬`,
                                      youtubeUrl: item.url,
                                      type: 'panel_video',
                                      author: item.creator
                                    });
                                    await deleteDoc(doc(db, 'applications_panel', item.id));
                                    showStatus('Vídeo aprovado na Comunidade! 👥');
                                    playSuccessSound();
                                    fetchAllApplications();
                                  } catch (err: any) {
                                    alert('Erro ao aprovar: ' + err.message);
                                  }
                                }}
                                className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/35 text-indigo-300 rounded-lg text-xs font-black border border-indigo-550/30 flex items-center gap-1 cursor-pointer"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Aprovar na COMUNIDADE 👥</span>
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  playTapSound();
                                  if (confirm('Deseja excluir esta inscrição permanentemente?')) {
                                    try {
                                      await deleteDoc(doc(db, 'applications_panel', item.id));
                                      showStatus('Inscrição excluída.');
                                      fetchAllApplications();
                                    } catch (err: any) {
                                      alert(err.message);
                                    }
                                  }
                                }}
                                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-black border border-red-500/20 flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Excluir</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Category 2: Destaque de Shorts */}
                  <div className="space-y-3">
                    <h5 className="font-sans font-black text-xs text-cyan-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-cyan-500/10 pb-1.5">
                      <Smartphone className="w-4 h-4" />
                      <span>Destaques de Shorts ({appsShorts.length})</span>
                    </h5>
                    
                    {appsShorts.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">Nenhuma inscrição de destaque de shorts pendente.</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-3.5">
                        {appsShorts.map((item) => (
                          <div key={item.id} className="bg-black/40 border border-zinc-850 p-4 rounded-xl space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                              <span className="font-bold text-gray-200">Canal: <strong className="text-cyan-300">{item.creator}</strong></span>
                              <span className="text-xs font-semibold text-white">Título: "{item.title}"</span>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] uppercase font-bold text-gray-400 block font-mono">Link do Shorts:</span>
                              <a href={item.url} target="_blank" rel="noreferrer" className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
                                {item.url} <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                            <div className="flex items-center gap-2 justify-end pt-1.5 border-t border-white/5">
                              <button
                                type="button"
                                onClick={async () => {
                                  playTapSound();
                                  try {
                                    onAddShort({
                                      title: item.title,
                                      youtubeUrl: item.url
                                    });
                                    await deleteDoc(doc(db, 'applications_shorts', item.id));
                                    showStatus('Short de destaque aprovado e publicado com sucesso! 📱');
                                    playSuccessSound();
                                    fetchAllApplications();
                                  } catch (err: any) {
                                    alert('Erro ao aprovar: ' + err.message);
                                  }
                                }}
                                className="px-3 py-1.5 bg-emerald-550/20 hover:bg-emerald-550/30 text-emerald-400 rounded-lg text-xs font-black border border-emerald-500/30 flex items-center gap-1 cursor-pointer"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Aprovar Shorts</span>
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  playTapSound();
                                  if (confirm('Deseja excluir esta inscrição?')) {
                                    try {
                                      await deleteDoc(doc(db, 'applications_shorts', item.id));
                                      showStatus('Inscrição excluída.');
                                      fetchAllApplications();
                                    } catch (err: any) {
                                      alert(err.message);
                                    }
                                  }
                                }}
                                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-black border border-red-500/20 flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Excluir</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Category 3: Teorias Enviadas */}
                  <div className="space-y-3">
                    <h5 className="font-sans font-black text-xs text-pink-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-pink-500/10 pb-1.5">
                      <Sparkles className="w-4 h-4" />
                      <span>Teorias Enviadas ({appsTheories.length})</span>
                    </h5>
                    
                    {appsTheories.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">Nenhuma teoria enviada pendente.</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-3.5">
                        {appsTheories.map((item) => (
                          <div key={item.id} className="bg-black/40 border border-zinc-850 p-4 rounded-xl space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                              <span className="font-bold text-gray-200">Autor: <strong className="text-pink-300">{item.author}</strong></span>
                              <span className="text-xs font-bold text-white">Título: "{item.title}"</span>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] uppercase font-bold text-gray-400 block font-mono">Conteúdo da Teoria:</span>
                              <p className="text-xs text-gray-300 bg-zinc-950/50 p-2.5 rounded-lg leading-relaxed whitespace-pre-wrap">{item.content}</p>
                            </div>
                            <div className="flex items-center gap-2 justify-end pt-1.5 border-t border-white/5">
                              <button
                                type="button"
                                onClick={async () => {
                                  playTapSound();
                                  try {
                                    onAddTheory({
                                      title: item.title,
                                      content: item.content,
                                      author: item.author
                                    });
                                    await deleteDoc(doc(db, 'applications_theories', item.id));
                                    showStatus('Teoria aprovada e publicada com sucesso! 🔮');
                                    playSuccessSound();
                                    fetchAllApplications();
                                  } catch (err: any) {
                                    alert('Erro ao aprovar: ' + err.message);
                                  }
                                }}
                                className="px-3 py-1.5 bg-emerald-550/20 hover:bg-emerald-550/30 text-emerald-400 rounded-lg text-xs font-black border border-emerald-500/30 flex items-center gap-1 cursor-pointer"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Aprovar Teoria</span>
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  playTapSound();
                                  if (confirm('Deseja excluir esta teoria?')) {
                                    try {
                                      await deleteDoc(doc(db, 'applications_theories', item.id));
                                      showStatus('Teoria excluída.');
                                      fetchAllApplications();
                                    } catch (err: any) {
                                      alert(err.message);
                                    }
                                  }
                                }}
                                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-black border border-red-500/20 flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Excluir</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Category 4: Candidaturas ADM */}
                  <div className="space-y-3">
                    <h5 className="font-sans font-black text-xs text-yellow-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-yellow-500/10 pb-1.5">
                      <UserCheck className="w-4 h-4" />
                      <span>Candidaturas para ADM ({appsAdmin.length})</span>
                    </h5>
                    
                    {appsAdmin.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">Nenhuma candidatura de administrador pendente.</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-3.5">
                        {appsAdmin.map((item) => (
                          <div key={item.id} className="bg-black/40 border border-zinc-850 p-4 rounded-xl space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                              <div>
                                <span className="text-[10px] uppercase font-bold text-gray-450 block font-mono">Nome / Nick:</span>
                                <strong className="text-yellow-300 font-bold">{item.name}</strong>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-bold text-gray-450 block font-mono">Idade:</span>
                                <span className="text-gray-200">{item.age} anos</span>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-bold text-gray-450 block font-mono">Contato:</span>
                                <span className="text-cyan-400 font-semibold">{item.contact}</span>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                              <div className="col-span-1 md:col-span-1">
                                <span className="text-[10px] uppercase font-bold text-gray-450 block font-mono">Horas por Semana:</span>
                                <span className="text-gray-300">{item.hours}</span>
                              </div>
                              <div className="col-span-1 md:col-span-2">
                                <span className="text-[10px] uppercase font-bold text-gray-450 block font-mono">Por que quer ser Admin?</span>
                                <p className="text-xs text-gray-300 bg-zinc-950/50 p-2.5 rounded-lg leading-relaxed whitespace-pre-wrap">{item.reason}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 justify-end pt-1.5 border-t border-white/5">
                              <a
                                href={`https://api.whatsapp.com/send?phone=${encodeURIComponent(item.contact)}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={() => playTapSound()}
                                className="px-3 py-1.5 bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-300 rounded-lg text-xs font-black border border-yellow-400/20 flex items-center gap-1.5 cursor-pointer"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Contatar Candidato</span>
                              </a>
                              <button
                                type="button"
                                onClick={async () => {
                                  playTapSound();
                                  if (confirm('Deseja excluir esta candidatura?')) {
                                    try {
                                      await deleteDoc(doc(db, 'applications_admin', item.id));
                                      showStatus('Candidatura excluída.');
                                      fetchAllApplications();
                                    } catch (err: any) {
                                      alert(err.message);
                                    }
                                  }
                                }}
                                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-black border border-red-500/20 flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Excluir</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          )}

          {/* TAB: Moderação de Comentários */}
          {activeTab === 'moderation' && (
            <div className="space-y-6 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-3 gap-3">
                <div>
                  <h4 className="font-sans font-black text-sm uppercase text-pink-400 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4" />
                    <span>🛡️ GERENCIAR COMENTÁRIOS E SEGURANÇA</span>
                  </h4>
                  <p className="text-[11px] text-gray-400 font-sans leading-relaxed">
                    Aprove ou exclua comentários enviados nas seções de Teorias e Vídeos. Comentários contendo links, hacks ou insultos são bloqueados automaticamente para moderação.
                  </p>
                </div>

                <div className="flex bg-black/30 p-1 rounded-xl border border-white/5 self-start sm:self-center">
                  <button
                    type="button"
                    onClick={() => { playTapSound(); setModFilter('pending'); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all uppercase cursor-pointer ${
                      modFilter === 'pending' ? 'bg-pink-500 text-white shadow' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Pendentes ({allComments.filter(c => c.status === 'pending_review').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => { playTapSound(); setModFilter('approved'); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all uppercase cursor-pointer ${
                      modFilter === 'approved' ? 'bg-indigo-500 text-white shadow' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Aprovados ({allComments.filter(c => c.status === 'approved').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => { playTapSound(); setModFilter('all'); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all uppercase cursor-pointer ${
                      modFilter === 'all' ? 'bg-zinc-800 text-white shadow' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Todos ({allComments.length})
                  </button>
                </div>
              </div>

              {/* Comments List */}
              {allComments.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-white/5 bg-black/10 rounded-2xl">
                  <MessageSquare className="w-8 h-8 text-pink-500/30 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Nenhum comentário registrado no momento.</p>
                </div>
              ) : (
                (() => {
                  const filtered = allComments.filter(c => {
                    if (modFilter === 'pending') return c.status === 'pending_review';
                    if (modFilter === 'approved') return c.status === 'approved';
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-8 text-gray-500 text-xs italic">
                        Nenhum comentário correspondente ao filtro selecionado.
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 gap-4">
                      {filtered.map((comment) => {
                        const isPending = comment.status === 'pending_review';
                        
                        // Highlight suspicious terms
                        const suspiciousWords = ['hack', 'mod menu', 'cheat', 'cheater', 'gerador', 'gratis', 'gemas', 'moedas', 'robux', 'bug', 'merda', 'porra', 'bosta', 'caralho', 'puta', 'fdp', 'viado', 'cu', 'cuzão', 'link_suspeito'];
                        const textLower = comment.content.toLowerCase();
                        const hasSuspiciousTerms = suspiciousWords.some(word => textLower.includes(word));

                        return (
                          <div 
                            key={comment.id} 
                            className={`p-4 bg-black/40 border rounded-xl space-y-3 transition-all ${
                              isPending 
                                ? 'border-yellow-500/20 bg-yellow-500/5' 
                                : 'border-zinc-850 hover:border-zinc-800'
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-pink-400">
                                  ✍️ {comment.authorName}
                                </span>
                                {comment.authorId && (
                                  <span className="text-[9px] font-mono bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30 font-bold uppercase">
                                    Inscrito ✨
                                  </span>
                                )}
                                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase font-bold ${
                                  comment.targetType === 'theory' 
                                    ? 'bg-pink-500/10 text-pink-300 border-pink-500/20' 
                                    : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                                }`}>
                                  {comment.targetType === 'theory' ? '🔮 Teoria' : '🎬 Vídeo'}
                                </span>
                                <span className="text-[10px] text-gray-500">
                                  {new Date(comment.createdAt).toLocaleString('pt-BR')}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                {isPending ? (
                                  <span className="text-[9px] font-mono bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded border border-yellow-500/30 font-bold uppercase flex items-center gap-1 animate-pulse">
                                    <ShieldAlert className="w-3 h-3" />
                                    Filtro Ativado ⚠️
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 font-bold uppercase flex items-center gap-1">
                                    <Check className="w-3 h-3" />
                                    Aprovado ✔
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="bg-black/30 p-3 rounded-lg border border-white/5 space-y-1.5">
                              <p className="text-xs text-gray-200 leading-relaxed font-sans break-words font-medium">
                                {comment.content}
                              </p>
                              {hasSuspiciousTerms && isPending && (
                                <div className="text-[10px] text-yellow-400 font-bold uppercase flex items-center gap-1 pt-1.5 border-t border-white/5">
                                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 animate-bounce" />
                                  <span>Contém termos suspeitos ou proibidos detectados pelo filtro automático!</span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2 justify-end pt-1.5 border-t border-white/5">
                              {isPending && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      playTapSound();
                                      const commentRef = doc(db, 'comments', comment.id);
                                      await updateDoc(commentRef, { status: 'approved' });
                                      showStatus('Comentário aprovado com sucesso! ✨');
                                      playSuccessSound();
                                    } catch (err: any) {
                                      alert(err.message);
                                    }
                                  }}
                                  className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-black border border-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Aprovar Publicação</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    playTapSound();
                                    if (confirm('Deseja excluir permanentemente este comentário?')) {
                                      await deleteDoc(doc(db, 'comments', comment.id));
                                      showStatus('Comentário excluído da base de dados! 🗑️');
                                    }
                                  } catch (err: any) {
                                    alert(err.message);
                                  }
                                }}
                                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-black border border-red-500/20 flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Excluir</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              )}
            </div>
          )}

          {/* TAB: Criar/Gerenciar Códigos de Resgate */}
          {activeTab === 'promocodes' && (
            <div className="space-y-6 text-left">
              <div className="border-b border-white/5 pb-3">
                <h4 className="font-sans font-black text-sm uppercase text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>🎟️ GERENCIAR E CRIAR CÓDIGOS DE RESGATE</span>
                </h4>
                <p className="text-[11px] text-gray-400 font-sans leading-relaxed">
                  Gere novos cupons de joias e moedas com limite de resgates para distribuir ao fã-clube do PK XD! Os jogadores poderão resgatá-los no painel de cupons.
                </p>
              </div>

              {/* Form to create code */}
              <form onSubmit={handleCreatePromoCode} className="bg-zinc-950/40 border border-white/5 p-4 rounded-2xl space-y-4">
                <h5 className="text-xs font-black uppercase text-gray-200">Novo Código</h5>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Código de Texto *</label>
                    <input 
                      type="text" 
                      value={newCodeName} 
                      onChange={(e) => setNewCodeName(e.target.value)} 
                      placeholder="Ex: SPOILERROXO"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs font-semibold text-white focus:outline-none focus:border-yellow-400 uppercase font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Gemas de Recompensa *</label>
                    <input 
                      type="number" 
                      value={newCodeGems} 
                      onChange={(e) => setNewCodeGems(Number(e.target.value))} 
                      placeholder="Ex: 50"
                      min={0}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs font-semibold text-white focus:outline-none focus:border-yellow-400"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Moedas de Recompensa *</label>
                    <input 
                      type="number" 
                      value={newCodeCoins} 
                      onChange={(e) => setNewCodeCoins(Number(e.target.value))} 
                      placeholder="Ex: 2000"
                      min={0}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs font-semibold text-white focus:outline-none focus:border-yellow-400"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Limite de Resgates *</label>
                    <input 
                      type="number" 
                      value={newCodeMaxRedeems} 
                      onChange={(e) => setNewCodeMaxRedeems(Number(e.target.value))} 
                      placeholder="Ex: 50"
                      min={1}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs font-semibold text-white focus:outline-none focus:border-yellow-400"
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={codeSubmitLoading}
                  className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 disabled:bg-zinc-700 text-black font-sans font-black uppercase text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  {codeSubmitLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Gerando Código...</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Gerar Código de Resgate ✨</span>
                    </>
                  )}
                </button>
              </form>

              {/* Codes List */}
              <div className="space-y-3">
                <h5 className="text-xs font-black uppercase text-gray-300">Códigos Gerados Ativos</h5>
                {generatedCodes.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-white/5 bg-black/10 rounded-2xl text-gray-500 text-xs font-bold uppercase">
                    Nenhum código gerado ainda. Crie um acima!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {generatedCodes.map((code) => {
                      const isExpired = code.currentRedeems >= code.maxRedeems;
                      return (
                        <div key={code.code} className="bg-black/40 border border-zinc-800 p-4 rounded-xl flex items-center justify-between gap-4">
                          <div className="space-y-1 text-left">
                            <span className="font-mono font-black text-sm text-yellow-400 tracking-wider">
                              {code.code}
                            </span>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-purple-400 font-bold font-mono">💎 {code.gems}</span>
                              <span className="text-amber-500 font-bold font-mono">🪙 {code.coins}</span>
                            </div>
                            <div className="text-[10px] text-gray-400 flex items-center gap-1">
                              <span>Resgates:</span>
                              <span className={`font-mono font-extrabold ${isExpired ? 'text-red-400' : 'text-emerald-400'}`}>
                                {code.currentRedeems} / {code.maxRedeems}
                              </span>
                              {isExpired && (
                                <span className="bg-red-500/25 text-red-400 text-[8px] font-black px-1.5 py-0.5 rounded uppercase animate-pulse">
                                  ESGOTADO
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                playTapSound();
                                if (confirm(`Deseja revogar e excluir permanentemente o cupom ${code.code}?`)) {
                                  await deleteDoc(doc(db, 'generated_promo_codes', code.code));
                                  showStatus(`Cupom ${code.code} excluído! 🗑️`);
                                }
                              } catch (err: any) {
                                alert(err.message);
                              }
                            }}
                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 cursor-pointer"
                            title="Revogar Código"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
