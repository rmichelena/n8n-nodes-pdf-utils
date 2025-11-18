# Guía de Instalación Rápida

## Opción 1: Instalación Local para Desarrollo (Recomendada)

### Paso 1: Preparar el entorno
```bash
cd n8n-nodes-pdf-utils
npm install
```

### Paso 2: Compilar
```bash
npm run build
```

### Paso 3: Enlazar con n8n
```bash
# Desde el directorio del nodo
npm link

# Ir al directorio de n8n
cd ~/.n8n/custom
npm link n8n-nodes-pdf-utils
```

### Paso 4: Reiniciar n8n
```bash
n8n start
```

## Opción 2: Instalación desde archivo local

### Paso 1: Crear el paquete
```bash
npm pack
```

Esto creará un archivo: `n8n-nodes-pdf-utils-1.0.0.tgz`

### Paso 2: Instalar en n8n
```bash
cd ~/.n8n/custom
npm install /ruta/completa/a/n8n-nodes-pdf-utils-1.0.0.tgz
```

### Paso 3: Reiniciar n8n
```bash
n8n start
```

## Opción 3: Publicar en npm (para distribución pública)

### Paso 1: Crear cuenta en npmjs.com
Si no tienes una, registrate en https://www.npmjs.com/signup

### Paso 2: Login en npm
```bash
npm login
```

### Paso 3: Publicar
```bash
npm publish --access public
```

### Paso 4: Instalar en n8n UI
1. Ir a **Settings** > **Community Nodes**
2. Click en **Install**
3. Escribir: `n8n-nodes-pdf-utils`
4. Click en **Install**

## Verificar Instalación

### Método 1: UI de n8n
1. Abrir n8n
2. Crear un nuevo workflow
3. Buscar "PDF Utils" en el panel de nodos
4. Si aparece, ¡está instalado correctamente!

### Método 2: Línea de comandos
```bash
# Listar nodos instalados
ls ~/.n8n/custom/node_modules/

# Verificar que existe n8n-nodes-pdf-utils
ls ~/.n8n/custom/node_modules/n8n-nodes-pdf-utils
```

## Troubleshooting

### El nodo no aparece en n8n
1. Verificar que n8n fue reiniciado después de la instalación
2. Revisar logs de n8n para errores:
   ```bash
   n8n start
   # Buscar mensajes de error relacionados con "pdf-utils"
   ```

### Error "Cannot find module 'n8n-workflow'"
```bash
cd n8n-nodes-pdf-utils
npm install --save-peer n8n-workflow
npm run build
```

### Errores de compilación TypeScript
```bash
# Limpiar y reinstalar
rm -rf node_modules dist
npm install
npm run build
```

## Desarrollo Activo

Si estás desarrollando el nodo activamente:

```bash
# Terminal 1: Compilación automática
npm run dev

# Terminal 2: n8n en modo desarrollo
export N8N_LOG_LEVEL=debug
n8n start
```

Cada vez que guardes cambios en los archivos TypeScript, se recompilará automáticamente. Solo necesitas refrescar n8n en el navegador.

## Estructura de Directorios Esperada

```
~/.n8n/
├── custom/
│   └── node_modules/
│       └── n8n-nodes-pdf-utils/
│           ├── dist/
│           │   └── nodes/
│           │       └── PdfUtils/
│           │           ├── PdfUtils.node.js
│           │           ├── PdfUtils.node.json
│           │           └── pdf.svg
│           ├── node_modules/
│           └── package.json
```

## Logs Útiles

Ver logs de n8n con información detallada:
```bash
export N8N_LOG_LEVEL=debug
export N8N_LOG_OUTPUT=console
n8n start
```

## Siguiente Paso

Una vez instalado, importa el workflow de ejemplo:
```bash
# Copiar el workflow de ejemplo
cp examples/basic-workflow.json ~/test-pdf-utils.json
```

Luego en n8n UI:
1. Click en **Import from File**
2. Seleccionar `test-pdf-utils.json`
3. Ejecutar el workflow para probar
