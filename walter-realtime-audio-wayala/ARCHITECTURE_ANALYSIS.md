# Análisis de Arquitectura: Tools vs MCP vs Next.js API Routes

## Objetivo
Determinar la mejor arquitectura para integrar funcionalidad financiera (2 LLMs + MongoDB) en el agente de tiempo real, considerando escalabilidad futura para múltiples agentes y tools.

---

## Opción 1: Tools del Realtime API ✅ **RECOMENDADA**

### Descripción
Usar `tool()` de `@openai/agents/realtime` para definir funciones que el agente puede llamar directamente cuando detecta consultas financieras.

### Implementación

```typescript
// src/app/agentConfigs/weTrackFinancial.ts
import { RealtimeAgent, tool } from '@openai/agents/realtime';

export const financialAgent = new RealtimeAgent({
  name: 'financial_analyst',
  voice: 'ash',
  instructions: `
    Eres un asistente financiero especializado. Cuando el usuario pregunte sobre:
    - Ingresos, gastos, ganancias
    - Vehículos, conductores, clientes
    - Análisis financieros, promedios, totales
    
    Usa el tool 'queryFinancialData' para obtener información de la base de datos.
  `,
  tools: [
    tool({
      type: 'function',
      name: 'queryFinancialData',
      description: 'Consulta información financiera de la base de datos. Úsalo cuando el usuario pregunte sobre ingresos, gastos, vehículos, conductores, clientes, análisis financieros, promedios o totales.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Consulta del usuario en lenguaje natural'
          },
          user_id: {
            type: 'string',
            description: 'ID del usuario'
          }
        },
        required: ['query', 'user_id']
      }
    })
  ],
  toolLogic: {
    queryFinancialData: async (params: { query: string; user_id: string }) => {
      // Llamar a API Route de Next.js que ejecuta la lógica Python/TypeScript
      const response = await fetch('/api/we-track/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: params.query, 
          user_id: params.user_id 
        })
      });
      const data = await response.json();
      
      // Retornar respuesta que el agente puede leer
      if (data.data_type === 'xlsx') {
        return `${data.text}\n\nSe generó un archivo Excel con ${data.data_count} registros.`;
      } else if (data.data_type === 'png') {
        return `${data.text}\n\nSe generó una visualización con ${data.data_count} registros.`;
      }
      return data.text;
    }
  }
});
```

### Pros ✅
- **Integración nativa**: El agente decide inteligentemente cuándo usar el tool
- **Conversación fluida**: El agente puede explicar qué va a hacer antes de llamar el tool
- **Sin cambios en UI**: Funciona automáticamente dentro de la conversación
- **Escalable**: Fácil agregar más tools (ej: `queryInventory`, `querySales`, etc.)
- **Manejo de errores**: El agente puede manejar errores y explicarlos al usuario
- **No requiere servicios externos**: Todo puede estar en Next.js API Routes

### Contras ❌
- **Lógica backend**: Necesitamos implementar la lógica en TypeScript/Node.js o mantener Python
- **MongoDB desde Node.js**: Requiere `mongodb` o `mongoose` package
- **LLMs desde Node.js**: Requiere llamar a OpenAI API directamente

### Implementación Backend (Next.js API Route)
```typescript
// src/app/api/we-track/query/route.ts
// Opción A: Todo en TypeScript/Node.js
// Opción B: Proxy a backend Python (mantener Python existente)
```

---

## Opción 2: MCP (Model Context Protocol) 🔄

### Descripción
Crear un servidor MCP que expone recursos y herramientas financieras. El agente se conecta al servidor MCP para usar herramientas.

### Implementación

```typescript
// Servidor MCP (TypeScript o Python)
// mcp-server-we-track/index.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server({
  name: 'we-track-financial',
  version: '1.0.0',
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: 'queryFinancialData',
    description: 'Consulta información financiera',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        user_id: { type: 'string' }
      }
    }
  }]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'queryFinancialData') {
    // Ejecutar lógica financiera
    return { content: [{ type: 'text', text: result }] };
  }
});
```

### Pros ✅
- **Estándar abierto**: Protocolo oficial, compatible con múltiples modelos
- **Separación de concerns**: Servidor MCP independiente
- **Reutilizable**: Otros agentes pueden usar el mismo servidor MCP
- **Escalable**: Fácil agregar más tools al servidor MCP

### Contras ❌
- **Complejidad adicional**: Requiere implementar servidor MCP
- **Overhead**: Más capas de comunicación
- **Configuración**: Requiere configurar conexión MCP en el agente
- **No tan integrado**: Menos integración nativa con Realtime API

---

## Opción 3: Next.js API Routes (Sin Tools) ❌

### Descripción
Interceptar transcripciones, detectar si es consulta financiera, llamar API Route, y enviar respuesta al agente.

