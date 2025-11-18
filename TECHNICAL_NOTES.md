# Notas Técnicas - PDF Utils

## ¿Por qué NO necesitamos Canvas?

### Contexto
`pdfjs-dist` (PDF.js de Mozilla) **puede** usar canvas para renderizar PDFs visualmente, pero esto es **opcional** y solo necesario cuando quieres:
- Mostrar PDFs en navegadores (el caso de uso original de PDF.js)
- Renderizar páginas como imágenes
- Convertir PDFs a PNG/JPG

### Nuestro caso de uso
Solo necesitamos:
1. **Extraer texto** de PDFs (operación Inspect)
2. **Contar páginas**
3. **Detectar si es vectorial** (tiene texto embebido)

Para estas operaciones, `pdfjs-dist` funciona perfectamente en **modo headless** sin canvas.

## Configuración Headless

```typescript
// Deshabilitar el worker (evita dependencias de DOM/canvas)
pdfjsLib.GlobalWorkerOptions.workerSrc = '';

// Opciones para modo headless
const loadingTask = pdfjsLib.getDocument({
  data: new Uint8Array(pdfBuffer),
  verbosity: 0,              // Sin logs
  useWorkerFetch: false,     // No usar worker
  isEvalSupported: false,    // No evaluar código
  useSystemFonts: true,      // Usar fuentes del sistema si están disponibles
});
```

## Ventajas de NO usar Canvas

### ✅ Instalación más simple
- No requiere dependencias nativas del sistema
- No requiere compiladores C++ (Python, build-essential, etc.)
- Funciona en cualquier entorno Node.js sin configuración adicional

### ✅ Más portable
- Funciona en Docker sin instalaciones extra
- Funciona en serverless (AWS Lambda, Google Cloud Functions)
- Funciona en Windows sin problemas

### ✅ Más ligero
- Menos dependencias en `node_modules`
- Menos tiempo de instalación (`npm install` más rápido)
- Menos espacio en disco

### ✅ Más rápido
- No carga librerías de rendering visual
- Menos overhead de memoria
- Solo carga lo necesario para parsear el PDF

## Dependencias finales

```json
{
  "pdfjs-dist": "^3.11.174",  // Parsing y extracción de texto
  "pdf-lib": "^1.17.1"         // Manipulación y splitting
}
```

**Total**: 2 dependencias, 100% JavaScript puro, cero compilación nativa.

## Alternativas que SÍ necesitarían Canvas

Si en el futuro quisiéramos agregar operaciones como:
- Renderizar PDFs como imágenes
- Crear thumbnails/previews
- Extraer texto de PDFs escaneados (OCR)

Entonces SÍ necesitaríamos `canvas` o alternativas como:
- `sharp` (para manipulación de imágenes)
- `tesseract.js` (para OCR)
- `pdf2pic` (para convertir PDF a imágenes)

Pero para nuestras operaciones actuales (Inspect y Split), **no es necesario**.

## Testing sin Canvas

Para verificar que funciona sin canvas:

```bash
# Instalar solo las dependencias necesarias
npm install pdfjs-dist pdf-lib

# NO instalar canvas
# npm install canvas  ← NO HACER ESTO

# Compilar y probar
npm run build
```

Si funciona correctamente, significa que el nodo es 100% portable y no requiere dependencias nativas.

## Referencias

- [PDF.js sin canvas en Node.js](https://github.com/mozilla/pdf.js/wiki/Frequently-Asked-Questions#can-i-use-pdfjs-in-nodejs)
- [pdf-lib documentation](https://pdf-lib.js.org/)
- [n8n Community Node Guidelines](https://docs.n8n.io/integrations/creating-nodes/)
