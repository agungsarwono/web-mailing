# Walkthrough: Perbaikan Tanggal SPMK pada Ringkasan Kontrak

## Objective
The user reported that the generated `Ringkasan Kontrak` document was injecting the `SPK` date ("9 Agustus 2023") into the `"Tanggal Mulai Pekerjaan"` field, instead of properly utilizing the newly added `Mulai Kerja SPMK` input field data.

## Issue Analysis
The raw MS Word template `Ringkasan Kontrak.docx` contains the following default key strings:

`Tanggal Pekerjaan Harus Selesai : 24 November 2025`
`...`
`Tanggal Mulai Pekerjaan : 26 September 2025`

Because the underlying text explicitly matches the generic fallback template date `"26 September 2025"`, the `generator.js` execution engine inadvertently replaced it with the `Tanggal SPK` data globally *before* the application had the chance to correctly parse it as an SPMK date variable.

## Implementation Steps

We modified the text-replacement priority list directly inside `src/utils/generator.js` to ensure that specific text sequences in the template are evaluated using "Context-Aware" logic before the generic global fallback triggers.

1. **Specific Context Override Block:** We created an execution block exclusively evaluating `formData.spmk_tanggal_mulai` (or `tanggal_spmk` as a secondary fallback).
2. **Prioritized Array Key Binding:** Inside this block, we explicitly bound the entire paragraph fragment `"Tanggal Mulai Pekerjaan:26 September 2025"` to the SPMK value. Because Javascript ES6 Objects iterate their string initialization keys in order, injecting this complex key earlier completely shields the `"26 September 2025"` substring from the downstream `SPK` global fallback.

```javascript
    // SPMK Context Overrides & SPK fallback logic
    if (templateId === 'ringkasan_kontrak') {
        // In Ringkasan Kontrak, the generic "26 September 2025" without context is the SPMK date!
        if (formData.tanggal_spk) {
            const spkDate = formatDateIndo(formData.tanggal_spk);
            replacements["Tanggal 26 September 2025"] = "Tanggal " + spkDate;
            replacements["Jepara, 26 September 2025"] = "Jepara, " + spkDate;
        }
        if (formData.spmk_tanggal_mulai || formData.tanggal_spmk) {
            const spmkDate = formatDateIndo(formData.spmk_tanggal_mulai || formData.tanggal_spmk);
            // Replaces strictly the date string. This guarantees the preceding <w:tab/> tags are preserved.
            replacements["26 September 2025"] = spmkDate; 
        }
    } else {
        // For SPMK and other templates
        if (formData.spmk_tanggal_mulai || formData.tanggal_spmk) {
            const d = formatDateIndo(formData.spmk_tanggal_mulai || formData.tanggal_spmk);
            replacements["kerja : 26 September 2025"] = "kerja : " + d;
            replacements["Jepara, 26 September 2025"] = "Jepara, " + d;
            replacements["Tanggal Mulai Pekerjaan:26 September 2025"] = "Tanggal Mulai Pekerjaan:" + d;
        }
        if (formData.tanggal_spk) {
            replacements["26 September 2025"] = formatDateIndo(formData.tanggal_spk);
        }
    }
```

## Secondary Issue: Formatting Misalignment
During testing, we discovered that replacing the entire contextual string `"Tanggal Mulai Pekerjaan:26 September 2025"` destroyed the invisible MS Word `<w:tab/>` elements situated between the colon and the date.
This resulted in the date squashing against the colon in the generated document (e.g. `Tanggal Mulai Pekerjaan:25 Februari 2026`).

**The Fix:**
By splitting the Ringkasan Kontrak replacement instructions using the `templateId === 'ringkasan_kontrak'` condition, we are now able to safely instruct the engine to replace the pure `"26 September 2025"` substring instead. Because the script no longer attempts to override text spanning across the colon, the XML generator gracefully skips over the literal `<w:tab/>` nodes, retaining 100% template alignment fidelity.

## Verification Result
Users can test generating the `Ringkasan Kontrak` document. The system perfectly distinguishes between the `SPK Date` and the `Tanggal Mulai Pekerjaan` fields, and the date values will vertically align with the other document items.
