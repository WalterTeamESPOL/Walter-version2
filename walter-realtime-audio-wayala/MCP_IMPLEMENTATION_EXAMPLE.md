# Ejemplo Práctico: Implementación MCP

## Setup Completo: MCP Server + Cliente

Este ejemplo muestra cómo implementar MCP usando tu backend Python existente.

---

## Paso 1: Instalar Dependencias MCP

```bash
# En el servidor MCP (Python)
cd mcp-server-we-track
pip install mcp python-dotenv

# En el cliente (Next.js)
cd we-track-realtime-agent
npm install @modelcontextprotocol/sdk
```

---

## Paso 2: Servidor MCP (Python) - Reutilizando tu código existente

```python
# mcp-server-we-track/server.py
import asyncio
import sys
import os
from pathlib import Path

# Agregar path al backend existente
backend_path = Path(__file__).parent.parent / "whatsapp-bot-we-track-ai"
sys.path.insert(0, str(backend_path))

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent
import json

# Importar servicios existentes
from app.services.router_service import router_service
from app.services.llm_service import llm_service
from app.services.mongo_service import mongo_service
from app.services.output_service import output_service

# Inicializar MongoDB (si no está inicializado)
async def initialize_services():
    """Inicializar servicios antes de usar."""
    try:
        await mongo_service.connect()
        print("✅ MongoDB connected", file=sys.stderr)
    except Exception as e:
        print(f"⚠️ MongoDB connection warning: {e}", file=sys.stderr)

# Crear servidor MCP
app = Server("we-track-financial")

@app.list_tools()
async def list_tools() -> list[Tool]:
    """Lista herramientas disponibles."""
    return [
        Tool(
            name="queryFinancialData",
            description="""
            Consulta información financiera de la base de datos We-Track.
            
            Úsalo cuando el usuario pregunte sobre:
            - Ingresos, gastos, ganancias, ganancias netas
            - Vehículos, placas, conductores, clientes
            - Análisis financieros, promedios, totales, proporciones
            - Filtros por fecha/período (este mes, esta semana, hoy, etc.)
            - Comparaciones entre ingresos y gastos
            - Estadísticas por vehículo, conductor, cliente
            
            NO lo uses para saludos, despedidas, o conversación casual.
            """,
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "La consulta del usuario en lenguaje natural sobre datos financieros"
                    },
                    "user_id": {
                        "type": "string",
                        "description": "ID único del usuario para mantener contexto de conversación"
                    },
                    "session_id": {
                        "type": "string",
                        "description": "ID de sesión (opcional)"
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
        try:
            query = arguments.get("query")
            user_id = arguments.get("user_id")
            session_id = arguments.get("session_id")
            
            if not query or not user_id:
                return [TextContent(
                    type="text",
                    text="Error: query y user_id son requeridos"
                )]
            
            # Step 1: Route query (determinar si necesita pipeline)
            router_result = await router_service.route_query(
                query, 
                user_id, 
                data=None
            )
            
            pipeline_needed = router_result.get("pipeline_needed", False)
            
            # Si no necesita pipeline, retornar respuesta directa
            if not pipeline_needed:
                return [TextContent(
                    type="text",
                    text=router_result["response"]
                )]
            
            # Step 2: Generar pipeline
            pipeline = await llm_service.generate_pipeline(
                query,
                user_id,
                router_response=""
            )
            
            if not pipeline or len(pipeline) == 0:
                return [TextContent(
                    type="text",
                    text="No se pudo generar una consulta válida para tu solicitud. Por favor, reformula tu pregunta."
                )]
            
            # Step 3: Ejecutar pipeline
            data = await mongo_service.execute_pipeline(pipeline)
            
            # Step 4: Generar respuesta final
            final_result = await router_service.route_query(
                query,
                user_id,
                data=data if data else []
            )
            
            # Step 5: Generar output (Excel o PNG)
            if data and len(data) > 0:
                use_excel = output_service.should_use_excel(data)
                
                if use_excel:
                    excel_buffer, _ = output_service.generate_excel(data)
                    data_b64 = output_service.to_base64(excel_buffer)
                    
                    return [TextContent(
                        type="text",
                        text=f"{final_result['response']}\n\nSe generó un archivo Excel con {len(data)} registros para análisis detallado.",
                        metadata={
                            "data_type": "xlsx",
                            "data_b64": data_b64,
                            "data_count": len(data),
                            "session_id": session_id
                        }
                    )]
                else:
                    png_buffer, _ = output_service.generate_png(data, title=query)
                    data_b64 = output_service.to_base64(png_buffer)
                    
                    return [TextContent(
                        type="text",
                        text=f"{final_result['response']}\n\nSe generó una visualización gráfica con {len(data)} registros.",
                        metadata={
                            "data_type": "png",
                            "data_b64": data_b64,
                            "data_count": len(data),
                            "session_id": session_id
                        }
                    )]
            else:
                return [TextContent(
                    type="text",
                    text=final_result["response"]
                )]
                
        except Exception as e:
            import traceback
            error_msg = f"Error procesando consulta financiera: {str(e)}"
            print(f"❌ {error_msg}", file=sys.stderr)
            print(traceback.format_exc(), file=sys.stderr)
            
            return [TextContent(
                type="text",
                text=f"Lo siento, hubo un error al procesar tu consulta. Por favor intenta de nuevo o reformula tu pregunta."
            )]
    
    raise ValueError(f"Unknown tool: {name}")

async def main():
    """Función principal."""
    # Inicializar servicios
    await initialize_services()
    
    # Ejecutar servidor MCP sobre stdio
    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            app.create_initialization_options()
        )

if __name__ == "__main__":
    asyncio.run(main())
```

