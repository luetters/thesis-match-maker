/**
 * Seed-Skript: ~65 Professor:innen (Erstprüfer:innen) + ~300 Lehrbeauftragte (Zweitprüfer:innen)
 * für HTW Berlin Fachbereich 3
 * Ausführen mit: node seed-examiners.mjs
 */
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

// Typische deutsche Vor- und Nachnamen für realistische Testdaten
const firstNamesFemale = [
  'Anna', 'Maria', 'Julia', 'Laura', 'Sarah', 'Katharina', 'Christina', 'Sabine',
  'Petra', 'Monika', 'Claudia', 'Andrea', 'Stefanie', 'Nicole', 'Susanne', 'Birgit',
  'Karin', 'Martina', 'Silke', 'Anja', 'Heike', 'Ulrike', 'Renate', 'Ingrid',
  'Brigitte', 'Elisabeth', 'Ursula', 'Gisela', 'Helga', 'Erika', 'Lena', 'Sophie',
  'Emma', 'Hannah', 'Mia', 'Lea', 'Johanna', 'Clara', 'Luisa', 'Nora'
];

const firstNamesMale = [
  'Thomas', 'Michael', 'Andreas', 'Stefan', 'Christian', 'Klaus', 'Peter', 'Martin',
  'Jürgen', 'Markus', 'Frank', 'Ralf', 'Bernd', 'Uwe', 'Dieter', 'Holger',
  'Thorsten', 'Carsten', 'Sven', 'Dirk', 'Axel', 'Rainer', 'Volker', 'Heinz',
  'Werner', 'Gerhard', 'Manfred', 'Günter', 'Horst', 'Walter', 'Felix', 'Lukas',
  'Jonas', 'Maximilian', 'Tobias', 'Florian', 'Sebastian', 'Philipp', 'Daniel', 'Jan',
  'Alexander', 'Patrick', 'Dominik', 'Christoph', 'Benjamin', 'Fabian', 'Simon', 'Tim',
  'Niklas', 'Leon', 'Paul', 'David', 'Johannes', 'Matthias', 'Georg', 'Rolf'
];

const lastNames = [
  'Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker',
  'Schulz', 'Hoffmann', 'Schäfer', 'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf',
  'Schröder', 'Neumann', 'Schwarz', 'Zimmermann', 'Braun', 'Krüger', 'Hofmann', 'Hartmann',
  'Lange', 'Schmitt', 'Werner', 'Schmitz', 'Krause', 'Meier', 'Lehmann', 'Schmid',
  'Schulze', 'Maier', 'Köhler', 'Herrmann', 'König', 'Walter', 'Mayer', 'Huber',
  'Kaiser', 'Fuchs', 'Peters', 'Lang', 'Scholz', 'Möller', 'Weiß', 'Jung',
  'Hahn', 'Schubert', 'Vogel', 'Friedrich', 'Keller', 'Günther', 'Frank', 'Berger',
  'Winkler', 'Roth', 'Beck', 'Lorenz', 'Baumann', 'Franke', 'Albrecht', 'Schuster',
  'Simon', 'Ludwig', 'Böhm', 'Winter', 'Kraus', 'Martin', 'Schumacher', 'Krämer',
  'Vogt', 'Stein', 'Jäger', 'Otto', 'Sommer', 'Groß', 'Seidel', 'Heinrich',
  'Brandt', 'Haas', 'Schreiber', 'Graf', 'Schulte', 'Dietrich', 'Ziegler', 'Kuhn',
  'Kühn', 'Pohl', 'Engel', 'Horn', 'Busch', 'Bergmann', 'Thomas', 'Voigt',
  'Sauer', 'Arnold', 'Wolff', 'Pfeiffer', 'Böhme', 'Hess', 'Langer', 'Kraft'
];

// Forschungsgebiete für Prüfer:innen-Profile
const professorResearchAreas = [
  'Unternehmensführung und strategisches Management',
  'Controlling und Rechnungswesen',
  'Marketing und Marktforschung',
  'Personalmanagement und Organisationsentwicklung',
  'Finanzwirtschaft und Investition',
  'Wirtschaftsrecht und Vertragsgestaltung',
  'Immobilienwirtschaft und Stadtentwicklung',
  'Internationale Wirtschaftsbeziehungen',
  'Öffentliche Verwaltung und Public Management',
  'Nonprofit-Management und Sozialwirtschaft',
  'Wirtschaftspolitik und Volkswirtschaftslehre',
  'Steuerrecht und Unternehmensbesteuerung',
  'Arbeitsrecht und Sozialversicherungsrecht',
  'Logistik und Supply Chain Management',
  'Digitale Transformation und E-Commerce',
  'Nachhaltigkeitsmanagement und CSR',
  'Wirtschaftsethik und Corporate Governance',
  'Entrepreneurship und Innovationsmanagement',
  'Quantitative Methoden und Statistik',
  'Wirtschaftsinformatik und Digitalisierung',
];

