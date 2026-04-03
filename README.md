# n8n-nodes-pdf-utils

Custom n8n node for PDF inspection, splitting, and decryption.

## Features

### 🔍 Inspect Operation
- Analyzes PDF structure
- Counts pages
- **Detects if PDF is encrypted** (returns `isEncrypted: true` without failing)
- Detects if PDF is vectorial (text-based) or rasterized (image-based)
- Extracts text from first page
- **Performance**: Very fast (tens of milliseconds)

### ✂️ Split Operation
- Splits multi-page PDFs into individual pages
- Creates one output item per page
- Preserves PDF quality and structure

### 🔓 Decrypt Operation
- Removes password protection from encrypted PDFs
- Supports user and owner passwords
- Outputs a clean, unencrypted PDF
- **Requires `qpdf` installed on the host** (see [System Requirements](#system-requirements))

## System Requirements

The **Decrypt** operation requires `qpdf` to be installed on the host running n8n:

```bash
# Linux / Docker
apt-get install qpdf

# macOS
brew install qpdf
```

All other operations (Inspect, Split, Inspect and Split) have **no system-level dependencies** — they use pure npm packages only.

## Installation

### Option 1: Install from npm

```bash
npm install n8n-nodes-pdf-utils
```

### Option 2: Install locally for development

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the node:
   ```bash
   npm run build
   ```
4. Link to your n8n installation:
   ```bash
   npm link
   cd ~/.n8n/nodes
   npm link n8n-nodes-pdf-utils
   ```
5. Restart n8n

### Option 3: Install in n8n using community nodes

1. Go to **Settings** > **Community Nodes**
2. Click **Install**
3. Enter: `n8n-nodes-pdf-utils`
4. Click **Install**

## Usage

### Inspect Operation

**Input**: Binary data containing a PDF file

**Parameters**:
- `Binary Property`: Name of the binary property (default: "data")
- `Text Threshold`: Minimum text length to consider PDF as vectorial (default: 50)

**Output**: Single item with analysis + original PDF binary

If the PDF is not encrypted:
```json
{
  "json": {
    "isEncrypted": false,
    "pageCount": 5,
    "isMultiPage": true,
    "isVectorial": false,
    "textLength": 23,
    "firstPageText": "Preview of first 200 characters..."
  },
  "binary": {
    "data": "<original PDF>"
  }
}
```

If the PDF is encrypted (no password needed to detect it):
```json
{
  "json": {
    "isEncrypted": true
  },
  "binary": {
    "data": "<original PDF>"
  }
}
```

**Example workflow**:
```
HTTP Request (download PDF)
  → PDF Utils (Inspect)
    → IF (isEncrypted)
      → PDF Utils (Decrypt) → PDF Utils (Inspect again)
    → IF (isVectorial)
      → Route A (text processing with PDF)
      → Route B (OCR processing with PDF)
```

### Inspect and Split Operation

**Input**: Binary data containing a PDF file

**Parameters**:
- `Binary Property`: Name of the binary property (default: "data")
- `Text Threshold`: Minimum text length to consider PDF as vectorial (default: 50)
- `Output Binary Property`: Name for output binary property (default: "data")

**Output**:
- **If vectorial**: Single item with analysis + original PDF (pass-through)
- **If not vectorial**: Multiple items, one per page (split)

**Example workflow**:
```
HTTP Request (download PDF)
  → PDF Utils (Inspect and Split)
    → Vectorial PDFs pass through as-is
    → Scanned PDFs split into pages automatically
```

**Use case**: Automatically handle different PDF types without manual branching:
- Text-based PDFs (vectorial) → process as whole document
- Scanned PDFs (non-vectorial) → OCR each page individually

### Decrypt Operation

**Input**: Binary data containing a password-protected PDF

> **Requires `qpdf` installed on the host** — see [System Requirements](#system-requirements).

**Parameters**:
- `Binary Property`: Name of the input binary property (default: "data")
- `Password`: User or owner password to decrypt the PDF
- `Output Binary Property`: Name for the output binary property (default: "data")

**Output**: Single item with the decrypted PDF binary
```json
{
  "json": {
    "decrypted": true,
    "originalFileName": "document.pdf"
  },
  "binary": {
    "data": "<decrypted PDF>"
  }
}
```

**Example workflow**:
```
HTTP Request (download encrypted PDF)
  → PDF Utils (Decrypt)
    → PDF Utils (Inspect or Split)
```

### Split Operation

**Input**: Binary data containing a multi-page PDF

**Parameters**:
- `Binary Property`: Name of the input binary property (default: "data")
- `Output Binary Property`: Name for output binary property (default: "data")

**Output**: Multiple items, one per page
- Each item contains binary data with a single-page PDF
- JSON includes `pageNumber` and `originalFileName`

**Example workflow**:
```
HTTP Request (download PDF)
  → PDF Utils (Split)
    → Loop Over Items
      → Process each page individually
```

## Technical Details

### Dependencies
- `pdfjs-dist` (v5.4.394): For PDF analysis and text extraction (uses legacy build for Node.js)
- `pdf-lib` (v1.17.1): For PDF manipulation and splitting
- `qpdf` (system binary): Required only for the Decrypt operation

### Why These Libraries?

1. **pdfjs-dist**: Mozilla's PDF.js library - battle-tested, used in Firefox (headless mode, no canvas needed). We use the legacy build (`pdfjs-dist/legacy/build/pdf.mjs`) which is specifically designed for Node.js environments without DOM dependencies.
2. **pdf-lib**: Pure JavaScript, no native dependencies, excellent for manipulation
3. **qpdf**: The gold standard for PDF decryption — handles AES-128, AES-256, and RC4 encryption. Must be installed on the host system (not bundled in npm).

### Performance

- **Inspect**: Very fast (~10-50ms for typical PDFs)
- **Split**: Fast, scales linearly with page count (~50-200ms per page)
- **Decrypt**: Depends on qpdf and PDF size (~100-500ms typical)

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode for development
npm run dev

# Lint
npm run lint

# Format code
npm run format
```

## Troubleshooting

### n8n doesn't detect the node

1. Ensure n8n is restarted after installation
2. Check that the node is in `~/.n8n/nodes` or installed globally
3. Verify `package.json` has correct `n8n.nodes` configuration

### "qpdf is not installed" error

Install qpdf on the host running n8n:
```bash
apt-get install qpdf   # Linux / Docker
brew install qpdf      # macOS
```

If running n8n in Docker, add it to your Dockerfile:
```dockerfile
RUN apt-get update && apt-get install -y qpdf && rm -rf /var/lib/apt/lists/*
```

### "pdfjs-dist" errors

If you encounter issues with pdfjs-dist, ensure you're using Node.js 16 or higher:
```bash
node --version  # Should be v16.0.0 or higher
```

## License

MIT

## Author

Roberto Michelena - [INFINITEK S.A.C.](https://infinitek.pe)

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Roadmap

- [x] Decrypt password-protected PDFs
- [ ] Add merge operation
- [ ] Add extract pages by range
- [ ] Add rotate pages operation
- [ ] Add compress PDF operation
- [ ] Add watermark operation
