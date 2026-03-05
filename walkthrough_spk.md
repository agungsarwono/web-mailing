# Walkthrough: Fixing SPK Templates & Invisible Variables

## Objective
The SPK (Surat Perintah Kerja) template had several fields remaining hardcoded despite having valid data entered in the form. Specifically, the following details failed to connect with the output:
- **Sub Kegiatan**
- **Harga Kontrak** (Numerical and Word Format)
- **Data Legalitas Penyedia** (Alamat, Akta, Notaris, Sumber Dana)

## Issue Analysis
Unlike previous files where adding fields to the UI was necessary, the SPK data was *already* being collected properly by `InputForm.jsx` during Step 1 (Legalitas) and Step 2 (Data Penyedia). 
The failure stemmed from the fact that `generator.js` lacked the exact string mappings required to swap out these values in `5. SPK.docx`. 

More problematically, the static numerical price (`"92.691.000,00"`) inside the SPK template was heavily fragmented by Microsoft Word's XML formatting engine. It inserted invisible zero-width spaces (`\u200B`) and splitting tags between the digits, causing standard `String.prototype.indexOf()` replacements to bypass it completely.

## Implementation Steps
### 1. Mapping SPK Strings
I located the exact texts embedded in the `SPK.docx` file and added them directly to the `buildReplacements` function within `src/utils/generator.js`.

### 2. Rewriting the XML String Search Engine
To handle Microsoft Word slicing single sentences randomly between different `<w:t>` tags, the `replaceTextInDocx` engine already utilized a sophisticated loop that merged fragments together before checking them against `findText`.

However, that loop was failing when zero-width spaces were involved. I added a layer of text normalization across the algorithm:
```javascript
const cleanPartText = part.text.replace(/[\u200B-\u200D\uFEFF]/g, '');
```
By temporarily stripping these invisible characters when searching for an index, the string `"92.691.000,00"` could finally be detected and successfully overwritten regardless of how heavily fragmented the internal `.docx` tags were.

### 3. Adding Substring Overrides for Resiliency
Even with normalized spaces, the spacing syntax around the `Rp` symbol within the specific SPK template was too glued together. As an extra layer of safety, I added targeted substring replacements specifically matching just the thousands part of the target number:
```javascript
// Example string mapped for fallback
replacements["92.691"] = num.toLocaleString("id-ID").split('.')[0] + "." + num.toLocaleString("id-ID").split('.')[1];
```

## Outcome Result
All SPK template variables specified by the user are now accurately replaced during document generation. Values like the Notary name, Activity Sub-Title, and the Contract Price will automatically adapt based on the user's React input form.
