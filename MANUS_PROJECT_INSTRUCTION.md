# Thesis Match Maker HTW Berlin – Manus Projektanweisung

**Projektname:** Thesis Match Maker (HTW Berlin)  
**Stack:** React 19 + Tailwind 4 + Express 4 + tRPC 11 + Drizzle ORM + MySQL/TiDB  
**Zielgruppe:** Studierende, Prüfer:innen, Verwaltung, Superadmin  
**Sprachen:** Deutsch (DE) + Englisch (EN)

---

## 1. Projektüberblick

Das **Thesis Match Maker** System verwaltet den administrativen Ablauf von Abschlussarbeiten an der HTW Berlin. Es verbindet Studierende mit zwei Betreuungspersonen (Erst- und Zweitprüfer:in), verwaltet Kolloquiumstermine und bietet ein umfassendes Audit-Log für die Verwaltung.

### Kernfunktionen
- **Studierenden-Dashboard:** Abschlussarbeit einreichen, Exposé hochladen, Betreuungspersonen suchen, Kolloquiumstermine einsehen
- **Prüfer:innen-Dashboard:** Betreuungsanfragen annehmen/ablehnen, Profil verwalten, Kapazität einstellen, Kolloquiumstermine koordinieren
- **Verwaltungs-Dashboard (PAV):** Anfragen überblicken, Prüfer:innen zuweisen, Direktzuweisung ohne Rückfrage, CSV-Export
- **Dekanat-Statistik-Dashboard:** Kennzahlen (Anfragen pro Status, Bearbeitungszeit, Prüfer:innen-Auslastung), Diagramme
- **Superadmin-Bereich:** Systemkonfiguration, E-Mail-Vorlagen konfigurieren, Prüfer:innen-Verwaltung, Audit-Log-Export
- **Öffentliches Prüfer:innen-Verzeichnis:** Suchbar nach Fachbereich, mit Foto und Kapazität
- **Onboarding-Assistent:** Geführte 5-Schritt-Einrichtung für Prüfer:innen

---

## 2. Datenbankschema (Drizzle ORM)

### Kernentitäten

```typescript
// users: Alle Nutzer:innen (Studierende, Prüfer:innen, Verwaltung, Superadmin)
users {
  id: int PK
  openId: string (Manus OAuth)
  name: string
  email: string UNIQUE
  role: enum (student, examiner, admin, superadmin)
  passwordHash: string | null (für Magic-Link + Passwort-Login)
  preferredLanguage: enum (de, en) – Spracheinstellung persistiert
  createdAt, updatedAt, lastSignedIn: timestamp
}

// studentProfiles: Erweiterte Profildaten für Studierende
studentProfiles {
  id: int PK
  userId: int FK → users
  programmeId: int FK → programmes (einmalig setzbar)
  semester: int
  thesisTitle: string | null
  createdAt, updatedAt: timestamp
}

// examinerProfiles: Erweiterte Profildaten für Prüfer:innen
examinerProfiles {
  id: int PK
  userId: int FK → users
  title: string | null (Prof. Dr., Dr., etc.)
  department: string | null
  bio: string | null
  researchFocus: string | null
  maxSupervisions: int (Kapazität)
  isSecondExaminer: boolean (darf als Zweitprüfer:in fungieren)
  onboardingCompleted: boolean (5-Schritt-Assistent abgeschlossen)
  photoUrl: string | null (S3-URL)
  photoKey: string | null (S3-Key für Löschung)
  officeHours: string | null
  websiteUrl: string | null
  alternativeEmail: string | null
  languages: JSON (z.B. ["de", "en"])
  tags: JSON (Schlagwörter)
  studyPrograms: JSON (veraltet, nutze examinerProgrammes)
  createdAt, updatedAt: timestamp
}

// thesisRequests: Betreuungsanfragen
thesisRequests {
  id: int PK
  studentId: int FK → users
  title: string
  description: string
  programmeId: int FK → programmes
  semester: string (z.B. "WS 2025/26")
  language: enum (de, en)
  thesisType: enum (bachelor, master)
  status: enum (PENDING, ACCEPTED, REJECTED, MATCHED)
  primaryExaminerId: int | null FK → users
  secondaryExaminerId: int | null FK → users
  exposureUrl: string | null (S3-URL zum Exposé)
  exposureKey: string | null (S3-Key)
  createdAt, updatedAt: timestamp
}

// examinerProgrammes: Zuordnung Prüfer:in ↔ Studiengänge
examinerProgrammes {
  id: int PK
  examinerId: int FK → examinerProfiles
  programmeId: int FK → programmes
  createdAt: timestamp
}

// programmes: Alle 23 HTW-Studiengänge
programmes {
  id: int PK
  name: string (z.B. "Wirtschaftsinformatik")
  abbreviation: string (z.B. "WI")
  level: enum (bachelor, master)
  pictogramUrl: string (S3-URL zum Piktogramm)
  createdAt: timestamp
}

// colloquiums: Kolloquiumstermine
colloquiums {
  id: int PK
  thesisId: int FK → thesisRequests
  scheduledAt: timestamp
  location: string
  createdAt, updatedAt: timestamp
}

// auditLog: Alle Statusänderungen und Aktionen
auditLog {
  id: int PK
  thesisId: int | null FK → thesisRequests
  userId: int | null FK → users
  action: string (z.B. "status_changed", "examiner_assigned")
  oldValue: JSON | null
  newValue: JSON | null
  createdAt: timestamp
}

// notifications: Benachrichtigungen für Nutzer:innen
notifications {
  id: int PK
  userId: int FK → users
  title: string
  message: string
  thesisRequestId: int | null FK → thesisRequests
  read: boolean
  createdAt: timestamp
}

// emailTemplates: Konfigurierbare E-Mail-Vorlagen
emailTemplates {
  id: int PK
  key: enum (thesis_submitted, examiner_proposal, thesis_accepted, thesis_rejected, colloquium_invitation, status_change)
  subject: string
  htmlBody: string
  textBody: string
  updatedAt: timestamp
  updatedBy: int | null FK → users
}

// systemSettings: Systemkonfiguration (Superadmin)
systemSettings {
  id: int PK
  key: string (z.B. "contactEmail", "maintenanceMode", "systemName")
  value: string
  updatedAt: timestamp
}
```

