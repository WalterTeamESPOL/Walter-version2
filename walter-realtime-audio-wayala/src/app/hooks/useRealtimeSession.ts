import { useCallback, useRef, useState } from 'react';
import {
  RealtimeSession,
  RealtimeAgent,
  OpenAIRealtimeWebRTC,
} from '@openai/agents/realtime';

import { useEvent } from '../contexts/EventContext';
import { useHandleSessionHistory } from './useHandleSessionHistory';
import { SessionStatus } from '../types';

export interface RealtimeSessionCallbacks {
  onConnectionChange?: (status: SessionStatus) => void;
  onAgentHandoff?: (agentName: string) => void;
  onAudioBufferStarted?: () => void;
  onAudioBufferStopped?: () => void;
}

export interface ConnectOptions {
  getEphemeralKey: () => Promise<string>;
  initialAgents: RealtimeAgent[];
  audioElement?: HTMLAudioElement;
  extraContext?: Record<string, any>;
  outputGuardrails?: any[];
}

export function useRealtimeSession(callbacks: RealtimeSessionCallbacks = {}) {
  const sessionRef = useRef<RealtimeSession | null>(null);
  const isWalterSpeakingRef = useRef(false);
  const [status, setStatus] = useState<SessionStatus>('DISCONNECTED');

  const { logClientEvent, logServerEvent } = useEvent();
  const historyHandlers = useHandleSessionHistory().current;

  function sendWalterMouthEvent(
    type: 'WALTER_AUDIO_START' | 'WALTER_AUDIO_END'
  ) {
    if (typeof window === 'undefined') return;

    const channel = new BroadcastChannel('walter-channel');
    channel.postMessage({ type });
    channel.close();
  }

  const updateStatus = useCallback(
    (s: SessionStatus) => {
      setStatus(s);
      callbacks.onConnectionChange?.(s);
      logClientEvent({}, s);
    },
    [callbacks, logClientEvent],
  );

  const handleTransportEvent = useCallback(
    (event: any) => {
      switch (event.type) {
        case 'conversation.item.input_audio_transcription.completed': {
          historyHandlers.handleTranscriptionCompleted(event);
          break;
        }

        case 'response.audio_transcript.done': {
          historyHandlers.handleTranscriptionCompleted(event);
          break;
        }

        case 'response.audio_transcript.delta': {
          historyHandlers.handleTranscriptionDelta(event);
          break;
        }
        case 'output_audio_buffer.started': {
        isWalterSpeakingRef.current = true;

        console.log('🎤 output_audio_buffer.started - Walter empezó a hablar');
        sendWalterMouthEvent('WALTER_AUDIO_START');

        callbacks.onAudioBufferStarted?.();
        logServerEvent(event);
        break;
      }

        case 'output_audio_buffer.stopped': {
        isWalterSpeakingRef.current = false;

        console.log('🔇 output_audio_buffer.stopped - Walter paró de hablar');
        sendWalterMouthEvent('WALTER_AUDIO_END');

        callbacks.onAudioBufferStopped?.();
        logServerEvent(event);
        break;
      } 

        // case 'output_audio_buffer.started': {
        //   console.log('🎤 output_audio_buffer.started - Walter empezó a hablar');

        //   sendWalterMouthEvent('WALTER_AUDIO_START');

        //   callbacks.onAudioBufferStarted?.();
        //   logServerEvent(event);
        //   break;
        // }

        // case 'output_audio_buffer.stopped': {
        //   console.log('🔇 output_audio_buffer.stopped - Walter paró de hablar');

        //   sendWalterMouthEvent('WALTER_AUDIO_END');

        //   callbacks.onAudioBufferStopped?.();
        //   logServerEvent(event);
        //   break;
        // }

        default: {
          logServerEvent(event);
          break;
        }
      }
    },
    [callbacks, historyHandlers, logServerEvent],
  );

  const handleAgentHandoff = useCallback(
    (item: any) => {
      const history = item.context.history;
      const lastMessage = history[history.length - 1];
      const agentName = lastMessage.name.split('transfer_to_')[1];

      callbacks.onAgentHandoff?.(agentName);
    },
    [callbacks],
  );

  const connect = useCallback(
    async ({
      getEphemeralKey,
      initialAgents,
      audioElement,
      extraContext,
      outputGuardrails,
    }: ConnectOptions) => {
      if (sessionRef.current) return;

      updateStatus('CONNECTING');

      const ek = await getEphemeralKey();
      const rootAgent = initialAgents[0];

      const session = new RealtimeSession(rootAgent, {
        transport: new OpenAIRealtimeWebRTC({
          audioElement,
        }),

        model: 'gpt-realtime-2',

        config: {
          audio: {
            input: {
              turnDetection: {
                type: 'server_vad',
                threshold: 0.8,
                prefixPaddingMs: 300,
                silenceDurationMs: 800,
                createResponse: true,
                interruptResponse: false,
              },
            },
          },
        },

        outputGuardrails: outputGuardrails ?? [],
        context: extraContext ?? {},
      });

      session.on('error', (...args: any[]) => {
        logServerEvent({
          type: 'error',
          message: args[0],
        });
      });

      session.on('agent_handoff', handleAgentHandoff);
      session.on('agent_tool_start', historyHandlers.handleAgentToolStart);
      session.on('agent_tool_end', historyHandlers.handleAgentToolEnd);
      session.on('history_updated', historyHandlers.handleHistoryUpdated);
      session.on('history_added', historyHandlers.handleHistoryAdded);
      session.on('transport_event', handleTransportEvent);

      sessionRef.current = session;

      await session.connect({ apiKey: ek });

      updateStatus('CONNECTED');
    },
    [
      updateStatus,
      logServerEvent,
      handleAgentHandoff,
      handleTransportEvent,
      historyHandlers,
    ],
  );

  const disconnect = useCallback(() => {
    sendWalterMouthEvent('WALTER_AUDIO_END');

    sessionRef.current?.close();
    sessionRef.current = null;

    updateStatus('DISCONNECTED');
  }, [updateStatus]);

  const assertConnected = () => {
    if (!sessionRef.current) {
      throw new Error('RealtimeSession not connected');
    }
  };

  const interrupt = useCallback(() => {
    sendWalterMouthEvent('WALTER_AUDIO_END');
    sessionRef.current?.interrupt();
  }, []);

  const sendUserText = useCallback((text: string) => {
    assertConnected();
    sessionRef.current!.sendMessage(text);
  }, []);

  const sendEvent = useCallback((ev: any) => {
    sessionRef.current?.transport.sendEvent(ev);
  }, []);

  const mute = useCallback((m: boolean) => {
    sessionRef.current?.mute(m);
  }, []);

  const pushToTalkStart = useCallback(() => {
    if (!sessionRef.current) return;

    sessionRef.current.transport.sendEvent({
      type: 'input_audio_buffer.clear',
    } as any);
  }, []);
    const pushToTalkStop = useCallback(() => {
      if (!sessionRef.current) return;

      if (isWalterSpeakingRef.current) {
        console.log('Walter sigue hablando. No se crea una nueva respuesta todavía.');
        return;
      }

      sessionRef.current.transport.sendEvent({
        type: 'input_audio_buffer.commit',
      } as any);

      sessionRef.current.transport.sendEvent({
        type: 'response.create',
      } as any);
    }, []);  

  // const pushToTalkStop = useCallback(() => {
  //   if (!sessionRef.current) return;

  //   sessionRef.current.transport.sendEvent({
  //     type: 'input_audio_buffer.commit',
  //   } as any);

  //   sessionRef.current.transport.sendEvent({
  //     type: 'response.create',
  //   } as any);
  // }, []);

  return {
    status,
    connect,
    disconnect,
    sendUserText,
    sendEvent,
    mute,
    pushToTalkStart,
    pushToTalkStop,
    interrupt,
  } as const;
}