const lecturerSpecializations = [
  'Buchführung und Jahresabschluss',
  'Kosten- und Leistungsrechnung',
  'Wirtschaftsmathematik',
  'Statistik und Datenanalyse',
  'Mikroökonomie',
  'Makroökonomie',
  'Betriebliche Steuerlehre',
  'Handels- und Gesellschaftsrecht',
  'Arbeitsrecht',
  'Bürgerliches Recht',
  'Finanzierung und Investition',
  'Bankbetriebslehre',
  'Versicherungswirtschaft',
  'Immobilienbewertung',
  'Mietrecht und WEG-Recht',
  'Projektmanagement',
  'Qualitätsmanagement',
  'Change Management',
  'Personalentwicklung',
  'Führung und Kommunikation',
  'Internationales Management',
  'Exportwirtschaft',
  'Zollrecht und Außenhandel',
  'Sozialrecht',
  'Verwaltungsrecht',
  'Kommunalrecht',
  'Vergaberecht',
  'Compliance und Datenschutz',
  'IT-Recht',
  'Medienrecht',
  'Bilanzanalyse',
  'Wirtschaftsprüfung',
  'Unternehmensbewertung',
  'Mergers & Acquisitions',
  'Private Equity',
  'Kapitalmarktrecht',
  'Insolvenzrecht',
  'Sanierungsmanagement',
  'Krisenmanagement',
  'Risikomanagement',
];

const languages = [
  ['Deutsch'],
  ['Englisch'],
  ['Deutsch', 'Englisch'],
  ['Deutsch', 'Englisch', 'Französisch']
];

// Studiengänge IDs aus der DB (1-19)
const programmeIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateName() {
  const isFemale = Math.random() < 0.45;
  const firstName = isFemale ? randomFrom(firstNamesFemale) : randomFrom(firstNamesMale);
  const lastName = randomFrom(lastNames);
  return { firstName, lastName, isFemale };
}

function generateHtwEmail(firstName, lastName, suffix = '') {
  const clean = (s) => s.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '');
  return `${clean(firstName)}.${clean(lastName)}${suffix}@htw-berlin.de`;
}

