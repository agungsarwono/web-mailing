import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import fs from "fs";
import path from "path";

const templateDir = path.resolve("d:/test-project/templates");
// Only process .docx files, ignore docx that start with ~$ (temp files)
const files = fs.readdirSync(templateDir).filter(f => f.endsWith(".docx") && !f.startsWith("~$"));

console.log("Analyzing templates in:", templateDir);

files.forEach(file => {
    try {
        const content = fs.readFileSync(path.join(templateDir, file), "binary");
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

        // Attempt to get text and find curly brace patterns
        const text = doc.getFullText();
        // Regex for {variable_name} or similar
        const placeholders = text.match(/\{[^}]+\}/g);

        console.log(`\nFile: ${file}`);
        if (placeholders && placeholders.length > 0) {
            const uniquePlaceholders = [...new Set(placeholders)];
            console.log(`  Found ${uniquePlaceholders.length} unique placeholders:`);
            uniquePlaceholders.forEach(p => console.log(`    - ${p}`));
        } else {
            console.log("  No standard {placeholders} found. Check if fields are just highlighted text.");
        }
    } catch (error) {
        console.error(`  Error reading ${file}:`, error.message);
    }
});
