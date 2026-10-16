# 🧪 Instrucciones de Testing

## Servidor Iniciado ✅

El servidor está corriendo en: **http://localhost:3000**

---

## 🚀 Cómo Probar el Agente Financiero

### Paso 1: Abrir el Agente Financiero

Abre tu navegador y ve a:
```
http://localhost:3000?agentConfig=financial
```

O simplemente:
```
http://localhost:3000
```
Y cambia el agentConfig en la UI si hay selector.

### Paso 2: Conectarse

1. Haz clic en "Connect"
2. Espera a que el estado cambie a "CONNECTED"

### Paso 3: Probar Consultas

#### ✅ Consultas que SÍ necesitan pipeline (datos financieros):

**Habla o escribe:**
- "¿Cuáles son los ingresos de este mes?"
- "¿Qué vehículo genera más ingresos?"
- "Gastos de combustible"
- "Comparar ingresos y gastos"
- "Promedio de ingresos"
- "Ingresos por conductor"

**El agente debería:**
1. Explicar que va a consultar los datos
2. Llamar el tool `queryFinancialData`
3. Procesar la consulta
4. Leer la respuesta con los datos
5. Mencionar si hay un archivo Excel generado

#### ✅ Consultas que NO necesitan pipeline (conversación casual):

**Habla o escribe:**
- "Hola"
- "¿Cómo estás?"
- "Gracias"
- "Adiós"

**El agente debería:**
- Responder directamente sin llamar el tool
- Mantener conversación natural

---

## 🔍 Debugging

### Ver Logs del Servidor

En la terminal donde corriste `npm run dev`, verás:

- `🚀 Initializing We-Track services...` - Servicios iniciando
- `✅ MongoService: Connected to MongoDB` - MongoDB conectado
- `📥 API Query received` - Query recibida
- `🎯 Router decision` - Decisión del router
- `✅ Generated pipeline` - Pipeline generado
- `✅ Pipeline executed` - Pipeline ejecutado
- `✅ Generated final response` - Respuesta generada

### Ver Logs del Cliente

En la consola del navegador (F12):

- `🔍 QueryFinancialData called` - Tool llamado
- Respuestas del API
- Errores si los hay

---

## ⚠️ Problemas Comunes

### 1. Error de conexión a MongoDB

**Síntoma:** `❌ MongoService: Failed to connect to MongoDB`

**Solución:**
- Verifica que MongoDB esté corriendo
- Verifica `MONGODB_URI` en `.env.local`

### 2. Error de OpenAI API

**Síntoma:** `Error procesando consulta: ...`

**Solución:**
- Verifica `OPENAI_API_KEY` en `.env.local`
- Verifica que tengas acceso a los modelos configurados

### 3. El tool no se llama

**Síntoma:** El agente responde pero no llama el tool

**Solución:**
- Verifica que la pregunta sea sobre datos financieros específicos
- Revisa los logs del servidor para ver la decisión del router

---

## ✅ Checklist de Funcionamiento

- [ ] Servidor corre sin errores
- [ ] Puedo conectarme al agente
- [ ] Consultas casuales responden sin tool
- [ ] Consultas financieras llaman el tool
- [ ] Se generan respuestas con datos
- [ ] Se generan archivos Excel cuando hay >50 registros

---

## 🎉 ¡Listo para Probar!

Abre http://localhost:3000?agentConfig=financial y empieza a hacer preguntas.

