/**
 * Service for LLM interactions - generates MongoDB aggregation pipelines
 * Copied from Python llm_service.py to ensure exact same behavior
 */
import OpenAI from 'openai';
import { config } from './config';
import { memoryService } from './memoryService';
import { mongoService } from './mongoService';

// Helper to fix ISODate() in JSON strings
function fixISODateInJSON(jsonStr: string): string {
  // Pattern to match: ISODate("YYYY-MM-DDTHH:mm:ssZ")
  const pattern = /ISODate\s*\(\s*"([^"]+)"\s*\)/g;
  return jsonStr.replace(pattern, '"$1"');
}

// Helper to check if string is ISO date format
function isISODateString(value: string): boolean {
  const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?$/;
  return isoPattern.test(value);
}

// Fix pipeline dates: convert ISO date strings to Date objects in $match filters
function fixPipelineDates(pipeline: any[]): any[] {
  if (!pipeline || pipeline.length === 0) {
    return pipeline;
  }

  function convertISOStringsToDate(obj: any): any {
    if (typeof obj === 'object' && obj !== null) {
      if (Array.isArray(obj)) {
        return obj.map(convertISOStringsToDate);
      }

      const converted: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Check if this is a date comparison operator
        if (key === '$gte' || key === '$lte' || key === '$gt' || key === '$lt' || key === '$eq' || key === '$ne') {
          // If value is a string that looks like an ISO date, convert it
          if (typeof value === 'string' && isISODateString(value)) {
            try {
              converted[key] = new Date(value);
              console.log(`🔧 [LLM PIPELINE] Converted date string ${value} to Date object`);
            } catch (error) {
              console.warn(`⚠️ [LLM PIPELINE] Failed to parse date string ${value}:`, error);
              converted[key] = value;
            }
          } else if (typeof value === 'object' && value !== null) {
            // Check if it's $dateFromString - we need to extract the dateString
            const valueAny = value as any;
            if (valueAny.$dateFromString && valueAny.$dateFromString.dateString) {
              try {
                converted[key] = new Date(valueAny.$dateFromString.dateString);
                console.log(`🔧 [LLM PIPELINE] Converted $dateFromString to Date: ${valueAny.$dateFromString.dateString}`);
              } catch (error) {
                console.warn(`⚠️ [LLM PIPELINE] Failed to parse $dateFromString:`, error);
                converted[key] = value;
              }
            } else {
              converted[key] = convertISOStringsToDate(value);
            }
          } else {
            converted[key] = convertISOStringsToDate(value);
          }
        } else if (typeof value === 'string' && isISODateString(value)) {
          // Direct ISO date string value
          try {
            converted[key] = new Date(value);
            console.log(`🔧 [LLM PIPELINE] Converted direct date string ${value} to Date`);
          } catch {
            converted[key] = value;
          }
        } else if (typeof value === 'object' && value !== null) {
          // Nested object - check for date comparison operators or $dateFromString
          const valueAny = value as any;
          if (valueAny.$dateFromString && valueAny.$dateFromString.dateString) {
            try {
              converted[key] = new Date(valueAny.$dateFromString.dateString);
              console.log(`🔧 [LLM PIPELINE] Converted nested $dateFromString to Date: ${valueAny.$dateFromString.dateString}`);
            } catch {
              converted[key] = convertISOStringsToDate(value);
            }
          } else if (Object.keys(value).some(k => ['$gte', '$lte', '$gt', '$lt', '$eq', '$ne'].includes(k))) {
            // Nested date filter
            converted[key] = convertISOStringsToDate(value);
          } else {
            converted[key] = convertISOStringsToDate(value);
          }
        } else {
          converted[key] = convertISOStringsToDate(value);
        }
      }
      return converted;
    }
    return obj;
  }

  try {
    const correctedPipeline = convertISOStringsToDate(pipeline);
    console.log('✅ [LLM PIPELINE] Pipeline dates converted to Date objects');
    return correctedPipeline;
  } catch (error) {
    console.error('❌ [LLM PIPELINE] Failed to convert dates in pipeline:', error);
    return pipeline; // Return original if conversion fails
  }
}

