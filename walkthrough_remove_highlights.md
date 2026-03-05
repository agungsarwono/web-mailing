# Walkthrough: Pembersihan Blok Kuning Pada Hasil Cetakan

## Objective
The raw MS Word document templates heavily use Word's native "Text Highlight" feature (usually yellow) to visually demarcate input variable placeholders for manual editors. However, the programmatic generator was only replacing the text, leaving the background yellow highlight flags intact within the generated OpenXML output. The user requested that all generated output docs should be "clean" and free from these colored backgrounds.

## Implementation Steps

Instead of requiring the user to manually remove thousands of highlight formatting instructions across 14 different `.docx` templates, we implemented a completely programmatic, zero-touch Global Removal pipeline right inside the final zip phase of `src/utils/generator.js`.

Because MS Word maps all text background highlights under a specific node XML schema `<w:highlight w:val="yellow"/>`, we deployed a single sweep RegEx exactly before the file contents are committed to the `.zip` / `.docx` payload:

```javascript
// generator.js - replaceTextInDocx()

    // ... Search and replace logic loops ...
    
    // --- GLOBAL CLEANUP ---
    // Strip out all MS Word yellow highlight placeholders globally so the final output looks clean
    xml = xml.replace(/<w:highlight[^>]*>/g, "");

    zip.file(xmlFile, xml);
```

By substituting any `<w:highlight>` tag and its attributes with an empty string, the internal MS Word rendering pipeline degrades gracefully and simply draws the text blocks against the normal white page background, effectively eliminating the yellow stamps globally.

## Verification Result
Any template generated through the system now outputs entirely monochromatic/clean documents ready for printing or legal signing, whilst maintaining the visual helper highlights within the `/public/templates/` source files for developers.
