# Análisis Detallado: MCP (Model Context Protocol)

## ¿Qué es MCP?

MCP (Model Context Protocol) es un protocolo estándar desarrollado por Anthropic (y ahora adoptado por OpenAI y otros) que permite a los agentes de IA conectarse con herramientas externas de manera estandarizada. Es como un "protocolo universal" para que los agentes interactúen con cualquier sistema.

---

## Arquitectura MCP

```
┌─────────────────────────────────────────────────────────┐
│  Realtime Agent (Next.js)                                │
│  - Usa herramientas a través de MCP Client              │
└─────────────────────────────────────────────────────────┘
                          │
                          │ MCP Protocol (JSON-RPC)
                          │ (stdio, HTTP, SSE)
                          ▼
┌─────────────────────────────────────────────────────────┐
│  MCP Server (Python o TypeScript)                       │
│  - Expone herramientas financieras                      │
│  - Maneja lógica de negocio                             │
│  - Se conecta a MongoDB, OpenAI, etc.                   │
└─────────────────────────────────────────────────────────┘
```

---

## Ventajas de MCP vs Tools Directos

### ✅ Ventajas de MCP

1. **Estandarización Universal**
   - Funciona con cualquier modelo/proveedor (OpenAI, Anthropic, etc.)
   - No está atado a un framework específico
   - Protocolo abierto y documentado

2. **Separación de Concerns**
   - El servidor MCP es completamente independiente
   - Puede estar en Python, TypeScript, Go, etc.
   - Fácil de mantener y escalar

3. **Reutilización Masiva**
   - Mismo servidor MCP puede usarse por:
     - Realtime Agents
     - Chat completions
     - Otros frameworks
     - CLI tools
     - Cualquier cliente MCP

4. **Escalabilidad**
   - Agregar nuevas herramientas = agregar al servidor MCP
   - Múltiples agentes pueden usar el mismo servidor
   - Fácil crear nuevos servidores MCP especializados

5. **Recursos y Herramientas**
   - MCP soporta no solo "tools" sino también "resources"
   - Los recursos son datos que el agente puede leer
   - Herramientas son acciones que el agente puede ejecutar

---

## Comparación: Tools vs MCP

| Característica | Tools (Realtime API) | MCP |
|----------------|---------------------|-----|
| **Integración con Realtime API** | ⭐⭐⭐⭐⭐ Nativo | ⭐⭐⭐ Requiere cliente MCP |
| **Reutilización** | ⭐⭐⭐ Solo Realtime API | ⭐⭐⭐⭐⭐ Universal |
| **Separación de concerns** | ⭐⭐⭐ En el mismo proceso | ⭐⭐⭐⭐⭐ Proceso separado |
| **Estandarización** | ⭐⭐⭐ Específico de OpenAI | ⭐⭐⭐⭐⭐ Protocolo abierto |
| **Complejidad** | ⭐⭐⭐⭐ Más simple | ⭐⭐⭐ Más complejo |
| **Rendimiento** | ⭐⭐⭐⭐⭐ Más rápido (directo) | ⭐⭐⭐⭐ HTTP/stdio overhead |
| **Futuro-proof** | ⭐⭐⭐ Si cambias de framework | ⭐⭐⭐⭐⭐ Independiente |

---

## Implementación MCP: Opción 1 - Servidor MCP en Python

### Estructura

```
we-track-realtime-agent/
├── mcp-server-we-track/           # Servidor MCP independiente
│   ├── server.py                  # Servidor MCP principal
│   ├── tools/
│   │   └── financial.py          # Tool de consultas financieras
│   ├── resources/
│   │   └── database.py           # Recursos de BD (opcional)
│   └── requirements.txt
└── src/
    └── app/
        └── services/
            └── mcpClient.ts      # Cliente MCP en TypeScript
```

### Servidor MCP (Python)

