import { FormEvent, useEffect, useState } from "react";
import { BookOpenCheck, ChartNoAxesCombined, Globe2, LogIn, LogOut, ShieldCheck, Timer, UserRound, Languages } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "./lib/supabase";

type Lang = "en" | "fr";
const copy = {
  en: {
    tagline: "Prepare confidently for EU competitions",
    home: "Home", exams: "Mock exams", resources: "Study resources", dashboard: "My dashboard",
    signIn: "Sign in", signOut: "Sign out", register: "Create free account",
    title: "Your next step towards an EU career",
    intro: "Practise with structured mock examinations, review your answers and follow your progress — free of charge.",
    start: "Explore mock exams", free: "Free candidate access",
    catalogue: "Available preparation", catalogueText: "Start with EPSO AD7 ICT Infrastructure. More competitions and fields will be added progressively.",
    ad7: "EPSO AD7 · ICT Infrastructure", ad7desc: "Reasoning tests, ICT multiple-choice questions and written-exercise practice.",
    coming: "Additional EPSO competitions", comingdesc: "A flexible catalogue designed for AD, AST and contract-agent competitions.",
    progress: "Your progress", progressText: "Your attempts and scores will appear here after you sign in and complete a test.",
    account: "Candidate account", email: "Email address", password: "Password", name: "Display name",
    noConfig: "The website interface is ready, but Supabase is not configured yet. Add the project URL and publishable/anon key to the deployment environment variables.",
    authError: "Authentication failed. Please check your details and try again.",
    signedIn: "You are signed in.", create: "Create account", or: "or", google: "Continue with Google",
    emailConfirm: "Check your email to confirm your account, then sign in.",
    adminNote: "Administrator access is assigned securely by the platform owner; public registration never grants admin rights.",
    ad: "Advertisement space — advertising will be enabled only after consent and publisher approval.",
    footer: "Independent preparation resource. Not affiliated with or endorsed by EPSO or the European Union."
  },
  fr: {
    tagline: "Préparez-vous aux concours de l’Union européenne",
    home: "Accueil", exams: "Examens blancs", resources: "Ressources", dashboard: "Mon tableau de bord",
    signIn: "Connexion", signOut: "Déconnexion", register: "Créer un compte gratuit",
    title: "Votre prochaine étape vers une carrière européenne",
    intro: "Entraînez-vous avec des examens blancs structurés, consultez vos réponses et suivez vos progrès — gratuitement.",
    start: "Voir les examens blancs", free: "Accès gratuit aux candidats",
    catalogue: "Préparations disponibles", catalogueText: "Commencez par le concours EPSO AD7 – Infrastructure TIC. D’autres concours et domaines seront ajoutés progressivement.",
    ad7: "EPSO AD7 · Infrastructure TIC", ad7desc: "Tests de raisonnement, questions à choix multiples en TIC et exercices écrits.",
    coming: "Autres concours EPSO", comingdesc: "Un catalogue évolutif pour les concours AD, AST et agents contractuels.",
    progress: "Vos progrès", progressText: "Vos tentatives et résultats apparaîtront ici après connexion et réalisation d’un test.",
    account: "Compte candidat", email: "Adresse e-mail", password: "Mot de passe", name: "Nom affiché",
    noConfig: "L’interface est prête, mais Supabase n’est pas encore configuré. Ajoutez l’URL du projet et la clé publique/anon aux variables d’environnement du déploiement.",
    authError: "Échec de l’authentification. Vérifiez vos identifiants et réessayez.",
    signedIn: "Vous êtes connecté.", create: "Créer un compte", or: "ou", google: "Continuer avec Google",
    emailConfirm: "Vérifiez votre boîte e-mail pour confirmer votre compte, puis connectez-vous.",
    adminNote: "Les droits d’administration sont attribués de manière sécurisée par le propriétaire. Une inscription publique ne donne jamais de droits administrateur.",
    ad: "Espace publicitaire — la publicité sera activée après le consentement et l’approbation du diffuseur.",
    footer: "Ressource indépendante de préparation. Non affiliée à l’EPSO ni à l’Union européenne."
  }
};

