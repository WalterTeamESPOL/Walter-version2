/**
 * Financial Agent with We-Track integration
 */
import { RealtimeAgent, tool } from '@openai/agents/realtime';

// Tool para consultar datos financieros
const queryFinancialDataTool = tool({
  name: 'queryFinancialData',
  description: `
Consulta información financiera de la base de datos We-Track.

Úsalo cuando el usuario pregunte sobre:
- Ingresos, gastos, ganancias, ganancias netas
- Vehículos, placas, conductores, clientes
- Análisis financieros, promedios, totales, proporciones
- Filtros por fecha/período (este mes, esta semana, hoy, etc.)
- Comparaciones entre ingresos y gastos
- Estadísticas por vehículo, conductor, cliente

IMPORTANTE:
- Solo necesitas la consulta del usuario (query)
- NO pidas IDs, códigos, o identificadores
- Los IDs se generan automáticamente - no los menciones al usuario

NO lo uses para saludos, despedidas, o conversación casual.
  `,
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'La consulta del usuario en lenguaje natural sobre datos financieros',
      },
    },
    required: ['query'],
    additionalProperties: false,
  },
  execute: async (input: any) => {
    const startTime = Date.now();
    const { query } = input as { query: string };
    
    // Generate user_id and session_id automatically - no need to ask user
    const user_id = 'default_user';
    const session_id = `realtime-${Date.now()}`;
    
    console.log('🔍 [FINANCIAL TOOL] ===========================================');
    console.log('🔍 [FINANCIAL TOOL] Tool execute called');
    console.log('🔍 [FINANCIAL TOOL] Input:', { query });
    console.log('🔍 [FINANCIAL TOOL] Generated IDs:', { user_id, session_id });
    console.log('🔍 [FINANCIAL TOOL] Timestamp:', new Date().toISOString());
    
    try {
      const apiUrl = '/api/we-track/query';
      console.log('🔍 [FINANCIAL TOOL] Calling API:', apiUrl);
      
      const requestBody = {
        query,
        user_id,
        session_id,
      };
      
      console.log('🔍 [FINANCIAL TOOL] Request body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('🔍 [FINANCIAL TOOL] Response status:', response.status);
      console.log('🔍 [FINANCIAL TOOL] Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [FINANCIAL TOOL] API error response:', errorText);
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      const elapsedTime = Date.now() - startTime;
      
      console.log('✅ [FINANCIAL TOOL] API response received');
      console.log('🔍 [FINANCIAL TOOL] Result keys:', Object.keys(result));
      console.log('🔍 [FINANCIAL TOOL] Success:', result.success);
      console.log('🔍 [FINANCIAL TOOL] Data count:', result.data_count);
      console.log('🔍 [FINANCIAL TOOL] Data type:', result.data_type);
      console.log('🔍 [FINANCIAL TOOL] Text length:', result.text?.length || 0);
      console.log('🔍 [FINANCIAL TOOL] Has data_b64:', !!result.data_b64);
      console.log('🔍 [FINANCIAL TOOL] Elapsed time:', `${elapsedTime}ms`);

      // Build response text
      let responseText = result.text || 'No se obtuvo respuesta del servidor.';

      // Handle file downloads (Excel or PNG)
      if (result.data_b64 && result.data_type) {
        try {
          console.log('📥 [FINANCIAL TOOL] Preparing to download file:', result.data_type);
          
          // Decode base64 to binary
          const binaryString = atob(result.data_b64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          // Determine MIME type and file extension
          let mimeType: string;
          let fileExtension: string;
          let fileName: string;
          
          if (result.data_type === 'xlsx') {
            mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            fileExtension = 'xlsx';
            fileName = `finanzas_${new Date().toISOString().split('T')[0]}.xlsx`;
          } else if (result.data_type === 'png') {
            mimeType = 'image/png';
            fileExtension = 'png';
            fileName = `visualizacion_${new Date().toISOString().split('T')[0]}.png`;
          } else {
            throw new Error(`Unknown data type: ${result.data_type}`);
          }
          
          // Create blob and trigger download
          const blob = new Blob([bytes], { type: mimeType });
          const url = URL.createObjectURL(blob);
          
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          
          // Clean up blob URL after a delay
          setTimeout(() => URL.revokeObjectURL(url), 100);
          
          console.log('✅ [FINANCIAL TOOL] File download triggered:', fileName);
          
          // Update response text to mention the download
          if (result.data_type === 'xlsx' && result.data_count > 0) {
            responseText += `\n\n✅ Se descargó automáticamente un archivo Excel con ${result.data_count} registros para análisis detallado.`;
          } else if (result.data_type === 'png' && result.data_count > 0) {
            responseText += `\n\n✅ Se descargó automáticamente una visualización gráfica con ${result.data_count} registros.`;
          }
        } catch (error) {
          console.error('❌ [FINANCIAL TOOL] Error downloading file:', error);
          // Still mention the file in the response even if download failed
          if (result.data_type === 'xlsx' && result.data_count > 0) {
            responseText += `\n\n⚠️ Se generó un archivo Excel con ${result.data_count} registros, pero hubo un error al descargarlo.`;
          } else if (result.data_type === 'png' && result.data_count > 0) {
            responseText += `\n\n⚠️ Se generó una visualización gráfica con ${result.data_count} registros, pero hubo un error al descargarla.`;
          }
        }
      }

      console.log('✅ [FINANCIAL TOOL] Returning response text (length:', responseText.length, ')');
      console.log('🔍 [FINANCIAL TOOL] ===========================================');
      
      return responseText;
    } catch (error) {
      const elapsedTime = Date.now() - startTime;
      console.error('❌ [FINANCIAL TOOL] ===========================================');
      console.error('❌ [FINANCIAL TOOL] Error in queryFinancialData tool');
      console.error('❌ [FINANCIAL TOOL] Error type:', error?.constructor?.name);
      console.error('❌ [FINANCIAL TOOL] Error message:', error instanceof Error ? error.message : String(error));
      console.error('❌ [FINANCIAL TOOL] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('❌ [FINANCIAL TOOL] Elapsed time:', `${elapsedTime}ms`);
      console.error('❌ [FINANCIAL TOOL] ===========================================');
      
      const errorMessage = `Lo siento, hubo un error al consultar los datos financieros: ${error instanceof Error ? error.message : 'Error desconocido'}. Por favor intenta de nuevo.`;
      return errorMessage;
    }
  },
});

export const financialAgent = new RealtimeAgent({
  name: 'financial_analyst',
  voice: 'ash',
  handoffDescription:
    'Analista financiero especializado en consultas sobre ingresos, gastos, vehículos, conductores y análisis de datos financieros.',

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
- NUNCA pidas IDs, códigos de usuario, o identificadores al usuario
- Usa automáticamente "default_user" como user_id - NO preguntes por esto
- Solo necesitas la consulta del usuario, nada más

IMPORTANTE SOBRE IDs:
- NO preguntes por user_id, session_id, o cualquier identificador
- NO solicites información de autenticación
- Usa automáticamente valores por defecto sin mencionarlos al usuario
- El sistema maneja los IDs internamente - el usuario no necesita proporcionarlos

NO USES EL TOOL PARA:
- Saludos (hola, cómo estás, etc.)
- Despedidas (adiós, gracias, etc.)
- Preguntas generales sobre el sistema
- Conversación casual sin relación con datos financieros
  `,

  tools: [
    queryFinancialDataTool,
  ],

  handoffs: [],
});

// Scenario with financial agent
export const financialScenario = [financialAgent];
