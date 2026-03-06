import PizZip from "pizzip";
import { saveAs } from "file-saver";

export function replaceTextInDocx(content, replacements) {
    const zip = new PizZip(content);

    // Escape all values before writing to docx XML tags to prevent MS Word XML parser corruption
    const sanitizedReplacements = {};
    Object.entries(replacements).forEach(([k, v]) => {
        if (v == null) {
            sanitizedReplacements[k] = "";
        } else {
            let strVal = v.toString();
            // Bypass escaping if we are intentionally injecting raw Word XML tags like <w:tab/>
            if (strVal.includes("<w:tab/>") || strVal.includes("</w:t>")) {
                sanitizedReplacements[k] = strVal;
            } else {
                // Encode ONLY mandatory XML entities inside text nodes
                sanitizedReplacements[k] = strVal
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');
            }
        }
    });

    const xmlFiles = Object.keys(zip.files).filter(
        // Only process documents inside the 'word' directory (e.g. word/document.xml)
        // Avoid modifying docProps/ which dictates document Summary Info metadata
        (name) => name.endsWith(".xml") && name.startsWith("word/")
    );

    xmlFiles.forEach((xmlFile) => {
        let xml = zip.file(xmlFile)?.asText();
        if (!xml) return;

        Object.entries(sanitizedReplacements).forEach(([findText, replaceText]) => {
            if (!findText || findText.trim() === "") return;

            // Complex replacement across tags
            // Note: Global xml.includes(findText) shortcut was removed completely to prevent
            // overwriting short identifiers (like '295' for no_akta) that accidentally match
            // overwriting short identifiers (like '295' for no_akta) that accidentally match
            // inside internal XML w:rsid and formatting attributes causing "Unreadable Content"
            const textTagRegex = /<w:t(?: [^>]*)?>(.*?)<\/w:t>/g;
            let match;
            const textParts = [];

            while ((match = textTagRegex.exec(xml)) !== null) {
                textParts.push({
                    fullMatch: match[0],
                    text: match[1],
                    index: match.index,
                    end: match.index + match[0].length,
                });
            }

            let fullText = textParts.map((p) => p.text).join("");
            let cleanFullText = fullText.replace(/[\u200B-\u200D\uFEFF]/g, '');
            let searchIdx = cleanFullText.indexOf(findText);

            // Provide an infinite loop guard in case of unexpected XML shifts
            // max 1000 replacements of the identical string in a single XML file
            let loopGuard = 0;

            while (searchIdx !== -1 && loopGuard++ < 1000) {
                let charCount = 0;
                let startPartIdx = -1;
                let endPartIdx = -1;
                let startCharInPart = 0;
                let endCharInPart = 0;

                for (let i = 0; i < textParts.length; i++) {
                    const partLen = textParts[i].text.length;

                    if (startPartIdx === -1 && charCount + partLen > searchIdx) {
                        startPartIdx = i;
                        startCharInPart = searchIdx - charCount;
                    }

                    if (
                        startPartIdx !== -1 &&
                        charCount + partLen >= searchIdx + findText.length
                    ) {
                        endPartIdx = i;
                        endCharInPart = searchIdx + findText.length - charCount;
                        break;
                    }

                    charCount += partLen;
                }

                if (startPartIdx !== -1 && endPartIdx !== -1) {
                    if (startPartIdx === endPartIdx) {
                        const part = textParts[startPartIdx];
                        const cleanPartText = part.text.replace(/[\u200B-\u200D\uFEFF]/g, '');
                        const newText = cleanPartText.substring(0, startCharInPart) + replaceText + cleanPartText.substring(endCharInPart);

                        // IMMUNE REPLACEMENT: Reconstruct <w:t> tags directly
                        const openingTag = part.fullMatch.substring(0, part.fullMatch.indexOf('>') + 1);
                        const newTag = openingTag + newText + "</w:t>";
                        xml = xml.substring(0, part.index) + newTag + xml.substring(part.end);

                    } else {
                        let currentXml = xml;
                        for (let i = endPartIdx; i >= startPartIdx; i--) {
                            const part = textParts[i];
                            const cleanPartText = part.text.replace(/[\u200B-\u200D\uFEFF]/g, '');
                            let newText;

                            if (i === startPartIdx && i === endPartIdx) {
                                newText = cleanPartText.substring(0, startCharInPart) + replaceText + cleanPartText.substring(endCharInPart);
                            } else if (i === startPartIdx) {
                                newText = cleanPartText.substring(0, startCharInPart) + replaceText;
                            } else if (i === endPartIdx) {
                                newText = cleanPartText.substring(endCharInPart);
                            } else {
                                newText = "";
                            }

                            const openingTag = part.fullMatch.substring(0, part.fullMatch.indexOf('>') + 1);
                            const newTag = openingTag + newText + "</w:t>";
                            currentXml = currentXml.substring(0, part.index) + newTag + currentXml.substring(part.end);
                        }
                        xml = currentXml;
                    }

                    textParts.length = 0;
                    const regex2 = /<w:t(?: [^>]*)?>(.*?)<\/w:t>/g;
                    let m2;
                    while ((m2 = regex2.exec(xml)) !== null) {
                        textParts.push({ fullMatch: m2[0], text: m2[1], index: m2.index, end: m2.index + m2[0].length });
                    }

                    const newFullText = textParts.map((p) => p.text.replace(/[\u200B-\u200D\uFEFF]/g, '')).join('');
                    searchIdx = newFullText.indexOf(findText, searchIdx + replaceText.length);
                } else {
                    break;
                }
            }
        });

        // --- GLOBAL CLEANUP ---
        // Strip out all MS Word yellow highlight placeholders globally so the final output looks clean
        xml = xml.replace(/<w:highlight[^>]*>/g, "");

        zip.file(xmlFile, xml);
    });

    return zip.generate({
        type: "blob",
        mimeType:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
}

// --- Helper Functions ---

const satuan = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
function terbilang(n) {
    n = Math.abs(n);
    let str = "";
    if (n < 12) str = " " + satuan[n];
    else if (n < 20) str = terbilang(n - 10) + " Belas";
    else if (n < 100) str = terbilang(Math.floor(n / 10)) + " Puluh " + terbilang(n % 10);
    else if (n < 200) str = " Seratus" + terbilang(n - 100);
    else if (n < 1000) str = terbilang(Math.floor(n / 100)) + " Ratus" + terbilang(n % 100);
    else if (n < 2000) str = " Seribu" + terbilang(n - 1000);
    else if (n < 1000000) str = terbilang(Math.floor(n / 1000)) + " Ribu" + terbilang(n % 1000);
    else if (n < 1000000000) str = terbilang(Math.floor(n / 1000000)) + " Juta" + terbilang(n % 1000000);
    return str.trim();
}

export function formatRupiahTerbilang(amountStr) {
    if (!amountStr) return "";

    // Remove cents like ",00" before stripping non-digits
    let cleanStr = amountStr.toString().split(',')[0];

    const cleanNum = parseInt(cleanStr.replace(/\D/g, ""), 10);
    if (isNaN(cleanNum)) return "";

    const text = terbilang(cleanNum);
    // Capitalize first letter of each word
    return text.replace(/\b\w/g, l => l.toUpperCase()) + " Rupiah";
}

export function formatDateLongIndo(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;

    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    const dayName = days[d.getDay()];
    const dateNum = d.getDate();
    const monthName = months[d.getMonth()];
    const yearNum = d.getFullYear();

    const toTitleCase = (str) => str.replace(/\b\w/g, l => l.toUpperCase());

    const dateSpelled = toTitleCase(terbilang(dateNum));
    const yearSpelled = toTitleCase(terbilang(yearNum));

    const dd = String(dateNum).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = yearNum;

    return `${dayName} tanggal ${dateSpelled} bulan ${monthName} tahun ${yearSpelled} (${dd}-${mm}-${yyyy})`;
}

function formatDateIndo(dateStr) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr; // Return original if parse fails

    const months = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
}

function formatDateRange(startStr, endStr) {
    if (!startStr || !endStr) return "";
    const startDate = new Date(startStr);
    const endDate = new Date(endStr);

    // Ensure valid dates
    if (isNaN(startDate) || isNaN(endDate)) return "";

    const months = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    const startDay = startDate.getDate();
    const startMonth = months[startDate.getMonth()];
    const endDay = endDate.getDate();
    const endMonth = months[endDate.getMonth()];
    const endYear = endDate.getFullYear();

    // If same month and year: "25 s.d. 30 September 2025"
    // If different month: "25 September s.d. 24 November 2025"
    if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
        return `${startDay} s.d. ${endDay} ${startMonth} ${endYear}`;
    }

    return `${startDay} ${startMonth} s.d. ${endDay} ${endMonth} ${endYear}`;
}


