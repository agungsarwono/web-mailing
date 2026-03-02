const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const fs = require('fs');

const templateDir = 'public/templates';
const files = fs.readdirSync(templateDir).filter(f => f.endsWith('.docx') && !f.startsWith('~$'));

files.forEach(file => {
    try {
        const content = fs.readFileSync(templateDir + '/' + file, 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
        const text = doc.getFullText();

        // Find potential placeholder-like patterns
        const curlyMatches = text.match(/\{[^}]+\}/g);

        console.log('=== ' + file + ' ===');
        console.log('Length:', text.length);
        console.log('Placeholders {}: ', curlyMatches || 'NONE');
        console.log('Full text (first 1000 chars):');
        console.log(text.substring(0, 1000));
        console.log('');
        console.log('---');
    } catch (e) {
        console.error(file + ': ERROR -', e.message);
    }
});