```python
# mcp-server-we-track/server.py
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent
import asyncio

from tools.financial import query_financial_data

# Reutilizar servicios existentes del backend Python
import sys
sys.path.append('../whatsapp-bot-we-track-ai')
from app.services.router_service import router_service
from app.services.llm_service import llm_service
from app.services.mongo_service import mongo_service
from app.services.output_service import output_service

app = Server("we-track-financial")

@app.list_tools()
async def list_tools() -> list[Tool]:
    """Lista todas las herramientas disponibles."""
    return [
        Tool(
            name="queryFinancialData",
            description="""
            Consulta información financiera de la base de datos.
            
            Úsalo cuando el usuario pregunte sobre:
            - Ingresos, gastos, ganancias
            - Vehículos, conductores, clientes
            - Análisis financieros, promedios, totales
            """,
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Consulta del usuario en lenguaje natural"
                    },
                    "user_id": {
                        "type": "string",
                        "description": "ID del usuario"
                    }
                },
                "required": ["query", "user_id"]
            }
        )
    ]

@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    """Ejecuta una herramienta."""
    if name == "queryFinancialData":
        query = arguments.get("query")
        user_id = arguments.get("user_id")
        
        # Usar lógica existente del backend Python
        router_result = await router_service.route_query(query, user_id, data=None)
        
        if not router_result.get("pipeline_needed"):
            return [TextContent(
                type="text",
                text=router_result["response"]
            )]
        
        # Generar pipeline y ejecutar
        pipeline = await llm_service.generate_pipeline(query, user_id)
        data = await mongo_service.execute_pipeline(pipeline)
        
        # Generar respuesta final
        final_result = await router_service.route_query(
            query, user_id, data=data
        )
        
        # Generar output
        use_excel = output_service.should_use_excel(data)
        if use_excel:
            excel_buffer, _ = output_service.generate_excel(data)
            data_b64 = output_service.to_base64(excel_buffer)
            return [TextContent(
                type="text",
                text=f"{final_result['response']}\n\nSe generó un archivo Excel con {len(data)} registros.",
                metadata={"data_type": "xlsx", "data_b64": data_b64}
            )]
        else:
            png_buffer, _ = output_service.generate_png(data, title=query)
            data_b64 = output_service.to_base64(png_buffer)
            return [TextContent(
                type="text",
                text=f"{final_result['response']}\n\nSe generó una visualización con {len(data)} registros.",
                metadata={"data_type": "png", "data_b64": data_b64}
            )]
    
    raise ValueError(f"Unknown tool: {name}")

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            app.create_initialization_options()
        )

if __name__ == "__main__":
    asyncio.run(main())
```

### Cliente MCP (TypeScript/Next.js)

```typescript
// src/app/services/mcpClient.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

let mcpClient: Client | null = null;

export async function getMCPClient(): Promise<Client> {
  if (mcpClient) return mcpClient;

  // Iniciar servidor MCP Python como proceso hijo
  const pythonProcess = spawn('python', [
    'mcp-server-we-track/server.py'
  ]);

  // Crear transporte stdio
  const transport = new StdioClientTransport({
    command: 'python',
    args: ['mcp-server-we-track/server.py'],
    env: process.env
  });

  mcpClient = new Client({
    name: 'we-track-client',
    version: '1.0.0',
  }, {
    capabilities: {
      tools: {},
    },
  });

  await mcpClient.connect(transport);
  
  return mcpClient;
}

export async function callMCPTool(
  toolName: string, 
  args: Record<string, any>
): Promise<string> {
  const client = await getMCPClient();
  const result = await client.callTool({
    name: toolName,
    arguments: args as any,
  });

  // Extraer texto de la respuesta
  const textContents = result.content.filter(
    (c: any) => c.type === 'text'
  ) as Array<{ type: 'text'; text: string; metadata?: any }>;

  return textContents[0]?.text || '';
}
```

### Agente con MCP