/**
 * Build the replacement map from form data.
 */
export function buildReplacements(formData, templateId) {
    const replacements = {};

    // --- 1. Common Fields ---
    if (formData.paket_pengadaan) {
        const paket = formData.paket_pengadaan;
        const paketUpper = paket.toUpperCase();

        // Target: Header/Titles
        replacements["PENATAAN SARANA DAN PRASARANA MAKAM RADEN TUBAGUS KELURAHAN KARANGKEBAGUSAN"] = paketUpper;
        replacements["PERANCANGAN PEKERJAAN KONSTRUKSIPENATAAN SARANA DAN PRASARANA MAKAM RADEN TUBAGUS KELURAHAN KARANGKEBAGUSAN"] = "PERANCANGAN PEKERJAAN KONSTRUKSI " + paketUpper;

        // Target: Body text
        replacements["Penataan Sarana dan Prasarana Makam Raden Tubagus Kelurahan Karangkebagusan"] = paket;
        replacements["Perancangan Pekerjaan Konstruksi Penataan Sarana dan Prasarana Makam Raden Tubagus Kelurahan Karangkebagusan"] = "Perancangan Pekerjaan Konstruksi " + paket;

        // Target: Specific KAK
        replacements["{paket_pengadaan}"] = paket;
    }

    if (formData.sub_kegiatan) {
        replacements["PENGADAAN/PEMELIHARAAN/ REHABILITASISARANA DAN PRASARANADALAM DAYA TARIK WISATA UNGGULAN KABUPATEN/ KOTA"] = formData.sub_kegiatan.toUpperCase();
        // Handle variations in spacing/newlines
        replacements["PENGADAAN/ PEMELIHARAAN/ REHABILITASISARANA DAN PRASARANADALAM DAYA TARIK WISATA UNGGULAN KABUPATEN/ KOTA"] = formData.sub_kegiatan.toUpperCase();
    }

    if (formData.sistem_pembayaran) {
        // Using explicit <w:tab/> injection to ensure perfect Microsoft Word alignment layout
        replacements["Sistem Pembayaran:pembayaran secara sekaligus"] = `Sistem Pembayaran</w:t><w:tab/><w:t>: pembayaran secara ${formData.sistem_pembayaran.toLowerCase()}`;
        // Fallback in case there are variations
        replacements["Sistem Pembayaran : pembayaran secara sekaligus"] = `Sistem Pembayaran</w:t><w:tab/><w:t>: pembayaran secara ${formData.sistem_pembayaran.toLowerCase()}`;
    }

    // --- 2. MAK & Keluaran (New) ---
    if (formData.mak) {
        // Target specific string from the template
        replacements["3.26.02.2.01.0005.5.1.02.01.01.0039.8.1.0.20.20.90.002.00005"] = formData.mak;
        replacements["3.26.02.2.01.0005.5.1.02.01.01.0039.1.3.0.30.10.10.001.00005"] = formData.mak;
        // Also try spaced version just in case
        replacements["3.26.02.2.01. 0005.5.1.02.0 1.01.0039.8.1 .0.20.20.90.0 02.00005"] = formData.mak;
    }
    if (formData.keluaran) {
        // This overlaps with Paket Pengadaan replacement in some context, but if "Dokumen Perancangan...{paket}" is the key
        // KAK template actually has placeholders {paket_pengadaan}, but user wants to replace "Keluaran" logic entirely?
        // In KAK, Keluaran is "Dokumen Perancangan Pekerjaan Konstruksi {paket_pengadaan}".
        // Re-reading KAK text: "Dokumen Perancangan Pekerjaan Konstruksi {paket_pengadaan}" IS the keluaran.
        // If user wants to replace the WHOLE sentence with custom input:
        replacements["Dokumen Perancangan Pekerjaan Konstruksi {paket_pengadaan}"] = formData.keluaran;
        replacements["Rehabilitasi Bangunan Gedung Transit dan Gudang"] = formData.keluaran;
    }
    if (formData.hps_keluaran) {
        replacements["4.000.000,-"] = formData.hps_keluaran;
        replacements["4.000.000"] = formData.hps_keluaran;
        replacements["Rp 4.000.000,-"] = "Rp " + formData.hps_keluaran;
    }

    // --- 3. Jangka Waktu & Dates ---
    if (formData.jangka_waktu) {
        // Auto-format: "30 (Tiga Puluh) hari kalender"
        const days = parseInt(formData.jangka_waktu);
        const textDays = !isNaN(days) ? `${days} (${terbilang(days).toLowerCase()}) hari kalender` : formData.jangka_waktu;

        replacements["10 (sepuluh) hari kalender"] = textDays;
        replacements["60 (enam puluh) hari kalender"] = textDays;
        replacements["30 (tiga puluh) hari kalender"] = textDays;
        replacements["60 (enam puluh) Hari Kalender"] = textDays;
        replacements["10 (tujuh) hari kalender"] = textDays; // Found in KAK
    }

    if (formData.masa_pelaksanaan_start && formData.masa_pelaksanaan_end) {
        const rangeText = formatDateRange(formData.masa_pelaksanaan_start, formData.masa_pelaksanaan_end);
        replacements["25 September s.d. 24 November 2025"] = rangeText;
        replacements["26 September s.d. 24 November 2025"] = rangeText;
    }

    // --- 4. Harga & HPS ---
    if (formData.pagu_anggaran) {
        replacements["{PAGU_NOMINAL}"] = formData.pagu_anggaran;
        replacements["{PAGU_HURUF}"] = formatRupiahTerbilang(formData.pagu_anggaran);
    }

    if (formData.nilai_hps) {
        // Clean formatting
        const raw = formData.nilai_hps.replace(/[Rp.,]/g, "").trim();
        const num = parseInt(raw); // e.g. 93000000
        // Format with separators for display
        const display = "Rp " + num.toLocaleString("id-ID") + ",00";

        replacements["Rp 4.000.000,00"] = display;
        replacements["Rp 93.000.000,00"] = display;
        replacements["93.000.000,00"] = display.replace("Rp ", ""); // For the HPS table specifically
        replacements["{HPS_NOMINAL}"] = display;

        // Terbilang auto-generation if not manually provided?
        // User has input for "Huruf", we use that if available, else auto-generate?
        // User asked for input fields, so we prioritize inputs.
    }
    if (formData.nilai_hps_huruf) {
        replacements["Empat Juta Rupiah"] = formData.nilai_hps_huruf;
        replacements["Sembilan Puluh Tiga Juta Rupiah"] = formData.nilai_hps_huruf;
        replacements["{HPS_HURUF}"] = formData.nilai_hps_huruf;
    }

    if (formData.harga_negosiasi) {
        const raw = formData.harga_negosiasi.replace(/[Rp.,]/g, "").trim();
        const num = parseInt(raw);
        const display = "Rp " + num.toLocaleString("id-ID") + ",00";

        replacements["Rp 3.800.000,00"] = display;
    }
    if (formData.harga_negosiasi_huruf) {
        replacements["(Tiga Juta Delapan Ratus Ribu Rupiah)"] = `(${formData.harga_negosiasi_huruf})`;
        replacements["( Tiga Juta Delapan Ratus Ribu Rupiah )"] = `(${formData.harga_negosiasi_huruf})`;
    }

    // --- 5. Pejabat (New) ---
    if (formData.nama_ppk) {
        replacements["MOH EKO UDYYONO, S.IP, MH"] = formData.nama_ppk;
        replacements["AGUS PRIYADI, S.T., M.M."] = formData.nama_ppk;
    }
    if (formData.nip_ppk) {
        replacements["19730501 199311 1 002"] = formData.nip_ppk;
        replacements["19761017 200501 1 006"] = formData.nip_ppk;
    }
    if (formData.jabatan_ppk) {
        replacements["Pembina Utama Muda"] = formData.jabatan_ppk;
        replacements["Penata Tingkat I"] = formData.jabatan_ppk;
        replacements["Pembina Tk. I"] = formData.jabatan_ppk;

        // Target specifically the word "Pembina" for SPK, SPMK, Ringkasan Kontrak
        // using the exact matching word context generated by docxtemplater
        replacements["Pembina"] = formData.jabatan_ppk;
    }
    if (formData.golongan_ppk) {
        replacements["IV/c"] = formData.golongan_ppk; // Example placeholder, adjust as needed
        replacements["III/d"] = formData.golongan_ppk; // Example placeholder, adjust as needed
    }

    // --- SPMK Specifics (Hoisted to prevent "9 Agustus 2023" date string collisions with Tanggal SPK) ---
    if (formData.spmk_tanggal_selesai) { // NEW EXCLUSIVE FIELD
        const formattedDate = formatDateIndo(formData.spmk_tanggal_selesai);
        replacements["24 November 2025;"] = `${formattedDate};`;
        replacements["24 November 2025"] = formattedDate; // Fallback
    } else if (formData.masa_pelaksanaan_end) {
        // Fallback for backward compatibility if the exclusive field is empty
        const formattedDate = formatDateIndo(formData.masa_pelaksanaan_end);
        replacements["24 November 2025;"] = `${formattedDate};`;
        replacements["24 November 2025"] = formattedDate; // Fallback
    }

    if (formData.spmk_tanggal_mulai) { // NEW EXCLUSIVE FIELD
        const d = formatDateIndo(formData.spmk_tanggal_mulai);
        replacements["kerja : 26 September 2025"] = "kerja : " + d;
        replacements["Jepara, 26 September 2025"] = "Jepara, " + d;
    } else if (formData.tanggal_spmk) {
        // Fallback option B
        const d = formatDateIndo(formData.tanggal_spmk);
        replacements["kerja : 26 September 2025"] = "kerja : " + d;
        replacements["Jepara, 26 September 2025"] = "Jepara, " + d;
    }

    // --- 6. Nomor Surat (Expanded) ---
    // Undangan
    if (formData.nomor_undangan) replacements["027.2/0464.3"] = formData.nomor_undangan;
    if (formData.tanggal_undangan) replacements["17 September 2025"] = formatDateIndo(formData.tanggal_undangan);

    // Hasil PL
    if (formData.nomor_hasil_pl) replacements["027.2/0464.10"] = formData.nomor_hasil_pl;
    if (formData.tanggal_hasil_pl) replacements["23 September 2025"] = formatDateIndo(formData.tanggal_hasil_pl);

    // Nota Dinas
    if (formData.nomor_nota_dinas) replacements["027/3-019/2024"] = formData.nomor_nota_dinas;
    if (formData.tanggal_nota_dinas) {
        replacements["Tanggal:20 Agustus 2025"] = "Tanggal</w:t><w:tab/><w:tab/><w:t>: " + formatDateIndo(formData.tanggal_nota_dinas);
        replacements["Tanggal: 20 Agustus 2025"] = "Tanggal</w:t><w:tab/><w:tab/><w:t>: " + formatDateIndo(formData.tanggal_nota_dinas);
    }
    if (formData.kode_sirup) replacements["60274049"] = formData.kode_sirup;

    // SPPBJ
    if (formData.nomor_sppbj) replacements["027.2/3-005.1"] = formData.nomor_sppbj;
    if (formData.tanggal_sppbj) replacements["29 Agustus 2025"] = formatDateIndo(formData.tanggal_sppbj);

    // SPK
    if (formData.nomor_spk) replacements["027.2/3-012.3/FISIK/2025"] = formData.nomor_spk;

    // SPMK Context Overrides & SPK fallback logic
    if (templateId === 'ringkasan_kontrak') {
        // In Ringkasan Kontrak, the generic "26 September 2025" without context is the SPMK date!
        if (formData.tanggal_spk) {
            const spkDate = formatDateIndo(formData.tanggal_spk);
            replacements["Tanggal 26 September 2025"] = "Tanggal " + spkDate;
        }

        // Handle Source of Funds Literal specific to Ringkasan Kontrak
        if (formData.sumber_anggaran) {
            replacements["Anggaran Pendapatan dan Belanja Daerah (APBD) Kabupaten Jepara Tahun Perubahan 2025"] = formData.sumber_anggaran;
        }
        // Handle Bank Name Literal specific to Ringkasan Kontrak
        if (formData.nama_bank) {
            replacements["BPD Bank Jateng"] = formData.nama_bank;
        }

        // Handle Source of Funds Literal
        if (formData.sumber_anggaran) {
            replacements["Anggaran Pendapatan dan Belanja Daerah (APBD) Kabupaten Jepara Tahun Perubahan 2025"] = formData.sumber_anggaran;
        }
        // Handle Bank Name Literal
        if (formData.nama_bank) {
            replacements["BPD Bank Jateng"] = formData.nama_bank;
        }

        if (formData.spmk_tanggal_mulai || formData.tanggal_spmk) {
            const spmkDate = formatDateIndo(formData.spmk_tanggal_mulai || formData.tanggal_spmk);
            replacements["Jepara, 26 September 2025"] = "Jepara, " + spmkDate;
            replacements["26 September 2025"] = spmkDate; // Isolates cleanly inside <w:t> so <w:tab/> is untouched
        }
    } else {
        // For SPMK, BA Capaian 100%, and other templates
        if (formData.spmk_tanggal_mulai || formData.tanggal_spmk) {
            const d = formatDateIndo(formData.spmk_tanggal_mulai || formData.tanggal_spmk);
            replacements["kerja : 26 September 2025"] = "kerja : " + d;
            replacements["Jepara, 26 September 2025"] = "Jepara, " + d;
            replacements["Tanggal Mulai Pekerjaan:26 September 2025"] = "Tanggal Mulai Pekerjaan:" + d;
            // The SPMK date inside BA Capaian 100% was manually patched in the docx to 27 Sept to protect its <w:tab/> separator
            replacements["27 September 2025"] = d;
        }
        if (formData.tanggal_spk) {
            replacements["26 September 2025"] = formatDateIndo(formData.tanggal_spk);
        }
    }

    // SPMK
    if (formData.nomor_spmk) replacements["027.2/3-012.4/FISIK/2025"] = formData.nomor_spmk;

    // BAST Lokasi
    if (formData.nomor_bast_lokasi) replacements["027.2/3-012.5/FISIK/2025"] = formData.nomor_bast_lokasi;

    // --- 7. Data Penyedia & Lainnya ---
    if (formData.nama_badan_usaha) {
        replacements["CV SUARA ASRI"] = formData.nama_badan_usaha;
        replacements["CV ABADI JAYA"] = formData.nama_badan_usaha;
        replacements["CV AJI PRIMA KARYA"] = formData.nama_badan_usaha;
    }
    if (formData.nama_wakil) {
        replacements["MASRIKAN, S.T."] = formData.nama_wakil;
        replacements["SURAJI"] = formData.nama_wakil;
        replacements["MUHAMMAD ADITYA PRIMA K"] = formData.nama_wakil;
    }
    if (formData.lokasi_pekerjaan) {
        replacements["Makam Tubagus Kelurahan Karangkebagusan Kabupaten Jepara"] = formData.lokasi_pekerjaan;
        replacements["Makam Raden Tubagus Kelurahan Karangkebagusan. Kecamatan Jepara Kabupaten Jepara."] = formData.lokasi_pekerjaan;
        replacements["Desa X, Kecamatan Y, Kabupaten Z"] = formData.lokasi_pekerjaan;
        replacements["Penataan Area Dermaga Pantai Tirta Samudra Bandengan"] = formData.paket_pengadaan; // Often location/paket is used interchangeably in text
    }

    // Specific Fixes for BA Templates (25%, 100%, Bayar)
    // Paket
    if (formData.paket_pengadaan) {
        replacements["Penataan Area Dermaga Pantai Tirta Samudra Bandengan"] = formData.paket_pengadaan;
    }
    // Alamat Provider (Hardcoded in BA)
    if (formData.alamat) {
        replacements["Jalan Banyuputih No 50 Kecamatan Kalinyamatan Kabupaten Jepara"] = formData.alamat;
    }
    // Nomor Kontrak (Different in BA)
    if (formData.nomor_spk) {
        replacements["027.2/3-013.3/FISIK/2025"] = formData.nomor_spk;
    }
    // Nomor SPMK (Different in BA)
    if (formData.nomor_spmk) {
        replacements["027.2/3-013.5/FISIK/2025"] = formData.nomor_spmk;
    }
    // Harga (Different in BA)
    if (formData.nilai_hps) { // Or Harga Negosiasi? Usually Contract Price = Negosiasi
        // We use hps or negosiasi. Let's use harga_negosiasi if available, else HPS
        const priceVal = formData.harga_negosiasi || formData.nilai_hps;
        if (priceVal) {
            const raw = priceVal.replace(/[Rp.,]/g, "").trim();
            const num = parseInt(raw);
            const display = "Rp " + num.toLocaleString("id-ID") + ",00";
            replacements["Rp 185.474.000,00"] = display;
        }
    }
    // Terbilang Harga (Hardcoded in BA)
    if (formData.harga_negosiasi_huruf || formData.nilai_hps_huruf) {
        const huruf = formData.harga_negosiasi_huruf || formData.nilai_hps_huruf;
        replacements["Seratus Delapan Puluh Lima Juta Empat Ratus Tujuh Puluh Empat Ribu Rupiah"] = huruf;
    }
    // Waktu Pelaksanaan (Complex string in BA)
    if (formData.jangka_waktu && formData.masa_pelaksanaan_start && formData.masa_pelaksanaan_end) {
        // "75 (tujuh puluh lima) Hari Kalender 26 September s.d. 9 Desember 2025"
        const days = parseInt(formData.jangka_waktu);
        const textDays = !isNaN(days) ? `${days} (${terbilang(days).toLowerCase()}) Hari Kalender` : formData.jangka_waktu;
        const rangeDate = formatDateRange(formData.masa_pelaksanaan_start, formData.masa_pelaksanaan_end);

        replacements["75 (tujuh puluh lima) Hari Kalender 26 September s.d. 9 Desember 2025"] = `${textDays} ${rangeDate}`;
    }

    // SPK Specifics
    if (formData.sub_kegiatan) {
        replacements["PENGADAAN/PEMELIHARAAN/REHABILITASI SARANA DAN PRASARANA DALAM DAYA TARIK WISATA UNGGULAN KABUPATEN/KOTA"] = formData.sub_kegiatan;
    }
    if (formData.harga_negosiasi) {
        const raw = formData.harga_negosiasi.replace(/[Rp.,]/g, "").trim();
        const num = parseInt(raw);
        const display = "Rp " + num.toLocaleString("id-ID") + ",00";
        // Also map just the number if the "Rp" parsing is disconnected from the digits in XML
        replacements["92.691.000,00"] = display.replace("Rp ", "");
        replacements["Rp 92.691.000,00"] = display;
        replacements["92.691"] = num.toLocaleString("id-ID").split('.')[0] + "." + num.toLocaleString("id-ID").split('.')[1];
    }
    if (formData.harga_negosiasi_huruf) {
        replacements["(Sembilan Puluh Dua Juta Enam Ratus Sembilan Puluh Satu Ribu Rupiah)"] = `(${formData.harga_negosiasi_huruf})`;
    }
    if (formData.alamat) {
        replacements["Kelurahan Protoyudan RT 01 RW 03 Kecamatan Jepara Kabupaten Jepara"] = formData.alamat;
    }
    if (formData.no_akta) {
        replacements["295"] = formData.no_akta;
    }
    if (formData.tgl_akta) {
        replacements["27 Januari 2023"] = formatDateIndo(formData.tgl_akta);
    }
    if (formData.nama_notaris) {
        replacements["RAHMI NURLAILI. S.H, M.Kn."] = formData.nama_notaris;
    }
    if (formData.sumber_anggaran) {
        replacements["Anggaran Pendapatan dan Belanja Daerah Kabupaten Jepara Tahun 2024."] = formData.sumber_anggaran;
        replacements["Anggaran Pendapatan dan Belanja Daerah Perubahan (APBDP) Kabupaten Jepara Tahun 2025"] = formData.sumber_anggaran;
        replacements["Anggaran Pendapatan dan Belanja Daerah Perubahan (APBDP) Kabupaten Jepara Tahun Perubahan 2025"] = formData.sumber_anggaran;
    }

    // BA Capaian 25%
    if (formData.nomor_ba_25) {
        replacements["027.2/3-013.2/FISIK/2025"] = formData.nomor_ba_25;
        if (templateId === 'ba_25') replacements["027.2/3-013.8/FISIK/2025"] = formData.nomor_ba_25;
    }
    if (formData.tanggal_ba_25 && templateId === 'ba_25') {
        replacements["Kamis tanggal Tiga Puluh bulan Oktober tahun Dua Ribu Dua Puluh Lima (30-10-2025)"] = formatDateLongIndo(formData.tanggal_ba_25);
    }
    if (formData.nomor_surat_permohonan_ba_25 && formData.tanggal_surat_permohonan_ba_25) {
        // Targets "Konsultan Pengawas nomor : 002/DAH/X/2025 tanggal 11 Januari 2025 " literal text
        replacements["002/DAH/X/2025"] = formData.nomor_surat_permohonan_ba_25;
        replacements["11 Januari 2025"] = formatDateIndo(formData.tanggal_surat_permohonan_ba_25);
    }

    // BA Capaian 100%
    if (formData.nomor_ba_100) {
        replacements["027.2/3-013.3/FISIK/2025"] = formData.nomor_ba_100;
        if (templateId === 'ba_100') replacements["027.2/3-013.9/FISIK/2025"] = formData.nomor_ba_100;
        // Legacy copy-paste fallback
        if (templateId === 'ba_100') replacements["027.2/3-013.8/FISIK/2025"] = formData.nomor_ba_100;
    }
    if (formData.tanggal_ba_100 && templateId === 'ba_100') {
        replacements["Senin tanggal Delapan bulan Desember tahun Dua Ribu Dua Puluh Lima (08-12-2025)"] = formatDateLongIndo(formData.tanggal_ba_100);
    }
    if (formData.nomor_surat_permohonan_ba_25 && formData.tanggal_surat_permohonan_ba_25) {
        // Targets "Konsultan Pengawas nomor : 004/DAH/XII/2025 tanggal 25 November 2025 " literal text
        replacements["004/DAH/XII/2025"] = formData.nomor_surat_permohonan_ba_25;
        replacements["25 November 2025"] = formatDateIndo(formData.tanggal_surat_permohonan_ba_25);
    }

    // BA Serah Terima Pertama
    if (formData.nomor_ba_serah1) {
        replacements["027.2/3-013.4/FISIK/2025"] = formData.nomor_ba_serah1;
        if (templateId === 'ba_serah1') {
            replacements["027.2/3-013.10/FISIK/2025"] = formData.nomor_ba_serah1;
            replacements["027.2/3-013.11/FISIK/2025"] = formData.nomor_ba_serah1;
        }
    }
    if (formData.tanggal_ba_serah1 && templateId === 'ba_serah1') {
        replacements["Selasa tanggal Sembilan bulan Desember tahun Dua Ribu Dua Puluh Lima (09-12-2025)"] = formatDateLongIndo(formData.tanggal_ba_serah1);
    }
    if (templateId === 'ba_serah1' && formData.nama_ppk) {
        replacements["AGUS PRIYADI, S.T., M.M"] = formData.nama_ppk;
    }
    if (templateId === 'ba_serah1' && formData.golongan_ppk) {
        replacements["Pejabat Penandatangan Kontrak Dinas Pariwisata dan Kebudayaan Kabupaten Jepara"] = formData.golongan_ppk;
    }
    if (templateId === 'ba_serah1' && formData.alamat_instansi) {
        replacements["Jalan AR Hakim Nomor 51 Jepara"] = formData.alamat_instansi;
    }

    // BA Bayar Uang Muka
    if (formData.nomor_ba_bayar_uang_muka) {
        replacements["027.2/3-013.1/FISIK/2025"] = formData.nomor_ba_bayar_uang_muka; // Existent target
        replacements["934/3-016.1"] = formData.nomor_ba_bayar_uang_muka; // Specific missed target
    }
    if (formData.jabatan_wakil && formData.nama_badan_usaha) {
        replacements["Direktur CV. MULTI KARYA"] = `${formData.jabatan_wakil} ${formData.nama_badan_usaha}`;
    }
    if (formData.nomor_surat_permohonan_um) {
        replacements["[nomor surat permohonan pembayaran uang muka pekerjaan]"] = formData.nomor_surat_permohonan_um;
    }
    if (formData.tanggal_surat_permohonan_um) {
        replacements["[tanggal surat permohonan pembayaran uang muka pekerjaan]"] = formatDateIndo(formData.tanggal_surat_permohonan_um);
    }
    if (formData.paket_pengadaan) {
        replacements["Konstruksi Pembangunan Tempat Parkir Pantai Tirta Samudera Bandengan"] = formData.paket_pengadaan;
    }
    if (formData.tanggal_ba_bayar_uang_muka) {
        replacements["Kamis tanggal sebelas bulan Juli tahun dua ribu dua puluh empat (11-07-2024)"] = formatDateLongIndo(formData.tanggal_ba_bayar_uang_muka);

        // Month and Year extraction for the signature location "Jepara,   Juli 2024"
        const d = new Date(formData.tanggal_ba_bayar_uang_muka);
        if (!isNaN(d.getTime())) {
            const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
            const monthName = months[d.getMonth()];
            replacements["Juli 2024"] = `${monthName} ${d.getFullYear()}`;
            replacements["Jepara,        Juli 2024"] = `Jepara, ${monthName} ${d.getFullYear()}`;
        }
    }
    if (formData.nama_badan_usaha) {
        replacements["Penyedia\nCV. MULTI KARYA"] = `Penyedia\n${formData.nama_badan_usaha}`;
        replacements["Penyedia</w:t></w:r><w:r><w:t>CV. MULTI KARYA"] = `Penyedia</w:t></w:r><w:r><w:t>${formData.nama_badan_usaha}`;
        replacements["Penyedia CV. MULTI KARYA"] = `Penyedia\n${formData.nama_badan_usaha}`;
        replacements["CV. MULTI KARYA"] = formData.nama_badan_usaha;
    }
    if (formData.nama_wakil && formData.jabatan_wakil) {
        // Signee replacements: Name and Role
        replacements["ABDUL HAKIM"] = formData.nama_wakil;
        replacements["Direktur"] = formData.jabatan_wakil;
        replacements["ABDUL HAKIM\nDirektur"] = `${formData.nama_wakil}\n${formData.jabatan_wakil}`;
        replacements["ABDUL HAKIM</w:t></w:r><w:r><w:t>Direktur"] = `${formData.nama_wakil}</w:t></w:r><w:r><w:t>${formData.jabatan_wakil}`;
    }

    // BA Bayar 100%
    if (formData.nomor_ba_bayar_100) {
        replacements["027.2/3-013.6/FISIK/2025"] = formData.nomor_ba_bayar_100;
        if (templateId === 'ba_bayar100') replacements["027.2/3-013.11/FISIK/2025"] = formData.nomor_ba_bayar_100;
    }
    if (formData.tanggal_ba_bayar_100 && templateId === 'ba_bayar100') {
        replacements["Senin tanggal Delapan bulan Desember tahun Dua Ribu Dua Puluh Lima (08-12-2025)"] = formatDateLongIndo(formData.tanggal_ba_bayar_100);
    }
    // Robustness checks removed because they are handled in explicit blocks above

    // BAST (Berita Acara Serah Terima) Specifics
    if (formData.nomor_spk) {
        replacements["027.2/3-007.1"] = formData.nomor_spk;
    }
    if (formData.lokasi_pekerjaan) {
        replacements["Makam Raden Tubagus Kelurahan Karangkebagusan."] = formData.lokasi_pekerjaan;
        // In case the template doesn't have the period at the end
        replacements["Makam Raden Tubagus Kelurahan Karangkebagusan"] = formData.lokasi_pekerjaan;
    }
    // BA Bayar 100%
    if (templateId === 'ba_bayar100') {
        if (formData.nomor_surat_permohonan_ba_100) {
            replacements["[nomor surat]"] = formData.nomor_surat_permohonan_ba_100;
        }
        if (formData.tanggal_surat_permohonan_ba_100) {
            replacements["[tanggal surat]"] = formatDateIndo(formData.tanggal_surat_permohonan_ba_100);
        }
        if (formData.tanggal_ba_bayar_100) {
            const d100 = new Date(formData.tanggal_ba_bayar_100);
            if (!isNaN(d100.getTime())) {
                const mo100 = [
                    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
                    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
                ][d100.getMonth()];
                replacements["Jepara,      Desember 2025"] = `Jepara,      ${mo100} ${d100.getFullYear()}`;
            }
        }
    }

    // SPPBJ & HPS Specifics
    if (formData.tanggal_dokumen_hps) {
        const formattedHpsDate = formatDateIndo(formData.tanggal_dokumen_hps);
        // Replace in HPS and KAK templates
        replacements["Jepara, 10 September 2025"] = `Jepara, ${formattedHpsDate}`;
        replacements["Jepara, 20 Agustus 2025"] = `Jepara, ${formattedHpsDate}`; // Target KAK docx specific format
        // Additional replacement format sometimes found in other templates
        replacements["10 September 2025"] = formattedHpsDate;
    }
    if (formData.tanggal_sppbj) {
        replacements["11 Mei 2020"] = formatDateIndo(formData.tanggal_sppbj);
    }
    if (formData.nomor_surat_penawaran) {
        replacements["03/01/Penwr/MAPK/VIII/2025"] = formData.nomor_surat_penawaran;
    }
    if (formData.tanggal_surat_penawaran) {
        replacements["25 Agustus 2025"] = formatDateIndo(formData.tanggal_surat_penawaran);
    }
    if (formData.harga_negosiasi) {
        const raw = formData.harga_negosiasi.replace(/[Rp.,]/g, "").trim();
        const num = parseInt(raw);
        const display = "Rp " + num.toLocaleString("id-ID") + ",00";
        replacements["Rp 92.000.000,00"] = display;
    }
    if (formData.harga_negosiasi_huruf) {
        replacements["(Sembilan Puluh Dua Juta Rupiah)"] = `(${formData.harga_negosiasi_huruf})`;
    }



    return replacements;
}

export const generateDocument = async (templateName, formData, templateId) => {
    try {
        const response = await fetch(`/templates/${templateName}`);
        if (!response.ok) {
            throw new Error(`Failed to load template: ${templateName}`);
        }
        const content = await response.arrayBuffer();

        const replacements = buildReplacements(formData, templateId);
        const blob = replaceTextInDocx(content, replacements);

        const outputName = `${templateName.replace(".docx", "")}_Generated.docx`;
        saveAs(blob, outputName);
        return true;
    } catch (error) {
        console.error("Error generating document:", error);
        throw error;
    }
};

export default generateDocument;
