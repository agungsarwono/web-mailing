import fs from 'fs';
import PizZip from 'pizzip';
import { XMLValidator } from 'fast-xml-parser';
import { replaceTextInDocx, buildReplacements } from './src/utils/generator.js';

const formData = {
    paket_pengadaan: 'Memperbaiki Jalan X',
    alamat: 'Jl. A Yani',
    nomor_spk: 'SPK/123/2025',
    nomor_spmk: 'SPMK/123/2025',
    harga_negosiasi: 'Rp 100.000',
    harga_negosiasi_huruf: 'Seratus Ribu Rupiah',
    jangka_waktu: '30',
    masa_pelaksanaan_start: '2025-01-01',
    masa_pelaksanaan_end: '2025-01-30',
    nomor_ba_serah1: 'BA-001',
    nomor_ba_100: 'BA-100',
    nilai_hps: 'Rp 100.000',
    nilai_hps_huruf: 'Seratus Ribu',
    sistem_pembayaran: 'Sekaligus',
    jenis_kontrak: 'Lumsum'
};

const templatePath = 'd:/test-project/surat-generator/public/templates/11. BA Serah Terima Pekerjaan Pertama.docx';
const content = fs.readFileSync(templatePath);

try {
    const replacements = buildReplacements(formData, 'ba_serah1');
    const resultBuf = replaceTextInDocx(content, replacements);
    const outZip = new PizZip(resultBuf);

    let hasError = false;
    Object.keys(outZip.files).forEach(filename => {
        if (!filename.endsWith('.xml')) return;
        const xmlContent = outZip.file(filename).asText();
        const isValid = XMLValidator.validate(xmlContent);
        if (isValid !== true) {
            console.error('XML CORRUPTION IN:', filename, isValid.err);
            console.error('File Length:', xmlContent.length);
            hasError = true;
        }
    });

    if (!hasError) {
        console.log('NO CORRUPTION DETECTED BY FAST-XML-PARSER.');
    }
} catch (err) {
    console.error('CRASH:', err);
}