### Pros ✅
- **Simple**: Lógica directa sin abstracciones
- **Control total**: Control manual de cuándo llamar

### Contras ❌
- **Menos inteligente**: Necesitamos detectar manualmente si es consulta financiera
- **Menos integrado**: El agente no sabe que hay datos disponibles
- **Duplicación**: RouterService ya hace esta detección
- **Menos escalable**: Difícil agregar más funcionalidades

---

## Comparación Visual

| Criterio | Tools (Realtime) | MCP | Next.js Routes |
|----------|------------------|-----|----------------|
| **Integración nativa** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Inteligencia del agente** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **Escalabilidad** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Simplicidad** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Reutilización** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Mantenibilidad** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## Recomendación Final: **Opción 1 - Tools del Realtime API** 🏆

### Razones:

1. **Mejor integración con el agente**: El agente decide inteligentemente cuándo usar el tool basándose en la conversación
2. **Experiencia de usuario superior**: El agente puede explicar qué va a hacer antes de hacerlo
3. **Escalable**: Fácil agregar más tools al mismo agente o crear nuevos agentes con diferentes tools
4. **Arquitectura limpia**: Todo en un stack (Next.js), sin servicios externos complejos
5. **Manejo de errores natural**: El agente puede manejar errores y comunicarlos al usuario

### Arquitectura Propuesta:

```
┌─────────────────────────────────────────────────────────┐
│  Realtime Agent (Financial Agent)                       │
│  - Detecta consulta financiera                          │
│  - Llama tool 'queryFinancialData'                      │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Next.js API Route (/api/we-track/query)                │
│                                                          │
│  Opción A: Todo en TypeScript                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Router       │→ │ Pipeline     │→ │ MongoDB      │ │
│  │ (LLM 1)      │  │ (LLM 2)      │  │ (Execute)    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                          │                              │
│                          ▼                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Output Service                                   │  │
│  │ - PNG / Excel                                    │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  Opción B: Proxy a Backend Python (mantener existente)  │
│  → POST http://localhost:8000/api/query                 │
└─────────────────────────────────────────────────────────┘
```

### Migración Futura a MCP (Opcional)

Si en el futuro necesitamos más complejidad o queremos usar el servidor MCP con otros agentes/frameworks, podemos:
1. Crear servidor MCP que envuelva la lógica actual
2. El tool del Realtime API llama al servidor MCP
3. Otros agentes también pueden usar el servidor MCP

---

## Plan de Implementación (Tools Approach)

### FASE 1: Backend Logic (Elegir opción)

**Opción A: Implementar en TypeScript**
- [ ] Instalar `mongodb` package
- [ ] Portar `RouterService` a TypeScript
- [ ] Portar `LLMService` a TypeScript  
- [ ] Portar `MongoService` a TypeScript
- [ ] Portar `OutputService` a TypeScript (o usar librerías JS)

**Opción B: Mantener Python, usar como Proxy**
- [ ] Crear API Route que llama a Python backend
- [ ] Mantener toda la lógica en Python
- [ ] Más simple, pero requiere mantener 2 servicios

### FASE 2: Tool Definition
- [ ] Crear `financialAgent` con tool `queryFinancialData`
- [ ] Definir `toolLogic` que llama a API Route
- [ ] Integrar en `walterScenario` o crear nuevo scenario

### FASE 3: Visualización de Datos
- [ ] Modificar tool para retornar metadata (data_type, data_b64)
- [ ] Componente React para mostrar PNG/Excel
- [ ] Integrar en Transcript o mostrar como attachment

### FASE 4: Testing y Optimización
- [ ] Probar con consultas financieras
- [ ] Probar con consultas no financieras
- [ ] Optimizar manejo de errores

---

## Ejemplo de Conversación con Tools

**Usuario**: "¿Cuáles son los ingresos de este mes?"

**Agente**: "Voy a consultar los ingresos de este mes en la base de datos..."

[Agente llama tool `queryFinancialData`]

**Tool Response**: "Los ingresos totales de este mes son $45,230.50. Se generó un archivo Excel con los detalles."

**Agente**: "¡Perfecto! Los ingresos totales de este mes son **$45,230.50**. He generado un archivo Excel con todos los detalles por vehículo y fecha."

[UI muestra Excel download link]

---

## Conclusión

**Usar Tools del Realtime API** es la mejor opción porque:
- ✅ Mejor experiencia de usuario (agente inteligente)
- ✅ Integración nativa con el framework
- ✅ Escalable para futuros agentes y tools
- ✅ Arquitectura limpia y mantenible

**Considerar MCP en el futuro** si:
- Necesitamos usar las mismas herramientas con otros frameworks
- Queremos separar completamente la lógica del agente
- Requerimos compatibilidad con múltiples modelos/proveedores

