# Plan de Integración: We-Track Agent en Realtime Audio

## Objetivo
Integrar la lógica del bot de WhatsApp (`whatsapp-bot-we-track-ai`) en el agente de audio en tiempo real (`we-track-realtime-agent`) para que pueda responder consultas financieras usando 2 LLMs, generar pipelines de MongoDB, y entregar análisis con Excel/PNG cuando sea necesario.

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js Realtime Agent (Frontend + Backend API Routes)     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  useRealtimeSession Hook                           │    │
│  │  - Captura transcripciones del usuario            │    │
│  │  - Envía queries al servicio de We-Track          │    │
│  └────────────────────────────────────────────────────┘    │
│                          │                                   │
│                          ▼                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │  weTrackService.ts                                 │    │
│  │  - Llama al backend Python                         │    │
│  │  - Maneja respuestas (texto + Excel/PNG)          │    │
│  └────────────────────────────────────────────────────┘    │
│                          │                                   │
│                          ▼                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │  /api/we-track/query (Next.js API Route)          │    │
│  │  - Proxy al backend Python                         │    │
│  │  - Maneja errores                                  │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ HTTP POST
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Python FastAPI Backend (whatsapp-bot-we-track-ai)          │
│                                                              │
│  ┌──────────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ RouterService    │→ │ LLMService   │→ │ MongoService │ │
│  │ (2 LLMs)         │  │ (Pipeline)   │  │ (Execute)    │ │
│  └──────────────────┘  └──────────────┘  └──────────────┘ │
│                          │                                   │
│                          ▼                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │  OutputService                                     │    │
│  │  - PNG (≤50 rows)                                  │    │
│  │  - Excel (>50 rows)                                │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Fases de Implementación

### **FASE 1: Configuración y Servicio Base** ✅

#### 1.1 Variables de Entorno
- [ ] Crear `.env.local` con:
  ```
  NEXT_PUBLIC_WE_TRACK_API_URL=http://localhost:8000
  WE_TRACK_API_KEY= (si se requiere autenticación)
  ```

#### 1.2 Servicio de Cliente We-Track (TypeScript)
- [ ] Crear `src/app/services/weTrackService.ts`
  - Función `queryWeTrack(userQuery: string, userId: string, sessionId?: string)`
  - Manejo de errores
  - Tipos TypeScript para respuestas
  - Decodificación de base64 para Excel/PNG

---

### **FASE 2: API Route Next.js (Proxy)** ✅

#### 2.1 Crear API Route
- [ ] Crear `src/app/api/we-track/query/route.ts`
  - POST endpoint que actúa como proxy
  - Llama al backend Python en `http://localhost:8000/api/query`
  - Maneja CORS
  - Retorna respuesta JSON con:
    ```typescript
    {
      success: boolean;
      text: string;           // Respuesta conversacional
      data_type: 'png' | 'xlsx' | null;
      data_b64: string | null; // Base64 del archivo
      data_count: number;
      session_id: string;
    }
    ```

---

### **FASE 3: Integración con Realtime Session** ✅

#### 3.1 Hook para Procesar Queries
- [ ] Crear `src/app/hooks/useWeTrackQuery.ts`
  - Escucha transcripciones del usuario desde `useRealtimeSession`
  - Llama a `weTrackService.queryWeTrack()`
  - Maneja estados: loading, error, success
  - Retorna respuesta (texto + datos)

#### 3.2 Integrar en App.tsx
- [ ] Modificar `App.tsx`:
  - Usar `useWeTrackQuery` hook
  - Interceptar mensajes del usuario antes de enviarlos al agente de OpenAI
  - Si es consulta financiera, usar We-Track; si no, usar agente normal
  - Mostrar respuesta en transcript

---

### **FASE 4: Visualización de Datos** ✅

#### 4.1 Componente para Mostrar Excel/PNG
- [ ] Crear `src/app/components/DataVisualization.tsx`
  - Props: `dataType: 'png' | 'xlsx'`, `dataB64: string`, `dataCount: number`
  - Si `dataType === 'png'`: Mostrar imagen `<img src={data:image/png;base64,...} />`
  - Si `dataType === 'xlsx'`: 
    - Botón para descargar Excel
    - O mostrar tabla HTML (usando librería como `xlsx` para parsear)
  - Estilos con Tailwind

#### 4.2 Integrar en Transcript
- [ ] Modificar `components/Transcript.tsx`:
  - Detectar mensajes con `data_type` y `data_b64`
  - Renderizar `<DataVisualization />` después del texto de respuesta

---

### **FASE 5: Flujo Completo y Manejo de Respuestas de Voz** ✅

#### 5.1 Interceptar Transcripciones
- [ ] En `useRealtimeSession.ts` o nuevo hook:
  - Capturar eventos `conversation.item.input_audio_transcription.completed`
  - Extraer texto transcrito
  - Decidir si enviar a We-Track o al agente normal