---

## Paso 3: Cliente MCP (TypeScript/Next.js)

```typescript
// src/app/services/mcpClient.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import path from 'path';

let mcpClient: Client | null = null;
let transport: StdioClientTransport | null = null;

export interface MCPToolResult {
  text: string;
  metadata?: {
    data_type?: 'png' | 'xlsx' | null;
    data_b64?: string;
    data_count?: number;
    session_id?: string;
  };
}

export async function getMCPClient(): Promise<Client> {
  if (mcpClient) return mcpClient;

  // Ruta al servidor MCP Python
  const serverPath = path.join(
    process.cwd(),
    '..',
    'mcp-server-we-track',
    'server.py'
  );

  console.log('🔌 Iniciando cliente MCP...');

  // Crear transporte stdio
  transport = new StdioClientTransport({
    command: 'python',
    args: [serverPath],
    env: {
      ...process.env,
      PYTHONPATH: path.join(process.cwd(), '..', 'whatsapp-bot-we-track-ai'),
    },
  });

  // Crear cliente MCP
  mcpClient = new Client(
    {
      name: 'we-track-realtime-client',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  try {
    await mcpClient.connect(transport);
    console.log('✅ Cliente MCP conectado');
  } catch (error) {
    console.error('❌ Error conectando cliente MCP:', error);
    mcpClient = null;
    throw error;
  }

  return mcpClient;
}

export async function callMCPTool(
  toolName: string,
  args: Record<string, any>
): Promise<MCPToolResult> {
  try {
    const client = await getMCPClient();

    const result = await client.callTool({
      name: toolName,
      arguments: args as any,
    });

    // Extraer contenido de texto
    const textContents = result.content.filter(
      (c: any) => c.type === 'text'
    ) as Array<{
      type: 'text';
      text: string;
      metadata?: any;
    }>;

    if (textContents.length === 0) {
      throw new Error('No text content in MCP response');
    }

    const content = textContents[0];

    return {
      text: content.text,
      metadata: content.metadata,
    };
  } catch (error) {
    console.error('❌ Error llamando tool MCP:', error);
    throw error;
  }
}

export async function disconnectMCPClient(): Promise<void> {
  if (mcpClient) {
    try {
      await mcpClient.close();
    } catch (error) {
      console.error('Error cerrando cliente MCP:', error);
    }
    mcpClient = null;
    transport = null;
  }
}
```

---

## Paso 4: Agente con MCP

```typescript
// src/app/agentConfigs/financialMCP.ts
import { RealtimeAgent, tool } from '@openai/agents/realtime';
import { callMCPTool } from '../services/mcpClient';

export const financialAgentMCP = new RealtimeAgent({
  name: 'financial_analyst_mcp',
  voice: 'ash',
  handoffDescription:
    'Analista financiero especializado en consultas sobre ingresos, gastos, vehículos, conductores y análisis de datos financieros usando MCP.',

  instructions: `
Eres un asistente financiero experto y conversacional. Tu trabajo es ayudar a los usuarios a entender sus datos financieros.

CAPACIDADES:
- Consultar ingresos y gastos
- Analizar datos por vehículo, conductor, cliente
- Calcular promedios, totales, proporciones
- Generar reportes financieros