---

## 3. Backend-Architektur (tRPC + Express)

### tRPC-Router-Struktur

```typescript
// server/routers.ts – Alle Prozeduren organisiert nach Rolle/Feature

// Public (unauthenticated)
publicProcedure
  .query('programmes.list') // Alle Studiengänge mit Piktogrammen
  .query('examiners.list') // Öffentliche Prüfer:innen-Liste (mit Kapazität)
  .query('examiners.byId') // Einzelnes Prüfer:innen-Profil
  .mutation('auth.loginWithPassword') // E-Mail + Passwort
  .mutation('auth.requestMagicLink') // E-Mail-Versand
  .mutation('auth.verifyMagicLink') // Token-Validierung
  .mutation('auth.requestPasswordReset') // Passwort-Reset-Link
  .mutation('auth.resetPassword') // Neues Passwort setzen
  .query('examiner.respondViaToken') // JWT-gesicherter Endpunkt (E-Mail-CTA)

// Protected (authenticated)
protectedProcedure
  .query('auth.me') // Aktueller Nutzer + Profil
  .mutation('auth.logout') // Session löschen
  .mutation('auth.changePassword') // Passwort ändern
  .mutation('user.setLanguage') // Spracheinstellung speichern

// Student-only
studentProcedure
  .mutation('thesis.create') // Betreuungsanfrage einreichen
  .query('thesis.myRequests') // Eigene Anfragen
  .query('thesis.byId') // Anfrage-Details
  .mutation('thesis.uploadExposure') // Exposé hochladen (S3)
  .query('colloquium.byThesis') // Kolloquiumstermine
  .query('thesis.auditHistory') // Statushistorie

// Examiner-only
examinerProcedure
  .query('thesis.forMe') // Anfragen für diese Prüfer:in
  .mutation('examiner.respondToRequest') // Annehmen/Ablehnen
  .mutation('examiner.updateProfile') // Profil bearbeiten
  .mutation('examiner.completeOnboarding') // Onboarding abschließen
  .query('colloquium.forMe') // Meine Kolloquiumstermine

// Admin (PAV – Prüfungsverwaltung)
adminProcedure
  .query('thesis.all') // Alle Anfragen (gefiltert)
  .mutation('thesis.updateStatus') // Status ändern
  .mutation('pav.proposeExaminer') // Vorschlag unterbreiten (mit E-Mail)
  .mutation('pav.directAssignExaminer') // Direkt zuweisen (ohne E-Mail)
  .mutation('thesis.assignColloquium') // Kolloquium anlegen
  .query('colloquium.all') // Alle Kolloquiumstermine
  .mutation('dean.exportCsv') // CSV-Export (mit Statushistorie)
  .query('dean.stats') // Statistik-Daten

// Superadmin-only
superadminProcedure
  .query('admin.users') // Alle Nutzer:innen
  .mutation('admin.updateUserRole') // Rolle ändern
  .mutation('admin.inviteUser') // Nutzer:in per E-Mail einladen
  .query('auditLog.all') // Audit-Log exportieren
  .query('system.stats') // Systemstatistiken
  .mutation('system.updateSettings') // Systemkonfiguration speichern
  .query('emailTemplates.list') // E-Mail-Vorlagen auflisten
  .mutation('emailTemplates.update') // Vorlage bearbeiten
  .query('examiners.list') // Alle Prüfer:innen verwalten
  .mutation('examiners.updateProfile') // Prüfer:innen-Profil bearbeiten

// Audit & Notifications
auditLog.create() // Automatisch bei jeder Statusänderung
notifications.create() // Automatisch bei Zuweisung/Statusänderung
```

### Wichtige Backend-Helfer

```typescript
// server/db.ts – Query-Helfer (Drizzle ORM)
getThesisById(id)
getThesisForStudent(studentId)
getThesisForExaminer(examinerId)
getAllThesisRequests(filters)
updateThesisStatus(id, newStatus, userId)
assignExaminer(thesisId, examinerId, isPrimary)
getExaminerProfile(userId)
getAuditLog(thesisId)
createAuditLogEntry(thesisId, userId, action, oldValue, newValue)
createNotification(userId, title, message, thesisId)

// server/emailHelper.ts – E-Mail-Versand
loadTemplate(key, vars) // Vorlage aus DB laden, Fallback auf Hardcoded
replacePlaceholders(html, vars) // {{platzhalter}} ersetzen
sendExaminerCTAEmail(examiner, thesis, actionUrl) // JWT-Link
sendStatusChangeEmail(student, thesis, newStatus)
sendPasswordResetEmail(email, resetUrl)
sendMagicLinkEmail(email, magicUrl)
sendColloquiumInviteEmail(recipients, colloquium)

// server/jwtHelper.ts – Token-Verwaltung
signExaminerActionToken(examinerId, thesisId, action) // JWT für E-Mail-CTA
verifyExaminerActionToken(token) // Token validieren
signMagicLinkToken(email) // Magic-Link-Token
verifyMagicLinkToken(token)

// server/storage.ts – S3-Integration (vorkonfiguriert)
storagePut(relKey, buffer, contentType) // Upload
storageGet(relKey, expiresIn) // Presigned URL
```

