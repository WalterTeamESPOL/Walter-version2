/**
 * Service for routing queries - determines if pipeline is needed
 * Copied from Python router_service.py to ensure exact same behavior
 */
import OpenAI from 'openai';
import { config } from './config';
import { memoryService } from './memoryService';

interface RouterResult {
  response: string;
  pipeline_needed: boolean;
}

class RouterService {
  private client: OpenAI;
  private model: string;

  constructor() {
    this.client = new OpenAI({ apiKey: config.openai.apiKey });
    this.model = config.openai.modelRouter;
  }

  async routeQuery(
    userQuery: string,
    userId: string,
    data: any[] | null = null
  ): Promise<RouterResult> {
    // Get conversation context
    const context = await memoryService.getConversationContext(userId);
    const contextStr = context ? `Contexto de conversación previa:\n${context}\n` : '';

    // CRITICAL: If data is provided, this means pipeline was already executed.
    // Skip pipeline decision logic and go directly to final response generation.
    if (data !== null) {
      console.log(`📊 Data provided (${data.length} records), generating final response (skipping pipeline decision)`);
      return await this._generateFinalResponse(userQuery, userId, data, contextStr);
    }

    // Otherwise (data is None), route query to determine if pipeline is needed
    console.log('📊 No data provided, determining if pipeline is needed');

    const PIPELINE_CAPABLE_QUERIES = `
TIPOS DE PREGUNTAS QUE EL PIPELINE GENERATOR PUEDE RESPONDER (basado en sus ejemplos):

1. FILTRAR Y COMPARAR INCOME vs EXPENSE:
   - "¿Cuál es la proporción entre ingresos y gastos?"
   - "Comparar ingresos y gastos"
   - "Ingresos vs gastos"
   - "Total de ingresos y gastos"

2. FILTRAR INCOME Y AGRUPAR POR PLACA:
   - "¿Qué vehículo genera más ingresos?"
   - "¿Qué placa tiene más ingresos?"
   - "Ingresos por vehículo"
   - "Top vehículos por ingresos"
   - "Vehículo con más ingresos totales"

3. FILTRAR EXPENSE Y AGRUPAR POR CLIENTE:
   - "Gastos por cliente"
   - "¿Qué cliente tiene más gastos?"
   - "Cliente con más gastos"

4. FILTRAR POR SOURCE (fuel, toll, trip, maintenance, event):
   - "Gastos de combustible" o "gastos de fuel"
   - "Gastos de peajes" o "gastos de toll"
   - "Gastos de mantenimiento"
   - "Ingresos de viajes" o "ingresos de trip"

5. PROMEDIO DE VALUE:
   - "¿Cuál es el promedio de ingresos?"
   - "Promedio de gastos"
   - "Valor promedio"

6. AGRUPAR POR CONDUCTOR (con estadísticas):
   - "¿Qué conductor tiene más ingresos?"
   - "Ingresos por conductor"
   - "Promedio por conductor"
   - "Conductor con más ingresos"

7. FILTRAR POR FECHA/PERÍODO:
   - "Ingresos de este mes"
   - "Gastos de esta semana"
   - "Datos de noviembre 2025"
   - "Ingresos de hoy"
   - "Gastos del mes actual"

8. AGRUPAR POR DÍA DE LA SEMANA:
   - "Ingresos por día de la semana"
   - "Gastos por día"

9. AGRUPAR POR VEHICLE.TYPE (campo anidado):
   - "Ingresos por tipo de vehículo"
   - "Gastos por tipo de vehículo"

10. CONTAR CLIENTES ÚNICOS POR PLACA:
    - "Clientes únicos por vehículo"
    - "¿Cuántos clientes tiene cada placa?"

11. DETECTAR OUTLIERS:
    - "Valores atípicos"
    - "Outliers en los datos"

CUALQUIER OTRA PREGUNTA NO ESTÁ EN ESTA LISTA (pipeline_needed: false):
- Saludos: "hola", "buenos días", "hi"
- Despedidas: "adiós", "hasta luego", "bye"
- Conversación casual: "te amo", "gracias", "cómo estás"
- Preguntas generales sobre el sistema
- Cualquier cosa que NO esté específicamente en la lista arriba
`;

    const systemPrompt = `Eres un router que decide si una consulta necesita acceso a la base de datos.

${PIPELINE_CAPABLE_QUERIES}

INSTRUCCIONES CRÍTICAS:
1. SOLO marca pipeline_needed: true si la consulta del usuario está ESPECÍFICAMENTE en la lista de 11 tipos de preguntas arriba
2. Si la consulta es un saludo, despedida, conversación casual, o pregunta general, SIEMPRE marca pipeline_needed: false
3. Si la consulta NO menciona datos financieros específicos (ingresos, gastos, vehículos, conductores, clientes, fechas, promedios, totales, proporciones), marca pipeline_needed: false
4. Si necesitas pipeline, marca pipeline_needed: true y deja response como string vacío ""
5. Si NO necesitas pipeline, marca pipeline_needed: false y responde directamente de manera conversacional

FORMATO DE RESPUESTA (cuando NO necesita pipeline):
- Usa **Markdown** para formatear el texto (negritas, listas, etc.)
- Agrega **emoticones** relevantes para hacer la respuesta más amigable
- Sé conversacional y natural

Debes responder SOLO con un JSON válido con esta estructura:
{
  "response": "tu respuesta conversacional en Markdown con emoticones (solo si NO necesita pipeline, si necesita pipeline pon \"\")",
  "pipeline_needed": true o false
}`;

    const userPrompt = `Consulta del usuario: "${userQuery}"

${contextStr}

ANÁLISIS REQUERIDO:
1. ¿La consulta menciona datos financieros específicos? (ingresos, gastos, vehículos, conductores, clientes, fechas, promedios, totales, proporciones)
2. ¿La consulta está en la lista de 11 tipos de preguntas que el pipeline puede responder?

LISTA DE 11 TIPOS DE PREGUNTAS QUE SÍ NECESITAN PIPELINE:
1. Filtrar y comparar INCOME vs EXPENSE (proporción, comparación, totales)
2. Filtrar INCOME y agrupar por placa (vehículo/placa con más ingresos)
3. Filtrar EXPENSE y agrupar por cliente (gastos por cliente)
4. Filtrar por source (fuel, toll, trip, maintenance, event)
5. Promedio de value (promedio de ingresos/gastos)
6. Agrupar por conductor (conductor con más ingresos)
7. Filtrar por fecha/período (este mes, esta semana, noviembre, hoy)
8. Agrupar por día de la semana
9. Agrupar por vehicle.type
10. Contar clientes únicos por placa
11. Detectar outliers

EJEMPLOS DE CONSULTAS QUE NO NECESITAN PIPELINE (pipeline_needed: false):
- "hola" -> Es un saludo, NO menciona datos financieros
- "te amo" -> Es conversación casual, NO menciona datos financieros
- "gracias" -> Es cortesía, NO menciona datos financieros
- "cómo estás" -> Es conversación casual, NO menciona datos financieros
- "adiós" -> Es despedida, NO menciona datos financieros
- "qué puedes hacer" -> Es pregunta general, NO menciona datos financieros específicos

EJEMPLOS DE CONSULTAS QUE SÍ NECESITAN PIPELINE (pipeline_needed: true):
- "¿Cuál es la proporción entre ingresos y gastos?" -> Menciona ingresos y gastos (tipo 1)
- "¿Qué vehículo genera más ingresos?" -> Menciona vehículo e ingresos (tipo 2)
- "¿Cuáles son las ganancias de este mes?" -> Menciona ganancias (ingresos) y fecha (tipo 7)
- "Gastos de combustible" -> Menciona gastos y source (tipo 4)

REGLAS ESTRICTAS:
- Si la consulta es "hola", "te amo", "gracias", o cualquier saludo/despedida/conversación casual, SIEMPRE marca pipeline_needed: false
- Si la consulta NO menciona datos financieros específicos, SIEMPRE marca pipeline_needed: false
- Solo marca pipeline_needed: true si la consulta menciona datos financieros Y está en la lista de 11 tipos

Responde SOLO con el JSON, sin explicaciones adicionales.`;

    try {
      console.log('🎯 [ROUTER] Calling LLM with model:', this.model);
      
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      });

