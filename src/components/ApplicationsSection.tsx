import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Smartphone, 
  Video, 
  UserCheck, 
  Compass, 
  Send, 
  Check, 
  ExternalLink, 
  FileText, 
  AlertCircle,
  Trophy,
  Flame,
  ArrowLeft,
  Lock,
  Unlock,
  RefreshCw,
  Trash2,
  CheckCircle,
  Eye,
  Star,
  Settings
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { playTapSound, playSuccessSound, playLevelUpSound } from '../utils/audio';

interface ApplicationsSectionProps {
  onBackToHub: () => void;
  onAddXP: (amount: number, reason: string) => void;
  soundEnabled: boolean;
  user: any;
  isAdmin?: boolean;
  onAddNews?: (news: any) => void;
  onAddShort?: (short: any) => void;
  onAddTheory?: (theory: any) => void;
  onAddFeaturedVideo?: (video: any) => void;
}

export default function ApplicationsSection({ 
  onBackToHub, 
  onAddXP, 
  soundEnabled,
  user,
  isAdmin = false,
  onAddNews,
  onAddShort,
  onAddTheory,
  onAddFeaturedVideo
}: ApplicationsSectionProps) {
  const [activeTab, setActiveTab] = useState<'panel' | 'shorts' | 'theory' | 'admin'>(() => {
    try {
      const hash = window.location.hash.toLowerCase();
      const search = window.location.search.toLowerCase();
      if (hash.includes('admin') || search.includes('admin')) {
        return 'admin';
      }
      if (hash.includes('shorts') || search.includes('shorts')) {
        return 'shorts';
      }
      if (hash.includes('theory') || search.includes('theory') || hash.includes('teoria') || search.includes('teoria')) {
        return 'theory';
      }
      if (hash.includes('panel') || search.includes('panel') || hash.includes('destaque') || search.includes('destaque')) {
        return 'panel';
      }
    } catch (e) {}
    return 'panel';
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const checkHash = () => {
      try {
        const hash = window.location.hash.toLowerCase();
        const search = window.location.search.toLowerCase();
        if (hash.includes('admin') || search.includes('admin')) {
          setActiveTab('admin');
        } else if (hash.includes('shorts') || search.includes('shorts')) {
          setActiveTab('shorts');
        } else if (hash.includes('theory') || search.includes('theory') || hash.includes('teoria') || search.includes('teoria')) {
          setActiveTab('theory');
        } else if (hash.includes('panel') || search.includes('panel') || hash.includes('destaque') || search.includes('destaque')) {
          setActiveTab('panel');
        }
      } catch (e) {}
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  // Admin Dashboard States
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [isComponentAdmin, setIsComponentAdmin] = useState(isAdmin);
  const [inputPasscode, setInputPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  
  const [appsPanel, setAppsPanel] = useState<any[]>([]);
  const [appsShorts, setAppsShorts] = useState<any[]>([]);
  const [appsTheories, setAppsTheories] = useState<any[]>([]);
  const [appsAdmin, setAppsAdmin] = useState<any[]>([]);
  const [isAppsLoading, setIsAppsLoading] = useState(false);
  const [adminActiveSubTab, setAdminActiveSubTab] = useState<'panel' | 'shorts' | 'theory' | 'admin'>('panel');

  const fetchAllApplications = async () => {
    setIsAppsLoading(true);
    try {
      try {
        const panelSnap = await getDocs(collection(db, 'applications_panel'));
        setAppsPanel(panelSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, 'applications_panel');
      }

      try {
        const shortsSnap = await getDocs(collection(db, 'applications_shorts'));
        setAppsShorts(shortsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, 'applications_shorts');
      }

      try {
        const theoriesSnap = await getDocs(collection(db, 'applications_theories'));
        setAppsTheories(theoriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, 'applications_theories');
      }

      try {
        const adminSnap = await getDocs(collection(db, 'applications_admin'));
        setAppsAdmin(adminSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, 'applications_admin');
      }
    } catch (err) {
      console.error("Erro ao buscar inscrições:", err);
    } finally {
      setIsAppsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      setIsComponentAdmin(true);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (showAdminDashboard && isComponentAdmin) {
      fetchAllApplications();
    }
  }, [showAdminDashboard, isComponentAdmin]);

  const handlePasscodeUnlock = () => {
    triggerAudio('tap');
    const validPasscodes = ['pkxdcentral2026_portal_admin', 'kawanyuri_adm_seguro_99', 'central_pkxd_super_acesso_real', 'bela12@!'];
    if (validPasscodes.includes(inputPasscode.trim())) {
      setIsComponentAdmin(true);
      setPasscodeError('');
      setInputPasscode('');
      triggerAudio('success');
    } else {
      setPasscodeError('Código de acesso incorreto. Tente novamente!');
    }
  };

  // Form states - Tab 1: Panel Highlight
  const [panelCreator, setPanelCreator] = useState('');
  const [panelUrl, setPanelUrl] = useState('');
  const [panelDescription, setPanelDescription] = useState('');
  const [panelSocial, setPanelSocial] = useState('');

  // Form states - Tab 2: Shorts Highlight
  const [shortsCreator, setShortsCreator] = useState('');
  const [shortsUrl, setShortsUrl] = useState('');
  const [shortsTitle, setShortsTitle] = useState('');

  // Form states - Tab 3: Submit Theory
  const [theoryTitle, setTheoryTitle] = useState('');
  const [theoryContent, setTheoryContent] = useState('');
  const [theoryAuthor, setTheoryAuthor] = useState('');

  // Form states - Tab 4: Admin Application
  const [adminName, setAdminName] = useState('');
  const [adminContact, setAdminContact] = useState('');
  const [adminAge, setAdminAge] = useState('');
  const [adminReason, setAdminReason] = useState('');
  const [adminHours, setAdminHours] = useState('');

  const triggerAudio = (type: 'tap' | 'success' | 'levelUp') => {
    if (!soundEnabled) return;
    if (type === 'tap') playTapSound();
    if (type === 'success') playSuccessSound();
    if (type === 'levelUp') playLevelUpSound();
  };

  const handleTabChange = (tab: 'panel' | 'shorts' | 'theory' | 'admin') => {
    triggerAudio('tap');
    setActiveTab(tab);
    setSubmitStatus(null);
  };

  const resetForms = () => {
    setPanelCreator('');
    setPanelUrl('');
    setPanelDescription('');
    setPanelSocial('');

    setShortsCreator('');
    setShortsUrl('');
    setShortsTitle('');

    setTheoryTitle('');
    setTheoryContent('');
    setTheoryAuthor('');

    setAdminName('');
    setAdminContact('');
    setAdminAge('');
    setAdminReason('');
    setAdminHours('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerAudio('tap');
    setIsSubmitting(true);
    setSubmitStatus(null);

    const id = 'app_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    let collectionName = '';
    let payload: any = {
      id,
      submittedBy: user?.uid || 'anonymous',
      submittedByEmail: user?.email || 'convidado@pkxdcentral.com',
      createdAt: Date.now(),
      status: 'pending' // pending, approved, rejected
    };

    try {
      if (activeTab === 'panel') {
        if (!panelCreator || !panelUrl || !panelDescription) {
          throw new Error('Por favor, preencha todos os campos obrigatórios.');
        }
        collectionName = 'applications_panel';
        payload = {
          ...payload,
          creator: panelCreator,
          url: panelUrl,
          description: panelDescription,
          social: panelSocial
        };
      } else if (activeTab === 'shorts') {
        if (!shortsCreator || !shortsUrl || !shortsTitle) {
          throw new Error('Por favor, preencha todos os campos obrigatórios.');
        }
        collectionName = 'applications_shorts';
        payload = {
          ...payload,
          creator: shortsCreator,
          url: shortsUrl,
          title: shortsTitle
        };
      } else if (activeTab === 'theory') {
        if (!theoryTitle || !theoryContent || !theoryAuthor) {
          throw new Error('Por favor, preencha todos os campos obrigatórios.');
        }
        collectionName = 'applications_theories';
        payload = {
          ...payload,
          title: theoryTitle,
          content: theoryContent,
          author: theoryAuthor
        };
      } else if (activeTab === 'admin') {
        if (!adminName || !adminContact || !adminAge || !adminReason || !adminHours) {
          throw new Error('Por favor, preencha todos os campos obrigatórios.');
        }
        collectionName = 'applications_admin';
        payload = {
          ...payload,
          name: adminName,
          contact: adminContact,
          age: adminAge,
          reason: adminReason,
          hours: adminHours
        };
      }

      try {
        await setDoc(doc(db, collectionName, id), payload);
      } catch (dbErr: any) {
        console.warn("Erro no Firestore, verificando código do erro:", dbErr);
        if (dbErr?.code === 'permission-denied') {
          throw new Error('Permissão Negada de Nuvem (Firestore): A gravação foi rejeitada pelas regras de segurança. Entre em contato com um administrador!');
        } else {
          handleFirestoreError(dbErr, OperationType.WRITE, collectionName);
        }
      }
      
      triggerAudio('levelUp');
      setSubmitStatus({
        success: true,
        message: 'Inscrição enviada com sucesso! Ela foi guardada na nuvem do PKXD Central e nossa equipe vai analisar em breve! 🌟'
      });
      
      // Award XP
      const xpReward = 150;
      onAddXP(xpReward, `Inscrição: ${activeTab === 'panel' ? 'Destaque de Vídeo' : activeTab === 'shorts' ? 'Destaque de Shorts' : activeTab === 'theory' ? 'Envio de Teoria' : 'Candidatura ADM'}! 📝`);

      resetForms();
    } catch (err: any) {
      console.error(err);
      let errMsg = 'Erro ao processar inscrição. Verifique as informações e tente novamente.';
      try {
        if (err.message && err.message.startsWith('{')) {
          const parsed = JSON.parse(err.message);
          if (parsed.error && (parsed.error.includes('permission-denied') || parsed.error.includes('Missing or insufficient permissions'))) {
            errMsg = 'A gravação foi rejeitada devido a regras de segurança do banco de dados (Firestore). Verifique sua autenticação.';
          } else {
            errMsg = parsed.error || errMsg;
          }
        } else if (err.message) {
          errMsg = err.message;
        }
      } catch (e) {}

      setSubmitStatus({
        success: false,
        message: errMsg
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 py-8 relative" id="applications-area-wrapper">
      
      {/* Upper navigation row */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <button
          onClick={() => {
            triggerAudio('tap');
            onBackToHub();
          }}
          className="px-3 sm:px-4 py-2 sm:py-2.5 bg-zinc-900/85 hover:bg-purple-950 text-purple-300 hover:text-white rounded-xl border border-purple-500/30 transition-all duration-150 cursor-pointer flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-md"
        >
          <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Voltar <span className="hidden xs:inline">à Central</span></span>
        </button>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 sm:gap-1.5 bg-purple-900/40 p-1.5 px-2.5 sm:px-3 rounded-full border border-purple-500/20">
            <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-300" />
            <span className="text-[9px] sm:text-[10px] text-gray-300 font-bold uppercase tracking-wider">
              <span className="hidden sm:inline">Inscrição = </span>
              <strong className="text-yellow-300">+150 XP</strong>
            </span>
          </div>

          <button
            onClick={() => {
              triggerAudio('tap');
              setShowAdminDashboard(!showAdminDashboard);
              setSubmitStatus(null);
            }}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r rounded-xl border font-sans text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer flex items-center gap-1.5 shadow-md ${
              showAdminDashboard
                ? 'from-rose-600 to-red-600 text-white border-rose-500 hover:brightness-110'
                : 'from-amber-450 to-yellow-500 text-black border-yellow-400 hover:brightness-110'
            }`}
          >
            {showAdminDashboard ? (
              <>
                <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span><span className="hidden xs:inline">Enviar </span>Inscrição</span>
              </>
            ) : (
              <>
                <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span><span className="hidden xs:inline">Área do </span>Admin 🔑</span>
              </>
            )}
          </button>
        </div>
      </div>

      {showAdminDashboard ? (
        <>
          {/* Header card for Admin */}
          <div className="bg-gradient-to-r from-slate-900 via-zinc-950 to-indigo-950 border-2 border-yellow-500/40 rounded-3xl p-6 sm:p-8 text-left shadow-[0_12px_30px_rgba(234,179,8,0.15)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full filter blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/4 w-32 h-32 bg-indigo-500/5 rounded-full filter blur-2xl pointer-events-none" />
            
            <div className="relative z-10 space-y-3">
              <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 px-3.5 py-1 rounded-full text-yellow-300 font-mono text-[10px] font-black uppercase tracking-widest animate-pulse">
                <Lock className="w-3.5 h-3.5" />
                Painel do Administrador (Inscrições)
              </div>
              <h2 className="font-sans font-black text-2xl sm:text-4xl tracking-tight text-white uppercase leading-none">
                CURADORIA DE <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-400">INSCRIÇÕES</span>
              </h2>
              <p className="font-sans text-xs sm:text-sm text-gray-300 leading-relaxed max-w-2xl">
                Gerencie todas as solicitações enviadas pelos fás do fã-clube. Aprove posts direto para o portal ou entre em contato com novos candidatos a moderador!
              </p>
            </div>
          </div>

          {!isComponentAdmin ? (
            /* Passcode Entry Form */
            <div className="bg-zinc-900/60 border border-white/5 rounded-3xl p-6 sm:p-8 text-center relative overflow-hidden">
              <div className="max-w-md mx-auto py-8 space-y-5">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-zinc-950 border border-white/10 flex items-center justify-center text-yellow-400 shadow-inner">
                  <Lock className="w-7 h-7 animate-pulse" />
                </div>

                <div className="space-y-1">
                  <h3 className="font-sans font-black text-lg text-white uppercase tracking-wider">
                    🔐 ACESSO RESTRITO (CÓDIGO ADMIN)
                  </h3>
                  <p className="font-sans text-xs text-gray-400 leading-relaxed">
                    Insira uma senha de acesso autorizada para visualizar os dados de contato e inscrições feitas na central.
                  </p>
                </div>

                <div className="space-y-3">
                  <input
                    type="password"
                    placeholder="Senha de Admin ou PIN"
                    value={inputPasscode}
                    onChange={(e) => setInputPasscode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handlePasscodeUnlock();
                    }}
                    className="bg-zinc-950 text-white placeholder-zinc-600 text-xs px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-yellow-500 w-full font-mono text-center"
                  />
                  <button
                    onClick={handlePasscodeUnlock}
                    className="bg-yellow-400 hover:bg-yellow-350 text-black py-3 rounded-xl text-xs font-black font-sans tracking-wide cursor-pointer w-full uppercase shadow-md transition-all"
                  >
                    Desbloquear Painel 🔓
                  </button>
                  {passcodeError && (
                    <p className="text-red-400 text-xs font-sans font-bold pt-1">{passcodeError}</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Unlocked Admin Dashboard */
            <div className="space-y-6">
              {/* Admin Subtabs Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                <button
                  onClick={() => { triggerAudio('tap'); setAdminActiveSubTab('panel'); }}
                  className={`p-3.5 rounded-2xl border-2 font-sans font-black text-[11px] uppercase tracking-wider transition-all duration-150 cursor-pointer flex flex-col items-center justify-center gap-1.5 shadow-md ${
                    adminActiveSubTab === 'panel'
                      ? 'bg-gradient-to-b from-purple-800 to-purple-950 text-white border-purple-500'
                      : 'bg-zinc-900/70 text-gray-400 border-white/5 hover:text-gray-250'
                  }`}
                >
                  <Video className="w-4 h-4" />
                  <span>Vídeo Destaque ({appsPanel.length})</span>
                </button>

                <button
                  onClick={() => { triggerAudio('tap'); setAdminActiveSubTab('shorts'); }}
                  className={`p-3.5 rounded-2xl border-2 font-sans font-black text-[11px] uppercase tracking-wider transition-all duration-150 cursor-pointer flex flex-col items-center justify-center gap-1.5 shadow-md ${
                    adminActiveSubTab === 'shorts'
                      ? 'bg-gradient-to-b from-cyan-800 to-cyan-950 text-white border-cyan-500'
                      : 'bg-zinc-900/70 text-gray-400 border-white/5 hover:text-gray-250'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Shorts ({appsShorts.length})</span>
                </button>

                <button
                  onClick={() => { triggerAudio('tap'); setAdminActiveSubTab('theory'); }}
                  className={`p-3.5 rounded-2xl border-2 font-sans font-black text-[11px] uppercase tracking-wider transition-all duration-150 cursor-pointer flex flex-col items-center justify-center gap-1.5 shadow-md ${
                    adminActiveSubTab === 'theory'
                      ? 'bg-gradient-to-b from-pink-850 to-pink-950 text-white border-pink-500'
                      : 'bg-zinc-900/70 text-gray-400 border-white/5 hover:text-gray-250'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Teorias ({appsTheories.length})</span>
                </button>

                <button
                  onClick={() => { triggerAudio('tap'); setAdminActiveSubTab('admin'); }}
                  className={`p-3.5 rounded-2xl border-2 font-sans font-black text-[11px] uppercase tracking-wider transition-all duration-150 cursor-pointer flex flex-col items-center justify-center gap-1.5 shadow-md ${
                    adminActiveSubTab === 'admin'
                      ? 'bg-gradient-to-b from-yellow-800 to-yellow-950 text-white border-yellow-500'
                      : 'bg-zinc-900/70 text-gray-400 border-white/5 hover:text-gray-250'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Candidatos ADM ({appsAdmin.length})</span>
                </button>
              </div>

              {/* Data Content Box */}
              <div className="bg-zinc-900/60 border border-white/5 rounded-3xl p-6 sm:p-8 text-left relative overflow-hidden">
                
                {/* Refresh Trigger */}
                <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                  <h3 className="font-sans font-black text-xs sm:text-sm uppercase tracking-wider text-yellow-400 flex items-center gap-2">
                    <span>📥 LISTA DE SOLICITAÇÕES: {
                      adminActiveSubTab === 'panel' ? 'DESTAQUE DE VÍDEOS' :
                      adminActiveSubTab === 'shorts' ? 'DESTAQUE DE SHORTS' :
                      adminActiveSubTab === 'theory' ? 'TEORIAS ENVIADAS' :
                      'CANDIDATURAS PARA ADMINISTRADOR'
                    }</span>
                  </h3>
                  <button
                    onClick={() => { triggerAudio('tap'); fetchAllApplications(); }}
                    disabled={isAppsLoading}
                    className="p-2 px-3 bg-zinc-850 hover:bg-zinc-800 text-gray-300 hover:text-white rounded-xl text-xs font-bold font-sans flex items-center gap-1.5 cursor-pointer border border-white/5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isAppsLoading ? 'animate-spin' : ''}`} />
                    <span>{isAppsLoading ? 'Atualizando...' : 'Atualizar'}</span>
                  </button>
                </div>

                {isAppsLoading ? (
                  <div className="py-12 text-center text-gray-500">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-yellow-400 mb-3" />
                    <p className="font-sans text-xs">Acessando banco de dados...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Render Category List */}
                    {adminActiveSubTab === 'panel' && (
                      appsPanel.length === 0 ? (
                        <p className="py-8 text-center text-gray-500 text-xs">Nenhum pedido de destaque de vídeo pendente.</p>
                      ) : (
                        appsPanel.map((item) => (
                          <div key={item.id} className="p-4 bg-zinc-950/70 border border-white/5 rounded-2xl space-y-3 relative">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
                              <div>
                                <span className="text-[10px] text-purple-400 font-bold uppercase block">CRIADOR</span>
                                <h4 className="font-sans font-black text-xs text-white">{item.creator}</h4>
                                {item.social && <p className="text-[10px] text-gray-400">{item.social}</p>}
                              </div>
                              <span className="text-[9px] font-mono text-gray-500">{new Date(item.createdAt).toLocaleString()}</span>
                            </div>

                            <div className="space-y-1.5 text-xs">
                              <p className="text-gray-300 leading-normal font-sans"><span className="text-purple-300 font-semibold">Descrição:</span> {item.description}</p>
                              <p className="font-mono text-[10px] text-cyan-400 break-all select-all bg-black/40 p-2 rounded-lg flex items-center justify-between gap-2">
                                <span>{item.url}</span>
                                <a href={item.url} target="_blank" rel="noreferrer" className="text-white hover:text-cyan-300 flex-shrink-0">
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-2">
                              <button
                                onClick={async () => {
                                  triggerAudio('tap');
                                  if (!onAddFeaturedVideo) {
                                    alert('Erro: onAddFeaturedVideo não está disponível.');
                                    return;
                                  }
                                  try {
                                    onAddFeaturedVideo({
                                      title: item.description || `Destaque de ${item.creator}! 🎬`,
                                      youtubeUrl: item.url,
                                      type: 'game_highlight',
                                      author: item.creator
                                    });
                                    await deleteDoc(doc(db, 'applications_panel', item.id));
                                    triggerAudio('success');
                                    fetchAllApplications();
                                  } catch (err: any) {
                                    alert('Erro ao aprovar no Painel: ' + err.message);
                                  }
                                }}
                                className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-xs font-black font-sans cursor-pointer flex items-center gap-1 shadow-lg transition-all active:scale-95"
                              >
                                <Star className="w-3.5 h-3.5 fill-current text-black" />
                                <span>Aprovar no PAINEL 🌟</span>
                              </button>

                              <button
                                onClick={async () => {
                                  triggerAudio('tap');
                                  if (!onAddFeaturedVideo) {
                                    alert('Erro: onAddFeaturedVideo não está disponível.');
                                    return;
                                  }
                                  try {
                                    onAddFeaturedVideo({
                                      title: item.description || `Vídeo de ${item.creator}! 🎬`,
                                      youtubeUrl: item.url,
                                      type: 'panel_video',
                                      author: item.creator
                                    });
                                    await deleteDoc(doc(db, 'applications_panel', item.id));
                                    triggerAudio('success');
                                    fetchAllApplications();
                                  } catch (err: any) {
                                    alert('Erro ao aprovar na Comunidade: ' + err.message);
                                  }
                                }}
                                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black font-sans cursor-pointer flex items-center gap-1 shadow transition-all active:scale-95"
                              >
                                <CheckCircle className="w-3.5 h-3.5 text-white" />
                                <span>Aprovar na COMUNIDADE 👥</span>
                              </button>

                              <button
                                onClick={async () => {
                                  triggerAudio('tap');
                                  if (confirm('Deseja excluir esta inscrição permanentemente?')) {
                                    try {
                                      await deleteDoc(doc(db, 'applications_panel', item.id));
                                      fetchAllApplications();
                                    } catch (err: any) {
                                      alert(err.message);
                                    }
                                  }
                                }}
                                className="px-3 py-2 bg-red-650 hover:bg-red-600 text-white rounded-xl text-xs font-bold font-sans cursor-pointer flex items-center gap-1 transition-all active:scale-95 ml-auto"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Excluir</span>
                              </button>
                            </div>
                          </div>
                        ))
                      )
                    )}

                    {adminActiveSubTab === 'shorts' && (
                      appsShorts.length === 0 ? (
                        <p className="py-8 text-center text-gray-500 text-xs">Nenhum pedido de destaque de shorts pendente.</p>
                      ) : (
                        appsShorts.map((item) => (
                          <div key={item.id} className="p-4 bg-zinc-950/70 border border-white/5 rounded-2xl space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
                              <div>
                                <span className="text-[10px] text-cyan-400 font-bold uppercase block">CANAL</span>
                                <h4 className="font-sans font-black text-xs text-white">{item.creator}</h4>
                              </div>
                              <span className="text-[9px] font-mono text-gray-500">{new Date(item.createdAt).toLocaleString()}</span>
                            </div>

                            <div className="space-y-1.5 text-xs">
                              <p className="text-gray-300 font-sans"><span className="text-cyan-300 font-semibold">Título do Short:</span> {item.title}</p>
                              <p className="font-mono text-[10px] text-cyan-400 break-all select-all bg-black/40 p-2 rounded-lg flex items-center justify-between gap-2">
                                <span>{item.url}</span>
                                <a href={item.url} target="_blank" rel="noreferrer" className="text-white hover:text-cyan-300 flex-shrink-0">
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </p>
                            </div>

                            <div className="flex gap-2 pt-2">
                              <button
                                onClick={async () => {
                                  triggerAudio('tap');
                                  if (!onAddShort) return;
                                  try {
                                    onAddShort({
                                      title: item.title,
                                      youtubeUrl: item.url
                                    });
                                    await deleteDoc(doc(db, 'applications_shorts', item.id));
                                    triggerAudio('success');
                                    fetchAllApplications();
                                  } catch (err: any) {
                                    alert('Erro ao aprovar: ' + err.message);
                                  }
                                }}
                                className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-black font-black rounded-xl text-xs font-sans cursor-pointer flex items-center gap-1.5 shadow transition-all active:scale-95"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Aprovar Shorts</span>
                              </button>
                              <button
                                onClick={async () => {
                                  triggerAudio('tap');
                                  if (confirm('Deseja excluir esta inscrição permanentemente?')) {
                                    try {
                                      await deleteDoc(doc(db, 'applications_shorts', item.id));
                                      fetchAllApplications();
                                    } catch (err: any) {
                                      alert(err.message);
                                    }
                                  }
                                }}
                                className="px-3 py-2 bg-red-650 hover:bg-red-600 text-white rounded-xl text-xs font-bold font-sans cursor-pointer flex items-center gap-1 transition-all active:scale-95"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Excluir</span>
                              </button>
                            </div>
                          </div>
                        ))
                      )
                    )}

                    {adminActiveSubTab === 'theory' && (
                      appsTheories.length === 0 ? (
                        <p className="py-8 text-center text-gray-500 text-xs">Nenhuma teoria enviada pendente.</p>
                      ) : (
                        appsTheories.map((item) => (
                          <div key={item.id} className="p-4 bg-zinc-950/70 border border-white/5 rounded-2xl space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
                              <div>
                                <span className="text-[10px] text-pink-400 font-bold uppercase block">AUTOR / TÍTULO</span>
                                <h4 className="font-sans font-black text-xs text-white">{item.title}</h4>
                                <p className="text-[10px] text-gray-400">Por: {item.author}</p>
                              </div>
                              <span className="text-[9px] font-mono text-gray-500">{new Date(item.createdAt).toLocaleString()}</span>
                            </div>

                            <div className="text-xs bg-black/30 p-3 rounded-xl border border-white/5 max-h-40 overflow-y-auto">
                              <p className="text-gray-300 leading-relaxed whitespace-pre-wrap font-sans">{item.content}</p>
                            </div>

                            <div className="flex gap-2 pt-2">
                              <button
                                onClick={async () => {
                                  triggerAudio('tap');
                                  if (!onAddTheory) return;
                                  try {
                                    onAddTheory({
                                      title: item.title,
                                      content: item.content,
                                      author: item.author
                                    });
                                    await deleteDoc(doc(db, 'applications_theories', item.id));
                                    triggerAudio('success');
                                    fetchAllApplications();
                                  } catch (err: any) {
                                    alert('Erro ao aprovar: ' + err.message);
                                  }
                                }}
                                className="px-3.5 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-bold font-sans cursor-pointer flex items-center gap-1.5 shadow transition-all active:scale-95"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Aprovar Teoria</span>
                              </button>
                              <button
                                onClick={async () => {
                                  triggerAudio('tap');
                                  if (confirm('Deseja excluir esta teoria permanentemente?')) {
                                    try {
                                      await deleteDoc(doc(db, 'applications_theories', item.id));
                                      fetchAllApplications();
                                    } catch (err: any) {
                                      alert(err.message);
                                    }
                                  }
                                }}
                                className="px-3 py-2 bg-red-650 hover:bg-red-600 text-white rounded-xl text-xs font-bold font-sans cursor-pointer flex items-center gap-1 transition-all active:scale-95"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Excluir</span>
                              </button>
                            </div>
                          </div>
                        ))
                      )
                    )}

                    {adminActiveSubTab === 'admin' && (
                      appsAdmin.length === 0 ? (
                        <p className="py-8 text-center text-gray-500 text-xs">Nenhuma candidatura de administrador pendente.</p>
                      ) : (
                        appsAdmin.map((item) => (
                          <div key={item.id} className="p-4 bg-zinc-950/70 border border-white/5 rounded-2xl space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
                              <div>
                                <span className="text-[10px] text-yellow-400 font-bold uppercase block">CANDIDATO</span>
                                <h4 className="font-sans font-black text-xs text-white">{item.name} ({item.age} anos)</h4>
                                <p className="text-[10px] text-gray-400">Contato: <strong className="text-white select-all">{item.contact}</strong></p>
                              </div>
                              <span className="text-[9px] font-mono text-gray-500">{new Date(item.createdAt).toLocaleString()}</span>
                            </div>

                            <div className="space-y-2 text-xs">
                              <p className="text-gray-300 font-sans"><span className="text-yellow-300 font-semibold">Disponibilidade:</span> {item.hours}</p>
                              <div className="text-gray-300 leading-relaxed font-sans bg-black/30 p-3 rounded-xl border border-white/5">
                                <span className="text-yellow-300 font-semibold block mb-1">Por que quer ser Admin?</span>
                                {item.reason}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-2">
                              <a
                                href={`https://api.whatsapp.com/send?phone=${encodeURIComponent(item.contact)}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={() => triggerAudio('tap')}
                                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold font-sans cursor-pointer flex items-center gap-1.5 shadow transition-all active:scale-95"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Contatar via WhatsApp</span>
                              </a>
                              <button
                                onClick={async () => {
                                  triggerAudio('tap');
                                  if (confirm('Deseja excluir esta candidatura permanentemente?')) {
                                    try {
                                      await deleteDoc(doc(db, 'applications_admin', item.id));
                                      fetchAllApplications();
                                    } catch (err: any) {
                                      alert(err.message);
                                    }
                                  }
                                }}
                                className="px-3 py-2 bg-red-650 hover:bg-red-600 text-white rounded-xl text-xs font-bold font-sans cursor-pointer flex items-center gap-1 transition-all active:scale-95"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Excluir Candidatura</span>
                              </button>
                            </div>
                          </div>
                        ))
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Header card */}
          <div className="bg-gradient-to-r from-purple-900/80 via-zinc-950/95 to-slate-900 border-2 border-purple-500/40 rounded-3xl p-6 sm:p-8 text-left shadow-[0_12px_30px_rgba(147,51,234,0.15)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full filter blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/4 w-32 h-32 bg-cyan-500/5 rounded-full filter blur-2xl pointer-events-none" />
            
            <div className="relative z-10 space-y-3">
              <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 px-3.5 py-1 rounded-full text-purple-300 font-mono text-[10px] font-black uppercase tracking-widest animate-pulse">
                <Compass className="w-3.5 h-3.5 animate-spin-slow" />
                Portal de Recrutamento & Destaques
              </div>
              <h2 className="font-sans font-black text-2xl sm:text-4xl tracking-tight text-white uppercase leading-none">
                ÁREA DE <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400">INSCRIÇÕES</span> DO SITE
              </h2>
              <p className="font-sans text-xs sm:text-sm text-gray-300 leading-relaxed max-w-2xl">
                Bem-vindo à central do site! Aqui você pode se inscrever para aparecer em destaque nas seções do site, enviar suas teorias exclusivas de PK XD ou se candidatar para fazer parte da nossa equipe oficial de administradores!
              </p>
            </div>
          </div>

          {/* Tabs list (Beautiful solid visual blocks) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <button
              onClick={() => handleTabChange('panel')}
              className={`p-3.5 rounded-2xl border-2 font-sans font-black text-[11px] uppercase tracking-wider transition-all duration-150 cursor-pointer flex flex-col items-center justify-center gap-2 shadow-md ${
                activeTab === 'panel'
                  ? 'bg-gradient-to-b from-purple-800 to-purple-950 text-white border-purple-500 shadow-[0_4px_15px_rgba(168,85,247,0.25)]'
                  : 'bg-zinc-900/70 text-gray-400 border-white/5 hover:border-purple-500/30 hover:text-gray-205'
              }`}
            >
              <Video className="w-5 h-5" />
              <span className="text-center">Destaque de Vídeo</span>
            </button>

            <button
              onClick={() => handleTabChange('shorts')}
              className={`p-3.5 rounded-2xl border-2 font-sans font-black text-[11px] uppercase tracking-wider transition-all duration-150 cursor-pointer flex flex-col items-center justify-center gap-2 shadow-md ${
                activeTab === 'shorts'
                  ? 'bg-gradient-to-b from-cyan-800 to-cyan-950 text-white border-cyan-500 shadow-[0_4px_15px_rgba(6,182,212,0.25)]'
                  : 'bg-zinc-900/70 text-gray-400 border-white/5 hover:border-cyan-500/30 hover:text-gray-205'
              }`}
            >
              <Smartphone className="w-5 h-5" />
              <span className="text-center">Destaque de Shorts</span>
            </button>

            <button
              onClick={() => handleTabChange('theory')}
              className={`p-3.5 rounded-2xl border-2 font-sans font-black text-[11px] uppercase tracking-wider transition-all duration-150 cursor-pointer flex flex-col items-center justify-center gap-2 shadow-md ${
                activeTab === 'theory'
                  ? 'bg-gradient-to-b from-pink-850 to-pink-950 text-white border-pink-500 shadow-[0_4px_15px_rgba(236,72,153,0.25)]'
                  : 'bg-zinc-900/70 text-gray-400 border-white/5 hover:border-pink-500/30 hover:text-gray-205'
              }`}
            >
              <Sparkles className="w-5 h-5" />
              <span className="text-center">Enviar Teoria</span>
            </button>

            <button
              onClick={() => handleTabChange('admin')}
              className={`p-3.5 rounded-2xl border-2 font-sans font-black text-[11px] uppercase tracking-wider transition-all duration-150 cursor-pointer flex flex-col items-center justify-center gap-2 shadow-md ${
                activeTab === 'admin'
                  ? 'bg-gradient-to-b from-yellow-800 to-yellow-950 text-white border-yellow-500 shadow-[0_4px_15px_rgba(234,179,8,0.25)]'
                  : 'bg-zinc-900/70 text-gray-400 border-white/5 hover:border-yellow-500/30 hover:text-gray-205'
              }`}
            >
              <UserCheck className="w-5 h-5" />
              <span className="text-center">Ser Administrador</span>
            </button>
          </div>

          {/* Form area */}
          <div className="bg-zinc-900/60 border border-white/5 rounded-3xl p-6 sm:p-8 text-left relative overflow-hidden">
            
            {/* Status Messages */}
            {submitStatus && (
              <div className={`p-4 rounded-2xl mb-6 flex items-start gap-3 border ${
                submitStatus.success 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                  : 'bg-red-500/10 text-red-400 border-red-500/30'
              }`}>
                {submitStatus.success ? <Check className="w-5 h-5 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                <span className="font-sans text-xs leading-relaxed">{submitStatus.message}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              
              {activeTab === 'panel' && (
                <div className="space-y-4">
                  <div className="border-b border-white/5 pb-2">
                    <h3 className="font-sans font-black text-base uppercase text-purple-300">
                      🎥 Inscrição para Destaque no Painel de Vídeos
                    </h3>
                    <p className="text-[11px] text-gray-400 font-sans leading-normal">
                      Quer ver sua transmissão ou vídeo em destaque na nossa Central de Vídeos? Envie os dados abaixo!
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">Nome do Criador *</label>
                      <input
                        type="text"
                        required
                        value={panelCreator}
                        onChange={(e) => setPanelCreator(e.target.value)}
                        placeholder="Ex: JogadorEstrela_PKXD"
                        className="w-full bg-black/40 border border-zinc-800 focus:border-purple-500 rounded-xl p-3 text-xs text-white placeholder-gray-500 outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">Link do Vídeo / Live (YouTube) *</label>
                      <input
                        type="url"
                        required
                        value={panelUrl}
                        onChange={(e) => setPanelUrl(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="w-full bg-black/40 border border-zinc-800 focus:border-purple-500 rounded-xl p-3 text-xs text-white placeholder-gray-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">Descrição do Conteúdo *</label>
                    <textarea
                      required
                      rows={3}
                      value={panelDescription}
                      onChange={(e) => setPanelDescription(e.target.value)}
                      placeholder="Conte um pouco sobre o vídeo ou do que trata a sua live de códigos de PK XD..."
                      className="w-full bg-black/40 border border-zinc-800 focus:border-purple-500 rounded-xl p-3 text-xs text-white placeholder-gray-500 outline-none transition-all resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">Rede Social / Instagram (Opcional)</label>
                    <input
                      type="text"
                      value={panelSocial}
                      onChange={(e) => setPanelSocial(e.target.value)}
                      placeholder="@instagram_do_criador"
                      className="w-full bg-black/40 border border-zinc-800 focus:border-purple-500 rounded-xl p-3 text-xs text-white placeholder-gray-500 outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'shorts' && (
                <div className="space-y-4">
                  <div className="border-b border-white/5 pb-2">
                    <h3 className="font-sans font-black text-base uppercase text-cyan-300">
                      📱 Inscrição para Destaque de Shorts
                    </h3>
                    <p className="text-[11px] text-gray-400 font-sans leading-normal">
                      Destaque os seus melhores e mais engraçados curtas (Shorts) de PK XD no nosso feed rotativo!
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">Canal do YouTube *</label>
                      <input
                        type="text"
                        required
                        value={shortsCreator}
                        onChange={(e) => setShortsCreator(e.target.value)}
                        placeholder="Nome do seu Canal de Shorts"
                        className="w-full bg-black/40 border border-zinc-800 focus:border-cyan-500 rounded-xl p-3 text-xs text-white placeholder-gray-500 outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">URL do Short (YouTube ou TikTok) *</label>
                      <input
                        type="url"
                        required
                        value={shortsUrl}
                        onChange={(e) => setShortsUrl(e.target.value)}
                        placeholder="https://www.youtube.com/shorts/..."
                        className="w-full bg-black/40 border border-zinc-800 focus:border-cyan-500 rounded-xl p-3 text-xs text-white placeholder-gray-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">Frase de Efeito ou Título do Short *</label>
                    <input
                      type="text"
                      required
                      value={shortsTitle}
                      onChange={(e) => setShortsTitle(e.target.value)}
                      placeholder="Ex: MINHA NOVA ARMADURA DO PK XD SURPRESA! 🤖"
                      className="w-full bg-black/40 border border-zinc-800 focus:border-cyan-500 rounded-xl p-3 text-xs text-white placeholder-gray-500 outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'theory' && (
                <div className="space-y-4">
                  <div className="border-b border-white/5 pb-2">
                    <h3 className="font-sans font-black text-base uppercase text-pink-300">
                      🔮 Enviar Nova Teoria ao Mural do Site
                    </h3>
                    <p className="text-[11px] text-gray-400 font-sans leading-normal">
                      Compartilhe suas ideias mais insanas e detalhadas sobre as próximas atualizações, mistérios e segredos do Admin!
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">Nome de Autor / Nickname *</label>
                      <input
                        type="text"
                        required
                        value={theoryAuthor}
                        onChange={(e) => setTheoryAuthor(e.target.value)}
                        placeholder="Seu nome de fã"
                        className="w-full bg-black/40 border border-zinc-800 focus:border-pink-550 rounded-xl p-3 text-xs text-white placeholder-gray-500 outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">Título da Teoria *</label>
                      <input
                        type="text"
                        required
                        value={theoryTitle}
                        onChange={(e) => setTheoryTitle(e.target.value)}
                        placeholder="Ex: O Retorno Secreto da Nave Alienígena!"
                        className="w-full bg-black/40 border border-zinc-800 focus:border-pink-550 rounded-xl p-3 text-xs text-white placeholder-gray-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">Sua Teoria Completa *</label>
                    <textarea
                      required
                      rows={5}
                      value={theoryContent}
                      onChange={(e) => setTheoryContent(e.target.value)}
                      placeholder="Descreva em detalhes a sua teoria aqui..."
                      className="w-full bg-black/40 border border-zinc-800 focus:border-pink-550 rounded-xl p-3 text-xs text-white placeholder-gray-500 outline-none transition-all resize-none"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'admin' && (
                <div className="space-y-4">
                  <div className="border-b border-white/5 pb-2">
                    <h3 className="font-sans font-black text-base uppercase text-yellow-300">
                      🔐 Candidatura para Administrador (ADM)
                    </h3>
                    <p className="text-[11px] text-gray-400 font-sans leading-normal">
                      Faça parte do time PKXD Central! Ajude a registrar spoilers, organizar publicações e moderar nossa vibrante comunidade de fã-clube!
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1 col-span-1 md:col-span-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">Nome Completo / Nickname *</label>
                      <input
                        type="text"
                        required
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        placeholder="Seu nome"
                        className="w-full bg-black/40 border border-zinc-800 focus:border-yellow-500 rounded-xl p-3 text-xs text-white placeholder-gray-500 outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-1 col-span-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">Sua Idade *</label>
                      <input
                        type="number"
                        required
                        value={adminAge}
                        onChange={(e) => setAdminAge(e.target.value)}
                        placeholder="Ex: 14"
                        className="w-full bg-black/40 border border-zinc-800 focus:border-yellow-500 rounded-xl p-3 text-xs text-white placeholder-gray-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">Contato (Discord, WhatsApp, E-mail) *</label>
                      <input
                        type="text"
                        required
                        value={adminContact}
                        onChange={(e) => setAdminContact(e.target.value)}
                        placeholder="Seu ID do Discord ou número do WhatsApp"
                        className="w-full bg-black/40 border border-zinc-800 focus:border-yellow-500 rounded-xl p-3 text-xs text-white placeholder-gray-500 outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">Horas Disponíveis por Semana *</label>
                      <input
                        type="text"
                        required
                        value={adminHours}
                        onChange={(e) => setAdminHours(e.target.value)}
                        placeholder="Ex: 5 horas, 10 horas por semana..."
                        className="w-full bg-black/40 border border-zinc-800 focus:border-yellow-500 rounded-xl p-3 text-xs text-white placeholder-gray-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">Por que você quer ser Admin do PKXD Central? *</label>
                    <textarea
                      required
                      rows={4}
                      value={adminReason}
                      onChange={(e) => setAdminReason(e.target.value)}
                      placeholder="Escreva seus motivos, se você tem experiência prévia moderando outros grupos ou sites, e o que pode acrescentar ao nosso portal..."
                      className="w-full bg-black/40 border border-zinc-800 focus:border-yellow-500 rounded-xl p-3 text-xs text-white placeholder-gray-500 outline-none transition-all resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Action button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3 px-6 rounded-2xl font-sans font-black text-xs uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-2 border shadow-lg cursor-pointer ${
                  isSubmitting 
                    ? 'bg-zinc-800 text-zinc-500 border-zinc-850 cursor-not-allowed'
                    : activeTab === 'panel'
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-550 border-purple-400/40 text-white'
                    : activeTab === 'shorts'
                    ? 'bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-400 hover:to-teal-550 border-cyan-400/40 text-black font-black'
                    : activeTab === 'theory'
                    ? 'bg-gradient-to-r from-pink-500 to-purple-650 hover:from-pink-400 hover:to-purple-550 border-pink-400/40 text-white'
                    : 'bg-gradient-to-r from-yellow-450 to-amber-500 hover:from-yellow-400 hover:to-amber-450 border-yellow-400/40 text-black font-black'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Enviando Dados...' : 'Enviar Inscrição Oficial 🚀'}</span>
              </button>

            </form>

          </div>
        </>
      )}

    </div>
  );
}