---

## 4. Frontend-Architektur (React 19 + Tailwind 4)

### Seitenstruktur

```
client/src/
├── App.tsx                          # Routing, Role-Guards, Layout
├── main.tsx                         # React-Provider (Theme, Language, Auth)
├── index.css                        # HTW-Design-Tokens (Farben, Fonts)
├── pages/
│   ├── Home.tsx                     # Landing Page (Hero, Rollen, Ablauf, Footer)
│   ├── Login.tsx                    # Magic-Link + Passwort-Login
│   ├── ResetPassword.tsx            # Passwort-Reset-Seite
│   ├── StudentDashboard.tsx         # Anfragen, Exposé-Upload, Suche
│   ├── ExaminerDashboard.tsx        # Anfragen, Profil, Kolloquien
│   ├── ExaminerOnboarding.tsx       # 5-Schritt-Assistent
│   ├── ExaminerDirectory.tsx        # Öffentliches Verzeichnis (mit Filter)
│   ├── ExaminerManagement.tsx       # Superadmin: Prüfer:innen verwalten
│   ├── PavDashboard.tsx             # Admin: Verwaltung, CSV-Export
│   ├── DeanDashboard.tsx            # Dekanat: Anfragen-Übersicht
│   ├── DeanStats.tsx                # Dekanat: Statistik-Dashboard (Recharts)
│   ├── SuperadminDashboard.tsx      # Superadmin: Systemkonfiguration, E-Mail-Vorlagen
│   └── EmailTemplatesTab.tsx        # E-Mail-Vorlagen-Editor
├── components/
│   ├── DashboardLayout.tsx          # Sidebar-Navigation (alle Rollen)
│   ├── DashboardLayoutSkeleton.tsx  # Loading-State
│   ├── LanguageSwitcher.tsx         # DE|EN-Button
│   ├── ThesisDashboardLayout.tsx    # Thesis-spezifisches Layout
│   ├── ProgrammeCard.tsx            # Studiengang-Karte mit Piktogramm
│   ├── ExaminerProgrammeSelector.tsx # Mehrfachauswahl für Prüfer:innen
│   ├── StatusBadge.tsx              # Status-Farbcodierung
│   ├── AuditTimeline.tsx            # Zeitstrahl-Visualisierung
│   └── ui/                          # shadcn/ui Komponenten
├── contexts/
│   ├── LanguageContext.tsx          # DE/EN-Übersetzungen + useLanguage-Hook
│   └── AuthContext.tsx              # (optional, falls nicht über tRPC)
├── hooks/
│   └── useAuth.ts                   # Aktueller Nutzer + Login-URL
├── lib/
│   ├── trpc.ts                      # tRPC-Client-Konfiguration
│   └── const.ts                     # Konstanten (Farben, URLs, etc.)
└── pages/
```

### Design-System (HTW-Branding)

```css
/* client/src/index.css */

@layer base {
  :root {
    /* HTW-Grün (Primary) */
    --color-primary: oklch(45% 0.15 145); /* #006937 */
    --color-primary-light: oklch(85% 0.08 145); /* #f0f8f0 */
    
    /* HTW-Gold (Accent) */
    --color-accent: oklch(72% 0.16 70); /* #d4a574 */
    
    /* Navy (Secondary) */
    --color-secondary: oklch(20% 0.08 250); /* #1a2a4a */
    
    /* Neutral */
    --color-background: oklch(99% 0 0); /* #ffffff */
    --color-foreground: oklch(20% 0 0); /* #333333 */
    --color-border: oklch(90% 0 0); /* #e0e0e0 */
  }
  
  .dark {
    --color-background: oklch(15% 0 0);
    --color-foreground: oklch(95% 0 0);
  }
}

/* Tailwind-Utilities */
.container { margin: 0 auto; max-width: 80rem; padding: 0 1rem; }
.btn-primary { @apply bg-primary text-white hover:bg-primary-dark; }
.status-pending { @apply bg-yellow-100 text-yellow-900; }
.status-accepted { @apply bg-green-100 text-green-900; }
.status-rejected { @apply bg-red-100 text-red-900; }
.status-matched { @apply bg-blue-100 text-blue-900; }
```

### Wichtige Frontend-Hooks

```typescript
// useAuth() – Aktueller Nutzer + Login
const { user, isLoading } = useAuth();
const loginUrl = getLoginUrl('/dashboard');

// useLanguage() – Sprachumschalter
const { language, setLanguage, t } = useLanguage();
// Nutzen: t.landing.title, t.student.myRequests, etc.

// tRPC-Hooks
const { data, isLoading } = trpc.thesis.myRequests.useQuery();
const mutation = trpc.thesis.create.useMutation({
  onSuccess: () => { /* ... */ },
  onError: (err) => { /* ... */ }
});

// Optimistic Updates (für bessere UX)
const mutation = trpc.thesis.updateStatus.useMutation({
  onMutate: async (newData) => {
    await trpc.useUtils().thesis.invalidate();
    // Oder: Manuelles Update des Caches für sofortiges Feedback
  }
});
```

