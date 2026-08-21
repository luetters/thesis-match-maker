// Markdown adapter entry.
// Prepared projects receive report-theme.typ beside this file.

#import "@preview/cmarker:0.1.10"
#import "@preview/mitex:0.2.7": mitex
#import "@preview/glossarium:0.5.10": make-glossary, register-glossary, print-glossary
#import "report-theme.typ": report-theme

#let markdown-source = "source.md"

#show: report-theme.with(
  first-line-indent: none,
  running-header: false,
)
#show: make-glossary

#let transition-terms = (
  (key: "dns", short: "DNS", long: "Domain Name System", description: [Dienst zur Zuordnung einer Domain wie `thesis.htw-berlin.com` zu einer Serveradresse.]),
  (key: "s3", short: "S3", long: "S3-kompatibler Object Storage", description: [Privater Dateispeicher für Uploads und Sicherungen mit standardisierter Programmierschnittstelle.]),
  (key: "smtp", short: "SMTP", long: "Simple Mail Transfer Protocol", description: [Standardprotokoll für den Versand der System-E-Mails.]),
  (key: "tls", short: "TLS", long: "Transport Layer Security", description: [Verschlüsselung für HTTPS-Verbindungen zwischen Browser und Server.]),
  (key: "cron", short: "Cron", long: "Geplante Hintergrundaufgabe", description: [Zeitgesteuerter Prozess für Erinnerungen und regelmäßige Systemaufgaben.]),
  (key: "2fa", short: "2FA", long: "Zwei-Faktor-Authentifizierung", description: [Zusätzliche Anmeldung mit zeitbasiertem Einmalcode.]),
)
#register-glossary(transition-terms)

// cmarker emits tables with all-auto column widths. Re-emit those tables as
// full-width, booktabs-style tables while leaving explicitly sized tables alone.
#show table: it => {
  if it.columns.len() > 0 and it.columns.all(column => column == auto) {
    table(
      columns: (1fr,) * it.columns.len(),
      align: it.align,
      stroke: none,
      inset: (x: 10pt, y: 7pt),
      fill: (_, y) => if y > 0 and calc.even(y) { luma(248) } else { none },
      table.hline(stroke: 1pt),
      ..it.children.filter(
        child => child.func() != table.hline and child.func() != table.vline,
      ),
      table.hline(stroke: 1pt),
    )
  } else {
    it
  }
}
#show table.cell.where(y: 0): set text(weight: "bold")

// mitex renders LaTeX equations found in the Markdown source.
#cmarker.render(read(markdown-source), math: mitex)

#pagebreak()
= Begriffsverzeichnis
#print-glossary(transition-terms, show-all: true, disable-back-references: true)
