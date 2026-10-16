/**
 * Main query service - orchestrates the entire query flow
 */
import { routerService } from './routerService';
import { llmService } from './llmService';
import { mongoService } from './mongoService';
import { outputService } from './outputService';

export interface QueryResult {
  success: boolean;
  text: string;
  data_type: 'png' | 'xlsx' | null;
  data_b64: string | null;
  data_count: number;
  session_id?: string;
}

/**
 * Process a user query through the complete pipeline
 */
export async function processQuery(
  query: string,
  userId: string,
  sessionId?: string
): Promise<QueryResult> {
  const startTime = Date.now();
  console.log('📊 [QUERY SERVICE] ===========================================');
  console.log('📊 [QUERY SERVICE] Starting processQuery');
  console.log('📊 [QUERY SERVICE] Query:', query);
  console.log('📊 [QUERY SERVICE] User ID:', userId);
  console.log('📊 [QUERY SERVICE] Session ID:', sessionId);
  console.log('📊 [QUERY SERVICE] Timestamp:', new Date().toISOString());

  try {
    // Ensure services are connected
    console.log('📊 [QUERY SERVICE] Step 0: Ensuring MongoDB connection...');
    await mongoService.connect();
    console.log('✅ [QUERY SERVICE] MongoDB connected');

    // Step 1: Route query (determine if pipeline is needed)
    console.log('📊 [QUERY SERVICE] Step 1: Routing query...');
    const routerResult = await routerService.routeQuery(query, userId, null);
    const pipelineNeeded = routerResult.pipeline_needed;
    console.log('📊 [QUERY SERVICE] Router result:', {
      pipeline_needed: pipelineNeeded,
      response_length: routerResult.response?.length || 0,
      response_preview: routerResult.response?.substring(0, 100) || 'empty',
    });

    // If no pipeline needed, return router response directly
    if (!pipelineNeeded) {
      console.log('📊 [QUERY SERVICE] No pipeline needed, returning direct response');
      const result = {
        success: true,
        text: routerResult.response,
        data_type: null,
        data_b64: null,
        data_count: 0,
        session_id: sessionId,
      };
      console.log('✅ [QUERY SERVICE] Query processed (no pipeline)');
      console.log('📊 [QUERY SERVICE] Elapsed time:', `${Date.now() - startTime}ms`);
      console.log('📊 [QUERY SERVICE] ===========================================');
      return result;
    }

    console.log('📊 [QUERY SERVICE] Pipeline needed, proceeding...');

    // Step 2: Generate pipeline
    console.log('📊 [QUERY SERVICE] Step 2: Generating MongoDB pipeline...');
    const pipeline = await llmService.generatePipeline(query, userId, routerResult.response);
    
    console.log('📊 [QUERY SERVICE] Generated pipeline:', {
      stages: pipeline?.length || 0,
      pipeline_preview: JSON.stringify(pipeline, null, 2).substring(0, 500),
    });

    if (!pipeline || pipeline.length === 0) {
      console.warn('⚠️ [QUERY SERVICE] No pipeline generated');
      const result = {
        success: true,
        text: 'No se pudo generar una consulta válida para tu solicitud. Por favor, reformula tu pregunta.',
        data_type: null,
        data_b64: null,
        data_count: 0,
        session_id: sessionId,
      };
      console.log('📊 [QUERY SERVICE] ===========================================');
      return result;
    }

    // Step 3: Execute pipeline
    console.log('📊 [QUERY SERVICE] Step 3: Executing MongoDB pipeline...');
    console.log('📊 [QUERY SERVICE] Full pipeline:', JSON.stringify(pipeline, null, 2));
    const data = await mongoService.executePipeline(pipeline);
    
    console.log('📊 [QUERY SERVICE] Pipeline execution result:', {
      document_count: data?.length || 0,
      first_doc_keys: data?.[0] ? Object.keys(data[0]) : [],
      first_doc_preview: data?.[0] ? JSON.stringify(data[0], null, 2).substring(0, 300) : 'no data',
    });

    // Step 4: Generate final response
    console.log('📊 [QUERY SERVICE] Step 4: Generating final response with data...');
    const finalResult = await routerService.routeQuery(query, userId, data);
    
    console.log('📊 [QUERY SERVICE] Final response:', {
      response_length: finalResult.response?.length || 0,
      response_preview: finalResult.response?.substring(0, 200) || 'empty',
    });

    if (!data || data.length === 0) {
      console.log('📊 [QUERY SERVICE] No data returned, returning response without file');
      const result = {
        success: true,
        text: finalResult.response,
        data_type: null,
        data_b64: null,
        data_count: 0,
        session_id: sessionId,
      };
      console.log('📊 [QUERY SERVICE] Elapsed time:', `${Date.now() - startTime}ms`);
      console.log('📊 [QUERY SERVICE] ===========================================');
      return result;
    }

    // Step 5: Generate output (Excel or PNG)
    console.log('📊 [QUERY SERVICE] Step 5: Generating output file...');
    const useExcel = outputService.shouldUseExcel(data);
    console.log('📊 [QUERY SERVICE] Output type decision:', {
      use_excel: useExcel,
      data_count: data.length,
      threshold: 50,
    });

    if (useExcel) {
      console.log('📊 [QUERY SERVICE] Generating Excel file...');
      const { buffer } = await outputService.generateExcel(data);
      const dataB64 = outputService.toBase64(buffer);
      console.log('✅ [QUERY SERVICE] Excel generated:', {
        buffer_size: buffer.length,
        base64_length: dataB64.length,
      });

      const result = {
        success: true,
        text: finalResult.response,
        data_type: 'xlsx' as const,
        data_b64: dataB64,
        data_count: data.length,
        session_id: sessionId,
      };
      console.log('✅ [QUERY SERVICE] Query processed successfully (with Excel)');
      console.log('📊 [QUERY SERVICE] Elapsed time:', `${Date.now() - startTime}ms`);
      console.log('📊 [QUERY SERVICE] ===========================================');
      return result;
    } else {
      console.log('📊 [QUERY SERVICE] Generating Excel as fallback (PNG not implemented)...');
      const { buffer } = await outputService.generateExcel(data);
      const dataB64 = outputService.toBase64(buffer);

      const result = {
        success: true,
        text: finalResult.response,
        data_type: 'xlsx' as const,
        data_b64: dataB64,
        data_count: data.length,
        session_id: sessionId,
      };
      console.log('✅ [QUERY SERVICE] Query processed successfully (with Excel fallback)');
      console.log('📊 [QUERY SERVICE] Elapsed time:', `${Date.now() - startTime}ms`);
      console.log('📊 [QUERY SERVICE] ===========================================');
      return result;
    }
  } catch (error) {
    const elapsedTime = Date.now() - startTime;
    console.error('❌ [QUERY SERVICE] ===========================================');
    console.error('❌ [QUERY SERVICE] Error processing query');
    console.error('❌ [QUERY SERVICE] Error type:', error?.constructor?.name);
    console.error('❌ [QUERY SERVICE] Error message:', error instanceof Error ? error.message : String(error));
    console.error('❌ [QUERY SERVICE] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('❌ [QUERY SERVICE] Elapsed time:', `${elapsedTime}ms`);
    console.error('❌ [QUERY SERVICE] ===========================================');
    
    return {
      success: false,
      text: `Lo siento, hubo un error al procesar tu consulta: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      data_type: null,
      data_b64: null,
      data_count: 0,
      session_id: sessionId,
    };
  }
}
