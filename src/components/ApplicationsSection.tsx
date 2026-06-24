import React, { useState } from 'react';
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
  ArrowLeft
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { playTapSound, playSuccessSound, playLevelUpSound } from '../utils/audio';

interface ApplicationsSectionProps {
  onBackToHub: () => void;
  onAddXP: (amount: number, reason: string) => void;
  soundEnabled: boolean;
  user: any;
}

export default function ApplicationsSection({ 
  onBackToHub, 
  onAddXP, 
  soundEnabled,
  user
}: ApplicationsSectionProps) {
  const [activeTab, setActiveTab] = useState<'panel' | 'shorts' | 'theory' | 'admin'>('panel');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ success: boolean; message: string } | null>(null);

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
      submittedByEmail: user?.email || 'convidado@pkxdhub.com',
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

      await setDoc(doc(db, collectionName, id), payload);
      
      triggerAudio('levelUp');
      setSubmitStatus({
        success: true,
        message: 'Inscrição enviada com sucesso! Ela foi guardada na nuvem do PKXD Hub e nossa equipe vai analisar em breve! 🌟'
      });
      
      // Award XP
      const xpReward = 150;
      onAddXP(xpReward, `Inscrição: ${activeTab === 'panel' ? 'Destaque de Vídeo' : activeTab === 'shorts' ? 'Destaque de Shorts' : activeTab === 'theory' ? 'Envio de Teoria' : 'Candidatura ADM'}! 📝`);

      resetForms();
    } catch (err: any) {
      console.error(err);
      setSubmitStatus({
        success: false,
        message: err.message || 'Erro ao processar inscrição. Verifique as informações e tente novamente.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 py-8 relative" id="applications-area-wrapper">
      
      {/* Upper navigation row */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            triggerAudio('tap');
            onBackToHub();
          }}
          className="px-4 py-2.5 bg-zinc-900/85 hover:bg-purple-950 text-purple-300 hover:text-white rounded-xl border border-purple-500/30 transition-all duration-150 cursor-pointer flex items-center gap-2 text-xs font-black uppercase tracking-wider shadow-md"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Hub Principal</span>
        </button>

        <div className="flex items-center gap-1.5 bg-purple-900/40 p-1.5 px-3 rounded-full border border-purple-500/20">
          <Trophy className="w-3.5 h-3.5 text-yellow-300" />
          <span className="text-[10px] text-gray-300 font-bold uppercase tracking-wider">Inscrição = <strong className="text-yellow-300">+150 XP</strong></span>
        </div>
      </div>

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
              : 'bg-zinc-900/70 text-gray-400 border-white/5 hover:border-purple-500/30 hover:text-gray-200'
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
              : 'bg-zinc-900/70 text-gray-400 border-white/5 hover:border-cyan-500/30 hover:text-gray-200'
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
              : 'bg-zinc-900/70 text-gray-400 border-white/5 hover:border-pink-500/30 hover:text-gray-200'
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
              : 'bg-zinc-900/70 text-gray-400 border-white/5 hover:border-yellow-500/30 hover:text-gray-200'
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
                  Faça parte do time PKXD Hub! Ajude a registrar spoilers, organizar publicações e moderar nossa vibrante comunidade de fã-clube!
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
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">Por que você quer ser Admin do PKXD Hub? *</label>
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

    </div>
  );
}
