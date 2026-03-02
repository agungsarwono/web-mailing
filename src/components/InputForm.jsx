import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
    CardFooter,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { generateDocument } from "@/utils/generator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const TEMPLATES = [
    { id: "kak", name: "1. Kerangka Acuan Kerja.docx", label: "Kerangka Acuan Kerja (KAK)", icon: "📋" },
    { id: "hps", name: "1. Informasi Paket.docx", label: "HPS / Informasi Paket", icon: "📦" },
    { id: "nota_dinas", name: "2. Nota Dinas.docx", label: "Nota Dinas", icon: "📝" },
    { id: "uraian", name: "3. Uraian Singkat Pekerjaan.docx", label: "Uraian Singkat Pekerjaan", icon: "📄" },
    { id: "sppbj", name: "4. SPPBJ.docx", label: "SPPBJ", icon: "✅" },
    { id: "spk", name: "5. SPK.docx", label: "SPK / Kontrak", icon: "📑" },
    { id: "bast_lokasi", name: "6. BAST Lokasi Kerja.docx", label: "BA Serah Terima Lokasi", icon: "📍" },
    { id: "spmk", name: "7. SPMK.docx", label: "SPMK", icon: "🚀" },
    { id: "ba_uang_muka", name: "8. BA Pembayaran Uang Muka.docx", label: "BA Uang Muka", icon: "💰" },
    { id: "ba_25", name: "9. BA Pemeriksaan Capaian 25 Persen Pekerjaan.docx", label: "BA Capaian 25%", icon: "📊" },
    { id: "ba_100", name: "10. BA Pemeriksaan Capaian 100 Persen Pekerjaan.docx", label: "BA Capaian 100%", icon: "🏆" },
    { id: "ba_serah1", name: "11. BA Serah Terima Pekerjaan Pertama.docx", label: "BA Serah Terima Pertama", icon: "🤝" },
    { id: "ba_bayar100", name: "12. BA Pembayaran Prestasi Pekerjaan Termin 100 Persen.docx", label: "BA Bayar 100%", icon: "💵" },
    { id: "ringkasan_kontrak", name: "Ringkasan Kontrak.docx", label: "Ringkasan Kontrak", icon: "📑" },
];

const STEPS = [
    { id: 1, title: "Informasi Kegiatan", icon: "🏗️" },
    { id: 2, title: "Detail Kontrak & Surat", icon: "📝" },
    { id: 3, title: "Data Penyedia", icon: "🏢" },
    { id: 4, title: "Legalitas", icon: "⚖️" },
    { id: 5, title: "Pilih & Generate", icon: "🚀" },
];