---

## 5. Authentifizierung & Autorisierung

### Authentifizierungs-Flow

1. **Magic-Link (Standard für externe Nutzer:innen)**
   - Nutzer:in gibt E-Mail ein → Backend sendet Link per SMTP
   - Link validiert Token → Session-Cookie gesetzt
   - Nutzer:in ist angemeldet

2. **Passwort-Login (für Testkonten + Superadmin)**
   - E-Mail + Passwort eingeben
   - Backend prüft bcrypt-Hash
   - Session-Cookie gesetzt

3. **Manus OAuth (optional, aktuell nicht aktiv)**
   - Kann später aktiviert werden für zusätzliche Sicherheit

### Rollen & Autorisierung

| Rolle | Zugriff | Besonderheiten |
|-------|---------|---|
| **student** | Eigene Anfragen, Exposé-Upload, Prüfer:innen-Suche | Studiengang einmalig setzbar |
| **examiner** | Anfragen annehmen/ablehnen, Profil, Onboarding | Kapazität + Zweitprüfer:in-Flag |
| **admin** | Alle Anfragen, Zuweisung, CSV-Export, Statistiken | Verwaltung (PAV) + Dekanat |
| **superadmin** | Alles + Systemkonfiguration, E-Mail-Vorlagen, Nutzer:innen-Verwaltung | Nur Superadmins können Rollen vergeben |

### Sicherheit

- **JWT für E-Mail-CTAs:** Prüfer:innen können auf Anfragen antworten, ohne sich anzumelden
- **Passwort-Hashing:** bcrypt mit Salt
- **Session-Cookies:** HttpOnly, Secure, SameSite
- **Role-Guards:** Jede Prozedur prüft Rolle mit `protectedProcedure`, `studentProcedure`, etc.
- **SMTP-Secrets:** Nicht im Code, über `webdev_request_secrets` injiziert

---

## 6. Internationalisierung (DE/EN)

### Übersetzungsstruktur

```typescript
// client/src/contexts/LanguageContext.tsx

const translations = {
  de: {
    nav: { home: "Startseite", dashboard: "Dashboard", ... },
    landing: { title: "Thesis Match Maker", subtitle: "Finden Sie Ihre 2 Betreuungspersonen", ... },
    student: { myRequests: "Meine Anfragen", submitNew: "Neue Anfrage einreichen", ... },
    examiner: { openRequests: "Offene Anfragen", acceptRequest: "Anfrage annehmen", ... },
    pav: { allRequests: "Alle Anfragen", assignExaminer: "Prüfer:in zuweisen", ... },
    dean: { statistics: "Statistiken", requestsPerStatus: "Anfragen pro Status", ... },
    superadmin: { systemSettings: "Systemkonfiguration", emailTemplates: "E-Mail-Vorlagen", ... },
    common: { save: "Speichern", cancel: "Abbrechen", error: "Fehler", ... }
  },
  en: { /* ... */ }
};

// Nutzen im Component
const { t } = useLanguage();
<h1>{t.landing.title}</h1>
```

### Sprach-Persistierung

- **localStorage:** Auswahl wird im Browser gespeichert (sofort wirksam)
- **Datenbank:** `users.preferredLanguage` speichert Nutzerpräferenz (geräteübergreifend)
- **Sync beim Login:** LanguageContext lädt Sprache aus DB beim Authentifizieren

---

## 6a. Phase 25: Erweiterte Internationalisierung (i18n-Verbesserungen)

### Implementierungsschritte

#### 1. Datenbankschema erweitern

```typescript
// drizzle/schema.ts
export const users = sqliteTable('users', {
  // ... existing fields ...
  preferredLanguage: text('preferred_language', { enum: ['de', 'en'] }).default('de'),
});
```

**Migration ausführen:**
```bash
pnpm db:push
```

#### 2. Backend: `user.setLanguage` tRPC-Prozedur

```typescript
// server/routers.ts
export const appRouter = t.router({
  user: t.router({
    setLanguage: protectedProcedure
      .input(z.object({ language: z.enum(['de', 'en']) }))
      .mutation(async ({ ctx, input }) => {
        // Sprache in DB speichern
        await db.users.update(
          { id: ctx.user.id },
          { preferredLanguage: input.language }
        );
        return { success: true, language: input.language };
      }),
  }),
});
```

#### 3. Backend: `auth.me` erweitern

```typescript
// server/routers.ts – auth.me Prozedur
auth: t.router({
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.users.findById(ctx.user.id);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      preferredLanguage: user.preferredLanguage || 'de', // ← Neu
    };
  }),
}),
```

#### 4. Frontend: LanguageContext beim Login aktualisieren