class LLMService {
  private client: OpenAI;
  private model: string;

  // Schema completo de FinanceEvent para el LLM
  private readonly FINANCE_EVENT_SCHEMA = `
Estructura completa del documento FinanceEvent:
{
  "id": "string",
  "plate": "string",                    // Placa del vehículo
  "command": "string",                  // Comando/operación
  "createdAt": "Date/ISODate",         // Fecha de creación
  "driverName": "string",               // Nombre del conductor
  "clientName": "string",               // Nombre del cliente
  "clientId": "string",                 // ID del cliente
  "materialName": "string | null",      // Nombre del material (opcional)
  "value": "number",                    // Valor monetario
  "source": "event" | "trip" | "toll" | "fuel" | "maintenance",  // Fuente del evento
  "type": "INCOME" | "EXPENSE",         // Tipo: INGRESO o GASTO
  "vehicle": {                          // Objeto anidado (opcional)
    "id": "string",
    "plate": "string",
    "type": "string",                   // Tipo de vehículo
    "brand": "string",
    "year": "number",
    "capacity": "number",                // Capacidad del vehículo
    "status": "string",
    "deviceId": "string | null",
    "clientId": "string | null",
    "driver": {                         // Objeto anidado dentro de vehicle (opcional)
      "id": "string",
      "nationalId": "string",
      "fullName": "string",
      "phone": "string",
      "plate": "string | null",
      "licenseExpirationDate": "Date",
      "hireDate": "Date",
      "iessRegistration": "string | null",
      "employmentStatus": "string | null",
      "telegramId": "string | null",
      "salary": "number"
    }
  }
}
`;

