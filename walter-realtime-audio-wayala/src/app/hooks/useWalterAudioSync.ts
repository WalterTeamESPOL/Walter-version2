import { useEffect, useState, useRef } from 'react';

interface WalterAudioSyncCallbacks {
  onSpeakingStart?: () => void;
  onSpeakingStop?: () => void;
}

/**
 * Hook que detecta cuando hay audio real fluyendo en el stream de WebRTC
 * Usa Web Audio API para analizar el nivel de audio en el MediaStream
 */
export function useWalterAudioSync(
  audioElement: HTMLAudioElement | null,
  callbacks: WalterAudioSyncCallbacks = {}
): { isSpeaking: boolean } {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isSpeakingRef = useRef(false);
  const silenceCountRef = useRef(0);

  useEffect(() => {
    if (!audioElement || !audioElement.srcObject) {
      // Limpiar si no hay elemento o stream
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
        analyserRef.current = null;
        sourceRef.current = null;
      }
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      return;
    }

    const stream = audioElement.srcObject as MediaStream;

    // Crear AudioContext para analizar el stream
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = audioContext;

    // Crear AnalyserNode para detectar niveles de audio
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.3;
    analyserRef.current = analyser;

    // Conectar el stream al analyser
    try {
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;
    } catch (err) {
      console.error('Error conectando stream al analyser:', err);
      audioContext.close();
      return;
    }

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const SPEAKING_THRESHOLD = 10; // Umbral mínimo de audio para considerar que está hablando
    const SILENCE_FRAMES = 15; // Número de frames en silencio antes de considerar que paró

    const checkAudio = () => {
      analyser.getByteFrequencyData(dataArray);

      // Calcular el promedio de volumen
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;

      if (average > SPEAKING_THRESHOLD) {
        // Hay audio detectado
        silenceCountRef.current = 0;
        if (!isSpeakingRef.current) {
          // Acaba de empezar a hablar
          isSpeakingRef.current = true;
          setIsSpeaking(true);
          console.log('🎤 Walter empezó a hablar (audio detectado en stream)');
          callbacks.onSpeakingStart?.();
        }
      } else {
        // Silencio detectado
        silenceCountRef.current++;
        if (isSpeakingRef.current && silenceCountRef.current >= SILENCE_FRAMES) {
          // Ha estado en silencio suficiente tiempo
          isSpeakingRef.current = false;
          setIsSpeaking(false);
          silenceCountRef.current = 0;
          console.log('🔇 Walter paró de hablar (audio en silencio)');
          callbacks.onSpeakingStop?.();
        }
      }

      animationFrameRef.current = requestAnimationFrame(checkAudio);
    };

    // Iniciar el loop de detección
    animationFrameRef.current = requestAnimationFrame(checkAudio);

    // Limpiar al desmontar o cambiar
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      if (analyserRef.current) {
        analyserRef.current.disconnect();
        analyserRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
      }
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      silenceCountRef.current = 0;
    };
  }, [audioElement, callbacks]);

  return { isSpeaking };
}