```typescript
// client/src/contexts/LanguageContext.tsx
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(() => {
    try {
      return (localStorage.getItem('htw-lang') as Language) ?? 'de';
    } catch {
      return 'de';
    }
  });

  // Beim Login: Sprache aus DB laden
  const { data: user } = useAuth(); // tRPC hook
  useEffect(() => {
    if (user?.preferredLanguage) {
      setLang(user.preferredLanguage as Language);
      localStorage.setItem('htw-lang', user.preferredLanguage);
    }
  }, [user?.preferredLanguage]);

  const handleSetLang = (newLang: Language) => {
    setLang(newLang);
    try {
      localStorage.setItem('htw-lang', newLang);
      // Optional: In DB speichern wenn eingeloggt
      if (user?.id) {
        trpc.user.setLanguage.mutate({ language: newLang });
      }
    } catch {}
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang: handleSetLang, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}
```

#### 5. LanguageSwitcher: DB-Speicherung hinzufügen

```typescript
// client/src/components/LanguageSwitcher.tsx
export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { lang, setLang } = useLanguage();
  const { data: user } = useAuth();
  const setLanguageMutation = trpc.user.setLanguage.useMutation();

  const handleLanguageChange = (newLang: Language) => {
    setLang(newLang);
    // In DB speichern wenn eingeloggt
    if (user?.id) {
      setLanguageMutation.mutate({ language: newLang });
    }
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        onClick={() => handleLanguageChange('de')}
        className={`px-2 py-1 text-xs font-semibold rounded transition-colors ${
          lang === 'de'
            ? 'bg-[#76B900] text-white'
            : 'text-gray-500 hover:text-gray-800'
        }`}
        aria-label="Deutsch"
      >
        DE
      </button>
      <span className="text-gray-300 text-xs">|</span>
      <button
        onClick={() => handleLanguageChange('en')}
        className={`px-2 py-1 text-xs font-semibold rounded transition-colors ${
          lang === 'en'
            ? 'bg-[#76B900] text-white'
            : 'text-gray-500 hover:text-gray-800'
        }`}
        aria-label="English"
      >
        EN
      </button>
    </div>
  );
}
```

#### 6. LanguageContext: `common.errors` und `common.toasts` erweitern

```typescript
// client/src/contexts/LanguageContext.tsx
const translations = {
  de: {
    // ... existing translations ...
    common: {
      // ... existing common fields ...
      errors: {
        invalidEmail: 'Ungültige E-Mail-Adresse',
        invalidPassword: 'Passwort muss mindestens 8 Zeichen lang sein',
        emailRequired: 'E-Mail ist erforderlich',
        passwordRequired: 'Passwort ist erforderlich',
        userNotFound: 'Benutzer:in nicht gefunden',
        unauthorized: 'Authentifizierung erforderlich',
        forbidden: 'Zugriff verweigert',
        serverError: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.',
        networkError: 'Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.',
        invalidToken: 'Ungültiger oder abgelaufener Token',
        fileTooBig: 'Datei ist zu groß (max. 16 MB)',
        invalidFileType: 'Ungültiger Dateityp',
      },
      toasts: {
        success: 'Erfolgreich!',
        error: 'Fehler',
        warning: 'Warnung',
        info: 'Information',
        saved: 'Gespeichert',
        deleted: 'Gelöscht',
        copied: 'In die Zwischenablage kopiert',
        loading: 'Wird geladen…',
        uploading: 'Wird hochgeladen…',
        processing: 'Wird verarbeitet…',
        requestSent: 'Anfrage versendet',
        profileUpdated: 'Profil aktualisiert',
        settingsSaved: 'Einstellungen gespeichert',
      },
    },
  },
  en: {
    // ... existing translations ...
    common: {
      // ... existing common fields ...
      errors: {
        invalidEmail: 'Invalid email address',
        invalidPassword: 'Password must be at least 8 characters long',
        emailRequired: 'Email is required',
        passwordRequired: 'Password is required',
        userNotFound: 'User not found',
        unauthorized: 'Authentication required',
        forbidden: 'Access denied',
        serverError: 'An error occurred. Please try again later.',
        networkError: 'Network error. Please check your internet connection.',
        invalidToken: 'Invalid or expired token',
        fileTooBig: 'File is too large (max. 16 MB)',
        invalidFileType: 'Invalid file type',
      },
      toasts: {
        success: 'Success!',
        error: 'Error',
        warning: 'Warning',
        info: 'Information',
        saved: 'Saved',
        deleted: 'Deleted',
        copied: 'Copied to clipboard',
        loading: 'Loading…',
        uploading: 'Uploading…',
        processing: 'Processing…',
        requestSent: 'Request sent',
        profileUpdated: 'Profile updated',
        settingsSaved: 'Settings saved',
      },
    },
  },
};
```

#### 7. Toast-Nachrichten in Dashboards übersetzen

```typescript
// client/src/pages/ExaminerDashboard.tsx
const { t } = useLanguage();

const respondMutation = trpc.examiner.respondToRequest.useMutation({
  onSuccess: (data) => {
    if (data.accepted) {
      toast.success(t.common.toasts.success); // Statt hardcodiert
    } else {
      toast.info(t.common.toasts.warning);
    }
  },
  onError: (err) => {
    toast.error(err.message || t.common.toasts.error);
  },
});
```

#### 8. Vitest-Tests für neue Prozeduren

```typescript
// server/user.setLanguage.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createMockContext } from './test-utils';
import { appRouter } from './routers';

describe('user.setLanguage', () => {
  it('speichert Spracheinstellung in DB', async () => {
    const ctx = createMockContext({ user: { id: 1, role: 'student' } });
    const caller = appRouter.createCaller(ctx);

    const result = await caller.user.setLanguage({ language: 'en' });

    expect(result.success).toBe(true);
    expect(result.language).toBe('en');
  });

  it('lehnt unauthentifizierte Anfragen ab', async () => {
    const ctx = createMockContext({ user: null });
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.user.setLanguage({ language: 'de' })
    ).rejects.toThrow('UNAUTHORIZED');
  });
});
```

