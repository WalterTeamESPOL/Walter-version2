/**
 * API Route for We-Track queries
 * Runs only on server side
 */
import { NextRequest, NextResponse } from 'next/server';
import { processQuery } from '@/app/services/we-track/queryService';
import { initializeWeTrackServices } from '@/app/services/we-track/init';

// Initialize services on first request
let servicesInitialized = false;

async function ensureServicesInitialized() {
  if (!servicesInitialized) {
    await initializeWeTrackServices();
    servicesInitialized = true;
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('📥 [API ROUTE] ===========================================');
  console.log('📥 [API ROUTE] POST /api/we-track/query received');
  console.log('📥 [API ROUTE] Timestamp:', new Date().toISOString());
  
  try {
    // Ensure services are initialized
    console.log('📥 [API ROUTE] Ensuring services are initialized...');
    await ensureServicesInitialized();
    console.log('✅ [API ROUTE] Services initialized');

    const body = await request.json();
    console.log('📥 [API ROUTE] Request body received');
    console.log('📥 [API ROUTE] Body keys:', Object.keys(body));
    
    const { query, user_id, session_id } = body;
    console.log('📥 [API ROUTE] Parsed:', { 
      query: query?.substring(0, 50) + (query?.length > 50 ? '...' : ''),
      user_id, 
      session_id 
    });

    if (!query || !user_id) {
      console.error('❌ [API ROUTE] Missing required fields');
      return NextResponse.json(
        { error: 'query and user_id are required' },
        { status: 400 }
      );
    }

    console.log('📥 [API ROUTE] Processing query...');
    
    // Process query
    const result = await processQuery(query, user_id, session_id);
    
    const elapsedTime = Date.now() - startTime;
    console.log('✅ [API ROUTE] Query processed successfully');
    console.log('📥 [API ROUTE] Result:', {
      success: result.success,
      data_count: result.data_count,
      data_type: result.data_type,
      text_length: result.text?.length || 0,
    });
    console.log('📥 [API ROUTE] Elapsed time:', `${elapsedTime}ms`);
    console.log('📥 [API ROUTE] ===========================================');

    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  } catch (error) {
    const elapsedTime = Date.now() - startTime;
    console.error('❌ [API ROUTE] ===========================================');
    console.error('❌ [API ROUTE] Error in API route');
    console.error('❌ [API ROUTE] Error type:', error?.constructor?.name);
    console.error('❌ [API ROUTE] Error message:', error instanceof Error ? error.message : String(error));
    console.error('❌ [API ROUTE] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('❌ [API ROUTE] Elapsed time:', `${elapsedTime}ms`);
    console.error('❌ [API ROUTE] ===========================================');
    
    return NextResponse.json(
      {
        success: false,
        text: `Error procesando consulta: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        data_type: null,
        data_b64: null,
        data_count: 0,
      },
      { status: 500 }
    );
  }
}

