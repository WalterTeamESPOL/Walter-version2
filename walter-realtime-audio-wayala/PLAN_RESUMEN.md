# Plan de Integración - Resumen Ejecutivo

## Objetivo
Integrar la lógica del bot de WhatsApp (Python/FastAPI) en el agente de audio en tiempo real (Next.js) para responder consultas financieras con 2 LLMs, pipelines de MongoDB y análisis con Excel/PNG.

## Arquitectura Simplificada

```
Usuario habla → Realtime Session (Next.js)
                    ↓
            Detectar si es consulta financiera
                    ↓
              We-Track Service (TypeScript)
                    ↓
            API Route Proxy (Next.js)
                    ↓
         Backend Python (FastAPI)
         - RouterService (LLM 1: Decide si necesita DB)
         - LLMService (LLM 2: Genera pipeline MongoDB)
         - MongoService (Ejecuta pipeline)
         - OutputService (Genera Excel/PNG)
                    ↓
            Respuesta: Texto + Excel/PNG
                    ↓
        Mostrar en UI + Leer con voz
```

## Fases

1. **FASE 1**: Configuración y servicio base
   - Variables de entorno
   - Servicio TypeScript para llamar al backend

2. **FASE 2**: API Route Next.js (proxy)
   - Endpoint POST que llama al backend Python

3. **FASE 3**: Integración con Realtime Session
   - Hook para procesar queries
   - Interceptar transcripciones

4. **FASE 4**: Visualización de datos
   - Componente para mostrar Excel/PNG
   - Integrar en Transcript

5. **FASE 5**: Flujo completo
   - Enviar respuestas al agente de voz
   - Manejo de estados

6. **FASE 6**: Optimizaciones
   - Caching, error handling, logging

## Archivos Clave a Crear

- `src/app/services/weTrackService.ts` - Cliente para backend
- `src/app/api/we-track/query/route.ts` - API route proxy
- `src/app/hooks/useWeTrackQuery.ts` - Hook de integración
- `src/app/components/DataVisualization.tsx` - Visualización de Excel/PNG

## Archivos a Modificar

- `src/app/App.tsx` - Integrar hook de We-Track
- `src/app/components/Transcript.tsx` - Mostrar visualizaciones
- `src/app/types.ts` - Agregar tipos TypeScript

## Requisitos Previos

1. Backend Python corriendo en `http://localhost:8000`
2. MongoDB conectado y funcionando
3. Variables de entorno configuradas

## Ver Plan Completo

Ver `INTEGRATION_PLAN.md` para detalles completos de implementación.