#### 9. Checkliste für Phase 25

- [ ] `users.preferredLanguage` Spalte hinzufügen und migrieren
- [ ] `user.setLanguage` tRPC-Prozedur implementieren
- [ ] `auth.me` um `preferredLanguage` erweitern
- [ ] LanguageContext beim Login aktualisieren
- [ ] LanguageSwitcher DB-Speicherung hinzufügen
- [ ] `common.errors` und `common.toasts` in LanguageContext ergänzen
- [ ] ExaminerDashboard.tsx Toast-Nachrichten übersetzen
- [ ] PavDashboard.tsx Toast-Nachrichten übersetzen
- [ ] DeanDashboard.tsx Toast-Nachrichten übersetzen
- [ ] StudentDashboard.tsx Toast-Nachrichten übersetzen
- [ ] Vitest-Tests schreiben und ausführen (`pnpm test`)
- [ ] Alle Komponenten mit `useLanguage()` Hook überprüfen
- [ ] Checkpoint erstellen und testen

---

## 7. Seed-Daten & Testkonten

### Testkonten (Passwort: `HTWBerlin2024!`)

```
Superadmin:
  E-Mail: holger@luetters.net
  Rolle: superadmin

Student:
  E-Mail: student@htw-berlin.com
  Rolle: student
  Studiengang: Wirtschaftsinformatik (WI)

Erstprüfer:in:
  E-Mail: firstsupervisor@htw-berlin.com
  Rolle: examiner
  Kapazität: 5 Betreuungen

Zweitprüfer:in:
  E-Mail: secondsupervisor@htw-berlin.com
  Rolle: examiner
  Kapazität: 10 Betreuungen
  isSecondExaminer: true

Verwaltung (PAV):
  E-Mail: verwaltung@htw-berlin.com
  Rolle: admin
```

### Seed-Skripte

```bash
# Alle Seed-Daten anlegen
node seed-examiners.mjs      # 65 Professor:innen + 300 Lehrbeauftragte
node seed-email-templates.mjs # 6 Standard-E-Mail-Vorlagen
node seed-programmes.mjs      # 23 HTW-Studiengänge mit Piktogrammen
```

---

## 8. Deployment & Konfiguration

### Umgebungsvariablen (via `webdev_request_secrets`)

```
# Database
DATABASE_URL=mysql://user:pass@host/db

# JWT & Sessions
JWT_SECRET=<random-secret>

# SMTP (E-Mail-Versand)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@htw-berlin.com
SMTP_PASS=<password>
SMTP_FROM=noreply@htw-berlin.com

# Manus OAuth (optional)
VITE_APP_ID=<app-id>
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im/login

# Storage (S3)
BUILT_IN_FORGE_API_URL=<s3-endpoint>
BUILT_IN_FORGE_API_KEY=<s3-key>

# Analytics (optional)
VITE_ANALYTICS_ENDPOINT=<endpoint>
VITE_ANALYTICS_WEBSITE_ID=<id>
```

### Deployment-Schritte

1. **Checkpoint erstellen:** `webdev_save_checkpoint`
2. **Publish-Button klicken** im Manus Management UI
3. **Domain konfigurieren:** Custom Domain oder manus.space-Subdomain
4. **SMTP testen:** Superadmin-Dashboard → Systemkonfiguration → SMTP-Test
5. **Seed-Daten laden:** `node seed-*.mjs` auf Production-DB

---

## 9. Häufige Entwicklungs-Aufgaben

### Neue Seite hinzufügen

1. Datei erstellen: `client/src/pages/NewPage.tsx`
2. Route in `App.tsx` registrieren
3. `useLanguage()` importieren und Übersetzungsschlüssel in `LanguageContext.tsx` hinzufügen
4. tRPC-Hooks verwenden für Datenabruf
5. Tests in `server/newFeature.test.ts` schreiben

### Neue tRPC-Prozedur

1. Funktion in `server/db.ts` schreiben (Query-Helfer)
2. Prozedur in `server/routers.ts` hinzufügen (mit `protectedProcedure` oder `adminProcedure`)
3. Frontend-Hook: `trpc.feature.useQuery()` oder `useMutation()`
4. Test in `server/feature.test.ts` schreiben

### E-Mail-Vorlage anpassen

1. Superadmin-Dashboard → Tab "E-Mail-Vorlagen"
2. Vorlage auswählen → Bearbeiten
3. Platzhalter verfügbar: `{{studentName}}`, `{{examinerName}}`, `{{thesisTitle}}`, `{{actionUrl}}`
4. Speichern → Änderung ist sofort aktiv

### Sprache hinzufügen

1. `LanguageContext.tsx` → neuen Sprachblock hinzufügen (z.B. `fr: { ... }`)
2. `LanguageSwitcher.tsx` → neue Option hinzufügen
3. Alle Komponenten nutzen automatisch `useLanguage()`

---

## 10. Wichtige Dateien & Referenzen

