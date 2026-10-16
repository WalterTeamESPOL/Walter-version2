import { io, Socket } from 'socket.io-client';

class WalterControllerService {
  private socket: Socket | null = null;
  private isEnabled: boolean = false;
  private serverUrl: string;
  private mouthAnimationInterval: NodeJS.Timeout | null = null;

  // Secuencia de estados para animación de habla natural
  // Alterna entre estados grandes y pequeños (como hablar real) en lugar de progresión lineal
  private readonly mouthStates = [
    'mouth-closed',         // Cerrado
    'mouth-open',           // Abierto
    'mouth-closed',         // Cerrado
    'mouth-large',          // Grande
    'mouth-small',          // Pequeño
    'bigsmile',             // Muy grande
    'mouth-quarter',        // Pequeño
    'mouth-open',           // Grande
    'mouth-closed',         // Cerrado
    'mouth-medium-large',   // Grande
    'mouth-tiny',           // Muy pequeño
    'mouth-open',           // Grande
    'mouth-closed',         // Cerrado
    'mouth-half',           // Mediano
    'mouth-large',          // Grande
    'mouth-small',          // Pequeño
    'mouth-open',           // Grande
    'mouth-closed',         // Cerrado
  ];

  constructor(serverUrl: string = 'http://localhost:3000') {
    this.serverUrl = serverUrl;
  }

