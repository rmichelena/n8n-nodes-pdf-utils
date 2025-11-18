# n8n-nodes-pdf-utils

Custom n8n node for PDF inspection and splitting using pure npm packages.

## Features

### 🔍 Inspect Operation
- Analyzes PDF structure
- Counts pages
- Detects if PDF is vectorial (text-based) or rasterized (image-based)
- Extracts text from first page
- **Performance**: Very fast (tens of milliseconds)

### ✂️ Split Operation
- Splits multi-page PDFs into individual pages
- Creates one output item per page
- Preserves PDF quality and structure

## Installation

### Option 1: Install from npm (when published)

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

**Output** (JSON):
```json
{
  "pageCount": 5,
  "isMultiPage": true,
  "isVectorial": false,
  "textLength": 23,
  "firstPageText": "Preview of first 200 characters..."
}
```

**Example workflow**:
```
HTTP Request (download PDF) 
  → PDF Utils (Inspect) 
    → IF (isVectorial) 
      → Route A (text processing)
      → Route B (OCR processing)
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

### Why These Libraries?

1. **pdfjs-dist**: Mozilla's PDF.js library - battle-tested, used in Firefox (headless mode, no canvas needed). We use the legacy build (`pdfjs-dist/legacy/build/pdf.mjs`) which is specifically designed for Node.js environments without DOM dependencies.
2. **pdf-lib**: Pure JavaScript, no native dependencies, excellent for manipulation
3. **100% npm packages**: No system-level dependencies (like Poppler, Ghostscript) and no canvas/native modules!

### Performance

- **Inspect**: Very fast (~10-50ms for typical PDFs)
- **Split**: Fast, scales linearly with page count (~50-200ms per page)

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

- [ ] Add merge operation
- [ ] Add extract pages by range
- [ ] Add rotate pages operation
- [ ] Add compress PDF operation
- [ ] Add watermark operation