| Datei | Zweck |
|-------|-------|
| `drizzle/schema.ts` | Datenbankschema (Drizzle ORM) |
| `server/routers.ts` | Alle tRPC-Prozeduren |
| `server/db.ts` | Query-Helfer (Drizzle) |
| `server/emailHelper.ts` | E-Mail-Versand mit DB-Vorlagen |
| `server/jwtHelper.ts` | Token-Verwaltung |
| `client/src/App.tsx` | Routing + Role-Guards |
| `client/src/contexts/LanguageContext.tsx` | DE/EN-Übersetzungen |
| `client/src/pages/Home.tsx` | Landing Page |
| `client/src/components/DashboardLayout.tsx` | Sidebar-Navigation |
| `client/src/index.css` | HTW-Design-Tokens |
| `package.json` | Dependencies + Scripts |
| `todo.md` | Projekt-Checkliste (alle Phasen) |

---

## 11. Tipps für Manus-Neuimplementierung

### Schnellstart-Strategie

1. **Projekt initialisieren:** `webdev_init_project` mit Features: `db`, `server`, `user`
2. **Datenbankschema kopieren:** `drizzle/schema.ts` aus dieser Anweisung
3. **Backend in Phasen aufbauen:**
   - Phase 1: Core-Tabellen + Basic-Queries
   - Phase 2: tRPC-Prozeduren (public, protected, admin)
   - Phase 3: E-Mail + SMTP
   - Phase 4: Authentifizierung (Magic-Link + Passwort)
4. **Frontend in Phasen aufbauen:**
   - Phase 1: Landing Page + Design-System
   - Phase 2: Dashboards (Struktur)
   - Phase 3: Daten-Integration (tRPC-Hooks)
   - Phase 4: i18n (DE/EN)
5. **Testen:** Vitest-Tests für kritische Prozeduren
6. **Seed-Daten:** Testkonten + Studiengänge + E-Mail-Vorlagen
7. **Deployment:** Checkpoint → Publish

### Häufige Fehler vermeiden

- ❌ `isActive`-Spalte in DB nicht vorhanden → Aus Schema entfernen oder DB-Migration durchführen
- ❌ Fehlende Übersetzungsschlüssel → `LanguageContext.tsx` vor Komponenten-Verwendung erweitern
- ❌ S3-Dateien lokal speichern → Immer `storagePut()` verwenden
- ❌ Role-Guards vergessen → `protectedProcedure` + `adminProcedure` verwenden
- ❌ E-Mail-Vorlagen hardcodiert → Immer `loadTemplate()` verwenden

### Performance-Optimierungen

- Nutze `trpc.useUtils().invalidate()` für Caching
- Optimistic Updates für bessere UX
- Pagination für große Datenmengen (Anfragen-Listen)
- Recharts-Diagramme mit `useMemo()` memoizen
- Lazy-Loading für Seiten mit `React.lazy()`

---

## 12. Support & Debugging

### Häufige Fehlerquellen

| Fehler | Ursache | Lösung |
|--------|--------|--------|
| SQL-Fehler (Spalte nicht vorhanden) | Schema nicht migriert | `pnpm db:push` ausführen |
| 401 Unauthorized | Session abgelaufen | Neu anmelden |
| E-Mails nicht versendet | SMTP nicht konfiguriert | `webdev_request_secrets` → SMTP-Daten |
| Übersetzung fehlt | Schlüssel nicht in LanguageContext | Schlüssel hinzufügen + Browser-Cache leeren |
| Bilder nicht sichtbar | S3-URL falsch | `storagePut()` verwenden, nicht lokale Pfade |

### Debugging-Tipps

- **Browser-Konsole:** `console.log()` für Frontend-Fehler
- **Server-Logs:** `tail -f .manus-logs/devserver.log`
- **Datenbank:** SQL-Queries in `webdev_execute_sql` testen
- **tRPC-Fehler:** `onError` in Mutations/Queries loggen
- **Vitest:** `pnpm test` für Unit-Tests

---

**Viel Erfolg bei der Neuimplementierung! 🚀**


---

## 6b. Vollständige Übersetzungsliste (LanguageContext.tsx)

### Struktur der Übersetzungen

Die Übersetzungen sind in `client/src/contexts/LanguageContext.tsx` organisiert nach Funktionsbereichen:

```
translations = {
  de: {
    nav: { ... }                    # Navigation & Layout
    landing: { ... }                # Landing Page
    student: { ... }                # Studierenden-Dashboard
    examiner: { ... }               # Prüfer:innen-Dashboard
    pav: { ... }                    # PAV-Dashboard
    dean: { ... }                   # Dekanat-Dashboard
    superadmin: { ... }             # Superadmin-Dashboard
    onboarding: { ... }             # Onboarding-Assistent
    directory: { ... }              # Prüfer:innen-Verzeichnis
    admin: { ... }                  # Admin-Dashboard
    status: { ... }                 # Status-Codierung
    common: {                        # Globale Strings
      save, cancel, delete, ...
      errors: { ... }               # Fehlermeldungen
      toasts: { ... }               # Toast-Benachrichtigungen
    }
  },
  en: { ... }                        # Englische Übersetzungen (identische Struktur)
}
```

### Aktuelle Übersetzungsschlüssel

#### Navigation (`nav.*`)
```
home, examiners, login, logout, dashboard, student, examiner, admin, directory
```