function generateExternalEmail(firstName, lastName) {
  const clean = (s) => s.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '');
  const domains = ['gmail.com', 'web.de', 'gmx.de', 't-online.de', 'outlook.com', 'freenet.de'];
  return `${clean(firstName)}.${clean(lastName)}@${randomFrom(domains)}`;
}

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const passwordHash = await bcrypt.hash('HTWBerlin2024!', 10);

  // Alle Studiengänge aus der DB laden
  const [programmes] = await conn.query('SELECT id, name FROM programmes');
  const programmeIdList = programmes.map(p => p.id);

  let created = 0;
  let skipped = 0;

  // ── 65 Professor:innen (Erstprüfer:innen, isSecondExaminer=0) ──────────────
  console.log('Erstelle 65 Professor:innen (Erstprüfer:innen)...');
  const usedEmails = new Set();

  for (let i = 0; i < 65; i++) {
    const { firstName, lastName } = generateName();
    let email = generateHtwEmail(firstName, lastName);
    // Duplikate vermeiden
    let suffix = 1;
    while (usedEmails.has(email)) {
      email = generateHtwEmail(firstName, lastName, suffix++);
    }
    usedEmails.add(email);

    // Prüfen ob E-Mail schon existiert
    const [existing] = await conn.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) { skipped++; continue; }

    const title = Math.random() < 0.5 ? 'Prof. Dr.' : 'Prof.';
    const name = `${title} ${firstName} ${lastName}`;

    const [userResult] = await conn.query(
      'INSERT INTO users (name, email, role, passwordHash, openId, createdAt) VALUES (?, ?, ?, ?, UUID(), NOW())',
      [name, email, 'examiner', passwordHash]
    );
    const userId = userResult.insertId;

    // Profil anlegen
    const researchArea = randomFrom(professorResearchAreas);
    const bio = `${title} ${firstName} ${lastName} lehrt und forscht im Bereich ${researchArea} am Fachbereich 3 der HTW Berlin.`;
    const capacity = randomInt(2, 5);
    const lang = randomFrom(languages);
    const prog1 = randomFrom(programmeIdList);
    const prog2 = Math.random() > 0.5 ? randomFrom(programmeIdList) : null;

    await conn.query(
      `INSERT INTO examiner_profiles 
       (userId, bio, researchFocus, languages, maxSupervisions, isSecondExaminer, onboardingCompleted, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, 0, 1, NOW(), NOW())`,
      [userId, bio, researchArea, JSON.stringify(lang), capacity]
    );

    // Studiengangszuordnung
    await conn.query('INSERT INTO examiner_programmes (examiner_id, programme_id) VALUES (?, ?)', [userId, prog1]);
    if (prog2 && prog2 !== prog1) {
      await conn.query('INSERT INTO examiner_programmes (examiner_id, programme_id) VALUES (?, ?)', [userId, prog2]);
    }

    created++;
    if (created % 10 === 0) process.stdout.write(`  ${created} Professor:innen erstellt...\n`);
  }
  console.log(`  ✓ ${created} Professor:innen erstellt, ${skipped} übersprungen`);

  // ── 300 Lehrbeauftragte (Zweitprüfer:innen, isSecondExaminer=1) ────────────
  console.log('Erstelle 300 Lehrbeauftragte (Zweitprüfer:innen)...');
  let lecturerCreated = 0;
  let lecturerSkipped = 0;

  for (let i = 0; i < 300; i++) {
    const { firstName, lastName } = generateName();
    // Lehrbeauftragte haben oft externe E-Mails
    const useExternal = Math.random() < 0.6;
    let email = useExternal
      ? generateExternalEmail(firstName, lastName)
      : generateHtwEmail(firstName, lastName);

    let suffix = 1;
    while (usedEmails.has(email)) {
      email = useExternal
        ? generateExternalEmail(firstName, lastName + suffix++)
        : generateHtwEmail(firstName, lastName, suffix++);
    }
    usedEmails.add(email);

    const [existing] = await conn.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) { lecturerSkipped++; continue; }

    // Lehrbeauftragte haben selten akademische Titel
    const hasTitle = Math.random() < 0.3;
    const title = hasTitle ? (Math.random() < 0.7 ? 'Dr.' : 'RA') : '';
    const name = title ? `${title} ${firstName} ${lastName}` : `${firstName} ${lastName}`;

    const [userResult] = await conn.query(
      'INSERT INTO users (name, email, role, passwordHash, openId, createdAt) VALUES (?, ?, ?, ?, UUID(), NOW())',
      [name, email, 'examiner', passwordHash]
    );
    const userId = userResult.insertId;

    // Profil anlegen
    const specialization = randomFrom(lecturerSpecializations);
    const bio = `${name} ist Lehrbeauftragte:r am Fachbereich 3 der HTW Berlin mit Schwerpunkt ${specialization}.`;
    const capacity = randomInt(1, 3);
    const lang = randomFrom(languages);
    const prog1 = randomFrom(programmeIdList);

    // Alternative E-Mail für externe Lehrbeauftragte
    const altEmail = useExternal ? null : (Math.random() < 0.3 ? generateExternalEmail(firstName, lastName) : null);

    await conn.query(
      `INSERT INTO examiner_profiles 
       (userId, bio, researchFocus, languages, maxSupervisions, isSecondExaminer, onboardingCompleted, alternativeEmail, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, 1, 1, ?, NOW(), NOW())`,
      [userId, bio, specialization, JSON.stringify(lang), capacity, altEmail]
    );

    // Studiengangszuordnung
    await conn.query('INSERT INTO examiner_programmes (examiner_id, programme_id) VALUES (?, ?)', [userId, prog1]);

    lecturerCreated++;
    if (lecturerCreated % 50 === 0) process.stdout.write(`  ${lecturerCreated} Lehrbeauftragte erstellt...\n`);
  }
  console.log(`  ✓ ${lecturerCreated} Lehrbeauftragte erstellt, ${lecturerSkipped} übersprungen`);

  await conn.end();
  console.log('\n✅ Seed abgeschlossen!');
  console.log(`   Professor:innen: ${created}`);
  console.log(`   Lehrbeauftragte: ${lecturerCreated}`);
  console.log(`   Gesamt neue Prüfer:innen: ${created + lecturerCreated}`);
}

main().catch(console.error);
