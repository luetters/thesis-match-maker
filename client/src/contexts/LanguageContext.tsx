import { createContext, useContext, useState, ReactNode } from "react";

export type Language = "de" | "en";

const translations = {
  de: {
    // Navigation & Layout
    nav: {
      home: "Startseite",
      examiners: "Prüfer:innen",
      login: "Anmelden",
      logout: "Abmelden",
      dashboard: "Dashboard",
    },
    // Landing Page
    landing: {
      title: "Thesis Match Maker",
      subtitle: "Find your 2 supervisors with your brilliant academic idea",
      tagline: "Die Plattform der HTW Berlin zur Vermittlung von Abschlussarbeiten",
      loginBtn: "Jetzt anmelden",
      loginMagicLink: "Anmelden via Magic Link",
      loginManus: "Anmelden via HTW-Konto",
      emailPlaceholder: "Ihre HTW-E-Mail-Adresse",
      sendLink: "Magic Link senden",
      sending: "Wird gesendet…",
      linkSent: "Magic Link gesendet! Bitte prüfen Sie Ihr E-Mail-Postfach.",
      browseExaminers: "Prüfer:innen-Verzeichnis",
      features: {
        match: "Betreuer:innen finden",
        matchDesc: "Finden Sie passende Erst- und Zweitprüfer:innen für Ihre Abschlussarbeit.",
        track: "Status verfolgen",
        trackDesc: "Behalten Sie den Überblick über Anfragen, Deadlines und Kolloquien.",
        secure: "Sicher & Datenschutzkonform",
        secureDesc: "Alle Daten werden gemäß DSGVO verarbeitet und sicher gespeichert.",
      },
    },
    // Student Dashboard
    student: {
      title: "Studierenden-Dashboard",
      newRequest: "Neue Anfrage",
      myRequests: "Meine Anfragen",
      noRequests: "Noch keine Anfragen eingereicht.",
      submitRequest: "Anfrage einreichen",
      thesisTitle: "Titel der Abschlussarbeit",
      description: "Beschreibung",
      department: "Fachbereich",
      degreeType: "Abschlussart",
      targetSemester: "Zielsemester",
      language: "Sprache",
      uploadExpose: "Exposé hochladen (PDF)",
      uploading: "Wird hochgeladen…",
      uploadSuccess: "Exposé erfolgreich hochgeladen!",
      deadline: "Abgabefrist",
      downloadIcs: "Termin herunterladen (.ics)",
      colloquiums: "Kolloquien",
      history: "Verlauf",
    },
    // Examiner Dashboard
    examiner: {
      title: "Prüfer:innen-Dashboard",
      requests: "Anfragen",
      profile: "Profil",
      colloquiums: "Kolloquien",
      history: "Verlauf",
      accept: "Annehmen",
      reject: "Ablehnen",
      downloadExpose: "Exposé herunterladen (PDF)",
      noRequests: "Keine offenen Anfragen.",
    },
    // Admin Dashboard
    admin: {
      title: "Verwaltungs-Dashboard",
      overview: "Übersicht",
      requests: "Alle Anfragen",
      audit: "Audit-Log",
      users: "Nutzerverwaltung",
      stats: "Statistiken",
      settings: "Einstellungen",
      colloquiums: "Kolloquien",
      totalRequests: "Anfragen gesamt",
      pending: "Ausstehend",
      matched: "Zugeordnet",
      users_count: "Nutzer:innen",
    },
    // Status
    status: {
      PENDING: "Ausstehend",
      ACCEPTED: "Angenommen",
      REJECTED: "Abgelehnt",
      MATCHED: "Zugeordnet",
    },
    // Common
    common: {
      save: "Speichern",
      cancel: "Abbrechen",
      delete: "Löschen",
      edit: "Bearbeiten",
      loading: "Wird geladen…",
      error: "Fehler",
      success: "Erfolgreich",
      confirm: "Bestätigen",
      back: "Zurück",
      search: "Suchen",
      filter: "Filtern",
      all: "Alle",
      noData: "Keine Daten vorhanden.",
    },
  },
  en: {
    // Navigation & Layout
    nav: {
      home: "Home",
      examiners: "Examiners",
      login: "Sign In",
      logout: "Sign Out",
      dashboard: "Dashboard",
    },
    // Landing Page
    landing: {
      title: "Thesis Match Maker",
      subtitle: "Find your 2 supervisors with your brilliant academic idea",
      tagline: "The HTW Berlin platform for thesis supervision matching",
      loginBtn: "Sign In Now",
      loginMagicLink: "Sign in via Magic Link",
      loginManus: "Sign in via HTW Account",
      emailPlaceholder: "Your HTW email address",
      sendLink: "Send Magic Link",
      sending: "Sending…",
      linkSent: "Magic Link sent! Please check your inbox.",
      browseExaminers: "Browse Examiners",
      features: {
        match: "Find Supervisors",
        matchDesc: "Find suitable first and second examiners for your thesis.",
        track: "Track Status",
        trackDesc: "Keep track of requests, deadlines, and colloquiums.",
        secure: "Secure & GDPR-Compliant",
        secureDesc: "All data is processed in accordance with GDPR and stored securely.",
      },
    },
    // Student Dashboard
    student: {
      title: "Student Dashboard",
      newRequest: "New Request",
      myRequests: "My Requests",
      noRequests: "No requests submitted yet.",
      submitRequest: "Submit Request",
      thesisTitle: "Thesis Title",
      description: "Description",
      department: "Department",
      degreeType: "Degree Type",
      targetSemester: "Target Semester",
      language: "Language",
      uploadExpose: "Upload Exposé (PDF)",
      uploading: "Uploading…",
      uploadSuccess: "Exposé uploaded successfully!",
      deadline: "Submission Deadline",
      downloadIcs: "Download Calendar Event (.ics)",
      colloquiums: "Colloquiums",
      history: "History",
    },
    // Examiner Dashboard
    examiner: {
      title: "Examiner Dashboard",
      requests: "Requests",
      profile: "Profile",
      colloquiums: "Colloquiums",
      history: "History",
      accept: "Accept",
      reject: "Reject",
      downloadExpose: "Download Exposé (PDF)",
      noRequests: "No open requests.",
    },
    // Admin Dashboard
    admin: {
      title: "Administration Dashboard",
      overview: "Overview",
      requests: "All Requests",
      audit: "Audit Log",
      users: "User Management",
      stats: "Statistics",
      settings: "Settings",
      colloquiums: "Colloquiums",
      totalRequests: "Total Requests",
      pending: "Pending",
      matched: "Matched",
      users_count: "Users",
    },
    // Status
    status: {
      PENDING: "Pending",
      ACCEPTED: "Accepted",
      REJECTED: "Rejected",
      MATCHED: "Matched",
    },
    // Common
    common: {
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
      loading: "Loading…",
      error: "Error",
      success: "Success",
      confirm: "Confirm",
      back: "Back",
      search: "Search",
      filter: "Filter",
      all: "All",
      noData: "No data available.",
    },
  },
} as const;

export type Translations = typeof translations[Language];

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: typeof translations.de;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(() => {
    try {
      return (localStorage.getItem("htw-lang") as Language) ?? "de";
    } catch {
      return "de";
    }
  });

  const handleSetLang = (newLang: Language) => {
    setLang(newLang);
    try {
      localStorage.setItem("htw-lang", newLang);
    } catch {}
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang: handleSetLang, t: translations[lang] as typeof translations.de }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

/** Compact language switcher component */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLanguage();
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        onClick={() => setLang("de")}
        className={`px-2 py-1 text-xs font-semibold rounded transition-colors ${
          lang === "de"
            ? "bg-[#76B900] text-white"
            : "text-gray-500 hover:text-gray-800"
        }`}
        aria-label="Deutsch"
      >
        DE
      </button>
      <span className="text-gray-300 text-xs">|</span>
      <button
        onClick={() => setLang("en")}
        className={`px-2 py-1 text-xs font-semibold rounded transition-colors ${
          lang === "en"
            ? "bg-[#76B900] text-white"
            : "text-gray-500 hover:text-gray-800"
        }`}
        aria-label="English"
      >
        EN
      </button>
    </div>
  );
}
