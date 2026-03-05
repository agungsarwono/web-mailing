# Walkthrough: Fixing SPK and Document XML Corruption ("Summary Info 1" Error)

## Objective
The user reported that the generated `6. SPK` (and later `11. BA Serah Terima`) documents were causing Microsoft Word to display corruption warnings.
- SPK Error: "Summary Info 1"
- BA Serah Terima Error: "Text Recovery converter" or "insufficient memory"

## Issue Analysis
There are three primary ways manipulating MS Word XML strings causes full document corruption:

1. **Blind Global String Disruption:** By running a broad `xml.split(findText).join(replaceText)` command, the generator accidentally matches text inside XML element attributes rather than just visual strings. For example, if a user input matched a partial `w:rsidR` identifier hex hidden in `docProps/app.xml`, MS Word immediately considered the document irreversibly structurally corrupt.
2. **Over-Escaping (OpenXML Quirks):** While standard HTML escapes apostrophes to `&apos;` and quotes to `&quot;`, MS Word's proprietary OpenXML reader actually *fails* (Throws "Text Recovery Converter") when encountering `&apos;` directly inside `<w:t>` text nodes! It strictly expects literal `'` characters or `&#39;`.
3. **Single-Tag Trailing Text Truncation (The "BA Serah Terima" Bug):** A critical logic flaw existed in our custom cross-tag parsing engine (`generator.js`). When the engine found a matching string that fit *perfectly* inside one single `<w:t>` XML tag, the code replaced the target string but **forgot to append the remaining trailing text** hidden inside that tag. In BA Serah Terima, this accidentally deleted parts of words or hidden OpenXML structural fields immediately following our replacement targets!

## Implementation Steps

### 1. Robust Tag Text Manipulation
We overhauled `replaceTextInDocx` inside `src/utils/generator.js` to eliminate raw global string replacement. 
- We completely filtered out the `docProps/` metadata folder.
- We restricted text manipulation exclusively to the values strictly wrapped inside `<w:t>` nodes through contextual splitting, preserving the surrounding nodes transparently.

### 2. Specialized Entity Encoding
To prevent arbitrary string inputs from breaking the generic XML schema constraints, an encoding transformer was bolted onto the replacements map. Before strings are embedded, characters like `&`, `<`, and `>` are explicitly translated to safe entities. We explicitly excluded quotes and apostrophes to conform to MS Word's fragile parser.

```javascript
// Escape all values before writing to docx XML tags to prevent MS Word XML parser corruption
const sanitizedReplacements = {};
Object.entries(replacements).forEach(([k, v]) => {
    ...
    // Encode ONLY mandatory XML entities inside text nodes
    sanitizedReplacements[k] = v.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
});
```

### 3. Patching The Truncation Logic
We revised the array index comparison in `generator.js` so that when `startPartIdx === endPartIdx`, the engine reliably stitches the remaining characters `cleanPartText.substring(endCharInPart)` onto the end of the new node, ceasing the fatal text deletions.

```javascript
// CRITICAL FIX: Preserve text trailing behind the replacement inside a standalone node
if (i === startPartIdx && i === endPartIdx) {
    newText = cleanPartText.substring(0, startCharInPart) + replaceText + cleanPartText.substring(endCharInPart);
} else if (i === startPartIdx) {
//...
```

## Verification Result
Users can now input extreme edge-cases containing strict entity symbols without risking template destruction. The generated documents perfectly retain MS Word's OpenXML schema padding and open effortlessly in desktop offline word processors.
