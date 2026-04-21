---
name: vin-pdf-html
description: Edit a PDF document (e.g. resume, CV, report) by extracting its text with pdftotext and regenerating it as a clean A4-styled printable HTML file with the user's requested edits applied. The HTML is designed to be opened in Chrome/Edge and exported to PDF via "Print → Save as PDF". Use whenever the user provides a PDF and asks to modify, update, add to, restructure, or rewrite its content (especially resumes / CVs), or asks to "edit this PDF" / "update this resume" / "add a section to this PDF". Also use when converting a PDF to an editable, restyled HTML version.
---

# vin-pdf-html

Convert and edit PDF documents by extracting their text and regenerating them as printable A4-styled HTML.

## When to use

- User shares a PDF (resume, CV, report) and asks to edit/update/add/remove sections.
- User wants a PDF converted to an editable HTML version that can be re-printed to PDF.
- User wants to restyle a PDF with a clean modern layout.

## Workflow

### 1. Extract text from the PDF

Use the `pdftotext` CLI (ships with Git for Windows under `mingw64/bin/pdftotext.exe`, or via poppler on macOS/Linux). Always use `-layout` to preserve column structure:

```bash
pdftotext -layout "<input.pdf>" "<input>.txt"
```

Then read the `.txt` file with the Read tool.

If `pdftotext` is unavailable, fall back to:
- The Read tool directly on the PDF (may return raw bytes), or
- `WebFetch` if the user provides a public URL with the same content (e.g. a personal homepage).

### 2. Parse the document into sections

Identify standard sections so they can be regenerated as semantic HTML:
- Header (name, title, contact info)
- Summary / Objective
- Work Experience (per-role: title, company, dates, bullets)
- Education
- Skills (group by category)
- Projects
- Languages / Additional Information

### 3. Apply the user's edits

Apply requested changes to the parsed structure BEFORE generating HTML. Common edits:
- Add/remove/reorder bullets
- Add a new skill category (e.g. "AI / Agentic AI: MCP, Skills, Agent")
- Add new projects to the Projects section
- Update contact info or summary

When adding new content, optionally wrap it in `<span class="new">…</span>` so the user can visually review what changed (the template highlights `.new` with a soft yellow background). Mention this convention so the user knows to remove the class for the final version.

### 4. Generate the HTML

Copy `assets/resume-template.html` as the starting point. It includes:
- `@page { size: A4; margin: 18mm }` for clean PDF export
- A header row (name + contact)
- Section styling (`h2` with bottom border, `h3` with right-floated date `.meta`)
- `.new` highlight class for review
- Print-safe fonts (Segoe UI / Arial fallback)

Save the output next to the source PDF, using the same base filename with `.html`:
```
<original-name>.pdf  →  <original-name>.html
```

### 5. Tell the user how to export to PDF

After writing the HTML, instruct the user:
> Open the HTML in Chrome/Edge → **Ctrl+P** → **Destination: Save as PDF** → A4, default margins.

## Conventions

- **Never overwrite the original PDF.** Always write a new `.html` file alongside it.
- **Preserve all original content** unless the user explicitly asked to remove it.
- **Use semantic HTML** (`h1/h2/h3`, `ul/ol`, `strong`) — not `<div>` soup — so the printed PDF remains accessible and copy-pasteable.
- **Keep styles inline in `<style>`** within the single HTML file so the file is self-contained and portable.
- **Highlight new content** with `class="new"` during review; remove on user request for the final version.

## Template

See `assets/resume-template.html` for the canonical A4-styled starting template. Copy it, fill in the parsed sections, apply edits, and write the result.

## Interactive editor

`assets/resume-editor.html` is a self-contained visual editor for this resume format. Open it directly in Chrome/Edge (no server needed). Features:

- Live side-by-side editing (form on the left, printable A4 preview on the right)
- Sections: Header, Summary, Work Experience, Education, Skills, Projects, Languages, Additional Info
- Add / remove / reorder entries; bullets are one-per-line
- Wrap text in `[new]...[/new]` to highlight it yellow for review (auto-stripped on print)
- Autosaves to `localStorage`; JSON import/export; HTML download; print-to-PDF

Offer this editor to the user whenever they want to maintain/revise the resume themselves rather than having Claude regenerate it. To launch it for them, tell them to open the file in a browser or serve it via `python -m http.server` from the `assets/` directory.
