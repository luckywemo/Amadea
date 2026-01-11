import React, { useState, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';

const VoiceConcierge: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [transcription, setTranscription] = useState<string[]>([]);
  const [status, setStatus] = useState<string>('Standby Protocol');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionRef = useRef<any>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
    return buffer;
  };

  const stopConcierge = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    setIsActive(false);
    setStatus('Connection Severed');
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  const startConcierge = async () => {
    try {
      setStatus('Initializing Link...');
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const inputCtx = new AudioContext({ sampleRate: 16000 });
      const outputCtx = new AudioContext({ sampleRate: 24000 });
      audioContextRef.current = outputCtx;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setStatus('Active Sync');
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message) => {
            if (message.serverContent?.outputTranscription) setTranscription(prev => [...prev.slice(-4), `A: ${message.serverContent.outputTranscription.text}`]);
            if (message.serverContent?.inputTranscription) setTranscription(prev => [...prev.slice(-4), `U: ${message.serverContent.inputTranscription.text}`]);
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
            if (audioData) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const buffer = await decodeAudioData(decode(audioData), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outputCtx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }
          },
          onerror: () => stopConcierge(),
          onclose: () => stopConcierge()
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } },
          systemInstruction: "You are Amadea, an elite travel voice concierge. Responses: Concise, refined, professional."
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) {
      setStatus('Interface Restricted');
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[75vh] px-8 animate-fadeIn pt-12">
      
      {/* Neural Sphere */}
      <div 
        onClick={isActive ? stopConcierge : startConcierge}
        className={`relative w-80 h-80 rounded-[5rem] flex items-center justify-center mb-24 transition-all duration-700 cursor-pointer shadow-2xl group ${isActive ? 'bg-indigo-600 rotate-6 scale-105' : 'bg-white hover:bg-slate-50 border border-slate-100'}`}
      >
        {isActive ? (
          <div className="flex items-center gap-3">
            {[1,2,3,4,5].map(i => <div key={i} className="wave-bar !bg-white !w-1.5" style={{animationDelay: `${i * 0.15}s`}}></div>)}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-5">
            <span className="text-8xl grayscale group-hover:grayscale-0 transition-all duration-700">🎧</span>
            <span className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-400">Initialize Sync</span>
          </div>
        )}
        <div className={`absolute inset-0 rounded-[5rem] border-8 border-indigo-600/10 transition-all duration-700 ${isActive ? 'scale-110 opacity-0' : 'scale-100 opacity-100 animate-pulse'}`}></div>
      </div>

      <div className="text-center mb-16">
        <h2 className="text-5xl font-[900] text-slate-900 mb-6 tracking-tighter">Voice Concierge.</h2>
        <div className="inline-flex items-center gap-4 bg-white px-10 py-4 rounded-full border border-slate-200 shadow-xl">
          {isActive && (
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-600"></span>
            </span>
          )}
          <span className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-900">{status}</span>
        </div>
      </div>

      {/* Transcription Hub */}
      <div className="w-full max-w-2xl bg-white rounded-[4rem] p-16 mb-16 shadow-2xl border border-slate-100 flex flex-col justify-center gap-6 overflow-hidden min-h-[220px]">
        {transcription.length === 0 ? (
          <div className="flex flex-col items-center gap-6 opacity-40">
            <p className="text-slate-400 text-base italic font-bold tracking-tight">Listening for Amadea protocols...</p>
            <div className="flex gap-3">
              {[1,2,3].map(i => <div key={i} className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{animationDelay: `${i*0.2}s`}}></div>)}
            </div>
          </div>
        ) : (
          transcription.map((t, i) => (
            <p key={i} className={`text-lg font-bold animate-slideUp tracking-tight ${t.startsWith('U:') ? 'text-slate-400' : 'text-indigo-600'}`}>
              <span className="text-[10px] uppercase font-black tracking-widest mr-4 opacity-50">{t.split(':')[0] === 'U' ? 'USER' : 'AMADEA'}</span>
              {t.split(':')[1]}
            </p>
          ))
        )}
      </div>

      <div className="flex items-center gap-12 opacity-50">
         <div className="flex flex-col items-center">
            <span className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-900 leading-none">Encrypted</span>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-2">E2E Protocol</span>
         </div>
         <div className="w-px h-10 bg-slate-200"></div>
         <div className="flex flex-col items-center">
            <span className="text-[11px] font-black uppercase tracking-[0.4em] text-indigo-600 leading-none">Neural Direct</span>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-2">Verified Sync</span>
         </div>
      </div>
    </div>
  );
};

export default VoiceConcierge;