export default function App() {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem("eep-lang") as Lang) || "en");
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const t = copy[lang];

  useEffect(() => {
    localStorage.setItem("eep-lang", lang);
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, current) => setSession(current));
    return () => listener.subscription.unsubscribe();
  }, []);

  async function submitAuth(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true); setMessage("");
    const result = mode === "register"
      ? await supabase.auth.signUp({ email, password, options: { data: { full_name: displayName } } })
      : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error) setMessage(result.error.message || t.authError);
    else if (mode === "register" && !result.data.session) setMessage(t.emailConfirm);
    else setMessage(t.signedIn);
  }

  async function googleLogin() {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin }
    });
    if (error) setMessage(error.message);
  }

  async function logout() { if (supabase) await supabase.auth.signOut(); }

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#"><span className="brand-mark"><BookOpenCheck size={23}/></span><span>EU Exam Practice<small>(Mock test)</small></span></a>
      <nav><a href="#home">{t.home}</a><a href="#exams">{t.exams}</a><a href="#resources">{t.resources}</a><a href="#dashboard">{t.dashboard}</a></nav>
      <div className="top-actions">
        <button className="language" onClick={() => setLang(lang === "en" ? "fr" : "en")} aria-label="Change language"><Languages size={17}/>{lang.toUpperCase()}</button>
        {session ? <button className="outline small" onClick={logout}><LogOut size={16}/>{t.signOut}</button> : <a className="button small" href="#account"><LogIn size={16}/>{t.signIn}</a>}
      </div>
    </header>

    <main>
      <section id="home" className="hero">
        <div className="hero-copy">
          <span className="eyebrow"><Globe2 size={15}/>{t.free}</span>
          <h1>{t.title}</h1><p>{t.intro}</p>
          <a className="button" href="#exams">{t.start} <span>→</span></a>
          <div className="trust"><ShieldCheck size={16}/>{t.tagline}</div>
        </div>
        <div className="hero-art"><div className="orbit orbit-one"></div><div className="orbit orbit-two"></div><div className="hero-card"><BookOpenCheck size={38}/><strong>EPSO</strong><span>Practice · Progress · Prepare</span><div className="mini-bars"><i/><i/><i/><i/><i/></div></div></div>
      </section>

      <section id="exams" className="section">
        <div className="section-heading"><div><span className="kicker">01 / PREPARATION</span><h2>{t.catalogue}</h2><p>{t.catalogueText}</p></div></div>
        <div className="cards">
          <article className="exam-card featured"><div className="card-icon"><BookOpenCheck/></div><span className="tag">FIRST RELEASE</span><h3>{t.ad7}</h3><p>{t.ad7desc}</p><div className="card-bottom"><span><Timer size={15}/> Timed practice</span><span className="soon">Content integration pending</span></div></article>
          <article className="exam-card"><div className="card-icon muted"><ChartNoAxesCombined/></div><span className="tag neutral">ROADMAP</span><h3>{t.coming}</h3><p>{t.comingdesc}</p><div className="card-bottom"><span><Globe2 size={15}/> EN / FR</span><span className="soon">Coming progressively</span></div></article>
        </div>
      </section>

      <section id="dashboard" className="section dashboard">
        <div className="section-heading"><div><span className="kicker">02 / CANDIDATE AREA</span><h2>{t.progress}</h2><p>{t.progressText}</p></div></div>
        <div className="dashboard-panel">
          <div className="avatar"><UserRound/></div>
          <div className="dashboard-copy"><strong>{session?.user.email || t.account}</strong><p>{session ? t.signedIn : t.progressText}</p></div>
          <span className={session ? "status online" : "status"}>{session ? "SIGNED IN" : "GUEST"}</span>
        </div>
      </section>

      <section id="account" className="section account-section">
        <div className="auth-card">
          <span className="kicker">03 / ACCOUNT</span><h2>{mode === "login" ? t.signIn : t.register}</h2>
          {!isSupabaseConfigured && <div className="notice">{t.noConfig}</div>}
          {message && <div className="notice">{message}</div>}
          <form onSubmit={submitAuth}>
            {mode === "register" && <label>{t.name}<input value={displayName} onChange={e=>setDisplayName(e.target.value)} required minLength={2}/></label>}
            <label>{t.email}<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label>
            <label>{t.password}<input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={e=>setPassword(e.target.value)} minLength={8} required/></label>
            <button className="button full" disabled={!isSupabaseConfigured || busy}>{busy ? "…" : mode === "login" ? t.signIn : t.create}</button>
          </form>
          <div className="separator"><span>{t.or}</span></div>
          <button className="outline full" onClick={googleLogin} disabled={!isSupabaseConfigured}><span className="google-g">G</span>{t.google}</button>
          <button className="text-button" onClick={()=>{setMode(mode === "login" ? "register" : "login");setMessage("");}}>{mode === "login" ? t.register : t.signIn}</button>
          <p className="small-note">{t.adminNote}</p>
        </div>
      </section>
      <section id="resources" className="ad-placeholder"><span className="ad-label">ADVERTISEMENT</span><p>{t.ad}</p></section>
    </main>
    <footer><span>© {new Date().getFullYear()} EU Exam Practice (Mock test)</span><span>{t.footer}</span><span>English · Français</span></footer>
  </div>;
}