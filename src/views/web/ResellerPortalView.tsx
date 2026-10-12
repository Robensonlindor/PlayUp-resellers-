import React, { useState, useEffect } from 'react';
import {
  Key,
  Wallet,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Copy,
  Plus,
  Trash2,
  RefreshCw,
  Send,
  ShieldCheck,
  Globe,
  Terminal,
  ArrowRight,
  DollarSign,
  Bell,
  MessageCircle,
  Lock,
  Eye,
  EyeOff,
  Building2,
  Phone,
  User,
  Mail,
  FileText,
  XCircle,
  QrCode,
  ShoppingBag,
  Sparkles
} from 'lucide-react';
import {
  Reseller,
  ApiKey,
  Order,
  Transaction,
  WebhookLog,
  Service,
  Game,
  ResellerUsdtTopupRecord,
  ResellerWalletLedgerEntry
} from '../../types';
import { apiClient } from '../../services/apiClient';
import { safeStorage } from '../../lib/safeStorage';
import { Language } from '../../i18n';

interface ResellerPortalViewProps {
  onNavigate: (tab: string) => void;
  lang: Language;
}

const AVAILABLE_PERMISSIONS = [
  { id: 'games.read', label: 'Lecture Jeux (games.read)' },
  { id: 'services.read', label: 'Lecture Catalogue & Prix (services.read)' },
  { id: 'orders.create', label: 'Création Commandes Top-Up (orders.create)' },
  { id: 'orders.read', label: 'Suivi Statut Commandes (orders.read)' },
  { id: 'balance.read', label: 'Consultation Solde B2B (balance.read)' },
  { id: 'webhooks.manage', label: 'Gestion Webhooks (webhooks.manage)' }
];