  /**
   * Conectar al servidor walter_web
   */
  connect(): void {
    if (this.socket?.connected) return;

    try {
      this.socket = io(this.serverUrl, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      this.socket.on('connect', () => {
        console.log('✅ Conectado a walter_web server');
      });

      this.socket.on('disconnect', () => {
        console.log('❌ Desconectado de walter_web server');
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Error conectando a walter_web:', error);
      });
    } catch (error) {
      console.error('❌ Error inicializando WalterControllerService:', error);
    }
  }

  /**
   * Desconectar del servidor
   */
  disconnect(): void {
    this.stopSpeakingAnimation();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Habilitar/deshabilitar el servicio
   */
  enable(): void {
    // No hacer nada si Walter está deshabilitado globalmente
    if (process.env.NEXT_PUBLIC_WALTER_ENABLED !== 'true') {
      return;
    }
    this.isEnabled = true;
    if (!this.socket?.connected) {
      this.connect();
    }
  }

  disable(): void {
    this.isEnabled = false;
    // Detener animación si estaba activa
    this.stopMouthAnimation();
    // Desconectar socket
    this.disconnect();
  }

  /**
   * Iniciar animación de habla: Boca moviéndose continuamente + movimientos sutiles de brazos
   * Se llama cuando el audio buffer empieza a reproducirse (evento 'play')
   */
  startSpeakingAnimation(): void {
    if (!this.isEnabled || !this.socket?.connected) {
      console.warn('⚠️ Walter no está habilitado o desconectado');
      return;
    }

    // Si ya está hablando, no hacer nada
    if (this.mouthAnimationInterval) {
      return;
    }

    console.log('🎤 Iniciando animación de habla de Walter');
    console.log('📊 Secuencia de estados:', this.mouthStates.length, 'estados diferentes');

    // Enviar señal al servidor walter_web para iniciar movimientos
    this.socket.emit('walter-speaking-start');

    // Iniciar loop de animación de boca (alternar expresiones para simular habla)
    this.startMouthAnimation();
  }

  /**
   * Detener animación de habla
   * Se llama cuando el audio buffer se pausa o termina (eventos 'pause' o 'ended')
   */
  stopSpeakingAnimation(): void {
    // Si ya está detenido, no hacer nada
    if (!this.mouthAnimationInterval) {
      return;
    }

    console.log('🔇 Deteniendo animación de habla de Walter');
    console.log('⏹️  Animación detenida, volviendo a neutral');

    // Detener loop de animación de boca primero
    this.stopMouthAnimation();

    // Enviar señal al servidor walter_web para detener movimientos
    if (this.isEnabled && this.socket?.connected) {
      this.socket.emit('walter-speaking-stop');
    }
  }

  /**
   * Iniciar loop de animación de boca
   * Alterna entre expresiones para simular movimiento de boca hablando
   * SOLO se ejecuta cuando Walter está hablando
   */
  private startMouthAnimation(): void {
    // Si ya existe un interval, no crear otro
    if (this.mouthAnimationInterval) {
      return;
    }

    if (!this.isEnabled || !this.socket?.connected) {
      return;
    }
    
    let currentIndex = 0; // Índice actual en la secuencia

    this.mouthAnimationInterval = setInterval(() => {
      // Verificar que aún esté habilitado y conectado
      if (!this.isEnabled || !this.socket?.connected) {
        this.stopMouthAnimation();
        return;
      }

      // Enviar el estado actual de la boca
      const currentState = this.mouthStates[currentIndex];
      this.sendExpression(currentState);
      
      // Log claro para debugging - mostrar progreso y estado actual
      console.log(`👄 [${String(currentIndex + 1).padStart(2, '0')}/${this.mouthStates.length}] → ${currentState}`);
      
      // Avanzar al siguiente estado (ciclo infinito)
      currentIndex = (currentIndex + 1) % this.mouthStates.length;
    }, 200); // Cada 200ms - velocidad rápida para alternar entre abierto/cerrado (simula hablar real)
  }

  /**
   * Detener loop de animación de boca
   * Se ejecuta cuando Walter para de hablar
   */
  private stopMouthAnimation(): void {
    if (this.mouthAnimationInterval) {
      clearInterval(this.mouthAnimationInterval);
      this.mouthAnimationInterval = null;
      
      // Volver a expresión neutral solo UNA VEZ cuando para
      if (this.isEnabled && this.socket?.connected) {
        this.sendExpression('neutral');
      }
    }
  }

  /**
   * Enviar expresión facial
   * Solo se llama desde startMouthAnimation() cuando Walter está hablando
   * o desde stopMouthAnimation() cuando para (neutral)
   */
  private sendExpression(expression: string): void {
    if (!this.isEnabled || !this.socket?.connected) {
      console.warn('⚠️ No se puede enviar expresión:', expression, '- isEnabled:', this.isEnabled, '- connected:', this.socket?.connected);
      return;
    }
    
    this.socket.emit('expression', { name: expression, intensity: 1.0 });
    // Solo log para neutral (cuando para), los estados de boca se loguean en el loop
    if (expression === 'neutral') {
      console.log('😊 Expresión neutral enviada (Walter paró de hablar)');
    }
  }

  /**
   * Enviar movimiento de brazos manualmente
   */
  sendArmMovement(movement: string): void {
    if (!this.isEnabled || !this.socket?.connected) return;
    
    this.socket.emit(movement, { action: movement });
    console.log('🦾 Movimiento enviado:', movement);
  }
}

// Singleton instance - se reinicia en desarrollo para evitar problemas con hot reload
let walterControllerInstance: WalterControllerService | null = null;

export function getWalterController(serverUrl?: string): WalterControllerService {
  const defaultServerUrl = serverUrl || 'http://localhost:3002';
  
  // En desarrollo, verificar si la instancia necesita recrearse
  if (!walterControllerInstance) {
    walterControllerInstance = new WalterControllerService(defaultServerUrl);
  } else if (serverUrl && walterControllerInstance['serverUrl'] !== serverUrl) {
    // Si cambia el serverUrl, crear nueva instancia
    walterControllerInstance.disable();
    walterControllerInstance = new WalterControllerService(serverUrl);
  }
  
  return walterControllerInstance;
}

// Función para resetear el singleton (útil en desarrollo)
export function resetWalterController(): void {
  if (walterControllerInstance) {
    walterControllerInstance.disable();
    walterControllerInstance = null;
  }
}

export default WalterControllerService;

