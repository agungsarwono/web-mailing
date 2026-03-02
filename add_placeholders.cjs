const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const fs = require('fs');
const path = require('path');

// Mappings: old text -> placeholder name
// Based on the actual content found in templates
const REPLACEMENTS = [
    // Sub Kegiatan
    { find: 'PENGADAAN/PEMELIHARAAN/ REHABILITASISARANA DAN PRASARANADALAM DAYA TARIK WISATA UNGGULAN KABUPATEN/ KOTA', replace: '{sub_kegiatan}' },
    { find: 'PENGADAAN/ PEMELIHARAAN/ REHABILITASISARANA DAN PRASARANADALAM DAYA TARIK WISATA UNGGULAN KABUPATEN/ KOTA', replace: '{sub_kegiatan}' },
    { find: 'PENGADAAN/PEMELIHARAAN/REHABILITASI SARANA DAN PRASARANA DALAM DAYA TARIK WISATA UNGGULAN KABUPATEN/KOTA', replace: '{sub_kegiatan}' },

    // Paket Pengadaan (varies per template)
    { find: 'Penataan Sarana dan Prasarana Makam Raden Tubagus Kelurahan Karangkebagusan', replace: '{paket_pengadaan}' },
    { find: 'PENATAAN SARANA DAN PRASARANA MAKAM RADEN TUBAGUS KELURAHAN KARANGKEBAGUSAN', replace: '{paket_pengadaan_upper}' },
    { find: 'Perancangan Pekerjaan Konstruksi Penataan Sarana dan Prasarana Makam Raden Tubagus Kelurahan Karangkebagusan', replace: '{paket_pengadaan}' },
    { find: 'PERANCANGAN PEKERJAAN KONSTRUKSIPENATAAN SARANA DAN PRASARANA MAKAM RADEN TUBAGUS KELURAHAN KARANGKEBAGUSAN', replace: '{paket_pengadaan_upper}' },

    // HPS / Harga
    { find: 'Rp 4.000.000,00', replace: 'Rp {nilai_hps}' },
    { find: 'Rp 93.000.000,00', replace: 'Rp {nilai_hps}' },
    { find: 'Empat Juta Rupiah', replace: '{nilai_hps_huruf}' },
    { find: 'Sembilan Puluh Tiga Juta Rupiah', replace: '{nilai_hps_huruf}' },

    // Penyedia
    { find: 'MUHAMMAD ADITYA PRIMA K', replace: '{nama_wakil}' },
    { find: 'CV SUARA ASRI', replace: '{nama_badan_usaha}' },
    { find: 'CV AJI PRIMA KARYA', replace: '{nama_badan_usaha}' },
    { find: 'CV. MULTI KARYA', replace: '{nama_badan_usaha}' },
    { find: 'MASRIKAN, S.T.', replace: '{nama_wakil}' },
    { find: 'SURAJI', replace: '{nama_wakil}' },
    { find: 'Direktur CV SUARA ASRI', replace: 'Direktur {nama_badan_usaha}' },
    { find: 'Direktur CV AJI PRIMA KARYA', replace: 'Direktur {nama_badan_usaha}' },

    // Alamat Penyedia
    { find: 'Kelurahan Protoyudan RT 01 RW 03 Kecamatan Jepara Kabupaten Jepara', replace: '{alamat}' },
    { find: 'Jalan Banyuputih No 50 Kecamatan Kalinyamatan Kabupaten Jepara', replace: '{alamat}' },

    // Jangka Waktu
    { find: '10 (sepuluh) hari kalender', replace: '{jangka_waktu}' },
    { find: '60 (enam puluh) hari kalender', replace: '{jangka_waktu}' },
    { find: '75 (tujuh puluh lima) Hari Kalender', replace: '{jangka_waktu}' },
];

const srcDir = path.resolve('public/templates');
const outDir = path.resolve('public/templates_with_placeholders');

if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.docx') && !f.startsWith('~$'));

files.forEach(file => {
    try {
        const content = fs.readFileSync(path.join(srcDir, file), 'binary');
        const zip = new PizZip(content);

        // Get all XML files in the docx
        const xmlFiles = Object.keys(zip.files).filter(name => name.endsWith('.xml'));

        let totalReplacements = 0;

        xmlFiles.forEach(xmlFile => {
            let xml = zip.file(xmlFile).asText();

            REPLACEMENTS.forEach(({ find, replace }) => {
                // The text in XML might be split across runs, so we need to search in the raw XML
                // But first try simple text replacement
                if (xml.includes(find)) {
                    xml = xml.split(find).join(replace);
                    totalReplacements++;
                }
            });

            zip.file(xmlFile, xml);
        });

        // Write modified file
        const out = zip.generate({ type: 'nodebuffer' });
        fs.writeFileSync(path.join(outDir, file), out);

        console.log(`${file}: ${totalReplacements} replacements made`);
    } catch (e) {
        console.error(`${file}: ERROR - ${e.message}`);
    }
});

console.log('\nDone! Output in:', outDir);