#### 5.2 Enviar Respuesta al Agente de Voz
- [ ] Cuando We-Track devuelve respuesta de texto:
  - Usar `sendUserText()` o `sendEvent()` para enviar respuesta al agente
  - El agente de OpenAI hablará la respuesta
  - O directamente usar TTS para leer la respuesta

#### 5.3 Manejo de Estados
- [ ] Estados:
  - `idle`: Sin consulta pendiente
  - `processing`: Consulta en progreso
  - `data_ready`: Datos listos (Excel/PNG)
  - `error`: Error en consulta

---

### **FASE 6: Optimizaciones y Mejoras** ✅

#### 6.1 Caching de Respuestas
- [ ] Cache en memoria de consultas frecuentes
- [ ] Usar `sessionId` para agrupar conversaciones

#### 6.2 Manejo de Errores Mejorado
- [ ] Mensajes de error amigables
- [ ] Retry automático para errores de red
- [ ] Fallback al agente normal si We-Track falla

#### 6.3 Logging y Debugging
- [ ] Console logs con emojis para debugging
- [ ] Panel de debug en desarrollo para ver consultas/respuestas

---

## Estructura de Archivos a Crear/Modificar

```
we-track-realtime-agent/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── we-track/
│   │   │       └── query/
│   │   │           └── route.ts              [NUEVO]
│   │   ├── components/
│   │   │   ├── DataVisualization.tsx         [NUEVO]
│   │   │   └── Transcript.tsx                [MODIFICAR]
│   │   ├── hooks/
│   │   │   ├── useWeTrackQuery.ts            [NUEVO]
│   │   │   └── useRealtimeSession.ts         [MODIFICAR]
│   │   ├── services/
│   │   │   ├── weTrackService.ts             [NUEVO]
│   │   │   └── walterControllerService.ts    [EXISTENTE]
│   │   ├── types.ts                          [MODIFICAR - agregar tipos We-Track]
│   │   └── App.tsx                           [MODIFICAR]
│   └── ...
├── .env.local                                 [NUEVO/MODIFICAR]
└── package.json                               [MODIFICAR - agregar xlsx si necesario]
```

---

## Tipos TypeScript

```typescript
// src/app/types.ts

export interface WeTrackQueryRequest {
  query: string;
  user_id: string;
  session_id?: string;
}

export interface WeTrackQueryResponse {
  success: boolean;
  message?: string;
  text: string;
  data_type: 'png' | 'xlsx' | null;
  data_b64: string | null;
  data_count: number;
  session_id: string;
}

export type WeTrackQueryStatus = 'idle' | 'processing' | 'data_ready' | 'error';
```

---

## Dependencias Adicionales

```json
{
  "dependencies": {
    "xlsx": "^0.18.5"  // Para parsear Excel en frontend (opcional)
  },
  "devDependencies": {
    "@types/xlsx": "^0.0.36"  // Si se usa xlsx
  }
}
```

---

## Checklist de Implementación

### Preparación
- [ ] Backend Python corriendo en puerto 8000
- [ ] Variables de entorno configuradas
- [ ] Dependencias instaladas

### Desarrollo
- [ ] Servicio We-Track creado
- [ ] API route proxy funcionando
- [ ] Hook de query integrado
- [ ] Componente de visualización creado
- [ ] Integración en App.tsx completa

### Testing
- [ ] Probar consulta simple (saludo) - no debería usar pipeline
- [ ] Probar consulta financiera (necesita pipeline)
- [ ] Probar consulta que genera PNG (<50 rows)
- [ ] Probar consulta que genera Excel (>50 rows)
- [ ] Verificar que la respuesta de voz funciona
- [ ] Verificar visualización de datos

### Producción
- [ ] Variables de entorno en producción
- [ ] URL del backend Python en producción
- [ ] CORS configurado correctamente
- [ ] Error handling robusto

---

## Notas Importantes

1. **Backend Python debe estar corriendo**: El backend Python debe estar ejecutándose en `http://localhost:8000` (o la URL configurada).

2. **Detección de consultas financieras**: El RouterService del backend Python ya determina si necesita pipeline. No es necesario duplicar esta lógica en el frontend.

3. **Manejo de sesiones**: Usar `sessionId` del RealtimeSession para agrupar conversaciones en el backend.

4. **Respuestas de voz**: Considerar si la respuesta de texto debe ser hablada por el agente de OpenAI o si se debe usar TTS directamente.

5. **Excel en frontend**: Si se quiere mostrar Excel en el navegador sin descarga, usar librería `xlsx` para parsear y renderizar como tabla HTML.

---

## Próximos Pasos

1. Revisar y aprobar este plan
2. Iniciar FASE 1 (Configuración y Servicio Base)
3. Implementar fases secuencialmente
4. Testing incremental por fase

