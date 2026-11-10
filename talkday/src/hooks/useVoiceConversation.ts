import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MAX_FAILURES,
  fallbackReply,
  goodbyeReply,
  isStopPhrase,
  joinSegments,
  silenceAction,
  trimHistory,
  type ChatLang,
  type ChatResult,
  type ChatTurn,
} from '@/domain/chat';
import type { Accent } from '@/domain/types';
import { aiClient } from '@/services/ai';
import { speakAsync, stopSpeaking } from '@/services/speech';
import { listenOnce, recognitionSupported, requestMicPermission } from '@/services/speechRecognition';

export type TalkState = 'idle' | 'speaking' | 'listening' | 'thinking' | 'ended';

export interface TalkLine {
  id: number;
  role: 'ai' | 'user';
  lang: ChatLang;
  text: string;
}

interface Options {
  accent: Accent;
  rate: number;
  /** Palavras que o aluno já aprendeu (a IA tenta usá-las). */
  words: string[];
}

export type TalkProblem = 'no-ai' | 'no-mic-support' | 'denied' | 'failed' | null;

/**
 * Conversa livre por voz, sem botões: a IA fala, o app escuta sozinho,
 * envia para a IA e repete até o aluno se despedir ou parar.
 */
export function useVoiceConversation({ accent, rate, words }: Options) {
  const [state, setState] = useState<TalkState>('idle');
  const [lines, setLines] = useState<TalkLine[]>([]);
  const [live, setLive] = useState('');
  const [listenLang, setListenLang] = useState<ChatLang>('en');
  const [problem, setProblem] = useState<TalkProblem>(null);

  const run = useRef(0); // identifica a sessão atual; mudar cancela a anterior
  const cancelListen = useRef<(() => void) | null>(null);
  const history = useRef<ChatTurn[]>([]);
  const lineId = useRef(0);
  const opts = useRef({ accent, rate, words });
  opts.current = { accent, rate, words };

  const addLine = (role: TalkLine['role'], lang: ChatLang, text: string) =>
    setLines((l) => [...l, { id: ++lineId.current, role, lang, text }]);

  const halt = useCallback(() => {
    run.current += 1;
    cancelListen.current?.();
    cancelListen.current = null;
    stopSpeaking();
  }, []);

  const stop = useCallback(() => {
    halt();
    setLive('');
    setState('ended');
  }, [halt]);

  const start = useCallback(async () => {
    if (!aiClient.chat) return setProblem('no-ai');
    if (!recognitionSupported) return setProblem('no-mic-support');
    if (!(await requestMicPermission())) return setProblem('denied');

    halt();
    const id = ++run.current;
    const alive = () => run.current === id;
    history.current = [];
    lineId.current = 0;
    setLines([]);
    setLive('');
    setProblem(null);
    let failures = 0;
    let silence = 0;
    let lang = 'en' as ChatLang; // alterado dentro de aiTurn

    /** Pede a próxima fala à IA e a pronuncia. Devolve se a conversa continua. */
    const aiTurn = async (extra: { userText?: string; confidence?: number; silence?: boolean }): Promise<'continue' | 'end' | 'cancelled'> => {
      setState('thinking');
      let result: ChatResult;
      try {
        result = await aiClient.chat!({
          history: trimHistory(history.current),
          ...extra,
          listenedAs: extra.userText ? lang : undefined,
          words: opts.current.words,
          accent: opts.current.accent,
        });
        failures = 0;
      } catch {
        failures += 1;
        if (!alive()) return 'cancelled';
        if (failures >= MAX_FAILURES) {
          setProblem('failed');
          return 'end';
        }
        result = isStopPhrase(extra.userText ?? '') ? goodbyeReply() : fallbackReply();
      }
      if (!alive()) return 'cancelled';

      if (extra.userText) history.current.push({ role: 'user', text: extra.userText });
      history.current.push({ role: 'ai', text: joinSegments(result.segments) });
      lang = result.nextListen;
      setListenLang(lang);

      setState('speaking');
      for (const seg of result.segments) {
        if (!alive()) return 'cancelled';
        addLine('ai', seg.lang, seg.text);
        await speakAsync(seg.text, seg.lang === 'pt' ? 'pt-BR' : opts.current.accent, opts.current.rate);
      }
      return alive() ? (result.end ? 'end' : 'continue') : 'cancelled';
    };

    let next = await aiTurn({});
    while (next === 'continue' && alive()) {
      setState('listening');
      setLive('');
      const l = listenOnce({ lang: lang === 'pt' ? 'pt-BR' : opts.current.accent, onInterim: (t) => alive() && setLive(t) });
      cancelListen.current = l.cancel;
      const heard = await l.promise;
      cancelListen.current = null;
      if (!alive()) return;
      setLive('');

      if (heard.status === 'cancelled') return;
      if (heard.status === 'denied') {
        setProblem('denied');
        break;
      }
      if (heard.status === 'error') {
        failures += 1;
        if (failures >= MAX_FAILURES) {
          setProblem('failed');
          break;
        }
        await new Promise((r) => setTimeout(r, 600));
        continue;
      }
      if (heard.status === 'silence') {
        silence += 1;
        const action = silenceAction(silence);
        if (action === 'end') break;
        if (action === 'nudge') next = await aiTurn({ silence: true });
        continue;
      }

      silence = 0;
      addLine('user', lang, heard.text);
      next = await aiTurn({ userText: heard.text, confidence: heard.confidence });
    }
    if (alive()) {
      setLive('');
      setState('ended');
    }
  }, [halt]);

  // Sai da conversa (silencia e para de escutar) ao desmontar a tela.
  useEffect(() => halt, [halt]);

  return { state, lines, live, listenLang, problem, start, stop };
}