```typescript
// src/app/agentConfigs/financialMCP.ts
import { RealtimeAgent, tool } from '@openai/agents/realtime';
import { callMCPTool } from '../services/mcpClient';

export const financialAgentMCP = new RealtimeAgent({
  name: 'financial_analyst_mcp',
  voice: 'ash',
  instructions: `Eres un asistente financiero...`,
  
  tools: [
    tool({
      name: 'queryFinancialData',
      description: 'Consulta información financiera...',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          user_id: { type: 'string' }
        },
        required: ['query', 'user_id']
      },
      execute: async (input: { query: string; user_id: string }) => {
        // El tool del Realtime API llama al cliente MCP
        return await callMCPTool('queryFinancialData', input);
      }
    })
  ]
});
```

---

## Implementación MCP: Opción 2 - Servidor MCP en TypeScript

### Servidor MCP (TypeScript/Node.js)

```typescript
// mcp-server-we-track/server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Importar lógica (necesitarías portar servicios a TypeScript)
import { routerService } from './services/routerService';
import { llmService } from './services/llmService';
import { mongoService } from './services/mongoService';
import { outputService } from './services/outputService';

const server = new Server(
  {
    name: 'we-track-financial',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'queryFinancialData',
      description: 'Consulta información financiera...',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          user_id: { type: 'string' }
        },
        required: ['query', 'user_id']
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'queryFinancialData') {
    const { query, user_id } = request.params.arguments as {
      query: string;
      user_id: string;
    };

    // Lógica similar al ejemplo Python
    const routerResult = await routerService.routeQuery(query, user_id);
    // ... resto de la lógica

    return {
      content: [
        {
          type: 'text',
          text: result,
          metadata: { data_type, data_b64 }
        }
      ]
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('We-Track MCP server running on stdio');
}

main().catch(console.error);
```

---

## Comparación Final: ¿Cuándo usar cada uno?

### Usa **Tools del Realtime API** si:
- ✅ Solo trabajas con Realtime API de OpenAI
- ✅ Quieres la integración más simple y directa
- ✅ No necesitas reutilizar con otros frameworks
- ✅ Prefieres todo en un stack (Next.js)

### Usa **MCP** si:
- ✅ Necesitas reutilizar herramientas con múltiples frameworks
- ✅ Quieres separar completamente la lógica de negocio
- ✅ Planeas usar herramientas con otros modelos/proveedores
- ✅ Prefieres un protocolo estándar y futuro-proof
- ✅ Quieres que otros equipos/proyectos usen tus herramientas

---

## Recomendación Híbrida 🎯

**Mejor de ambos mundos:**

1. **Corto plazo**: Usar **Tools del Realtime API** para integración rápida
2. **Largo plazo**: Migrar a **MCP** cuando:
   - Necesites reutilizar con otros agentes
   - Quieras separar servidores especializados
   - Requieras compatibilidad multi-proveedor

### Migración Gradual

```
FASE 1: Tools Directos (Ahora)
  ↓
FASE 2: Wrapper MCP alrededor de lógica existente
  ↓
FASE 3: Servidor MCP independiente
```

---

## Ejemplo: Arquitectura Híbrida

```typescript
// El tool llama a MCP, que usa la lógica existente
tool({
  execute: async (input) => {
    // Opción A: Llamar directamente a API Route (simple)
    const response = await fetch('/api/we-track/query', { ... });
    
    // Opción B: Llamar a MCP (más reutilizable)
    const result = await callMCPTool('queryFinancialData', input);
    
    return result;
  }
})
```

---

## Conclusión

**Para tu caso específico:**

1. **Si priorizas velocidad**: Usa **Tools del Realtime API** primero
2. **Si priorizas reutilización futura**: Usa **MCP** desde el inicio
3. **Si quieres lo mejor de ambos**: Empieza con Tools, migra a MCP después

**Mi recomendación**: Empieza con **Tools** (más rápido), pero estructura el código de forma que sea fácil migrar a MCP después si lo necesitas.