#### Landing Page (`landing.*`)
```
title, subtitle, tagline, loginBtn, loginMagicLink, loginManus, emailPlaceholder,
sendLink, sending, linkSent, browseExaminers, openArea, fachbereich, heroDesc,
startAsStudent, examinerArea,
features: { match, matchDesc, track, trackDesc, secure, secureDesc },
roles: { title, subtitle, student, studentFeatures, examiner, examinerFeatures, admin, adminFeatures },
process: { label, title, steps },
tech: { label, title, desc, descSuffix, items },
footer: { forStudents, forExaminers, contact, studentLinks, examinerLinks, imprint, privacy, accessibility, copyright }
```

#### Studierenden-Dashboard (`student.*`)
```
title, newRequest, myRequests, noRequests, submitRequest, thesisTitle, description,
department, degreeType, targetSemester, language, uploadExpose, uploading, uploadSuccess,
deadline, downloadIcs, colloquiums, history
```

#### Prüfer:innen-Dashboard (`examiner.*`)
```
title, requests, profile, colloquiums, history, accept, reject, downloadExpose, noRequests,
programmes, toastAccepted, toastRejected, toastProfileSaved, toastEmailSaved, toastRoleSaved,
toastOnboardingDone, statsTotal, statsOpen, statsAccepted, statsMatched,
colStatusScheduled, colStatusCompleted, colStatusCancelled,
auditThesisCreated, auditStatusChanged, auditExaminerAccepted, auditExaminerRejected,
auditFirstAssigned, auditSecondAssigned, auditColloquiumCreated, auditDeadlineSet
```

#### PAV-Dashboard (`pav.*`)
```
title, unassigned, myProgrammes, proposeExaminer, directAssign, sendRequest, sending,
assigning, successPropose, successAssign, role, firstExaminer, secondExaminer,
selectExaminer, selectRole, noUnassigned, noProgrammes, addProgramme, removeProgramme,
bachelor, master, proposalNote
```

#### Dekanat-Dashboard (`dean.*`)
```
title, allRequests, csvExport, exporting, statistics, search, filterStatus, total, pending,
matched, accepted, rejected, dean, viceDean, admin, language_de, language_en, confirmed,
allStatus, searchPlaceholder, colTopic, colStudent, colDepartment, colDegree, colStatus,
colSubmitted, clickForDetails,
stats: {
  title, subtitle, totalRequests, openRequests, avgProcessingTime, completionRate, days,
  byStatus, byProgramme, byMonth, examinerLoad, examinerName, current, max, utilization,
  noData, loading, backToDashboard
}
```

#### Superadmin-Dashboard (`superadmin.*`)
```
title,
tabs: { overview, users, programmes, settings, emailTemplates },
examinerManagement, manageExaminerProfiles, editProfile, profileUpdated, statusUpdated,
confirmStatusChange, statusChangeWarning, noExaminers, department, bio, researchFocus,
maxSupervisions,
emailTemplates: {
  title, subtitle, edit, save, cancel, subject, htmlBody, textBody, preview,
  placeholders, saving, successSave, errorSave, noTemplates
}
```

#### Onboarding (`onboarding.*`)
```
title, subtitle, step1, step2, step3, step4, step5, next, back, finish, skip,
academicTitle, department, bio, researchFocus, officeHours, website, uploadPhoto,
maxSupervisions, isSecondExaminer, selectProgrammes, completing, successComplete
```

#### Prüfer:innen-Verzeichnis (`directory.*`)
```
title, subtitle, search, filterProgramme, filterRole, allProgrammes, allRoles,
firstExaminer, secondExaminer, noResults, capacity, researchFocus, officeHours,
website, requestSupervision
```

#### Admin-Dashboard (`admin.*`)
```
title, overview, requests, audit, users, stats, settings, colloquiums, totalRequests,
pending, matched, users_count
```

#### Status (`status.*`)
```
PENDING, ACCEPTED, REJECTED, MATCHED
```

#### Globale Strings (`common.*`)
```
save, cancel, delete, edit, loading, error, success, confirm, back, search, filter,
all, noData, name, email, status, actions, active, inactive, forbidden, accessDenied,
backHome, close
```

### Phase 25: Neue Übersetzungsschlüssel

#### Fehler (`common.errors.*`)
```
invalidEmail, invalidPassword, emailRequired, passwordRequired, userNotFound,
unauthorized, forbidden, serverError, networkError, invalidToken, fileTooBig,
invalidFileType
```

#### Toast-Benachrichtigungen (`common.toasts.*`)
```
success, error, warning, info, saved, deleted, copied, loading, uploading,
processing, requestSent, profileUpdated, settingsSaved
```

### Verwendungsbeispiel

```typescript
import { useLanguage } from '@/contexts/LanguageContext';

export function MyComponent() {
  const { t } = useLanguage();
  
  return (
    <div>
      <h1>{t.landing.title}</h1>
      <p>{t.landing.subtitle}</p>
      <button>{t.common.save}</button>
      <span className="error">{t.common.errors.invalidEmail}</span>
    </div>
  );
}
```

### Best Practices

1. **Immer `useLanguage()` verwenden** – Nicht direkt auf `translations` zugreifen
2. **Typsicherheit nutzen** – TypeScript warnt bei fehlenden Schlüsseln
3. **Neue Schlüssel hinzufügen** – Immer in beiden Sprachen (DE + EN)
4. **Strukturiert organisieren** – Nach Funktionsbereichen (nav, landing, student, etc.)
5. **Platzhalter verwenden** – Für dynamische Werte (z.B. `${userName}`)

---

## 7. Seed-Daten & Testkonten