export const ResellerPortalView: React.FC<ResellerPortalViewProps> = ({ onNavigate }) => {
  const [session, setSession] = useState<{
    reseller: Reseller;
    resellerToken?: string;
    apiKey?: ApiKey;
  } | null>(null);

  // Login states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPasswordOrKey, setLoginPasswordOrKey] = useState('');
  const [loginMethod, setLoginMethod] = useState<'password' | 'apikey'>('password');

  // Registration states
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerTelegram, setRegisterTelegram] = useState('');
  const [registerCompany, setRegisterCompany] = useState('');
  const [registerCountry, setRegisterCountry] = useState('Haïti - Port-au-Prince');
  const [registerBusinessType, setRegisterBusinessType] = useState('Boutique Gaming / Revendeur local');
  const [registerVolume, setRegisterVolume] = useState('500 - 2 000 USD / mois');
  const [registerWebsite, setRegisterWebsite] = useState('');
  const [registerMessage, setRegisterMessage] = useState('');

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Dashboard active sub-tab
  const [activeTab, setActiveTab] = useState<
    'overview' | 'wallet' | 'shop' | 'api-keys' | 'orders' | 'transactions' | 'webhook'
  >('overview');

  // Dashboard data
  const [dashboardData, setDashboardData] = useState<{
    reseller: Reseller;
    stats: any;
    wallet?: {
      resellerId: string;
      balanceUsd: number;
      currency: 'USD';
      totalRechargedUsd: number;
      totalCommissionsPaidUsd: number;
      totalSpentUsd: number;
      totalProfitUsd: number;
      ordersCount: number;
      usdtConfig: {
        receivingAddress: string;
        network: 'TRC20' | 'ERC20' | 'BEP20' | 'POLYGON';
        qrCodeUrl: string;
        commissionPercent: number;
      };
      topups: ResellerUsdtTopupRecord[];
      ledger: ResellerWalletLedgerEntry[];
    };
    apiKeys: ApiKey[];
    recentOrders: Order[];
    transactions: Transaction[];
    webhookLogs: WebhookLog[];
    validationContacts?: {
      whatsapp: string;
      telegram: string;
    };
  } | null>(null);

  const [validationContacts, setValidationContacts] = useState<{
    whatsapp: string;
    telegram: string;
  }>({
    whatsapp: '+1 (509) 4412-8899',
    telegram: 'playup_support'
  });

  // UI states for "Générer ma clé API" & Validation buttons
  const [showValidationChannelsPrompt, setShowValidationChannelsPrompt] = useState(false);
  const [validationFeedback, setValidationFeedback] = useState<string | null>(null);
  const [showReapplyForm, setShowReapplyForm] = useState(false);
  const [reapplyLoading, setReapplyLoading] = useState(false);

  // API key creation states (when approved)
  const [loading, setLoading] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyIsTest, setNewKeyIsTest] = useState(false);
  const [selectedKeyPermissions, setSelectedKeyPermissions] = useState<string[]>([
    'games.read',
    'services.read',
    'orders.create',
    'orders.read',
    'balance.read'
  ]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
  const [newlyGeneratedKey, setNewlyGeneratedKey] = useState<ApiKey | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);

  const [webhookInputUrl, setWebhookInputUrl] = useState('');
  const [webhookMsg, setWebhookMsg] = useState<string | null>(null);

  // USDT Recharge states (Real Blockchain Verification + 4% PlayUp Commission)
  const [usdtAmountInput, setUsdtAmountInput] = useState('100');
  const [usdtTxidInput, setUsdtTxidInput] = useState('');
  const [usdtSubmitting, setUsdtSubmitting] = useState(false);
  const [usdtFeedback, setUsdtFeedback] = useState<{
    type: 'success' | 'error' | 'pending';
    message: string;
  } | null>(null);

  // Reseller Service Catalog & Ordering states
  const [catalogGames, setCatalogGames] = useState<Game[]>([]);
  const [catalogServices, setCatalogServices] = useState<Service[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>('');
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [orderPlayerId, setOrderPlayerId] = useState('');
  const [orderServerId, setOrderServerId] = useState('');
  const [orderPlayerName, setOrderPlayerName] = useState('');
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderFeedback, setOrderFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Load public validation contacts (WhatsApp & Telegram configured by admin)
  useEffect(() => {
      apiClient
        .getResellerValidationContacts()
        .then((res) => {
          setValidationContacts({
            whatsapp: res.contactWhatsApp || '+1 (509) 4412-8899',
            telegram: res.contactTelegram || 'playup_support'
          });
        })
        .catch(() => {});

      // Load active games & services for Reseller Service Ordering
      Promise.all([apiClient.getGames(), apiClient.getServices()])
        .then(([games, services]) => {
          const activeGames = games.filter((g) => g.isActive);
          const activeServices = services.filter((s) => s.isActive);
          setCatalogGames(activeGames);
          setCatalogServices(activeServices);
          if (activeGames.length > 0) {
            setSelectedGameId(activeGames[0].id);
            const firstSrv = activeServices.find((s) => s.gameId === activeGames[0].id);
            const firstPkg = firstSrv?.packages.find((p) => p.isActive);
            if (firstPkg) setSelectedPackageId(firstPkg.id);
          }
        })
        .catch(() => {});
    }, []);

  // Check existing session in safeStorage
  useEffect(() => {
    const saved = safeStorage.getItem('playup_reseller_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const tokenToUse = parsed?.resellerToken || parsed?.apiKey?.key;
        if (tokenToUse) {
          setSession(parsed);
          loadDashboard(tokenToUse);
        } else {
          safeStorage.removeItem('playup_reseller_session');
        }
      } catch {
        safeStorage.removeItem('playup_reseller_session');
      }
    }
  }, []);

  // Automatic real-time wallet & dashboard polling every 15 seconds when logged in
  useEffect(() => {
    const token = session?.resellerToken || session?.apiKey?.key;
    if (!token) return;
    const interval = setInterval(() => {
      loadDashboard(token, true);
    }, 15000);
    return () => clearInterval(interval);
  }, [session?.resellerToken, session?.apiKey?.key]);

  const getAuthTokenOrKey = () =>
    session?.resellerToken || session?.apiKey?.key || dashboardData?.apiKeys?.[0]?.key || '';

  const loadDashboard = async (tokenOrKey: string, silent = false) => {
    if (!tokenOrKey) return;
    if (!silent) setLoading(true);
    try {
      const data = await apiClient.getResellerMe(tokenOrKey);
      setDashboardData(data);
      if (!silent) setWebhookInputUrl(data.reseller.webhookUrl || '');
      if (data.validationContacts) {
        setValidationContacts({
          whatsapp: data.validationContacts.whatsapp || validationContacts.whatsapp,
          telegram: data.validationContacts.telegram || validationContacts.telegram
        });
      }
      // Keep session reseller status synced
      setSession((prev) =>
        prev
          ? {
              ...prev,
              reseller: data.reseller
            }
          : { reseller: data.reseller, resellerToken: tokenOrKey }
      );
    } catch {
      if (!silent) {
        safeStorage.removeItem('playup_reseller_session');
        setSession(null);
        setDashboardData(null);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      const res = await apiClient.resellerLogin(
        loginEmail,
        loginPasswordOrKey,
        loginMethod === 'apikey'
      );
      setSession(res);
      safeStorage.setItem('playup_reseller_session', JSON.stringify(res));
      await loadDashboard(res.resellerToken || res.apiKey?.key || '');
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      const res = await apiClient.resellerRegister({
        name: registerName,
        email: registerEmail,
        password: registerPassword,
        phone: registerPhone,
        telegramUsername: registerTelegram || undefined,
        company: registerCompany,
        country: registerCountry,
        businessType: registerBusinessType,
        estimatedMonthlyVolume: registerVolume,
        websiteOrSocialUrl: registerWebsite || undefined,
        message: registerMessage || undefined
      });
      setSession(res);
      safeStorage.setItem('playup_reseller_session', JSON.stringify(res));
      setShowValidationChannelsPrompt(false);
      await loadDashboard(res.resellerToken);
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = () => {
    safeStorage.removeItem('playup_reseller_session');
    setSession(null);
    setDashboardData(null);
    setShowValidationChannelsPrompt(false);
    setNewlyGeneratedKey(null);
  };

  const currentReseller = dashboardData?.reseller || session?.reseller;
  const isApproved = currentReseller?.status === 'active';

  // Build pre-filled validation request message containing Reseller ID and profile info
  const buildValidationMessage = (res: Reseller) => {
    return (
      `Bonjour Administrateur PlayUp,\n\n` +
      `Je souhaite demander la validation de mon profil revendeur PlayUp Reseller afin d'activer l'accès à mes clés API.\n\n` +
      `• Identifiant Revendeur : ${res.id}\n` +
      `• Nom complet : ${res.name}\n` +
      `• Entreprise / Boutique : ${res.company}\n` +
      `• Email : ${res.email}\n` +
      `• Téléphone : ${res.phone || 'Non renseigné'}\n` +
      `• Pays / Ville : ${res.country || 'Haïti'}\n` +
      `• Activité : ${res.businessType || 'Revendeur Gaming'}\n\n` +
      `Merci de bien vouloir valider mon compte revendeur.`
    );
  };

  const buildWhatsAppUrl = (res: Reseller) => {
    const rawPhone = validationContacts.whatsapp || '+150944128899';
    const cleanDigits = rawPhone.replace(/[^0-9]/g, '');
    const msg = buildValidationMessage(res);
    return `https://wa.me/${cleanDigits}?text=${encodeURIComponent(msg)}`;
  };

  const buildTelegramUrl = (res: Reseller) => {
    const rawTg = validationContacts.telegram || 'playup_support';
    const cleanUsername = rawTg
      .replace(/^https?:\/\/(www\.)?t\.me\//i, '')
      .replace(/^@/, '')
      .split('?')[0]
      .trim();
    const msg = buildValidationMessage(res);
    return `https://t.me/${cleanUsername}?text=${encodeURIComponent(msg)}`;
  };

  const handleRecordValidationChannelClick = async (channel: 'whatsapp' | 'telegram') => {
    const token = getAuthTokenOrKey();
    if (!token || !currentReseller) return;
    try {
      const updated = await apiClient.requestResellerValidation(token, channel);
      if (updated.validationContacts) {
        setValidationContacts({
          whatsapp: updated.validationContacts.whatsapp || validationContacts.whatsapp,
          telegram: updated.validationContacts.telegram || validationContacts.telegram
        });
      }
      setValidationFeedback(
        `Votre demande de validation (ID: ${currentReseller.id}) a été préparée pour ${
          channel === 'whatsapp' ? 'WhatsApp' : 'Telegram'
        }. Envoyez le message prérempli à l’administrateur.`
      );
      await loadDashboard(token);
    } catch {
      // Non-blocking
    }
  };

  // Handler for "Générer ma clé API" button
  const handleGenerateMyApiKeyClick = async () => {
    setKeyError(null);
    if (!currentReseller) return;

    // Requirement 2: When the reseller clicks "Générer ma clé API", if approval is not granted yet,
    // API keys must not be accessible and we display the two buttons: WhatsApp & Telegram
    if (currentReseller.status !== 'active') {
      setShowValidationChannelsPrompt(true);
      return;
    }

    // If approved ('active'), generate a real unique API key on the backend
    const token = getAuthTokenOrKey();
    if (!token) return;
    try {
      const created = await apiClient.createApiKey(
        token,
        newKeyName.trim() || `Clé API ${currentReseller.company}`,
        newKeyIsTest,
        selectedKeyPermissions
      );
      setNewKeyName('');
      setNewlyGeneratedKey(created);
      setRevealedKeys((prev) => ({ ...prev, [created.id]: true }));
      await loadDashboard(token);
      setActiveTab('api-keys');
    } catch (err: any) {
      setKeyError(err.message);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    const token = getAuthTokenOrKey();
    if (!token) return;
    try {
      await apiClient.revokeApiKey(token, keyId);
      await loadDashboard(token);
    } catch (err: any) {
      setKeyError(err.message);
    }
  };

  const handleReapplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAuthTokenOrKey();
    if (!token || !currentReseller) return;
    setReapplyLoading(true);
    setKeyError(null);
    try {
      const res = await apiClient.reapplyResellerValidation(token, {
        name: registerName || currentReseller.name,
        phone: registerPhone || currentReseller.phone,
        telegramUsername: registerTelegram || currentReseller.telegramUsername,
        company: registerCompany || currentReseller.company,
        country: registerCountry || currentReseller.country,
        businessType: registerBusinessType || currentReseller.businessType,
        estimatedMonthlyVolume: registerVolume || currentReseller.estimatedMonthlyVolume,
        websiteOrSocialUrl: registerWebsite || currentReseller.websiteOrSocialUrl,
        message: registerMessage || currentReseller.message
      });
      setValidationFeedback(res.message);
      setShowReapplyForm(false);
      await loadDashboard(token);
    } catch (err: any) {
      setKeyError(err.message);
    } finally {
      setReapplyLoading(false);
    }
  };

  const handleSaveWebhook = async () => {
    const token = getAuthTokenOrKey();
    if (!token) return;
    try {
      await apiClient.updateWebhook(token, webhookInputUrl);
      setWebhookMsg('URL de Webhook enregistrée avec succès.');
      setTimeout(() => setWebhookMsg(null), 3000);
      await loadDashboard(token);
    } catch (err: any) {
      setWebhookMsg(err.message || 'Erreur lors de la mise à jour');
    }
  };

  const handleTestWebhookPing = async () => {
    const token = getAuthTokenOrKey();
    if (!token) return;
    try {
      await apiClient.testWebhookPing(token);
      setWebhookMsg('Événement de test expédié au webhook.');
      setTimeout(() => setWebhookMsg(null), 4000);
      await loadDashboard(token);
    } catch (err: any) {
      setWebhookMsg(err.message);
    }
  };

  const handleUsdtTopupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsdtFeedback(null);
    const token = getAuthTokenOrKey();
    if (!token || !isApproved) return;

    const parsedAmount = Number(usdtAmountInput);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setUsdtFeedback({
        type: 'error',
        message: 'Veuillez saisir un montant USDT valide supérieur à 0.'
      });
      return;
    }

    const cleanTxid = usdtTxidInput.trim();
    if (!cleanTxid || cleanTxid.length < 16) {
      setUsdtFeedback({
        type: 'error',
        message: 'Veuillez fournir un TXID (Hash de transaction blockchain) valide.'
      });
      return;
    }

    setUsdtSubmitting(true);
    try {
      const res = await apiClient.submitResellerUsdtTopup(token, {
        amountSentUsdt: parsedAmount,
        txid: cleanTxid,
        network: dashboardData?.wallet?.usdtConfig?.network || 'TRC20',
        idempotencyKey: `topup_${currentReseller?.id}_${cleanTxid.toLowerCase()}`
      });

      setUsdtFeedback({
        type: res.status === 'pending' ? 'pending' : 'success',
        message:
          res.message ||
          `Recharge USDT vérifiée ! Crédit net ajouté à votre wallet : +$${res.topup?.netCreditedUsd.toFixed(2)} USD.`
      });
      setUsdtTxidInput('');
      await loadDashboard(token);
    } catch (err: any) {
      setUsdtFeedback({
        type: 'error',
        message: err.message || 'La vérification blockchain de la transaction USDT a échoué.'
      });
      await loadDashboard(token, true);
    } finally {
      setUsdtSubmitting(false);
    }
  };

  const handleResellerOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderFeedback(null);
    const token = getAuthTokenOrKey();
    if (!token || !isApproved || !currentReseller) return;

    if (!selectedPackageId) {
      setOrderFeedback({
        type: 'error',
        message: 'Veuillez sélectionner un pack à commander.'
      });
      return;
    }

    if (!orderPlayerId.trim()) {
      setOrderFeedback({
        type: 'error',
        message: 'Veuillez saisir le Player ID / UID du joueur.'
      });
      return;
    }

    const activeService = catalogServices.find((s) =>
      s.packages.some((p) => p.id === selectedPackageId)
    );
    const activePkg = activeService?.packages.find((p) => p.id === selectedPackageId);

    if (activePkg && (currentReseller.balance || 0) < activePkg.resellerPrice) {
      setOrderFeedback({
        type: 'error',
        message: 'Solde insuffisant — veuillez recharger votre wallet'
      });
      return;
    }

    setOrderSubmitting(true);
    try {
      const idempotencyKey = `res_ord_${currentReseller.id}_${selectedPackageId}_${orderPlayerId.trim()}_${Math.floor(
        Date.now() / 10000
      )}`;
      const res = await apiClient.createResellerServiceOrder(token, {
        gameId: selectedGameId || activeService?.gameId,
        serviceId: activeService?.id,
        packageId: selectedPackageId,
        productKey: activePkg?.externalProductId || undefined,
        playerId: orderPlayerId.trim(),
        serverId: orderServerId.trim() || undefined,
        playerName: orderPlayerName.trim() || undefined,
        idempotencyKey
      });

      const orderNum =
        (res.order as any)?.orderNumber ||
        (res.order as any)?.buyer_ref ||
        (res.order as any)?.id ||
        'OK';
      setOrderFeedback({
        type: 'success',
        message: `Commande ${orderNum} transmise avec succès ! Solde restant : $${Number(
          res.remainingBalance ?? 0
        ).toFixed(2)} USD · Bénéfice revendeur : +$${Number(res.resellerProfitUsd ?? 0).toFixed(2)} USD.`
      });
      setOrderPlayerId('');
      setOrderServerId('');
      setOrderPlayerName('');
      await loadDashboard(token);
    } catch (err: any) {
      setOrderFeedback({
        type: 'error',
        message: err.message || 'Solde insuffisant — veuillez recharger votre wallet'
      });
      await loadDashboard(token, true);
    } finally {
      setOrderSubmitting(false);
    }
  };

  const copyKey = (val: string, id: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const togglePermissionSelection = (permId: string) => {
    setSelectedKeyPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  // ============================================================================
  // IF NOT LOGGED IN: SHOW REGISTRATION / LOGIN FORM
  // ============================================================================
  if (!session || !currentReseller) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-lg space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-orange-600 text-white font-black text-2xl flex items-center justify-center mx-auto">
              P
            </div>
            <h2 className="font-display text-2xl font-bold text-slate-900">
              Programme Revendeur &amp; API PlayUp
            </h2>
            <p className="text-xs text-slate-500">
              Inscrivez-vous comme revendeur officiel PlayUp ou connectez-vous pour gérer vos clés API et vos commandes B2B.
            </p>
          </div>

          {/* Toggle Login / Register */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setAuthError(null);
              }}
              className={`flex-1 py-2.5 rounded-lg transition-colors ${
                authMode === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              Connexion Revendeur
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setAuthError(null);
              }}
              className={`flex-1 py-2.5 rounded-lg transition-colors ${
                authMode === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              Devenir Revendeur (Inscription)
            </button>
          </div>

          {authError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{authError}</span>
            </div>
          )}

          {authMode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4 text-xs">
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-slate-500 font-medium">Mode d’authentification :</span>
                <button
                  type="button"
                  onClick={() => setLoginMethod('password')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    loginMethod === 'password'
                      ? 'bg-orange-50 text-orange-700 border border-orange-200'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  Mot de passe
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMethod('apikey')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    loginMethod === 'apikey'
                      ? 'bg-orange-50 text-orange-700 border border-orange-200'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  Clé API Active
                </button>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Email revendeur</label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="contact@entreprise.com"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  {loginMethod === 'password' ? 'Mot de passe revendeur' : 'Clé API Active (X-API-KEY)'}
                </label>
                <input
                  type="password"
                  required
                  value={loginPasswordOrKey}
                  onChange={(e) => setLoginPasswordOrKey(e.target.value)}
                  placeholder={loginMethod === 'password' ? 'Votre mot de passe' : 'plup_live_...'}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={authSubmitting}
                  className="w-full py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-60 text-white font-semibold rounded-xl text-xs shadow-md transition-colors"
                >
                  {authSubmitting ? 'Connexion en cours...' : 'Accéder à mon Espace Revendeur'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4 text-xs">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900">
                Remplissez toutes les informations ci-dessous. Votre compte sera créé avec le statut{' '}
                <strong>« En attente de validation »</strong> jusqu’à l’approbation par l’administrateur PlayUp.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nom complet *</label>
                  <input
                    type="text"
                    required
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    placeholder="Jean-Baptiste Pierre"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Entreprise / Boutique *</label>
                  <input
                    type="text"
                    required
                    value={registerCompany}
                    onChange={(e) => setRegisterCompany(e.target.value)}
                    placeholder="ex: Kreyol Gaming Store"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Email professionnel *</label>
                  <input
                    type="email"
                    required
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="contact@maboutique.com"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Mot de passe du compte *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder="Minimum 6 caractères"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Téléphone / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    value={registerPhone}
                    onChange={(e) => setRegisterPhone(e.target.value)}
                    placeholder="+509 3700-0000"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nom d’utilisateur Telegram</label>
                  <input
                    type="text"
                    value={registerTelegram}
                    onChange={(e) => setRegisterTelegram(e.target.value)}
                    placeholder="@votre_telegram"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Pays / Ville *</label>
                  <input
                    type="text"
                    required
                    value={registerCountry}
                    onChange={(e) => setRegisterCountry(e.target.value)}
                    placeholder="Haïti - Port-au-Prince"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Type d’activité *</label>
                  <select
                    value={registerBusinessType}
                    onChange={(e) => setRegisterBusinessType(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="Boutique Gaming / Revendeur local">Boutique Gaming / Revendeur local</option>
                    <option value="Bot Automatisé (WhatsApp / Telegram / Discord)">Bot Automatisé (WhatsApp / Telegram / Discord)</option>
                    <option value="Site E-commerce">Site E-commerce</option>
                    <option value="Cybercafé / Point de vente physique">Cybercafé / Point de vente physique</option>
                    <option value="Créateur / Communauté Gaming">Créateur / Communauté Gaming</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Volume mensuel estimé</label>
                  <select
                    value={registerVolume}
                    onChange={(e) => setRegisterVolume(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="< 500 USD / mois">&lt; 500 USD / mois</option>
                    <option value="500 - 2 000 USD / mois">500 - 2 000 USD / mois</option>
                    <option value="2 000 - 10 000 USD / mois">2 000 - 10 000 USD / mois</option>
                    <option value="> 10 000 USD / mois">&gt; 10 000 USD / mois</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Site Web ou Réseau Social</label>
                  <input
                    type="text"
                    value={registerWebsite}
                    onChange={(e) => setRegisterWebsite(e.target.value)}
                    placeholder="https://... ou @page_boutique"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Présentation / Détails de votre demande</label>
                <textarea
                  rows={2}
                  value={registerMessage}
                  onChange={(e) => setRegisterMessage(e.target.value)}
                  placeholder="Décrivez brièvement comment vous souhaitez distribuer les recharges PlayUp..."
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={authSubmitting}
                  className="w-full py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-60 text-white font-semibold rounded-xl text-xs shadow-md transition-colors"
                >
                  {authSubmitting ? 'Enregistrement en cours...' : 'Soumettre mon inscription revendeur'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // IF LOGGED IN: SHOW RESELLER PORTAL & VALIDATION / API KEYS WORKFLOW
  // ============================================================================
  const res = currentReseller;
  const stats = dashboardData?.stats;

  const statusLabel =
    res.status === 'active'
      ? 'Approuvé (Validé)'
      : res.status === 'pending'
      ? 'En attente de validation'
      : res.status === 'rejected'
      ? 'Demande refusée'
      : 'Suspendu';

  const statusTextColor =
    res.status === 'active'
      ? 'text-emerald-700'
      : res.status === 'pending'
      ? 'text-amber-700'
      : 'text-red-700';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>Portail Revendeur</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono font-bold text-slate-800">{res.id}</span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-orange-600">{res.company}</span>
            <span aria-hidden="true">·</span>
            <span className={`font-bold ${statusTextColor}`}>{statusLabel}</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Dashboard Partenaire &amp; Clés API
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleGenerateMyApiKeyClick}
            className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
          >
            <Key className="w-4 h-4" />
            <span>Générer ma clé API</span>
          </button>

          <button
            type="button"
            onClick={() => loadDashboard(getAuthTokenOrKey())}
            className="px-3 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Actualiser le statut"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-600' : ''}`} />
            <span>Actualiser</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('api-docs')}
            className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Terminal className="w-3.5 h-3.5 text-orange-600" />
            <span>Documentation API</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-red-600 transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* VALIDATION STATUS BANNER & WHATSAPP / TELEGRAM VALIDATION BUTTONS    */}
      {/* ==================================================================== */}
      {res.status !== 'active' && (
        <div
          className={`rounded-2xl p-6 border space-y-5 ${
            res.status === 'pending'
              ? 'bg-amber-50/90 border-amber-200'
              : 'bg-red-50/90 border-red-200'
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {res.status === 'pending' ? (
                  <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                )}
                <h2 className="font-display text-lg font-bold text-slate-900">
                  {res.status === 'pending'
                    ? 'Statut du compte : En attente de validation'
                    : res.status === 'rejected'
                    ? 'Statut du compte : Demande refusée par l’administrateur'
                    : 'Statut du compte : Compte suspendu'}
                </h2>
              </div>

              <p className="text-xs text-slate-700 max-w-3xl leading-relaxed">
                {res.status === 'pending' ? (
                  <>
                    Votre profil revendeur (Identifiant : <strong className="font-mono">{res.id}</strong>) est enregistré dans la base de données PlayUp.{' '}
                    <strong>Tant que l’approbation de l’administrateur n’est pas accordée, les clés API ne sont pas accessibles.</strong>{' '}
                    Cliquez sur <strong>« Générer ma clé API »</strong> pour demander la validation directe de votre profil sur WhatsApp ou Telegram.
                  </>
                ) : res.status === 'rejected' ? (
                  <>
                    Votre demande de validation revendeur (ID : <strong className="font-mono">{res.id}</strong>) a été refusée.
                    {res.rejectionReason && (
                      <span className="block mt-1 font-semibold text-red-800">
                        Motif indiqué par l’administrateur : {res.rejectionReason}
                      </span>
                    )}
                  </>
                ) : (
                  <>Votre compte revendeur a été suspendu par l’administrateur. Vos clés API ont été désactivées.</>
                )}
              </p>

              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 pt-1">
                <span>Inscrit le : {new Date(res.createdAt).toLocaleString()}</span>
                {res.validationRequestedAt && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>
                      Demande envoyée le : {new Date(res.validationRequestedAt).toLocaleString()} ({res.validationChannel?.toUpperCase()})
                    </span>
                  </>
                )}
                {res.rejectedAt && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>Refusé le : {new Date(res.rejectedAt).toLocaleString()}</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowValidationChannelsPrompt(true)}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
              >
                <Key className="w-4 h-4 text-orange-400" />
                <span>Générer ma clé API</span>
              </button>

              {res.status === 'rejected' && res.canReapply !== false && (
                <button
                  type="button"
                  onClick={() => {
                    setRegisterName(res.name);
                    setRegisterCompany(res.company);
                    setRegisterPhone(res.phone || '');
                    setRegisterTelegram(res.telegramUsername || '');
                    setRegisterCountry(res.country || 'Haïti');
                    setRegisterBusinessType(res.businessType || 'Boutique Gaming / Revendeur local');
                    setRegisterVolume(res.estimatedMonthlyVolume || '500 - 2 000 USD / mois');
                    setRegisterWebsite(res.websiteOrSocialUrl || '');
                    setRegisterMessage(res.message || '');
                    setShowReapplyForm(!showReapplyForm);
                  }}
                  className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Nouvelle demande de validation
                </button>
              )}
            </div>
          </div>

          {/* When reseller clicks "Générer ma clé API" -> Shows the 2 buttons: WhatsApp & Telegram */}
          {showValidationChannelsPrompt && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <Lock className="w-4 h-4 text-orange-600" />
                    <span>Validation administrateur requise avant l’accès aux clés API</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Choisissez <strong>WhatsApp</strong> ou <strong>Telegram</strong> ci-dessous pour ouvrir directement une conversation avec l’administrateur PlayUp. Un message prérempli contenant votre identifiant (<code className="font-mono font-bold text-slate-900">{res.id}</code>) et votre demande de validation sera automatiquement préparé.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <a
                  href={buildWhatsAppUrl(res)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleRecordValidationChannelClick('whatsapp')}
                  className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2.5 shadow-sm transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp</span>
                </a>

                <a
                  href={buildTelegramUrl(res)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleRecordValidationChannelClick('telegram')}
                  className="px-5 py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center gap-2.5 shadow-sm transition-colors"
                >
                  <Send className="w-4 h-4" />
                  <span>Telegram</span>
                </a>

                <button
                  type="button"
                  onClick={() => copyKey(buildValidationMessage(res), 'validation_msg')}
                  className="px-3.5 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>{copiedKey === 'validation_msg' ? 'Message copié !' : 'Copier le message de demande'}</span>
                </button>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-mono text-slate-700 whitespace-pre-line">
                {buildValidationMessage(res)}
              </div>

              {validationFeedback && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium">
                  {validationFeedback}
                </div>
              )}
            </div>
          )}

          {/* Reapply form when rejected and allowed by admin */}
          {res.status === 'rejected' && showReapplyForm && res.canReapply !== false && (
            <form onSubmit={handleReapplySubmit} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <h3 className="font-display text-sm font-bold text-slate-900">
                Mettre à jour mes informations et soumettre une nouvelle demande
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nom complet</label>
                  <input
                    type="text"
                    required
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Entreprise / Boutique</label>
                  <input
                    type="text"
                    required
                    value={registerCompany}
                    onChange={(e) => setRegisterCompany(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Téléphone / WhatsApp</label>
                  <input
                    type="text"
                    required
                    value={registerPhone}
                    onChange={(e) => setRegisterPhone(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>
              <div className="text-xs">
                <label className="font-semibold text-slate-700 block mb-1">Message / Précisions pour l’administrateur</label>
                <textarea
                  rows={2}
                  value={registerMessage}
                  onChange={(e) => setRegisterMessage(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={reapplyLoading}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold"
                >
                  {reapplyLoading ? 'Envoi...' : 'Renvoyer ma demande de validation'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowReapplyForm(false)}
                  className="px-3 py-2 text-xs text-slate-500 hover:text-slate-800"
                >
                  Annuler
                </button>
              </div>
            </form>
          )}

          {res.status === 'rejected' && res.canReapply === false && (
            <div className="p-3 bg-white border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              L’administrateur n’autorise pas de nouvelle demande automatique pour ce compte actuellement. Vous pouvez le contacter via WhatsApp ou Telegram pour plus d’informations.
            </div>
          )}
        </div>
      )}

      {/* Newly Generated Key Alert Banner (For Approved Resellers) */}
      {newlyGeneratedKey && isApproved && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Nouvelle clé API générée avec succès : {newlyGeneratedKey.name}</span>
            </div>
            <button
              type="button"
              onClick={() => setNewlyGeneratedKey(null)}
              className="text-xs text-emerald-700 hover:underline font-semibold"
            >
              Fermer
            </button>
          </div>
          <p className="text-xs text-emerald-800">
            Copiez et conservez votre clé API en lieu sûr. Elle est associée exclusivement à votre compte revendeur (<code className="font-mono font-bold">{res.id}</code>).
          </p>
          <div className="flex items-center gap-2 bg-white border border-emerald-300 rounded-xl p-3 font-mono text-xs text-slate-900">
            <span className="truncate flex-1 select-all">{newlyGeneratedKey.key}</span>
            <button
              type="button"
              onClick={() => copyKey(newlyGeneratedKey.key, newlyGeneratedKey.id)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-sans font-bold flex items-center gap-1.5 shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedKey === newlyGeneratedKey.id ? 'Copié !' : 'Copier ma clé'}</span>
            </button>
          </div>
        </div>
      )}

      {/* KPI Stats Cards (Individual Reseller USD Wallet) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Balance Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Solde Wallet Revendeur (USD)</span>
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-mono text-2xl sm:text-3xl font-bold text-slate-900">
              ${Number(dashboardData?.wallet?.balanceUsd ?? res.balance ?? 0).toFixed(2)}{' '}
              <span className="text-xs font-sans text-slate-400">USD</span>
            </div>
            {isApproved ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('wallet')}
                  className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Recharger en USDT</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('shop')}
                  className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  Commander
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-amber-600 mt-2 font-medium">
                Validation administrateur requise pour recharger
              </p>
            )}
          </div>
        </div>

        {/* Recharges & Commissions Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Rechargé (Net USD)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-mono text-2xl sm:text-3xl font-bold text-emerald-700">
              ${Number(dashboardData?.wallet?.totalRechargedUsd ?? res.totalRechargedUsd ?? 0).toFixed(2)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Commissions PlayUp ({dashboardData?.wallet?.usdtConfig?.commissionPercent ?? 4}%) :{' '}
              <span className="font-mono font-semibold text-slate-700">
                ${Number(dashboardData?.wallet?.totalCommissionsPaidUsd ?? res.totalCommissionsPaidUsd ?? 0).toFixed(2)}
              </span>
            </p>
          </div>
        </div>

        {/* Purchases / Total Spent Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Achats de Services</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-mono text-2xl sm:text-3xl font-bold text-slate-900">
              ${Number(dashboardData?.wallet?.totalSpentUsd ?? stats?.totalSpent ?? res.totalSpent ?? 0).toFixed(2)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {stats?.totalOrders ?? res.ordersCount ?? 0} commandes ({stats?.completedOrders ?? 0} livrées)
            </p>
          </div>
        </div>

        {/* Reseller Net Profit Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Bénéfices Revendeur (USD)</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-mono text-2xl sm:text-3xl font-bold text-purple-700">
              +${Number(dashboardData?.wallet?.totalProfitUsd ?? res.totalProfitUsd ?? 0).toFixed(2)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Marge réalisée sur vos tarifs revendeur PlayUp
            </p>
          </div>
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex items-center gap-1 border-b border-slate-200 pb-px overflow-x-auto">
        {[
          { id: 'overview', label: 'Profil & Vue d’ensemble' },
          { id: 'wallet', label: 'Recharge USDT & Wallet USD' },
          { id: 'shop', label: 'Acheter un Service (Catalogue)' },
          { id: 'orders', label: 'Historique Achats & Commandes' },
          { id: 'transactions', label: 'Historique Financier Sécurisé' },
          { id: 'api-keys', label: 'Clés d’API' },
          { id: 'webhook', label: 'Webhooks' }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB: WALLET & USDT RECHARGE SPACE */}
      {activeTab === 'wallet' && (
        <div className="space-y-6">
          {!isApproved ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4">
              <Lock className="w-8 h-8 text-amber-600 mx-auto" />
              <h3 className="font-display text-lg font-bold text-slate-900">
                Wallet USD Revendeur verrouillé avant validation
              </h3>
              <p className="text-xs text-slate-600 max-w-lg mx-auto">
                Votre compte revendeur doit d’abord être approuvé par l’administrateur PlayUp avant de pouvoir recharger votre wallet en USDT.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Admin Configured USDT Receiving Details & QR Code */}
                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 block">
                        Dépôt Crypto Officiel PlayUp
                      </span>
                      <h3 className="font-display text-base font-bold text-slate-900 mt-0.5">
                        Coordonnées de Réception USDT
                      </h3>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg font-mono text-xs font-bold">
                      Réseau : {dashboardData?.wallet?.usdtConfig?.network || 'TRC20'}
                    </span>
                  </div>

                  {dashboardData?.wallet?.usdtConfig?.receivingAddress ? (
                    <div className="space-y-4">
                      {dashboardData.wallet.usdtConfig.qrCodeUrl && (
                        <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                          <img
                            src={dashboardData.wallet.usdtConfig.qrCodeUrl}
                            alt="QR Code Adresse USDT PlayUp"
                            className="w-44 h-44 object-contain rounded-xl bg-white p-2 border border-slate-200"
                          />
                          <span className="text-[11px] text-slate-500 mt-2 font-medium">
                            Scannez ce QR Code pour envoyer vos USDT ({dashboardData.wallet.usdtConfig.network})
                          </span>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 block">
                          Adresse USDT de réception ({dashboardData.wallet.usdtConfig.network})
                        </label>
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono text-xs text-slate-900">
                          <span className="truncate flex-1 select-all">
                            {dashboardData.wallet.usdtConfig.receivingAddress}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              copyKey(dashboardData.wallet!.usdtConfig.receivingAddress, 'usdt_addr')
                            }
                            className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-sans font-bold flex items-center gap-1 shrink-0"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>{copiedKey === 'usdt_addr' ? 'Copié !' : 'Copier'}</span>
                          </button>
                        </div>
                      </div>

                      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                        <div className="font-bold flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                          <span>Vérification Blockchain Stricte</span>
                        </div>
                        <p className="text-[11px] leading-relaxed">
                          Envoyez uniquement des <strong>USDT</strong> sur le réseau{' '}
                          <strong>{dashboardData.wallet.usdtConfig.network}</strong>. Le système vérifie réellement la transaction sur la blockchain (destinataire, statut confirmé et montant exact) avant de créditer votre wallet USD. Un simple screenshot ou TXID non confirmé ne suffit jamais.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
                      <div className="font-bold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Adresse USDT non configurée par l’administrateur</span>
                      </div>
                      <p className="text-[11px]">
                        L’administrateur PlayUp n’a pas encore renseigné l’adresse USDT de réception dans le panneau d’administration. Veuillez contacter l’administrateur via WhatsApp ou Telegram.
                      </p>
                    </div>
                  )}
                </div>

                {/* Right Column: USDT Recharge Submission & 4% Commission Breakdown */}
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
                  <div className="border-b border-slate-100 pb-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">
                      Crédit Automatique après Confirmation On-Chain
                    </span>
                    <h3 className="font-display text-base font-bold text-slate-900 mt-0.5">
                      Soumettre une Recharge USDT (Commission PlayUp {dashboardData?.wallet?.usdtConfig?.commissionPercent ?? 4}%)
                    </h3>
                  </div>

                  {usdtFeedback && (
                    <div
                      className={`p-4 rounded-xl border text-xs flex items-start gap-2.5 ${
                        usdtFeedback.type === 'success'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : usdtFeedback.type === 'pending'
                          ? 'bg-amber-50 border-amber-200 text-amber-900'
                          : 'bg-red-50 border-red-200 text-red-800'
                      }`}
                    >
                      {usdtFeedback.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      )}
                      <div className="font-medium leading-relaxed">{usdtFeedback.message}</div>
                    </div>
                  )}

                  <form onSubmit={handleUsdtTopupSubmit} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">
                          Montant envoyé (USDT) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="1"
                          required
                          value={usdtAmountInput}
                          onChange={(e) => setUsdtAmountInput(e.target.value)}
                          placeholder="100.00"
                          className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 font-mono text-sm font-bold text-slate-900 focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">
                          Réseau Blockchain configuré
                        </label>
                        <input
                          type="text"
                          readOnly
                          value={`USDT — Réseau ${dashboardData?.wallet?.usdtConfig?.network || 'TRC20'}`}
                          className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono text-xs font-bold text-slate-700"
                        />
                      </div>
                    </div>

                    {/* Transparent 4% PlayUp Commission Calculation Box */}
                    {(() => {
                      const rawSent = Math.max(0, Number(usdtAmountInput) || 0);
                      const rate = Number(dashboardData?.wallet?.usdtConfig?.commissionPercent ?? 4);
                      const feeUsd = Number(((rawSent * rate) / 100).toFixed(2));
                      const netUsd = Number(Math.max(0, rawSent - feeUsd).toFixed(2));
                      return (
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                          <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                            Détail du calcul de votre recharge
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="p-3 bg-white border border-slate-200 rounded-xl">
                              <span className="text-[10px] text-slate-500 block">Montant envoyé</span>
                              <span className="font-mono text-base font-bold text-slate-900">
                                {rawSent.toFixed(2)} USDT
                              </span>
                            </div>
                            <div className="p-3 bg-white border border-slate-200 rounded-xl">
                              <span className="text-[10px] text-slate-500 block">
                                Frais PlayUp ({rate}%)
                              </span>
                              <span className="font-mono text-base font-bold text-amber-700">
                                -{feeUsd.toFixed(2)} USD
                              </span>
                            </div>
                            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                              <span className="text-[10px] text-emerald-800 font-semibold block">
                                Montant net crédité
                              </span>
                              <span className="font-mono text-base font-bold text-emerald-700">
                                +{netUsd.toFixed(2)} USD
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        TXID / Hash de la transaction blockchain *
                      </label>
                      <input
                        type="text"
                        required
                        value={usdtTxidInput}
                        onChange={(e) => setUsdtTxidInput(e.target.value)}
                        placeholder={
                          (dashboardData?.wallet?.usdtConfig?.network || 'TRC20') === 'TRC20'
                            ? 'Ex: 64 caractères hexadécimaux (Hash TronGrid / Tronscan)'
                            : 'Ex: 0x... (Hash de transaction 66 caractères)'
                        }
                        className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 font-mono text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                      />
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        Chaque TXID est vérifié en direct sur l’explorateur blockchain ({dashboardData?.wallet?.usdtConfig?.network || 'TRC20'}) et protégé contre tout double crédit.
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={
                        usdtSubmitting || !dashboardData?.wallet?.usdtConfig?.receivingAddress
                      }
                      className="w-full py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <RefreshCw className={`w-4 h-4 ${usdtSubmitting ? 'animate-spin' : ''}`} />
                      <span>
                        {usdtSubmitting
                          ? 'Vérification de la transaction sur la blockchain en cours...'
                          : 'Vérifier sur la Blockchain & Créditer mon Wallet USD'}
                      </span>
                    </button>
                  </form>
                </div>
              </div>

              {/* USDT Recharge History Table */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm text-slate-900">
                      Historique de vos Recharges USDT
                    </h3>
                    <p className="text-xs text-slate-500">
                      Suivi détaillé du montant envoyé, de la commission PlayUp (4%) et du montant net crédité en USD.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Réseau &amp; TXID</th>
                        <th className="py-2.5 px-3">Montant Envoyé</th>
                        <th className="py-2.5 px-3">Frais PlayUp (4%)</th>
                        <th className="py-2.5 px-3">Montant Net Crédité</th>
                        <th className="py-2.5 px-3">Statut Blockchain</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(dashboardData?.wallet?.topups || []).map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-3 text-slate-500 text-[11px]">
                            {new Date(t.createdAt).toLocaleString()}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-mono font-bold text-slate-800 mr-1.5">
                              [{t.network}]
                            </span>
                            <span className="font-mono text-[11px] text-slate-600">
                              {t.txid.slice(0, 12)}...{t.txid.slice(-8)}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono font-semibold text-slate-900">
                            {t.amountSentUsdt.toFixed(2)} USDT
                          </td>
                          <td className="py-3 px-3 font-mono text-amber-700">
                            -{t.commissionAmountUsd.toFixed(2)} USD ({t.commissionRatePercent}%)
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-emerald-700">
                            +{t.netCreditedUsd.toFixed(2)} USD
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`font-bold uppercase text-[11px] ${
                                t.status === 'verified' || t.status === 'verified_credited'
                                  ? 'text-emerald-700'
                                  : t.status === 'pending_verification' || t.status === 'pending'
                                  ? 'text-amber-700'
                                  : 'text-red-600'
                              }`}
                            >
                              {t.status === 'verified' || t.status === 'verified_credited'
                                ? 'Vérifié & Crédité'
                                : t.status === 'pending_verification' || t.status === 'pending'
                                ? 'En attente de confirmation'
                                : 'Rejeté'}
                            </span>
                            {t.verificationMessage && (
                              <div className="text-[10px] text-slate-500 mt-0.5 max-w-xs truncate">
                                {t.verificationMessage}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {(!dashboardData?.wallet?.topups ||
                        dashboardData.wallet.topups.length === 0) && (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-400">
                            Aucune recharge USDT soumise pour le moment.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB: RESELLER SERVICE ORDERING (CATALOGUE REVENDEUR) */}
      {activeTab === 'shop' && (
        <div className="space-y-6">
          {!isApproved ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4">
              <Lock className="w-8 h-8 text-amber-600 mx-auto" />
              <h3 className="font-display text-lg font-bold text-slate-900">
                Commande de services réservée aux revendeurs approuvés
              </h3>
              <p className="text-xs text-slate-600 max-w-lg mx-auto">
                Dès que votre compte revendeur est validé par l’administrateur et que votre wallet USD est crédité, vous pouvez commander tous les services au tarif revendeur.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Service & Package Selector */}
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-display text-base font-bold text-slate-900">
                      Catalogue &amp; Tarifs Revendeur PlayUp
                    </h3>
                    <p className="text-xs text-slate-500">
                      Sélectionnez un jeu et un pack. Le montant déduit correspond à votre tarif revendeur configuré.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Votre Solde Disponible
                    </span>
                    <span className="font-mono text-sm font-bold text-orange-600">
                      ${Number(dashboardData?.wallet?.balanceUsd ?? res.balance ?? 0).toFixed(2)} USD
                    </span>
                  </div>
                </div>

                {/* Game Tabs */}
                <div className="flex flex-wrap gap-2">
                  {catalogGames.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        setSelectedGameId(g.id);
                        const firstSrv = catalogServices.find((s) => s.gameId === g.id);
                        const firstPkg = firstSrv?.packages.find((p) => p.isActive);
                        if (firstPkg) setSelectedPackageId(firstPkg.id);
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                        selectedGameId === g.id
                          ? 'bg-orange-600 text-white border-orange-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>

                {/* Packages Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                  {catalogServices
                    .filter((s) => !selectedGameId || s.gameId === selectedGameId)
                    .flatMap((s) =>
                      s.packages
                        .filter((p) => p.isActive)
                        .map((pkg) => ({ service: s, pkg }))
                    )
                    .map(({ service, pkg }) => {
                      const isSelected = selectedPackageId === pkg.id;
                      const resellerPriceUsd = Number(pkg.resellerPrice ?? pkg.publicPrice ?? 0);
                      const publicPriceUsd = Number(pkg.publicPrice ?? resellerPriceUsd);
                      const profit = Math.max(0, Number((publicPriceUsd - resellerPriceUsd).toFixed(2)));
                      const cardImg = pkg.imageUrl || service.imageUrl || '/src/assets/images/game_cover_freefire_1790988876938.jpg';
                      const regionLabel = (pkg as any).region || 'Global';
                      const productKey = (pkg as any).productKey || pkg.externalProductId || pkg.id;
                      return (
                        <button
                          key={pkg.id}
                          type="button"
                          onClick={() => setSelectedPackageId(pkg.id)}
                          className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                            isSelected
                              ? 'border-orange-600 bg-orange-50/60 shadow-xs'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <img
                              src={cardImg}
                              alt={pkg.name}
                              className="w-11 h-11 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-100"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] font-semibold text-slate-400 uppercase truncate">
                                  {service.name}
                                </span>
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                                  {regionLabel}
                                </span>
                              </div>
                              <div className="font-bold text-xs text-slate-900 mt-0.5 truncate">
                                {pkg.name}
                              </div>
                              <div className="text-[11px] font-semibold text-orange-700 mt-0.5">
                                {pkg.amount} {pkg.unit || 'Diamonds'}
                              </div>
                              <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5" title={productKey}>
                                ID: {pkg.id}
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                            <div>
                              <span className="text-[10px] text-slate-400 block">Tarif Revendeur</span>
                              <span className="font-mono font-bold text-orange-600">
                                ${resellerPriceUsd.toFixed(2)} USD
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 block">
                                Public: ${publicPriceUsd.toFixed(2)}
                              </span>
                              <span className="font-mono text-[11px] font-bold text-emerald-700">
                                Bénéfice: +${profit.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Order Execution Form */}
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
                <div className="border-b border-slate-100 pb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 block">
                    Exécution Directe Fournisseur RechargeGames
                  </span>
                  <h3 className="font-display text-base font-bold text-slate-900 mt-0.5">
                    Commander le Service Sélectionné
                  </h3>
                </div>

                {orderFeedback && (
                  <div
                    className={`p-4 rounded-xl border text-xs flex items-start gap-2.5 ${
                      orderFeedback.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}
                  >
                    {orderFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    )}
                    <div className="font-semibold leading-relaxed">{orderFeedback.message}</div>
                  </div>
                )}

                {(() => {
                  const activeService = catalogServices.find((s) =>
                    s.packages.some((p) => p.id === selectedPackageId)
                  );
                  const activePkg = activeService?.packages.find((p) => p.id === selectedPackageId);
                  const availableUsd = Number(dashboardData?.wallet?.balanceUsd ?? res.balance ?? 0);
                  const requiredUsd = activePkg ? Number(activePkg.resellerPrice ?? activePkg.publicPrice ?? 0) : 0;
                  const activePublicUsd = activePkg ? Number(activePkg.publicPrice ?? requiredUsd) : 0;
                  const profitUsd = activePkg
                    ? Math.max(0, Number((activePublicUsd - requiredUsd).toFixed(2)))
                    : 0;
                  const isBalanceInsufficient = activePkg ? availableUsd < requiredUsd : false;

                  return (
                    <form onSubmit={handleResellerOrderSubmit} className="space-y-4 text-xs">
                      {activePkg && (
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Pack sélectionné :</span>
                            <span className="font-bold text-slate-900">{activePkg.name}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Quantité :</span>
                            <span className="font-mono font-bold text-slate-800">
                              {activePkg.amount} {activePkg.unit || 'Diamonds'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Prix client public :</span>
                            <span className="font-mono text-slate-700">
                              ${activePublicUsd.toFixed(2)} USD
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-semibold">Tarif revendeur à débiter :</span>
                            <span className="font-mono font-bold text-orange-600 text-sm">
                              ${requiredUsd.toFixed(2)} USD
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                            <span className="text-emerald-800 font-semibold">Votre bénéfice net :</span>
                            <span className="font-mono font-bold text-emerald-700">
                              +${profitUsd.toFixed(2)} USD
                            </span>
                          </div>
                        </div>
                      )}

                      {isBalanceInsufficient && (
                        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-bold flex items-center justify-between gap-2">
                          <span>Solde insuffisant — veuillez recharger votre wallet</span>
                          <button
                            type="button"
                            onClick={() => setActiveTab('wallet')}
                            className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[11px] shrink-0"
                          >
                            Recharger
                          </button>
                        </div>
                      )}

                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">
                          Identifiant du Joueur (Player ID / UID) *
                        </label>
                        <input
                          type="text"
                          required
                          value={orderPlayerId}
                          onChange={(e) => setOrderPlayerId(e.target.value)}
                          placeholder="Ex: 123456789"
                          className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 font-mono text-xs focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">
                            Server / Zone ID (si requis)
                          </label>
                          <input
                            type="text"
                            value={orderServerId}
                            onChange={(e) => setOrderServerId(e.target.value)}
                            placeholder="Optionnel"
                            className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono text-xs focus:outline-none focus:border-orange-500"
                          />
                        </div>
                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">
                            Pseudo Joueur (optionnel)
                          </label>
                          <input
                            type="text"
                            value={orderPlayerName}
                            onChange={(e) => setOrderPlayerName(e.target.value)}
                            placeholder="Pseudo"
                            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-orange-500"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={orderSubmitting || !activePkg}
                        className="w-full py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-sm transition-colors flex items-center justify-center gap-2"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span>
                          {orderSubmitting
                            ? 'Vérification du solde & Envoi fournisseur...'
                            : activePkg
                            ? `Payer $${activePkg.resellerPrice.toFixed(2)} USD & Envoyer la commande`
                            : 'Sélectionnez un pack'}
                        </span>
                      </button>
                    </form>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 1: OVERVIEW & RESELLER PROFILE DETAILS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Reseller Profile Information Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-semibold text-sm text-slate-900">Informations du Compte Revendeur</h3>
                <p className="text-xs text-slate-500">
                  Détails enregistrés dans la base de données PlayUp et dates de cycle de vie.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={buildWhatsAppUrl(res)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleRecordValidationChannelClick('whatsapp')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp Admin</span>
                </a>
                <a
                  href={buildTelegramUrl(res)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleRecordValidationChannelClick('telegram')}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Telegram Admin</span>
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Identifiant Revendeur</span>
                <span className="font-mono font-bold text-slate-900 mt-0.5 block">{res.id}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Responsable &amp; Entreprise</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">
                  {res.name} · {res.company}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Contacts</span>
                <span className="text-slate-800 mt-0.5 block">
                  {res.email} {res.phone ? `· ${res.phone}` : ''}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Activité &amp; Pays</span>
                <span className="text-slate-800 mt-0.5 block">
                  {res.businessType || 'Revendeur'} ({res.country || 'Haïti'})
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Date de création</span>
                <span className="font-mono text-slate-800 mt-0.5 block">
                  {new Date(res.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Date de validation</span>
                <span className="font-mono text-slate-800 mt-0.5 block">
                  {res.validatedAt ? new Date(res.validatedAt).toLocaleString() : 'En attente'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Permissions accordées</span>
                <span className="font-mono text-[11px] text-slate-700 mt-0.5 block">
                  {(res.permissions || []).join(', ')}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Statut de validation</span>
                <span className={`font-bold mt-0.5 block ${statusTextColor}`}>{statusLabel}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-slate-900">Dernières Commandes traitées</h3>
              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className="text-xs text-orange-600 font-semibold hover:underline"
              >
                Voir tout ({dashboardData?.recentOrders.length || 0})
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                    <th className="py-2.5 px-3">N° Commande</th>
                    <th className="py-2.5 px-3">Jeu &amp; Pack</th>
                    <th className="py-2.5 px-3">Profil Joueur</th>
                    <th className="py-2.5 px-3">Tarif Débité</th>
                    <th className="py-2.5 px-3">Bénéfice</th>
                    <th className="py-2.5 px-3">Statut</th>
                    <th className="py-2.5 px-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dashboardData?.recentOrders.slice(0, 5).map((o) => {
                    const profit =
                      o.resellerProfitUsd !== undefined
                        ? o.resellerProfitUsd
                        : Math.max(0, Number(((o.publicPrice || o.chargedAmount) - o.chargedAmount).toFixed(2)));
                    return (
                      <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3 font-mono font-medium text-slate-900">{o.orderNumber}</td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900">{o.gameName}</div>
                          <div className="text-[11px] text-slate-500">{o.packageName}</div>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600">
                          {Object.entries(o.gameProfileData || {})
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(' · ') || o.playerId}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">
                          ${o.chargedAmount.toFixed(2)} USD
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-emerald-700">
                          +${profit.toFixed(2)} USD
                        </td>
                        <td className="py-3 px-3 font-bold uppercase text-[11px]">{o.status}</td>
                        <td className="py-3 px-3 text-slate-500 text-[11px]">
                          {new Date(o.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                  {(!dashboardData?.recentOrders || dashboardData.recentOrders.length === 0) && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        Aucune commande enregistrée pour l’instant.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: API KEYS */}
      {activeTab === 'api-keys' && (
        <div className="space-y-6">
          {!isApproved ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-5">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <div className="max-w-lg mx-auto space-y-2">
                <h3 className="font-display text-lg font-bold text-slate-900">
                  Accès aux clés API verrouillé ({statusLabel})
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Conformément aux règles de sécurité PlayUp Reseller, vos clés API ne sont pas accessibles tant que l’administrateur n’a pas validé votre profil revendeur (<code className="font-mono font-bold">{res.id}</code>).
                </p>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setShowValidationChannelsPrompt(true)}
                  className="px-5 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-sm transition-colors"
                >
                  <Key className="w-4 h-4" />
                  <span>Générer ma clé API</span>
                </button>
              </div>

              {showValidationChannelsPrompt && (
                <div className="max-w-xl mx-auto p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 text-left">
                  <p className="text-xs font-semibold text-slate-800">
                    Demandez la validation de votre compte revendeur à l’administrateur via :
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <a
                      href={buildWhatsAppUrl(res)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleRecordValidationChannelClick('whatsapp')}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>WhatsApp</span>
                    </a>
                    <a
                      href={buildTelegramUrl(res)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleRecordValidationChannelClick('telegram')}
                      className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>Telegram</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-semibold text-sm text-slate-900">Vos Clés d’API PlayUp</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Générez des clés API uniques et sécurisées associées à votre compte (<code className="font-mono">{res.id}</code>) avec permissions individuelles.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    placeholder="Nom de la clé (ex: Boutique Web, Bot)"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-xl text-xs w-60"
                  />
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 px-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newKeyIsTest}
                      onChange={(e) => setNewKeyIsTest(e.target.checked)}
                    />
                    <span>Mode Test</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateMyApiKeyClick}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Générer ma clé API</span>
                  </button>
                </div>
              </div>

              {/* Permissions selector for new API key */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="text-[11px] font-bold text-slate-700 block">
                  Permissions individuelles à associer à la nouvelle clé :
                </span>
                <div className="flex flex-wrap gap-3">
                  {AVAILABLE_PERMISSIONS.filter((p) =>
                    !res.permissions || res.permissions.includes(p.id)
                  ).map((perm) => (
                    <label key={perm.id} className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedKeyPermissions.includes(perm.id)}
                        onChange={() => togglePermissionSelection(perm.id)}
                      />
                      <span>{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {keyError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  {keyError}
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                      <th className="py-2.5 px-3">Nom</th>
                      <th className="py-2.5 px-3">Clé API (Unique &amp; Sécurisée)</th>
                      <th className="py-2.5 px-3">Statut</th>
                      <th className="py-2.5 px-3">Permissions individuelles</th>
                      <th className="py-2.5 px-3">Dates (Création / Validation / Révocation)</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dashboardData?.apiKeys.map((k) => {
                      const isRevealed = Boolean(revealedKeys[k.id]);
                      return (
                        <tr key={k.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-3 font-semibold text-slate-900">{k.name}</td>
                          <td className="py-3 px-3 font-mono text-orange-600">
                            <div className="flex items-center gap-2">
                              <span className="select-all">
                                {isRevealed ? k.key : k.maskedKey || `${k.key.slice(0, 12)}...${k.key.slice(-4)}`}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setRevealedKeys((prev) => ({ ...prev, [k.id]: !prev[k.id] }))
                                }
                                className="p-1 hover:bg-slate-200 rounded text-slate-500"
                                title={isRevealed ? 'Masquer la clé' : 'Afficher la clé'}
                              >
                                {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => copyKey(k.key, k.id)}
                                className="px-2 py-1 bg-orange-50 hover:bg-orange-100 rounded text-orange-700 font-sans font-semibold text-[11px] flex items-center gap-1 transition-colors"
                                title="Copier la clé"
                              >
                                <Copy className="w-3 h-3" />
                                <span>{copiedKey === k.id ? 'Copié !' : 'Copier'}</span>
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`font-bold uppercase text-[11px] ${
                                k.status === 'active' ? 'text-emerald-700' : 'text-red-600'
                              }`}
                            >
                              {k.status === 'active' ? 'Active' : 'Révoquée'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                            {(k.permissions || []).join(', ')}
                          </td>
                          <td className="py-3 px-3 text-slate-500 text-[11px] space-y-0.5">
                            <div>Créée : {new Date(k.createdAt).toLocaleString()}</div>
                            {k.validatedAt && (
                              <div className="text-emerald-700">
                                Validée : {new Date(k.validatedAt).toLocaleString()}
                              </div>
                            )}
                            {k.renewedAt && (
                              <div className="text-blue-700">
                                Renouvelée : {new Date(k.renewedAt).toLocaleString()}
                              </div>
                            )}
                            {k.revokedAt && (
                              <div className="text-red-600">
                                Révoquée : {new Date(k.revokedAt).toLocaleString()}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {k.status === 'active' && (
                              <button
                                type="button"
                                onClick={() => handleRevokeKey(k.id)}
                                className="text-red-600 hover:text-red-700 font-semibold text-[11px]"
                              >
                                Révoquer
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {(!dashboardData?.apiKeys || dashboardData.apiKeys.length === 0) && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          Aucune clé API générée pour le moment. Cliquez sur « Générer ma clé API » ci-dessus pour créer votre première clé.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Real-time API Request History Table */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-sm text-slate-900">Historique des Requêtes API</h4>
                    <p className="text-xs text-slate-500">
                      Journal temps réel des appels effectués avec vos clés API PlayUp Reseller.
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    {(dashboardData as any)?.apiRequestLogs?.length || 0} requête(s)
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                        <th className="py-2.5 px-3">Date &amp; Heure</th>
                        <th className="py-2.5 px-3">Méthode &amp; Endpoint</th>
                        <th className="py-2.5 px-3">Clé Utilisée</th>
                        <th className="py-2.5 px-3">Permission</th>
                        <th className="py-2.5 px-3">Statut HTTP</th>
                        <th className="py-2.5 px-3">Latence</th>
                        <th className="py-2.5 px-3">Commande / Détail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {((dashboardData as any)?.apiRequestLogs || []).slice(0, 20).map((log: any) => (
                        <tr key={log.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 font-mono">
                            <span className="font-bold text-slate-900 mr-1.5">{log.method}</span>
                            <span className="text-slate-700">{log.endpoint}</span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-orange-600">
                            {log.maskedKey || (log.authMethod === 'session_token' ? 'Session Portail' : '—')}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                            {log.permissionChecked || '—'}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold">
                            <span
                              className={
                                log.statusCode >= 200 && log.statusCode < 300
                                  ? 'text-emerald-700'
                                  : log.statusCode >= 400
                                  ? 'text-red-600'
                                  : 'text-amber-600'
                              }
                            >
                              {log.statusCode}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                            {log.latencyMs} ms
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700">
                            {log.orderId ? `Commande ${log.orderId}` : log.errorCode || 'OK'}
                          </td>
                        </tr>
                      ))}
                      {(!((dashboardData as any)?.apiRequestLogs) ||
                        (dashboardData as any).apiRequestLogs.length === 0) && (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-slate-400">
                            Aucune requête API enregistrée pour le moment.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ORDERS */}
      {activeTab === 'orders' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm text-slate-900">
                Historique de vos Achats de Services &amp; Bénéfices
              </h3>
              <p className="text-xs text-slate-500">
                Commandes passées via le portail revendeur ou l’API et transmises à RechargeGames.
              </p>
            </div>
            {isApproved && (
              <button
                type="button"
                onClick={() => setActiveTab('shop')}
                className="px-3.5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold"
              >
                + Nouvelle commande
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                  <th className="py-2.5 px-3">ID Commande</th>
                  <th className="py-2.5 px-3">Jeu &amp; Pack</th>
                  <th className="py-2.5 px-3">Profil Joueur</th>
                  <th className="py-2.5 px-3">Prix Public</th>
                  <th className="py-2.5 px-3">Tarif Débité</th>
                  <th className="py-2.5 px-3">Votre Bénéfice</th>
                  <th className="py-2.5 px-3">Statut</th>
                  <th className="py-2.5 px-3">Réf Fournisseur</th>
                  <th className="py-2.5 px-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dashboardData?.recentOrders.map((o) => {
                  const profit =
                    o.resellerProfitUsd !== undefined
                      ? o.resellerProfitUsd
                      : Math.max(0, Number(((o.publicPrice || o.chargedAmount) - o.chargedAmount).toFixed(2)));
                  return (
                    <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">{o.orderNumber}</td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{o.gameName}</div>
                        <div className="text-[11px] text-slate-500">{o.packageName}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                        {Object.entries(o.gameProfileData || {})
                          .map(([k, v]) => `${k}:${v}`)
                          .join(' ') || o.playerId}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500">
                        ${Number(o.publicPrice || o.chargedAmount).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        ${o.chargedAmount.toFixed(2)} USD
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-emerald-700">
                        +${profit.toFixed(2)} USD
                      </td>
                      <td className="py-3 px-3 font-bold uppercase text-[11px]">{o.status}</td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                        {o.providerReference || '—'}
                      </td>
                      <td className="py-3 px-3 text-slate-400 text-[11px]">
                        {new Date(o.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
                {(!dashboardData?.recentOrders || dashboardData.recentOrders.length === 0) && (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-slate-400">
                      Aucune commande enregistrée.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SECURE FINANCIAL LEDGER & TRANSACTIONS */}
      {activeTab === 'transactions' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm text-slate-900">
                Historique Financier Sécurisé (Grand Livre Atomique USD)
              </h3>
              <p className="text-xs text-slate-500">
                Toutes les recharges USDT vérifiées (avec détail de la commission PlayUp 4%), achats de services et remboursements.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Opération</th>
                  <th className="py-2.5 px-3">Détails / TXID / Commande</th>
                  <th className="py-2.5 px-3">Montant Brut</th>
                  <th className="py-2.5 px-3">Commission PlayUp</th>
                  <th className="py-2.5 px-3">Variation Wallet</th>
                  <th className="py-2.5 px-3">Solde Après</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(dashboardData?.wallet?.ledger || []).map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 text-slate-400 text-[11px]">
                      {new Date(entry.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-bold uppercase text-[11px]">
                      {entry.type === 'usdt_recharge'
                        ? 'Recharge USDT'
                        : entry.type === 'order_purchase'
                        ? 'Achat Service'
                        : entry.type === 'order_refund'
                        ? 'Remboursement'
                        : 'Ajustement'}
                    </td>
                    <td className="py-3 px-3 text-slate-600">{entry.description}</td>
                    <td className="py-3 px-3 font-mono text-slate-700">
                      {entry.grossAmountUsdt
                        ? `${entry.grossAmountUsdt.toFixed(2)} USDT`
                        : `$${Math.abs(entry.amountUsd).toFixed(2)} USD`}
                    </td>
                    <td className="py-3 px-3 font-mono text-amber-700">
                      {entry.commissionUsd ? `-$${entry.commissionUsd.toFixed(2)} USD` : '—'}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold">
                      <span className={entry.amountUsd >= 0 ? 'text-emerald-600' : 'text-slate-900'}>
                        {entry.amountUsd >= 0 ? '+' : '-'}${Math.abs(entry.amountUsd).toFixed(2)} USD
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      ${entry.balanceAfter.toFixed(2)} USD
                    </td>
                  </tr>
                ))}
                {(!dashboardData?.wallet?.ledger || dashboardData.wallet.ledger.length === 0) &&
                  dashboardData?.transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 text-slate-400 text-[11px]">
                        {new Date(t.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 font-bold uppercase text-[11px]">{t.type}</td>
                      <td className="py-3 px-3 text-slate-600">{t.note}</td>
                      <td className="py-3 px-3 font-mono text-slate-700">${t.amount.toFixed(2)} USD</td>
                      <td className="py-3 px-3 font-mono text-slate-400">—</td>
                      <td className="py-3 px-3 font-mono font-bold">
                        <span className={t.type === 'credit' || t.type === 'refund' ? 'text-emerald-600' : 'text-slate-900'}>
                          {t.type === 'debit' ? '-' : '+'}${t.amount.toFixed(2)} USD
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500">—</td>
                    </tr>
                  ))}
                {(!dashboardData?.wallet?.ledger || dashboardData.wallet.ledger.length === 0) &&
                  (!dashboardData?.transactions || dashboardData.transactions.length === 0) && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        Aucune opération financière enregistrée.
                      </td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: WEBHOOKS */}
      {activeTab === 'webhook' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
            <div className="space-y-1">
              <h3 className="font-semibold text-sm text-slate-900">Configuration de votre URL Webhook</h3>
              <p className="text-xs text-slate-500">
                Recevez automatiquement les événements de changement de statut (<code className="bg-slate-100 text-orange-600 px-1 py-0.5 rounded font-mono">order.completed</code>, <code className="bg-slate-100 text-red-600 px-1 py-0.5 rounded font-mono">order.failed</code>).
              </p>
            </div>

            {webhookMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium">
                {webhookMsg}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">URL Endpoint Webhook (POST)</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    disabled={!isApproved}
                    value={webhookInputUrl}
                    onChange={(e) => setWebhookInputUrl(e.target.value)}
                    placeholder="https://votredomaine.com/api/playup-webhook"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:border-orange-500 disabled:bg-slate-100"
                  />
                  <button
                    type="button"
                    disabled={!isApproved}
                    onClick={handleSaveWebhook}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors"
                  >
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    disabled={!isApproved}
                    onClick={handleTestWebhookPing}
                    className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 disabled:opacity-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5 text-orange-600" />
                    <span>Test Ping</span>
                  </button>
                </div>
              </div>

              {isApproved && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Clé secrète de signature (Webhook Secret)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={res.webhookSecret || ''}
                      placeholder="Non configuré"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => copyKey(res.webhookSecret || '', 'webhookSecret')}
                      className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Webhook logs */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h4 className="text-xs font-semibold text-slate-800">Derniers envois de Webhook enregistrés</h4>
              <div className="space-y-2">
                {dashboardData?.webhookLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-bold ${
                          log.httpStatus === 200 ? 'text-emerald-700' : 'text-red-600'
                        }`}
                      >
                        HTTP {log.httpStatus}
                      </span>
                      <span className="font-semibold text-slate-800">{log.event}</span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
                {(!dashboardData?.webhookLogs || dashboardData.webhookLogs.length === 0) && (
                  <p className="text-xs text-slate-400">Aucun envoi de webhook enregistré.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
