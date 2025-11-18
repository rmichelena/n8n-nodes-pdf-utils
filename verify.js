#!/usr/bin/env node

/**
 * Script de verificación rápida
 * Verifica que pdfjs-dist y pdf-lib funcionen sin canvas
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando dependencias...\n');

// 1. Verificar que canvas NO esté instalado
try {
  require.resolve('canvas');
  console.log('⚠️  ADVERTENCIA: Canvas está instalado pero NO es necesario');
  console.log('   Puedes desinstalarlo con: npm uninstall canvas\n');
} catch (e) {
  console.log('✅ Canvas no está instalado (correcto)\n');
}

// 2. Verificar pdfjs-dist
try {
  const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');
  console.log('✅ pdfjs-dist importado correctamente (legacy build para Node.js)');
  console.log(`   Versión: ${pdfjsLib.version || 'desconocida'}\n`);
} catch (e) {
  console.log('❌ Error importando pdfjs-dist:');
  console.log(`   ${e.message}\n`);
  process.exit(1);
}

// 3. Verificar pdf-lib
try {
  const { PDFDocument } = require('pdf-lib');
  console.log('✅ pdf-lib importado correctamente\n');
} catch (e) {
  console.log('❌ Error importando pdf-lib:');
  console.log(`   ${e.message}\n`);
  process.exit(1);
}

// 4. Verificar que el nodo compilado existe
const nodePath = path.join(__dirname, 'dist', 'nodes', 'PdfUtils', 'PdfUtils.node.js');
if (fs.existsSync(nodePath)) {
  console.log('✅ Nodo compilado encontrado en:', nodePath);
} else {
  console.log('⚠️  Nodo no compilado. Ejecuta: npm run build\n');
}

// 5. Test funcional simple (si hay un PDF de prueba)
const testPdfPath = path.join(__dirname, 'test.pdf');
if (fs.existsSync(testPdfPath)) {
  console.log('\n🧪 Ejecutando test funcional...\n');
  
  (async () => {
    try {
      const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');

      const pdfBuffer = fs.readFileSync(testPdfPath);
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(pdfBuffer),
        verbosity: 0,
        worker: null,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true,
      });
      
      const pdfDocument = await loadingTask.promise;
      const pageCount = pdfDocument.numPages;
      
      const firstPage = await pdfDocument.getPage(1);
      const textContent = await firstPage.getTextContent();
      const text = textContent.items
        .map(item => ('str' in item ? item.str : ''))
        .join('');
      
      await pdfDocument.destroy();
      
      console.log('✅ Test funcional exitoso:');
      console.log(`   Páginas: ${pageCount}`);
      console.log(`   Texto extraído: ${text.length} caracteres`);
      console.log(`   Preview: ${text.substring(0, 100)}...\n`);
    } catch (e) {
      console.log('❌ Error en test funcional:');
      console.log(`   ${e.message}\n`);
    }
  })();
} else {
  console.log('\n💡 Tip: Coloca un archivo test.pdf en el directorio raíz para ejecutar un test funcional\n');
}

console.log('═══════════════════════════════════════════════════');
console.log('✨ Verificación completada');
console.log('═══════════════════════════════════════════════════');
console.log('\n📚 Siguiente paso: npm run build && npm link\n');