  // Ejemplos de pipelines comunes
  private readonly PIPELINE_EXAMPLES = `
EJEMPLOS DE PIPELINES COMUNES:

1. Filtrar INCOME y EXPENSE, sumar valores y comparar:
[
  {"$match": {"type": {"$in": ["INCOME", "EXPENSE"]}}},
  {"$group": {
    "_id": "$type",
    "total": {"$sum": "$value"},
    "count": {"$sum": 1}
  }},
  {"$sort": {"_id": 1}}
]

2. Filtrar INCOME, agrupar por placa, sumar valores:
[
  {"$match": {"type": "INCOME"}},
  {"$group": {
    "_id": "$plate",
    "total": {"$sum": "$value"},
    "count": {"$sum": 1}
  }},
  {"$sort": {"total": -1}}
]

3. Filtrar EXPENSE, agrupar por cliente, sumar valores:
[
  {"$match": {"type": "EXPENSE"}},
  {"$group": {
    "_id": {"clientId": "$clientId", "clientName": "$clientName"},
    "total": {"$sum": "$value"},
    "count": {"$sum": 1}
  }},
  {"$sort": {"total": -1}}
]

4. Filtrar por source=fuel, agrupar por placa:
[
  {"$match": {"source": "fuel"}},
  {"$group": {
    "_id": "$plate",
    "total": {"$sum": "$value"},
    "count": {"$sum": 1}
  }},
  {"$sort": {"total": -1}}
]

5. Promedio de value en todos los registros:
[
  {"$group": {
    "_id": null,
    "average": {"$avg": "$value"},
    "total": {"$sum": "$value"},
    "count": {"$sum": 1}
  }}
]

6. Agrupar por conductor, calcular promedio y desviación estándar:
[
  {"$group": {
    "_id": "$driverName",
    "average": {"$avg": "$value"},
    "total": {"$sum": "$value"},
    "count": {"$sum": 1},
    "stdDev": {"$stdDevPop": "$value"},
    "min": {"$min": "$value"},
    "max": {"$max": "$value"}
  }},
  {"$sort": {"total": -1}}
]

7. Filtrar por fecha (rango específico):
[
  {"$match": {
    "createdAt": {
      "$gte": ISODate("2024-01-01T00:00:00Z"),
      "$lte": ISODate("2024-01-31T23:59:59Z")
    }
  }},
  {"$group": {
    "_id": "$type",
    "total": {"$sum": "$value"}
  }}
]

7b. Filtrar por "esta semana" (lunes a hoy) - USA LAS FECHAS PROPORCIONADAS:
[
  {"$match": {
    "type": "INCOME",
    "createdAt": {
      "$gte": ISODate("FECHA_INICIO_SEMANA_AQUI"),
      "$lte": ISODate("FECHA_ACTUAL_AQUI")
    }
  }},
  {"$group": {
    "_id": "$plate",
    "total": {"$sum": "$value"}
  }}
]

7c. Filtrar por "hoy" - USA LA FECHA ACTUAL PROPORCIONADA:
[
  {"$match": {
    "createdAt": {
      "$gte": ISODate("FECHA_ACTUAL_00:00:00Z"),
      "$lte": ISODate("FECHA_ACTUAL_AQUI")
    }
  }}
]

8. Agrupar por día de la semana:
[
  {"$project": {
    "dayOfWeek": {"$dayOfWeek": "$createdAt"},
    "value": 1,
    "type": 1
  }},
  {"$group": {
    "_id": "$dayOfWeek",
    "count": {"$sum": 1},
    "total": {"$sum": "$value"}
  }},
  {"$sort": {"_id": 1}}
]

9. Acceder a campos anidados (vehicle.type):
[
  {"$match": {"vehicle.type": {"$exists": true}}},
  {"$group": {
    "_id": "$vehicle.type",
    "total": {"$sum": "$value"},
    "count": {"$sum": 1}
  }},
  {"$sort": {"total": -1}}
]

10. Contar clientes únicos por placa:
[
  {"$group": {
    "_id": "$plate",
    "uniqueClients": {"$addToSet": "$clientId"},
    "clientCount": {"$sum": 1}
  }},
  {"$project": {
    "plate": "$_id",
    "uniqueClientCount": {"$size": "$uniqueClients"},
    "totalEvents": "$clientCount"
  }},
  {"$sort": {"uniqueClientCount": -1}}
]

11. Detectar outliers usando percentiles:
[
  {"$group": {
    "_id": "$plate",
    "values": {"$push": "$value"},
    "count": {"$sum": 1}
  }},
  {"$project": {
    "plate": "$_id",
    "p25": {"$arrayElemAt": [{"$sortArray": {"input": "$values", "sortOrder": 1}}, {"$floor": {"$multiply": [{"$size": "$values"}, 0.25]}}]},
    "p75": {"$arrayElemAt": [{"$sortArray": {"input": "$values", "sortOrder": 1}}, {"$floor": {"$multiply": [{"$size": "$values"}, 0.75]}}]},
    "median": {"$arrayElemAt": [{"$sortArray": {"input": "$values", "sortOrder": 1}}, {"$floor": {"$divide": [{"$size": "$values"}, 2]}]}]
  }}
]
`;

  constructor() {
    this.client = new OpenAI({ apiKey: config.openai.apiKey });
    this.model = config.openai.modelPipeline;
  }

  async generatePipeline(
    userQuery: string,
    userId: string,
    routerResponse: string = ''
  ): Promise<any[]> {
    // Get conversation context
    const context = await memoryService.getConversationContext(userId);
    const contextStr = context ? `Contexto de conversación previa:\n${context}\n` : '';

    // Get current date/time for date filters
    const currentDate = new Date();
    const currentDateStr = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentDateTimeStr = currentDate.toISOString(); // Full ISO with Z

    // Calculate start of week (Monday)
    const daysSinceMonday = currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1; // 0 = Monday, 6 = Sunday
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - daysSinceMonday);
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfWeekStr = startOfWeek.toISOString();

    // Get sample data to help LLM understand structure
    const sampleData = await mongoService.getViewSample(3);
    const sampleStr = JSON.stringify(sampleData, null, 2);