export default function InputForm() {
    const [activeStep, setActiveStep] = useState(1);
    const [savedProfiles, setSavedProfiles] = useState([]);
    const [showAutofill, setShowAutofill] = useState(false);
    const autofillRef = useRef(null);

    useEffect(() => {
        try {
            const stored = localStorage.getItem('surat_generator_autofill_profiles');
            if (stored) setSavedProfiles(JSON.parse(stored));
        } catch (e) {
            console.error("Failed to load profiles", e);
        }

        const handleClickOutside = (e) => {
            if (autofillRef.current && !autofillRef.current.contains(e.target)) {
                setShowAutofill(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const saveCurrentProfile = () => {
        if (!formData.paket_pengadaan && !formData.sub_kegiatan) return;

        setSavedProfiles(prev => {
            const newProfile = {
                id: Date.now(),
                dateSaved: new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
                name: formData.paket_pengadaan || formData.sub_kegiatan,
                sub_name: formData.sub_kegiatan || formData.lokasi_pekerjaan,
                data: { ...formData }
            };

            // Remove duplicates with same name
            const filtered = prev.filter(p => p.name !== newProfile.name);
            const updated = [newProfile, ...filtered].slice(0, 10);
            localStorage.setItem('surat_generator_autofill_profiles', JSON.stringify(updated));
            return updated;
        });
    };

    const [formData, setFormData] = useState({
        // Informasi Kegiatan
        sub_kegiatan: "",
        paket_pengadaan: "",
        lokasi_pekerjaan: "",
        sumber_anggaran: "",
        pagu_anggaran: "",
        nilai_hps: "",
        nilai_hps_huruf: "",
        kode_sirup: "",
        mata_anggaran: "", // MAK
        keluaran: "", // Keluaran Output
        hps_keluaran: "", // HPS Keluaran Output

        // Detail Kontrak
        jangka_waktu: "",
        masa_pelaksanaan_start: "", // New Date Range Start
        masa_pelaksanaan_end: "",   // New Date Range End
        jenis_kontrak: "",
        sistem_pembayaran: "Sekaligus", // New Dropdown
        harga_negosiasi: "", // New
        harga_negosiasi_huruf: "", // New
        tanggal_inspeksi: "", // New

        // Pejabat (Editable)
        nama_ppk: "MOH EKO UDYYONO, S.IP, MH",
        nip_ppk: "19730501 199311 1 002",
        jabatan_ppk: "Pembina Utama Muda",

        // Nomor & Tanggal Surat
        nomor_nota_dinas: "",
        tanggal_nota_dinas: "",
        nomor_undangan: "",
        tanggal_undangan: "",
        nomor_hasil_pl: "",
        tanggal_hasil_pl: "",
        nomor_surat_penawaran: "",
        tanggal_surat_penawaran: "",
        nomor_sppbj: "",
        tanggal_sppbj: "",
        nomor_spk: "",
        tanggal_spk: "",
        nomor_spmk: "",
        tanggal_spmk: "",
        nomor_bast_lokasi: "",
        nomor_ba_25: "",
        nomor_ba_100: "",
        nomor_ba_serah1: "",
        nomor_ba_bayar_uang_muka: "",
        nomor_ba_bayar_100: "",
        nomor_sppump: "", // Surat Perintah Pembayaran Uang Muka

        // Data Penyedia
        nama_badan_usaha: "",
        nama_wakil: "",
        jabatan_wakil: "",
        alamat: "",
        npwp: "",
        kab_kota: "",
        no_telepon: "",
        email: "",
        nama_bank: "",
        no_rekening: "",

        // Legalitas
        no_akta: "",
        nama_notaris: "",
        tgl_akta: "",
    });

    const [selectedTemplates, setSelectedTemplates] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedCount, setGeneratedCount] = useState(0);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name, value) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleTemplateSelect = (templateId) => {
        setSelectedTemplates((prev) =>
            prev.includes(templateId)
                ? prev.filter((id) => id !== templateId)
                : [...prev, templateId]
        );
    };

    const selectAll = () => {
        if (selectedTemplates.length === TEMPLATES.length) {
            setSelectedTemplates([]);
        } else {
            setSelectedTemplates(TEMPLATES.map((t) => t.id));
        }
    };

    const handleGenerate = async () => {
        if (selectedTemplates.length === 0) {
            alert("Pilih minimal satu dokumen untuk digenerate.");
            return;
        }

        setIsGenerating(true);
        setGeneratedCount(0);
        try {
            for (let i = 0; i < selectedTemplates.length; i++) {
                const templateId = selectedTemplates[i];
                const template = TEMPLATES.find((t) => t.id === templateId);
                if (template) {
                    await generateDocument(template.name, formData, template.id);
                    setGeneratedCount(i + 1);
                }
            }
            saveCurrentProfile();
        } catch (error) {
            console.error(error);
            alert("Terjadi kesalahan: " + error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const renderInput = (name, label, placeholder = "", type = "text") => {
        const isSubKegiatan = name === "sub_kegiatan";

        return (
            <div className="space-y-1.5 group relative" ref={isSubKegiatan ? autofillRef : null}>
                <Label
                    htmlFor={name}
                    className="text-sm font-medium text-muted-foreground group-focus-within:text-primary transition-colors"
                >
                    {label}
                </Label>
                <Input
                    id={name}
                    name={name}
                    type={type}
                    value={formData[name]}
                    onChange={(e) => {
                        handleChange(e);
                        if (isSubKegiatan && savedProfiles.length > 0) setShowAutofill(true);
                    }}
                    onFocus={() => {
                        if (isSubKegiatan && savedProfiles.length > 0) setShowAutofill(true);
                    }}
                    placeholder={placeholder}
                    className="h-11 bg-background/50 border-border/60 focus:border-primary focus:bg-background transition-all duration-200"
                />

                {/* Autofill Popover */}
                {isSubKegiatan && showAutofill && (
                    <div className="absolute top-[100%] left-0 w-full mt-1 bg-[#202124] text-white border border-[#3c4043] rounded-lg shadow-xl z-50 overflow-hidden text-sm">
                        <div className="p-2 border-b border-[#3c4043] flex justify-between items-center bg-[#292a2d]">
                            <span className="text-[#9aa0a6] font-medium px-2">Saved info</span>
                            <button type="button" onClick={() => setShowAutofill(false)} className="text-[#9aa0a6] hover:text-white p-1 rounded-md hover:bg-[#3c4043]">
                                ✕
                            </button>
                        </div>
                        <ul className="max-h-60 overflow-y-auto">
                            {savedProfiles.map((p) => (
                                <li key={p.id}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFormData(p.data);
                                            setShowAutofill(false);
                                        }}
                                        className="w-full text-left px-4 py-3 hover:bg-[#3c4043] transition-colors border-b border-[#3c4043]/30 last:border-0 flex flex-col gap-1 text-white"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-base truncate">{p.name || "Tanpa Judul"}</span>
                                            {p.id === savedProfiles[0].id && (
                                                <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded whitespace-nowrap flex-shrink-0">Last used</span>
                                            )}
                                        </div>
                                        <span className="text-xs text-[#9aa0a6] truncate">{p.sub_name} • {p.dateSaved}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        );
    };

    const renderSelect = (name, label, options) => (
        <div className="space-y-1.5 group">
            <Label
                htmlFor={name}
                className="text-sm font-medium text-muted-foreground group-focus-within:text-primary transition-colors"
            >
                {label}
            </Label>
            <Select onValueChange={(val) => handleSelectChange(name, val)} value={formData[name]}>
                <SelectTrigger className="h-11 bg-background/50 border-border/60 focus:border-primary">
                    <SelectValue placeholder="Pilih..." />
                </SelectTrigger>
                <SelectContent>
                    {options.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                            {opt}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );

    const filledFields = Object.values(formData).filter((v) => v.trim() !== "").length;
    const totalFields = Object.keys(formData).length;
    const progress = Math.round((filledFields / totalFields) * 100);

    return (
        <div className="min-h-screen bg-gradient-subtle relative overflow-hidden">
            {/* Decorative blobs */}
            <div className="blob-1" />
            <div className="blob-2" />

            {/* Header */}
            <header className="bg-gradient-hero text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute bottom-0 right-0 w-72 h-72 bg-white rounded-full translate-x-1/3 translate-y-1/3" />
                </div>
                <div className="container mx-auto px-4 py-8 relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl backdrop-blur-sm">
                            📄
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">Surat Generator</h1>
                    </div>
                    <p className="text-white/80 text-sm ml-[52px]">
                        Sistem otomatis pembuatan dokumen pengadaan barang dan jasa
                    </p>

                    {/* Progress */}
                    <div className="mt-6 ml-[52px]">
                        <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-white/70">Kelengkapan Data</span>
                            <span className="font-semibold">{progress}%</span>
                        </div>
                        <div className="progress-bar bg-white/20">
                            <div
                                className="progress-bar-fill !bg-white/80"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                </div>
            </header>

            {/* Step Indicator */}
            <div className="container mx-auto px-4 -mt-4 relative z-20">
                <div className="glass rounded-2xl p-3 shadow-lg">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                        {STEPS.map((step, idx) => (
                            <button
                                key={step.id}
                                onClick={() => setActiveStep(step.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 flex-1 justify-center min-w-[120px]
                  ${activeStep === step.id
                                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                                        : "hover:bg-accent text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                <span className="text-base">{step.icon}</span>
                                <span className="hidden lg:inline">{step.title}</span>
                                <span className="lg:hidden text-xs">
                                    {step.id}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <main className="container mx-auto px-4 py-6 relative z-10">
                {/* Step 1: Informasi Kegiatan */}
                {activeStep === 1 && (
                    <div className="animate-slide-in max-w-3xl mx-auto">
                        <Card className="card-hover shadow-lg border-0 glass">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl">
                                        🏗️
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl">Informasi Kegiatan</CardTitle>
                                        <CardDescription>
                                            Data dasar kegiatan, anggaran, dan lokasi
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {renderInput("sub_kegiatan", "Sub Kegiatan", "Pengadaan/Pemeliharaan/Rehabilitasi Sarana...")}
                                {renderInput("paket_pengadaan", "Paket Pengadaan", "Penataan Sarana dan Prasarana...")}
                                {renderInput("lokasi_pekerjaan", "Lokasi Pekerjaan", "Desa X, Kecamatan Y, Kabupaten Z")}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {renderInput("sumber_anggaran", "Sumber Anggaran/Dana", "APBD Perubahan 2025")}
                                    {renderInput("pagu_anggaran", "Pagu Anggaran", "Rp 100.000.000,00")}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {renderInput("nilai_hps", "Nilai HPS (Angka)", "93.000.000 (tanpa Rp)")}
                                    {renderInput("nilai_hps_huruf", "Nilai HPS (Huruf)", "Sembilan Puluh Tiga Juta Rupiah")}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {renderInput("kode_sirup", "Kode SiRUP", "60274049")}
                                    {renderInput("mak", "Mata Anggaran Kegiatan (MAK)", "3.26.02...")}
                                </div>
                                {renderInput("keluaran", "Keluaran (Output)", "Dokumen Perancangan Pekerjaan Konstruksi...")}
                                {renderInput("hps_keluaran", "Nilai HPS Keluaran", "Misal: 4.000.000,-")}
                            </CardContent>
                            <CardFooter className="flex justify-end pt-2">
                                <Button
                                    onClick={() => setActiveStep(2)}
                                    className="btn-shine bg-primary hover:bg-primary/90 gap-2"
                                >
                                    Selanjutnya
                                    <span>→</span>
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                )}

                {/* Step 2: Detail Kontrak & Surat */}
                {activeStep === 2 && (
                    <div className="animate-slide-in max-w-3xl mx-auto">
                        <Card className="card-hover shadow-lg border-0 glass">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl">
                                        📝
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl">Detail Kontrak & Surat</CardTitle>
                                        <CardDescription>
                                            Nomor surat, tanggal penting, dan pejabat
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Kontrak Section */}
                                <div className="space-y-4 border-b border-border/50 pb-4">
                                    <h3 className="font-semibold text-primary">A. Data Kontrak</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {renderInput("jangka_waktu", "Jangka Waktu (Hari)", "30")}
                                        {renderSelect("sistem_pembayaran", "Sistem Pembayaran", ["Sekaligus", "Termin"])}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {renderInput("masa_pelaksanaan_start", "Mulai Pelaksanaan", "", "date")}
                                        {renderInput("masa_pelaksanaan_end", "Selesai Pelaksanaan", "", "date")}
                                    </div>
                                    {renderInput("harga_negosiasi", "Harga Negosiasi (Angka)", "92.000.000")}
                                    {renderInput("harga_negosiasi_huruf", "Harga Negosiasi (Huruf)", "Sembilan Puluh Dua Juta Rupiah")}
                                    {renderInput("jenis_kontrak", "Jenis Kontrak", "Lumsum")}
                                </div>

                                {/* Pejabat Section */}
                                <div className="space-y-4 border-b border-border/50 pb-4">
                                    <h3 className="font-semibold text-primary">B. Pejabat Pembuat Komitmen (PPK)</h3>
                                    {renderInput("nama_ppk", "Nama PPK", "MOH EKO UDYYONO, S.IP, MH")}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {renderInput("nip_ppk", "NIP PPK", "19730501 199311 1 002")}
                                        {renderInput("jabatan_ppk", "Jabatan PPK", "Pembina Utama Muda")}
                                    </div>
                                </div>

                                {/* Surat Section */}
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-primary">C. Nomor & Tanggal Surat</h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/20 p-3 rounded-lg">
                                        {renderInput("nomor_nota_dinas", "Nomor Nota Dinas")}
                                        {renderInput("tanggal_nota_dinas", "Tanggal Nota Dinas")}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/20 p-3 rounded-lg">
                                        {renderInput("nomor_undangan", "Nomor Undangan Pengadaan")}
                                        {renderInput("tanggal_undangan", "Tanggal Undangan")}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/20 p-3 rounded-lg">
                                        {renderInput("nomor_hasil_pl", "Nomor Hasil Pengadaan")}
                                        {renderInput("tanggal_hasil_pl", "Tanggal Hasil Pengadaan")}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/20 p-3 rounded-lg">
                                        {renderInput("nomor_surat_penawaran", "Nomor Surat Penawaran")}
                                        {renderInput("tanggal_surat_penawaran", "Tanggal Surat Penawaran")}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/20 p-3 rounded-lg">
                                        {renderInput("nomor_sppbj", "Nomor SPPBJ")}
                                        {renderInput("tanggal_sppbj", "Tanggal SPPBJ")}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/20 p-3 rounded-lg">
                                        {renderInput("nomor_spk", "Nomor SPK")}
                                        {renderInput("tanggal_spk", "Tanggal SPK")}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/20 p-3 rounded-lg">
                                        {renderInput("nomor_spmk", "Nomor SPMK")}
                                        {renderInput("tanggal_spmk", "Tanggal SPMK")}
                                        {renderInput("spmk_tanggal_mulai", "Mulai Kerja (SPMK)", "", "date")}
                                        {renderInput("spmk_tanggal_selesai", "Waktu Penyelesaian (SPMK)", "", "date")}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {renderInput("nomor_bast_lokasi", "Nomor BAST Lokasi")}
                                        {renderInput("tanggal_inspeksi", "Tanggal Inspeksi Lapangan")}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {renderInput("nomor_ba_25", "Nomor BA Capaian 25%")}
                                        {renderInput("nomor_ba_100", "Nomor BA Capaian 100%")}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {renderInput("nomor_ba_serah1", "Nomor BA Serah Terima I")}
                                        {renderInput("nomor_ba_bayar_100", "Nomor BA Bayar 100%")}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {renderInput("nomor_ba_bayar_uang_muka", "Nomor BA Uang Muka")}
                                        {renderInput("nomor_sppump", "Nomor SPPUMP")}
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between pt-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setActiveStep(1)}
                                    className="gap-2"
                                >
                                    <span>←</span>
                                    Kembali
                                </Button>
                                <Button
                                    onClick={() => setActiveStep(3)}
                                    className="btn-shine bg-primary hover:bg-primary/90 gap-2"
                                >
                                    Selanjutnya
                                    <span>→</span>
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                )}

                {/* Step 3: Data Penyedia */}
                {activeStep === 3 && (
                    <div className="animate-slide-in max-w-2xl mx-auto">
                        <Card className="card-hover shadow-lg border-0 glass">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl">
                                        🏢
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl">Data Penyedia</CardTitle>
                                        <CardDescription>
                                            Informasi perusahaan penyedia barang/jasa
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {renderInput("nama_badan_usaha", "Nama Badan Usaha", "CV ABADI JAYA")}
                                <div className="grid grid-cols-2 gap-4">
                                    {renderInput("nama_wakil", "Nama Wakil Sah Penyedia", "Budi Santoso")}
                                    {renderInput("jabatan_wakil", "Jabatan Wakil", "Direktur")}
                                </div>
                                {renderInput("alamat", "Alamat Perusahaan", "Jl. Merdeka No. 1 Kecamatan...")}
                                <div className="grid grid-cols-2 gap-4">
                                    {renderInput("npwp", "NPWP", "01.234.567.8-123.000")}
                                    {renderInput("kab_kota", "Kabupaten/Kota", "Kabupaten Jepara")}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {renderInput("no_telepon", "No Telepon", "08123456789")}
                                    {renderInput("email", "Email", "email@perusahaan.com")}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {renderInput("nama_bank", "Nama Bank Penyedia", "Bank BJB")}
                                    {renderInput("no_rekening", "No Rekening", "123-456-789")}
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between pt-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setActiveStep(2)}
                                    className="gap-2"
                                >
                                    <span>←</span>
                                    Kembali
                                </Button>
                                <Button
                                    onClick={() => setActiveStep(4)}
                                    className="btn-shine bg-primary hover:bg-primary/90 gap-2"
                                >
                                    Selanjutnya
                                    <span>→</span>
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                )}

                {/* Step 4: Legalitas */}
                {activeStep === 4 && (
                    <div className="animate-slide-in max-w-2xl mx-auto">
                        <Card className="card-hover shadow-lg border-0 glass">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl">
                                        ⚖️
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl">Legalitas (Akta)</CardTitle>
                                        <CardDescription>
                                            Data akta pendirian perusahaan penyedia
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {renderInput("no_akta", "Nomor Akta Pendirian", "123/Not/2020")}
                                {renderInput("nama_notaris", "Nama Notaris Akta Pendirian", "Siti Aminah, SH, M.Kn")}
                                {renderInput("tgl_akta", "Tanggal Akta Pendirian", "1 Januari 2020")}
                            </CardContent>
                            <CardFooter className="flex justify-between pt-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setActiveStep(3)}
                                    className="gap-2"
                                >
                                    <span>←</span>
                                    Kembali
                                </Button>
                                <Button
                                    onClick={() => setActiveStep(5)}
                                    className="btn-shine bg-primary hover:bg-primary/90 gap-2"
                                >
                                    Pilih Dokumen
                                    <span>→</span>
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                )}

                {/* Step 5: Select & Generate */}
                {activeStep === 5 && (
                    <div className="animate-slide-in max-w-3xl mx-auto space-y-6">
                        {/* Summary Card */}
                        <Card className="shadow-lg border-0 glass">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl">
                                        📊
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl">Ringkasan Data</CardTitle>
                                        <CardDescription>
                                            Pastikan data sudah benar sebelum generate
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                    {[
                                        ["Paket Pengadaan", formData.paket_pengadaan],
                                        ["Nama Badan Usaha", formData.nama_badan_usaha],
                                        ["Nilai HPS", formData.nilai_hps],
                                        ["Jangka Waktu", formData.jangka_waktu],
                                        ["Nama PPK", formData.nama_ppk],
                                        ["Nomor SPK", formData.nomor_spk],
                                    ].map(([label, value]) => (
                                        <div key={label} className="flex justify-between py-1.5 border-b border-border/50">
                                            <span className="text-muted-foreground">{label}</span>
                                            <span className="font-medium text-right truncate max-w-[200px]">
                                                {value || <span className="text-destructive/60 italic">belum diisi</span>}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Document Selection */}
                        <Card className="shadow-lg border-0 glass">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl">
                                            🚀
                                        </div>
                                        <div>
                                            <CardTitle className="text-xl">Pilih Dokumen Output</CardTitle>
                                            <CardDescription>
                                                Centang surat mana saja yang ingin dibuat
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={selectAll}
                                        className="text-xs"
                                    >
                                        {selectedTemplates.length === TEMPLATES.length
                                            ? "Batal Semua"
                                            : "Pilih Semua"}
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {TEMPLATES.map((template) => {
                                        const isSelected = selectedTemplates.includes(template.id);
                                        return (
                                            <button
                                                key={template.id}
                                                onClick={() => handleTemplateSelect(template.id)}
                                                className={`checkbox-item flex items-center gap-3 p-3.5 rounded-xl text-left transition-all duration-200 border
                          ${isSelected
                                                        ? "border-primary bg-primary/5 shadow-sm shadow-primary/10"
                                                        : "border-border/60 hover:border-primary/40"
                                                    }`}
                                            >
                                                <Checkbox
                                                    id={template.id}
                                                    checked={isSelected}
                                                    onCheckedChange={() =>
                                                        handleTemplateSelect(template.id)
                                                    }
                                                    className="pointer-events-none"
                                                />
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="text-lg shrink-0">{template.icon}</span>
                                                    <span className="text-sm font-medium truncate">
                                                        {template.label}
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Selected count */}
                                {selectedTemplates.length > 0 && (
                                    <div className="mt-4 p-3 bg-primary/5 rounded-xl border border-primary/20 text-sm text-center">
                                        <span className="font-semibold text-primary">
                                            {selectedTemplates.length}
                                        </span>{" "}
                                        dokumen dipilih untuk digenerate
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="flex justify-between pt-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setActiveStep(4)}
                                    className="gap-2"
                                >
                                    <span>←</span>
                                    Kembali
                                </Button>
                                <Button
                                    size="lg"
                                    onClick={handleGenerate}
                                    disabled={isGenerating || selectedTemplates.length === 0}
                                    className="btn-shine bg-primary hover:bg-primary/90 gap-2 px-8 animate-pulse-glow"
                                >
                                    {isGenerating ? (
                                        <>
                                            <svg
                                                className="animate-spin h-4 w-4"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                />
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                                />
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                                />
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                                />
                                            </svg>
                                            Membuat ({generatedCount}/{selectedTemplates.length})...
                                        </>
                                    ) : (
                                        <>
                                            🚀 Buat {selectedTemplates.length > 0 ? selectedTemplates.length : ""} Dokumen
                                        </>
                                    )}
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="text-center py-6 text-xs text-muted-foreground relative z-10">
                Surat Generator — Sistem Otomatis Pembuatan Dokumen Pengadaan
            </footer>
        </div>
    );
}
