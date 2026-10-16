# 🔍 Guía de Debugging - Agente Financiero

## Problemas Comunes y Soluciones

### 1. Error: "NotFoundError: Requested device not found"

**Causa**: El SDK de OpenAI Realtime intenta acceder al micrófono y no lo encuentra.

**Soluciones**:
1. **Permitir acceso al micrófono en el navegador**:
   - Firefox: Click en el ícono del candado en la barra de direcciones → Permisos → Micrófono → Permitir
   - Chrome: Configuración → Privacidad y seguridad → Configuración del sitio → Micrófono → Permitir para localhost

2. **Verificar que tengas un micrófono conectado**:
   - En Linux: `pactl list sources short` (debería listar dispositivos de audio)

3. **Usar Push-to-Talk**:
   - Marca el checkbox "Push to talk" en la interfaz
   - Esto permite que el agente funcione sin acceso continuo al micrófono

### 2. Error: WebSocket a localhost:3002

**Causa**: Walter intentando conectarse (ya deshabilitado en código).

**Solución**: 
- ✅ Ya está corregido en el código
- Si persiste, limpia la caché del navegador (Ctrl+Shift+Delete)

### 3. El agente no responde después de conectar

**Verificaciones**:

1. **¿Está conectado?**
   - El botón debería decir "Disconnect" (no "Connect")
   - El estado debería mostrar "CONNECTED"

2. **¿Hay errores en la consola?**
   - Abre DevTools (F12) → Console
   - Busca errores en rojo

3. **¿El tool se está llamando?**
   - Busca en la consola: `🔍 QueryFinancialData called`
   - Verifica los logs del servidor: `tail -f /tmp/nextjs-dev.log`

4. **Prueba con texto primero**:
   - Usa el campo "Type a message..." en lugar de hablar
   - Escribe: "Hola" o "¿Cuáles son los ingresos de este mes?"
   - Presiona Enter o el botón de enviar

### 4. El agente responde pero no usa el tool

**Posibles causas**:
- La consulta no es clara (ej: "hola" no necesita tool)
- El router decide que no necesita pipeline

**Prueba con consultas específicas**:
- ✅ "¿Cuáles son los ingresos de este mes?"
- ✅ "¿Qué vehículo genera más ingresos?"
- ✅ "Muestra los gastos de combustible"
- ❌ "Hola" (no necesita tool)
- ❌ "Gracias" (no necesita tool)

## Logs Útiles

### Logs del Servidor (Terminal)
```bash
tail -f /tmp/nextjs-dev.log | grep -E "Query|Error|MongoDB|Pipeline"
```

### Logs del Cliente (Consola del Navegador)
- `🔍 QueryFinancialData called` - Tool ejecutado
- `✅ MongoService: Connected` - MongoDB OK
- `🎯 Router decision` - Decisión del router
- `❌ Error` - Errores

## Estado Actual

✅ **Walter deshabilitado** - No se conectará a puerto 3002
✅ **API Route funcionando** - `/api/we-track/query` responde
✅ **MongoDB conectado** - Conectado a Atlas
✅ **Tool implementado** - `queryFinancialData` listo

⚠️ **Requisito**: Micrófono o usar modo Push-to-Talk

## Próximos Pasos

1. **Permitir acceso al micrófono** en el navegador
2. **Hacer clic en "Connect"**
3. **Probar con texto primero** (campo "Type a message...")
4. **Verificar logs** si no funciona

