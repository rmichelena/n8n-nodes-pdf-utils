# 🚀 Quick Start - 5 minutos

## Instalación express

```bash
# 1. Descomprimir (si es necesario)
tar -xzf n8n-nodes-pdf-utils.tar.gz
cd n8n-nodes-pdf-utils

# 2. Instalar y verificar (1 min)
npm install
npm run verify

# 3. Compilar (30 seg)
npm run build

# 4. Enlazar con n8n (30 seg)
npm link
cd ~/.n8n/custom
npm link n8n-nodes-pdf-utils

# 5. Reiniciar n8n
n8n start
```

## ✅ Verificar que funciona

1. Abrir n8n en el navegador
2. Crear nuevo workflow
3. Buscar "PDF Utils" en el panel de nodos
4. ¡Si aparece, está funcionando! 🎉

## 🧪 Test rápido

1. Importar `examples/basic-workflow.json`
2. Ejecutar el workflow
3. Debería descargar un PDF y analizarlo

## ⚡ Uso básico

### Inspeccionar PDF
```
[Tu nodo con PDF] → [PDF Utils: Inspect]
```

Resultado:
```json
{
  "pageCount": 5,
  "isMultiPage": true,
  "isVectorial": true,
  "textLength": 1234
}
```

### Dividir PDF
```
[Tu nodo con PDF] → [PDF Utils: Split]
```

Resultado: N items (uno por página)

## 📚 Más información

- **Documentación completa**: `README.md`
- **Instalación detallada**: `INSTALLATION.md`
- **Notas técnicas**: `TECHNICAL_NOTES.md`
- **Resumen ejecutivo**: `SUMMARY.md`

## ❓ ¿Problemas?

### El nodo no aparece
```bash
# Reiniciar n8n
pkill -f n8n
n8n start
```

### Error al compilar
```bash
rm -rf node_modules dist
npm install
npm run build
```

### Verificar instalación
```bash
npm run verify
```

---

**¿Listo?** → Ejecuta los comandos de arriba y en 5 minutos tendrás tu nodo funcionando 🚀