      const rawText = completion.choices[0]?.message?.content || '';
      console.log('🎯 [ROUTER] LLM raw response:', rawText.substring(0, 500));
      
      const result = JSON.parse(rawText);
      console.log('🎯 [ROUTER] Parsed result:', JSON.stringify(result, null, 2));

      // Safety defaults
      if (typeof result.pipeline_needed !== 'boolean') {
        console.warn('⚠️ [ROUTER] pipeline_needed is not boolean, defaulting to false');
        result.pipeline_needed = false;
      }
      if (!result.response && !result.pipeline_needed) {
        console.log('🎯 [ROUTER] No response and no pipeline, setting default greeting');
        result.response = '¡Hola! ¿En qué puedo ayudarte con información financiera?';
      } else if (result.response === '' && !result.pipeline_needed) {
        result.response = '¡Hola! ¿En qué puedo ayudarte con información financiera?';
      }

      const pipelineNeeded = Boolean(result.pipeline_needed);
      const routerResponse = result.response || '';

      console.log('🎯 [ROUTER] Final decision:', {
        pipeline_needed: pipelineNeeded,
        response_length: routerResponse.length,
        response_preview: routerResponse.substring(0, 100),
      });

      // Add to memory only if no pipeline needed (final response)
      if (!pipelineNeeded) {
        await memoryService.addMessage(userId, 'user', userQuery);
        await memoryService.addMessage(userId, 'assistant', routerResponse);
      }