CUÁNDO USAR EL TOOL:
- Cuando el usuario pregunte sobre ingresos, gastos, ganancias
- Cuando pregunten sobre vehículos, conductores, clientes
- Cuando pidan análisis, promedios, totales, comparaciones
- Cuando mencionen fechas, períodos (este mes, esta semana, etc.)

ESTILO DE RESPUESTA:
- Sé conversacional y claro
- Explica qué vas a hacer antes de consultar datos
- Presenta los resultados de forma comprensible
- Si hay muchos datos, haz un resumen y menciona que hay detalles adicionales disponibles
- Si se generó un archivo Excel o visualización, menciónalo naturalmente

NO USES EL TOOL PARA:
- Saludos (hola, cómo estás, etc.)
- Despedidas (adiós, gracias, etc.)
- Preguntas generales sobre el sistema
- Conversación casual sin relación con datos financieros
  `,

  tools: [
    tool({
      type: 'function',
      name: 'queryFinancialData',
      description: `
Consulta información financiera de la base de datos usando MCP.

Úsalo cuando el usuario pregunte sobre datos financieros específicos.
      `,
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'La consulta del usuario en lenguaje natural sobre datos financieros',
          },
          user_id: {
            type: 'string',
            description: 'ID único del usuario para mantener contexto de conversación',
          },
          session_id: {
            type: 'string',
            description: 'ID de sesión (opcional)',
          },
        },
        required: ['query', 'user_id'],
        additionalProperties: false,
      },
      execute: async (input: {
        query: string;
        user_id: string;
        session_id?: string;
      }) => {
        try {
          const { query, user_id, session_id } = input;

          // Llamar a MCP tool
          const result = await callMCPTool('queryFinancialData', {
            query,
            user_id,
            session_id: session_id || `realtime-${Date.now()}`,
          });

          // Retornar texto al agente
          // La metadata se puede usar después para mostrar Excel/PNG en UI
          return {
            text: result.text,
            metadata: result.metadata, // Opcional: para UI
          };
        } catch (error) {
          console.error('Error en queryFinancialData tool:', error);
          return {
            text: 'Lo siento, hubo un error al consultar los datos financieros. Por favor intenta de nuevo.',
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      },
    }),
  ],

  handoffs: [],
});

// Scenario con MCP
export const financialMCPScenario = [financialAgentMCP];
```

---

## Paso 5: Integrar en App.tsx

```typescript
// src/app/App.tsx (modificar)
import { financialMCPScenario } from './agentConfigs/financialMCP';

// ... resto del código ...

// En el componente, usar financialMCPScenario en lugar de walterScenario
const { connect } = useRealtimeSession({ ... });

// Al conectar:
await connect({
  getEphemeralKey: async () => { ... },
  initialAgents: financialMCPScenario, // ← Usar scenario con MCP
  ...
});
```

---

## Paso 6: Probar MCP

```bash
# Terminal 1: Iniciar servidor MCP directamente (para testing)
cd mcp-server-we-track
python server.py

# Terminal 2: Iniciar Next.js
cd we-track-realtime-agent
npm run dev
```

---

## Ventajas de esta Implementación MCP

1. ✅ **Reutiliza tu código Python existente** - No necesitas portar nada
2. ✅ **Separación clara** - Servidor MCP independiente
3. ✅ **Reutilizable** - Otros agentes/frameworks pueden usar el mismo servidor
4. ✅ **Escalable** - Fácil agregar más tools al servidor MCP
5. ✅ **Futuro-proof** - Protocolo estándar

---

## Desventajas

1. ❌ **Más complejo** - Requiere manejar procesos stdio
2. ❌ **Overhead** - Comunicación entre procesos
3. ❌ **Debugging** - Más difícil debuggear procesos separados
4. ❌ **Setup inicial** - Requiere configurar servidor MCP

---

## ¿Vale la pena MCP?

**Sí, si:**
- Necesitas reutilizar con múltiples agentes/frameworks
- Quieres separación completa de concerns
- Planeas escalar a muchos tools/servicios

**No, si:**
- Solo trabajas con Realtime API
- Quieres la solución más simple
- No necesitas reutilización

---

## Recomendación Final

**Para empezar rápido**: Usa **Tools del Realtime API** directamente
**Para escalar a largo plazo**: Implementa **MCP** como mostré arriba

Puedes empezar con Tools y migrar a MCP después si lo necesitas. La estructura es similar.