    // Build comprehensive system prompt
    const systemPrompt = `Eres un experto en MongoDB y agregaciones. Tu tarea es convertir consultas en lenguaje natural sobre eventos financieros a pipelines de agregación de MongoDB.

${this.FINANCE_EVENT_SCHEMA}

REGLAS IMPORTANTES:
1. Debes responder SOLO con un JSON válido que contenga un array llamado "pipeline"
2. El pipeline debe ser un array de objetos, cada uno representando una etapa de agregación
3. Usa operadores estándar de MongoDB: $match, $group, $project, $sort, $limit, $unwind, etc.
4. Para campos anidados usa notación de punto: "vehicle.type", "vehicle.capacity"
5. Para fechas, usa operadores como $dayOfWeek, $dayOfMonth, $month, $year, $dateToString
6. Para filtros de fecha:
   - SIEMPRE usa ISODate("YYYY-MM-DDTHH:mm:ssZ") con las fechas exactas proporcionadas arriba
   - NO uses "$$NOW" ni operadores de fecha dinámicos - usa las fechas calculadas que se te proporcionan
   - Para "esta semana", usa ISODate con la fecha de inicio de semana proporcionada
   - Para "hoy", usa ISODate con la fecha actual proporcionada (00:00:00Z para inicio del día)
   - Las fechas están en formato UTC (Z al final)
7. NO incluyas explicaciones, solo el JSON con el pipeline
8. El JSON debe ser válido y parseable

OPERADORES COMUNES A USAR:
- $match: Filtrar documentos
- $group: Agrupar y agregar (usar $sum, $avg, $min, $max, $count, $stdDevPop, $stdDevSamp)
- $project: Seleccionar/transformar campos
- $sort: Ordenar resultados
- $limit: Limitar cantidad de resultados
- $unwind: Descomponer arrays
- $addToSet: Agregar valores únicos a un array
- $size: Tamaño de un array
- $dateToString: Convertir fecha a string
- $dayOfWeek, $dayOfMonth, $month, $year: Extraer partes de fecha

CAMPOS PRINCIPALES:
- type: "INCOME" o "EXPENSE" (usar $match para filtrar)
- source: "event", "trip", "toll", "fuel", "maintenance"
- value: número (usar en $sum, $avg, $min, $max)
- plate: placa del vehículo
- clientId, clientName: información del cliente
- driverName: nombre del conductor
- materialName: nombre del material (puede ser null)
- createdAt: fecha (usar operadores de fecha)
- vehicle.type: tipo de vehículo (campo anidado)
- vehicle.capacity: capacidad del vehículo (campo anidado)

${this.PIPELINE_EXAMPLES}

Ejemplo de formato de respuesta:
{
  "pipeline": [
    {"$match": {"type": "INCOME"}},
    {"$group": {"_id": "$plate", "total": {"$sum": "$value"}}},
    {"$sort": {"total": -1}},
    {"$limit": 10}
  ]
}`;

    // Build user prompt with context
    const routerContext = routerResponse
      ? `\nNota: El usuario ya recibió esta respuesta inicial: '${routerResponse}'\nAhora necesitas generar el pipeline para obtener los datos.\n`
      : '';