      return {
        response: routerResponse,
        pipeline_needed: pipelineNeeded,
      };
    } catch (error) {
      console.error('❌ [ROUTER] Error in router service:', error);
      throw error;
    }
  }

  private async _generateFinalResponse(
    userQuery: string,
    userId: string,
    data: any[],
    contextStr: string
  ): Promise<RouterResult> {
    // Format data for LLM (limit to avoid token limits)
    const dataSample = data.slice(0, 10);
    const dataStr = JSON.stringify(dataSample, null, 2);
    const dataCount = data.length;

    const systemPrompt = `Eres un asistente conversacional experto en análisis de datos financieros. Tu tarea es:
1. Responder al usuario de manera conversacional, clara y directa
2. Usar los datos proporcionados para responder su consulta
3. Presentar la información de forma natural y comprensible
4. Si hay muchos datos, hacer un resumen; si son pocos, dar detalles completos

FORMATO DE RESPUESTA:
- Usa **Markdown** para formatear el texto (negritas, listas con viñetas, tablas si es necesario)
- Agrega **emoticones** relevantes para hacer la respuesta más amigable y visual
- Usa listas con viñetas (-) o numeradas cuando presentes múltiples elementos
- Resalta números importantes con **negritas**
- Sé conversacional pero profesional

IMPORTANTE:
- Responde SIEMPRE de manera conversacional y natural
- Usa los datos proporcionados para responder la pregunta del usuario
- Si hay muchos registros, haz un resumen; si son pocos, da detalles
- Debes responder SOLO con un JSON válido con esta estructura:
  {
    "response": "tu respuesta conversacional completa en Markdown con emoticones usando los datos",
    "pipeline_needed": false
  }`;

    const extraNote = dataCount > 10 ? '\n(Nota: Hay más registros, pero se muestra una muestra representativa)' : '';

    const userPrompt = `Consulta del usuario: ${userQuery}

${contextStr}

DATOS OBTENIDOS:
- Total de registros: ${dataCount}
- Datos (muestra de hasta 10 registros):
${dataStr}
${extraNote}

Genera una respuesta conversacional completa que responda directamente la pregunta del usuario usando los datos proporcionados. 
Sé claro, directo y natural. Si hay números, preséntalos de forma legible (ej: $1,234.56).

FORMATO REQUERIDO:
- Usa **Markdown** para formatear (negritas, listas, etc.)
- Agrega **emoticones** relevantes (💰 para dinero, 📊 para datos, ✅ para confirmaciones, etc.)
- Usa listas con viñetas para múltiples elementos
- Resalta números importantes con **negritas**

Responde SOLO con el JSON, sin explicaciones adicionales.`;

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      });

      const rawText = completion.choices[0]?.message?.content || '';
      const result = JSON.parse(rawText);

      const finalResponse = result.response || rawText;

      console.log(`✅ [ROUTER] Generated final response with ${dataCount} records`);

      // Add to memory (user query and final response)
      await memoryService.addMessage(userId, 'user', userQuery);
      await memoryService.addMessage(userId, 'assistant', finalResponse);

      return {
        response: finalResponse,
        pipeline_needed: false,
      };
    } catch (error) {
      console.error('❌ [ROUTER] Error generating final response:', error);
      throw error;
    }
  }
}

// Singleton instance
export const routerService = new RouterService();
