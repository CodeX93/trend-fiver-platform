import { createContext, useContext, ReactNode, useState, useEffect } from "react";

type Language = "en" | "it";

type LanguageContextType = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

export const LanguageContext = createContext<LanguageContextType | null>(null);

// Comprehensive translations for the application
const translations: Record<Language, Record<string, string>> = {
  en: {
    // General
    "app.name": "Trend",
    "app.tagline": "Financial Market Sentiment Tracker",
    
    // Navigation
    "nav.home": "Home",
    "nav.leaderboard": "Leaderboard",
    "nav.profile": "Profile",
    "nav.login": "Login",
    "nav.logout": "Logout",
    "nav.register": "Register",
    
    // Home page
    "home.welcome": "Welcome to Trend",
    "home.welcome_user": "Welcome, {username}",
    "home.subtitle": "Track and share sentiment on financial assets",
    "home.login_prompt": "to add your own ratings",
    "home.top_assets": "Top Assets",
    "home.trending_up": "Trending Up",
    "home.trending_down": "Trending Down",
    "home.search_placeholder": "Search assets...",
    "home.language_selector": "Language",
    "home.language_en": "English",
    "home.language_it": "Italian",
    "home.total_assets": "Total Assets",
    "home.how_it_works": "How Trend Works",
    "home.track_assets": "Track Assets",
    "home.track_description": "Follow stocks and cryptocurrencies and see real-time community sentiment.",
    "home.make_predictions": "Make Predictions",
    "home.predictions_description": "Add your own sentiment ratings and percentage predictions for assets.",
    "home.earn_badges": "Earn Badges",
    "home.badges_description": "Get rewarded for accurate predictions with monthly performance badges.",
    
    // Search
    "search.title": "Search Assets",
    "search.description": "Find assets by name, symbol, or type",
    
    // Language
    "language.title": "Language Settings",
    "language.description": "Choose your preferred language",
    
    // Sentiment
    "sentiment.positive": "Positive",
    "sentiment.neutral": "Neutral",
    "sentiment.negative": "Negative",
    "sentiment.top_positive": "Top Positive Assets",
    "sentiment.top_negative": "Top Negative Assets",
    "sentiment.bullish": "Assets with the most bullish sentiment",
    "sentiment.bearish": "Assets with the most bearish sentiment",
    "sentiment.no_positive": "No positive assets found",
    "sentiment.no_negative": "No negative assets found",
    
    // Asset types
    "asset.type.stock": "Stock",
    "asset.type.cryptocurrency": "Cryptocurrency",
    "asset.crypto_title": "Cryptocurrency Assets",
    "asset.stock_title": "Stock Assets",
    "asset.forex_title": "Forex Pairs",
    "asset.no_crypto": "No cryptocurrency assets found.",
    "asset.no_stock": "No stock assets found.",
    "asset.no_forex": "No forex pairs available.",
    "asset.suggest": "Suggest Asset",
    "asset.suggest_title": "Suggest a New Asset",
    "asset.suggest_description": "Don't see your favorite stock or cryptocurrency? Suggest it here and we'll add it to our database.",
    
    // Auth
    "auth.signin": "Sign in",
    "auth.login": "Log in",
    "auth.register": "Register",
    
    // Profile
    "profile.title": "Profile",
    "profile.predictions": "Predictions",
    "profile.verification": "Verification Status",
    "profile.verification_progress": "Verification Progress",
    
    // Action buttons
    "action.save": "Save",
    "action.cancel": "Cancel",
    "action.submit": "Submit",
    
    // Share
    "share.share_app": "Share App",
    "share.share_with_friends": "Share with friends",
    "share.invite_friends": "Invite your friends to try Trend and track market sentiments together",
    "share.copied": "Copied!",
    "share.link_copied": "Link copied to clipboard",
    "share.or_share_link": "Or copy this link",
    "share.homepage": "Homepage",
    "share.leaderboard": "Leaderboard",
    "share.message": "Check out Trend, a platform for tracking financial market sentiments!",
    "share.email_subject": "Join me on Trend - Financial Market Sentiment Tracker",
    
    // Email verification
    "email_verification.status_label": "Status:",
    "email_verification.verified": "Verified",
    "email_verification.unverified": "Not Verified",
    "email_verification.verified_title": "Email Verified",
    "email_verification.verified_desc": "Your email address has been successfully verified.",
    "email_verification.unverified_title": "Email Not Verified",
    "email_verification.unverified_desc": "Please verify your email to unlock verified advisor status. Check your inbox for a verification email or request a new one.",
    "email_verification.resend_button": "Resend Verification Email",
    "email_verification.sending": "Sending...",
    "email_verification.resend_success_title": "Verification Email Sent",
    "email_verification.resend_success_desc": "Please check your inbox and click the verification link.",
    "email_verification.resend_error_title": "Failed to Send Email",
    "email_verification.cooldown_message": "Please wait {minutes} minutes before requesting another verification email",
    "email_verification.email_changed": "Email changed successfully. Please check your new email for verification.",
    "email_verification.change_email_title": "Change Email Address",
    "email_verification.new_email_label": "New Email Address",
    "email_verification.current_password_label": "Current Password",
    "email_verification.change_email_button": "Change Email",
    "email_verification.change_email_success": "Email changed successfully",
    "email_verification.change_email_error": "Failed to change email",
    
    // Badges
    "badges.title": "Achievement Badges",
    "badges.description": "Your monthly performance recognition",
    "badges.current": "Current Badge",
    "badges.history": "Badge History",
    "badges.noBadges": "You don't have any badges yet. Keep making predictions to earn badges!",
    "badges.noCurrentBadge": "No current badge. You need to be in the top 5 predictors last month to earn a badge.",
    "badges.noBadgeHistory": "No badge history available.",
    "badges.currentDescription": "Your current badge for last month's performance",
    "badges.top1": "Diamond Predictor",
    "badges.top2": "Platinum Predictor",
    "badges.top3": "Gold Predictor",
    "badges.top4": "Silver Predictor",
    "badges.top5": "Bronze Predictor",
    "badges.unknownBadge": "Mystery Badge",
    "badges.accuracy": "Accuracy: {value}%",
    "badges.predictions": "Predictions: {count}",
    "badges.viewHistory": "View Badge History",
    
    // Admin Panel
    "admin.dashboard": "Admin Dashboard",
    "admin.description": "Manage assets, users, and system settings",
    "admin.assets_tab": "Asset Management",
    "admin.users_tab": "User Management",
    "admin.userlist_tab": "User List",
    "admin.refresh_data": "Refresh Data",
    "admin.assets.title": "Assets",
    "admin.assets.description": "Manage the assets available on the platform",
    "admin.assets.add": "Add Asset",
    "admin.assets.add_title": "Add New Asset",
    "admin.assets.add_description": "Enter the details for the new asset to add to the platform",
    "admin.assets.filter": "Filter by type",
    "admin.assets.search": "Search assets...",
    "admin.assets.no_assets": "No assets found matching your filters.",
    "admin.assets.showing": "Showing {filtered} of {total} assets",
    "admin.assets.name": "Name",
    "admin.assets.symbol": "Symbol",
    "admin.assets.type": "Type",
    "admin.assets.sentiment": "Sentiment",
    "admin.assets.prediction": "Prediction",
    "admin.assets.actions": "Actions",
    "admin.assets.delete_confirm": "Are you sure?",
    "admin.assets.delete_description": "This will permanently remove {name} ({symbol}) from the platform. This action cannot be undone.",
    "admin.users.title": "Users",
    "admin.users.description": "Manage user accounts and verification status",
    "admin.users.filter_all": "All Users",
    "admin.users.filter_verified": "Verified Users",
    "admin.users.filter_unverified": "Unverified Users",
    "admin.users.search": "Search users...",
    "admin.users.no_users": "No users found matching your filters.",
    "admin.users.showing": "Showing {filtered} of {total} users",
    "admin.users.verify": "Verify",
    "admin.users.unverify": "Cancel Verification",
    "admin.userlist.title": "Complete User List",
    "admin.userlist.description": "Detailed view of all registered users",
    "admin.userlist.refresh": "Refresh",
    "admin.userlist.username": "Username",
    "admin.userlist.email": "Email",
    "admin.userlist.registered": "Registered",
    "admin.userlist.predictions": "Predictions",
    "admin.userlist.accuracy": "Accuracy",
    "admin.userlist.badge": "Badge",
    "admin.userlist.verified": "Verified",
    "admin.userlist.not_verified": "Not Verified",
    "admin.userlist.none": "None",
  },
  it: {
    // General
    "app.name": "Trend",
    "app.tagline": "Tracciatore di Sentimento del Mercato Finanziario",
    
    // Navigation
    "nav.home": "Home",
    "nav.leaderboard": "Classifica",
    "nav.profile": "Profilo",
    "nav.login": "Accedi",
    "nav.logout": "Esci",
    "nav.register": "Registrati",
    
    // Home page
    "home.welcome": "Benvenuto su Trend",
    "home.welcome_user": "Benvenuto, {username}",
    "home.subtitle": "Monitora e condividi il sentimento sugli asset finanziari",
    "home.login_prompt": "per aggiungere le tue valutazioni",
    "home.top_assets": "Asset Principali",
    "home.trending_up": "Tendenza Positiva",
    "home.trending_down": "Tendenza Negativa",
    "home.search_placeholder": "Cerca asset...",
    "home.language_selector": "Lingua",
    "home.language_en": "Inglese",
    "home.language_it": "Italiano",
    "home.total_assets": "Asset Totali",
    "home.how_it_works": "Come Funziona Trend",
    "home.track_assets": "Monitora Asset",
    "home.track_description": "Segui azioni e criptovalute e visualizza il sentiment della comunità in tempo reale.",
    "home.make_predictions": "Fai Previsioni",
    "home.predictions_description": "Aggiungi le tue valutazioni e previsioni percentuali per gli asset.",
    "home.earn_badges": "Ottieni Badge",
    "home.badges_description": "Vieni premiato per previsioni accurate con badge di performance mensili.",
    
    // Search
    "search.title": "Cerca Asset",
    "search.description": "Trova asset per nome, simbolo o tipo",
    
    // Language
    "language.title": "Impostazioni Lingua",
    "language.description": "Scegli la tua lingua preferita",
    
    // Sentiment
    "sentiment.positive": "Positivo",
    "sentiment.neutral": "Neutro",
    "sentiment.negative": "Negativo",
    "sentiment.top_positive": "Asset Più Positivi",
    "sentiment.top_negative": "Asset Più Negativi",
    "sentiment.bullish": "Asset con il sentimento più rialzista",
    "sentiment.bearish": "Asset con il sentimento più ribassista",
    "sentiment.no_positive": "Nessun asset positivo trovato",
    "sentiment.no_negative": "Nessun asset negativo trovato",
    
    // Asset types
    "asset.type.stock": "Azione",
    "asset.type.cryptocurrency": "Criptovaluta",
    "asset.crypto_title": "Asset Criptovalute",
    "asset.stock_title": "Asset Azioni",
    "asset.forex_title": "Coppie Forex",
    "asset.no_crypto": "Nessuna criptovaluta trovata.",
    "asset.no_stock": "Nessuna azione trovata.",
    "asset.no_forex": "Nessuna coppia forex disponibile.",
    "asset.suggest": "Suggerisci Asset",
    "asset.suggest_title": "Suggerisci un Nuovo Asset",
    "asset.suggest_description": "Non vedi la tua azione o criptovaluta preferita? Suggeriscila qui e la aggiungeremo al nostro database.",
    
    // Auth
    "auth.signin": "Accedi",
    "auth.login": "Accedi",
    "auth.register": "Registrati",
    
    // Profile
    "profile.title": "Profilo",
    "profile.predictions": "Previsioni",
    "profile.verification": "Stato di Verifica",
    "profile.verification_progress": "Progresso di Verifica",
    
    // Action buttons
    "action.save": "Salva",
    "action.cancel": "Annulla",
    "action.submit": "Invia",
    
    // Share
    "share.share_app": "Condividi App",
    "share.share_with_friends": "Condividi con amici",
    "share.invite_friends": "Invita i tuoi amici a provare Trend e monitorare insieme i sentiment del mercato",
    "share.copied": "Copiato!",
    "share.link_copied": "Link copiato negli appunti",
    "share.or_share_link": "Oppure copia questo link",
    "share.homepage": "Homepage",
    "share.leaderboard": "Classifica",
    "share.message": "Prova Trend, una piattaforma per monitorare il sentiment dei mercati finanziari!",
    "share.email_subject": "Unisciti a me su Trend - Monitoraggio del Sentiment del Mercato Finanziario",
    
    // Email verification
    "email_verification.status_label": "Stato:",
    "email_verification.verified": "Verificata",
    "email_verification.unverified": "Non Verificata",
    "email_verification.verified_title": "Email Verificata",
    "email_verification.verified_desc": "Il tuo indirizzo email è stato verificato con successo.",
    "email_verification.unverified_title": "Email Non Verificata",
    "email_verification.unverified_desc": "Verifica la tua email per sbloccare lo stato di consulente verificato. Controlla la tua casella di posta o richiedi una nuova email di verifica.",
    "email_verification.resend_button": "Reinvia Email di Verifica",
    "email_verification.sending": "Invio in corso...",
    "email_verification.resend_success_title": "Email di Verifica Inviata",
    "email_verification.resend_success_desc": "Controlla la tua casella di posta e clicca sul link di verifica.",
    "email_verification.resend_error_title": "Invio Email Fallito",
    "email_verification.cooldown_message": "Aspetta {minutes} minuti prima di richiedere un'altra email di verifica",
    "email_verification.email_changed": "Email cambiata con successo. Controlla la tua nuova email per la verifica.",
    "email_verification.change_email_title": "Cambia Indirizzo Email",
    "email_verification.new_email_label": "Nuovo Indirizzo Email",
    "email_verification.current_password_label": "Password Attuale",
    "email_verification.change_email_button": "Cambia Email",
    "email_verification.change_email_success": "Email cambiata con successo",
    "email_verification.change_email_error": "Impossibile cambiare email",
    
    // Badges
    "badges.title": "Badge di Rendimento",
    "badges.description": "Riconoscimenti per le tue performance mensili",
    "badges.current": "Badge Attuale",
    "badges.history": "Storico Badge",
    "badges.noBadges": "Non hai ancora badge. Continua a fare previsioni per guadagnare badge!",
    "badges.noCurrentBadge": "Nessun badge attuale. Devi essere tra i primi 5 predittori del mese scorso per guadagnare un badge.",
    "badges.noBadgeHistory": "Nessuna cronologia badge disponibile.",
    "badges.currentDescription": "Il tuo badge attuale per le performance del mese scorso",
    "badges.top1": "Predittore Diamante",
    "badges.top2": "Predittore Platino",
    "badges.top3": "Predittore Oro",
    "badges.top4": "Predittore Argento",
    "badges.top5": "Predittore Bronzo",
    "badges.unknownBadge": "Badge Misterioso",
    "badges.accuracy": "Precisione: {value}%",
    "badges.predictions": "Previsioni: {count}",
    "badges.viewHistory": "Visualizza Storico Badge",
    
    // Admin Panel
    "admin.dashboard": "Pannello Amministratore",
    "admin.description": "Gestisci asset, utenti e impostazioni di sistema",
    "admin.assets_tab": "Gestione Asset",
    "admin.users_tab": "Gestione Utenti",
    "admin.userlist_tab": "Elenco Utenti",
    "admin.refresh_data": "Aggiorna Dati",
    "admin.assets.title": "Asset",
    "admin.assets.description": "Gestisci gli asset disponibili sulla piattaforma",
    "admin.assets.add": "Aggiungi Asset",
    "admin.assets.add_title": "Aggiungi Nuovo Asset",
    "admin.assets.add_description": "Inserisci i dettagli per il nuovo asset da aggiungere alla piattaforma",
    "admin.assets.filter": "Filtra per tipo",
    "admin.assets.search": "Cerca asset...",
    "admin.assets.no_assets": "Nessun asset trovato corrispondente ai filtri.",
    "admin.assets.showing": "Visualizzando {filtered} di {total} asset",
    "admin.assets.name": "Nome",
    "admin.assets.symbol": "Simbolo",
    "admin.assets.type": "Tipo",
    "admin.assets.sentiment": "Sentiment",
    "admin.assets.prediction": "Previsione",
    "admin.assets.actions": "Azioni",
    "admin.assets.delete_confirm": "Sei sicuro?",
    "admin.assets.delete_description": "Questo rimuoverà permanentemente {name} ({symbol}) dalla piattaforma. Questa azione non può essere annullata.",
    "admin.users.title": "Utenti",
    "admin.users.description": "Gestisci account utente e stato di verifica",
    "admin.users.filter_all": "Tutti gli Utenti",
    "admin.users.filter_verified": "Utenti Verificati",
    "admin.users.filter_unverified": "Utenti Non Verificati",
    "admin.users.search": "Cerca utenti...",
    "admin.users.no_users": "Nessun utente trovato corrispondente ai filtri.",
    "admin.users.showing": "Visualizzando {filtered} di {total} utenti",
    "admin.users.verify": "Verifica",
    "admin.users.unverify": "Annulla Verifica",
    "admin.userlist.title": "Elenco completo degli utenti",
    "admin.userlist.description": "Visualizzazione dettagliata di tutti gli utenti registrati",
    "admin.userlist.refresh": "Aggiorna",
    "admin.userlist.username": "Nome Utente",
    "admin.userlist.email": "Email",
    "admin.userlist.registered": "Registrato",
    "admin.userlist.predictions": "Previsioni",
    "admin.userlist.accuracy": "Precisione",
    "admin.userlist.badge": "Badge",
    "admin.userlist.verified": "Verificato",
    "admin.userlist.not_verified": "Non Verificato",
    "admin.userlist.none": "Nessuno",
  }
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    // Try to get saved language from localStorage
    const savedLanguage = localStorage.getItem("language") as Language;
    return savedLanguage || "en";
  });

  // Function to translate keys with parameter replacements
  const t = (key: string, params?: Record<string, string | number>): string => {
    let translated = translations[language][key] || key;
    
    // Replace parameters if provided
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        translated = translated.replace(`{${paramKey}}`, String(paramValue));
      });
    }
    
    return translated;
  };

  // Update localStorage when language changes
  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
    localStorage.setItem("language", newLanguage);
  };

  // Initial localStorage setup
  useEffect(() => {
    localStorage.setItem("language", language);
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}