    const userPrompt = `Consulta del usuario: ${userQuery}
${routerContext}
FECHA ACTUAL (para usar en filtros de fecha):
- Fecha y hora actual (UTC): ${currentDateTimeStr}
- Fecha actual: ${currentDateStr}
- Inicio de esta semana (lunes): ${startOfWeekStr}

ESTRUCTURA IDEAL ESPERADA (FinanceEvent):
${this.FINANCE_EVENT_SCHEMA}

DATOS REALES DE EJEMPLO de la colección (primeros 3 documentos):
${sampleStr}

INSTRUCCIONES CRÍTICAS:
1. La estructura ideal (FinanceEvent) muestra los campos disponibles: id, plate, command, createdAt, driverName, clientName, clientId, materialName, value, source, type, vehicle
2. Los datos REALES arriba muestran la estructura ACTUAL en la base de datos
3. IMPORTANTE: Los datos ya están en el formato FinanceEvent correcto (campos en nivel raíz, no anidados en "data")
4. DEBES generar un pipeline que:
   - Use los campos directamente del nivel raíz: type, value, plate, clientId, clientName, driverName, source, createdAt, etc.
   - Para campos anidados en "vehicle" usa notación de punto: "vehicle.type", "vehicle.capacity"
   - NO busques campos en "data.value" o "data.type" - los campos ya están en el nivel raíz
   - Los campos principales están disponibles directamente: type (INCOME/EXPENSE), value (número), source, plate, etc.

ANÁLISIS REQUERIDO:
- Verifica que los datos REALES coinciden con la estructura ideal (deberían coincidir)
- Usa los campos directamente del nivel raíz como se muestran en los ejemplos
- Solo usa notación de punto para campos dentro de "vehicle" (ej: vehicle.type, vehicle.capacity)
- Genera el pipeline usando los nombres de campos que ves en los ejemplos REALES

${contextStr}

Genera un pipeline de agregación de MongoDB que:
1. PRIMERO analice y adapte la estructura real de los datos (usando $project si es necesario)
2. LUEGO aplique los filtros, agrupaciones y cálculos según la consulta
3. Si la consulta menciona fechas/periodos, incluye $match con filtros de fecha
4. Si pregunta por "más", "mayor", "top", incluye $sort y posiblemente $limit
5. Si pregunta por promedios, usa $avg
6. Si pregunta por totales, usa $sum
7. Si pregunta por conteos, usa $sum: 1 en $group
8. Si pregunta por variabilidad, usa $stdDevPop o $stdDevSamp
9. Si pregunta por días de la semana/meses, usa operadores de fecha en $project antes de $group

IMPORTANTE: El pipeline debe funcionar con la estructura REAL de los datos mostrados, no con la estructura ideal.

Responde SOLO con el JSON del pipeline, sin explicaciones adicionales.`;

    try {
      console.log('🔧 [LLM PIPELINE] Calling LLM to generate pipeline');
      console.log('🔧 [LLM PIPELINE] Model:', this.model);
      console.log('🔧 [LLM PIPELINE] Query:', userQuery);
      console.log('🔧 [LLM PIPELINE] Sample data count:', sampleData.length);

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      });

      const rawText = completion.choices[0]?.message?.content || '';
      console.log('🔧 [LLM PIPELINE] LLM raw response length:', rawText.length);
      console.log('🔧 [LLM PIPELINE] LLM raw response preview:', rawText.substring(0, 500));

      // Fix ISODate() calls in JSON before parsing
      const fixedText = fixISODateInJSON(rawText);
      console.log('🔧 [LLM PIPELINE] Fixed text (after ISODate fix) length:', fixedText.length);

      const result = JSON.parse(fixedText);
      console.log('🔧 [LLM PIPELINE] Parsed result keys:', Object.keys(result));

      if (!result.pipeline || !Array.isArray(result.pipeline)) {
        console.error('❌ [LLM PIPELINE] LLM response does not contain valid pipeline');
        console.error('❌ [LLM PIPELINE] Result:', JSON.stringify(result, null, 2));
        return [];
      }

      const pipeline = result.pipeline;
      console.log('✅ [LLM PIPELINE] Generated pipeline with', pipeline.length, 'stages');
      console.log('🔧 [LLM PIPELINE] Full pipeline (before date fix):', JSON.stringify(pipeline, null, 2));

      // Fix date filters in pipeline (replace $dateFromString with Date objects)
      const fixedPipeline = fixPipelineDates(pipeline);
      console.log('✅ [LLM PIPELINE] Pipeline after date correction:', JSON.stringify(fixedPipeline, null, 2));

      return fixedPipeline;
    } catch (error) {
      console.error('❌ [LLM PIPELINE] Error generating pipeline:', error);
      console.error('❌ [LLM PIPELINE] Error type:', error?.constructor?.name);
      console.error('❌ [LLM PIPELINE] Error message:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }
}

// Singleton instance
export const llmService = new LLMService();
