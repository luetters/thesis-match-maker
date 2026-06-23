import { createRequire } from 'module';
import { register } from 'node:module';
import { pathToFileURL } from 'url';

// Use tsx to run TypeScript
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

// Write a small test script
const script = `
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

async function test() {
  try {
    const qrBuffer = await QRCode.toBuffer('https://example.com/verify/abc', {
      errorCorrectionLevel: 'H', width: 120, margin: 1,
      color: { dark: '#1a1a2e', light: '#ffffff' },
    });
    console.log('QR OK, size:', qrBuffer.length);

    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    await new Promise((resolve, reject) => {
      doc.on('end', resolve);
      doc.on('error', reject);
      doc.text('Test');
      doc.end();
    });
    const buf = Buffer.concat(chunks);
    console.log('PDF OK, size:', buf.length);
  } catch(e) {
    console.error('ERROR:', e.message);
    console.error(e.stack);
  }
}
test();
`;

writeFileSync('/tmp/test-pdf-gen.cjs', script);
try {
  const out = execSync('node /tmp/test-pdf-gen.cjs', { cwd: '/home/ubuntu/thesis-match-maker', timeout: 15000 });
  console.log(out.toString());
} catch(e) {
  console.error(e.stdout?.toString());
  console.error(e.stderr?.toString());
}
