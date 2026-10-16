# We-Track Financial Agent - Integración Completa

## ✅ Implementación Completada

Toda la lógica del backend Python ha sido portada a TypeScript/Node.js y está lista para usar con Tools del Realtime API.

---

## 📁 Estructura de Archivos

```
src/app/services/we-track/
├── config.ts              # Configuración (MongoDB, OpenAI, etc.)
├── memoryService.ts       # Gestión de contexto de conversación
├── mongoService.ts        # Conexión y ejecución de pipelines MongoDB
├── routerService.ts       # LLM Router (decide si necesita pipeline)
├── llmService.ts          # LLM Pipeline Generator (genera pipelines)
├── outputService.ts       # Generación de Excel/PNG
├── queryService.ts        # Orquestador principal
└── init.ts                # Inicialización de servicios

src/app/agentConfigs/
└── financialAgent.ts      # Agente financiero con tool integrado
```

---

## 🚀 Configuración

### 1. Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=we-track
MONGODB_VIEW=finance_events_view

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL_ROUTER=gpt-4.1-mini-2025-04-14
OPENAI_MODEL_PIPELINE=gpt-4.1-2025-04-14

# Memory Configuration
MAX_CONVERSATION_HISTORY=8
```

### 2. Dependencias Instaladas

Ya se instalaron todas las dependencias necesarias:
- `mongodb` - Cliente MongoDB
- `exceljs` - Generación de archivos Excel
- `node-html-to-image` - Generación de PNG (pendiente implementación completa)
- `openai` - Ya estaba instalado

---

## 💻 Uso

### Opción 1: Usar Agente Financiero Solamente

En `App.tsx`, cambia el scenario:

```typescript
import { financialScenario } from './agentConfigs/financialAgent';

// Al conectar:
await connect({
  getEphemeralKey: async () => { ... },
  initialAgents: financialScenario, // ← Usar agente financiero
  ...
});
```

O usa el parámetro de URL: `?agentConfig=financial`

### Opción 2: Agregar a Walter

Modifica `walterScenario` para incluir el tool:

```typescript
// En walter.ts
import { financialAgent } from './financialAgent';

export const walterScenario = [walterAgent, financialAgent];
```

---

## 🔧 Inicialización de Servicios

Los servicios se inicializan automáticamente cuando se llama al tool por primera vez. Si quieres inicializarlos al arrancar la app:

```typescript
import { initializeWeTrackServices } from './services/we-track/init';

// En tu App.tsx o layout.tsx
useEffect(() => {
  initializeWeTrackServices().catch(console.error);
}, []);
```

---

## 📊 Flujo de Funcionamiento

1. **Usuario pregunta**: "¿Cuáles son los ingresos de este mes?"
2. **Agente detecta**: Consulta financiera
3. **Agente llama tool**: `queryFinancialData`
4. **RouterService (LLM 1)**: Decide que necesita pipeline
5. **LLMService (LLM 2)**: Genera pipeline MongoDB
6. **MongoService**: Ejecuta pipeline y obtiene datos
7. **RouterService (LLM 1)**: Genera respuesta conversacional con los datos
8. **OutputService**: Genera Excel si hay >50 registros
9. **Agente**: Lee la respuesta y menciona el archivo Excel

---

## 🧪 Testing

### Prueba Básica

1. Inicia el servidor: `npm run dev`
2. Abre `http://localhost:3000?agentConfig=financial`
3. Habla o escribe: "¿Cuáles son los ingresos de este mes?"
4. El agente debería:
   - Explicar que va a consultar
   - Llamar el tool
   - Leer la respuesta con los datos
   - Mencionar si hay un archivo Excel

### Consultas de Prueba

- ✅ **Necesita pipeline**: "¿Cuáles son los ingresos de este mes?"
- ✅ **Necesita pipeline**: "¿Qué vehículo genera más ingresos?"
- ✅ **No necesita pipeline**: "Hola, ¿cómo estás?"
- ✅ **No necesita pipeline**: "Gracias por tu ayuda"

---

## 📝 Notas

1. **PNG Generation**: Por ahora solo Excel está completamente implementado. PNG está como placeholder y usará Excel como fallback.

2. **Memory Service**: Guarda contexto en MongoDB y en memoria. Si MongoDB no está disponible, funciona solo con memoria.

3. **Error Handling**: Los servicios tienen manejo de errores robusto y no deberían romper la app si fallan.

4. **OpenAI Responses API**: Usa la nueva Responses API de OpenAI. Asegúrate de tener acceso a los modelos `gpt-4.1-mini` y `gpt-4.1`.

---

## 🔍 Debugging

Los servicios tienen logs detallados:
- `✅` = Operación exitosa
- `❌` = Error
- `⚠️` = Advertencia
- `🔍` = Información de debugging
- `📊` = Información de datos
- `🎯` = Decisiones del router

Revisa la consola del servidor (terminal) para ver los logs.

---

## 🎉 ¡Listo para Usar!

El sistema está completamente implementado en TypeScript y listo para usar. Solo necesitas:

1. ✅ Configurar variables de entorno
2. ✅ Asegurar que MongoDB esté corriendo
3. ✅ Tener acceso a OpenAI API
4. ✅ Usar el agente financiero en tu app

¡Disfruta de tu agente financiero completamente en TypeScript! 🚀

