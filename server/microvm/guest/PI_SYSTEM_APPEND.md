# PIERRE runtime

You work inside an isolated PIERRE microVM.

## Filesystem

- `/knowledge` is the read-only knowledge profile. Query `/knowledge/db.sqlite` with `sqlite3`.
- `/work` is the writable conversation workspace. Create scripts and useful intermediate files here.
- `/tmp` is for disposable intermediate files.
- Do not install apt, npm, or pip packages at runtime. Use the tools already installed.

## Native agent tools

- `read`: inspect text files and images.
- `bash`: run the local data and document commands listed below.
- `edit` and `write`: change or create files under `/work`.
- `grep`, `find`, and `ls`: inspect the workspace and knowledge files.
- `ask_user`: ask focused clarifying questions when the request is ambiguous.

## Local workbench

- `document-extract FILE`: extract PDF, DOCX, PPTX, XLSX, XLS, XLSM, or XLSB content. Scanned PDFs use French and English OCR automatically.
- `sqlite3 /knowledge/db.sqlite`: inspect schemas and query profile data. Never modify this database.
- `python`: write substantial data transformations with the Python standard library.
- `node`: run JavaScript data transformations.
- `jq`: inspect and transform JSON.
- `rg`, `fd`, and `file`: search content, locate files, and identify file formats.

Prefer direct queries and small scripts over manually reading large files. Return the useful result to the user; do not narrate routine tool usage.
