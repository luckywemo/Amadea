import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";

interface Message {
  role: 'user' | 'model';
  content: string;
  links?: { title: string; uri: string }[];
}

const TravelChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: "Amadea Neural Interface active. I am your specialized logistics concierge. How can I facilitate your global strategy today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (val: string) => {
    if (!val.trim() || isLoading) return;
    const userMessage = val.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: userMessage,
        config: { 
          tools: [{ googleSearch: {} }], 
          systemInstruction: "You are Amadea AI, an elite SaaS-premium travel concierge. Tone: Helpful, Sophisticated, Professional. Ground all answers in verified data." 
        },
      });
      const links = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => ({
        title: c.web?.title || 'Verified Intel', uri: c.web?.uri
      })).filter((l: any) => l.uri);
      
      setMessages(prev => [...prev, { role: 'model', content: response.text || "Interface error. Please re-engage synthesis.", links }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'model', content: "Signal latency detected. Re-synchronizing pathways..." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto h-[85vh] flex flex-col bg-white rounded-[4rem] shadow-2xl border border-slate-100 overflow-hidden animate-slideUp">
      
      {/* Header */}
      <div className="px-12 py-10 border-b flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-7">
          <div className="w-16 h-16 rounded-[2rem] bg-slate-950 text-white flex items-center justify-center font-black text-3xl shadow-2xl">A</div>
          <div>
            <h2 className="text-2xl font-[900] text-slate-900 tracking-tighter">Neural Concierge.</h2>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">Operational Live</span>
            </div>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-4">
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white border border-slate-100 px-6 py-3 rounded-full shadow-sm">Secure Interface</span>
        </div>
      </div>

      {/* Message Hub */}
      <div className="flex-grow overflow-y-auto p-10 sm:p-14 space-y-14 hide-scrollbar bg-slate-50/20">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
            <div className={`max-w-[85%] sm:max-w-[78%] ${
              m.role === 'user' 
                ? 'bg-slate-950 text-white rounded-t-[2.5rem] rounded-bl-[3rem] shadow-2xl' 
                : 'bg-white text-slate-800 rounded-t-[2.5rem] rounded-br-[3rem] shadow-xl border border-slate-100'
            } px-10 py-8 text-base sm:text-lg leading-relaxed`}>
              <p className="font-semibold whitespace-pre-wrap tracking-tight">{m.content}</p>
              
              {m.links && m.links.length > 0 && (
                <div className="mt-10 pt-8 border-t border-slate-100/50">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-5">Verified Intelligence</p>
                  <div className="flex flex-wrap gap-4">
                    {m.links.map((l, li) => (
                      <a key={li} href={l.uri} target="_blank" className="text-[10px] bg-slate-50 px-6 py-3.5 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all font-black flex items-center gap-3 border border-slate-200 shadow-sm active:scale-95">
                        🔍 {l.title.slice(0, 35)}{l.title.length > 35 ? '...' : ''}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start animate-fadeIn">
            <div className="bg-white px-10 py-8 rounded-[3rem] shadow-xl border border-slate-100 flex items-center gap-4">
               <div className="flex gap-2">
                 <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-bounce"></div>
                 <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                 <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.4s]"></div>
               </div>
               <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-4">Synthesizing response</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Hub */}
      <div className="p-10 sm:p-12 bg-white border-t border-slate-100">
        <form onSubmit={e => { e.preventDefault(); handleSend(input); }} className="flex gap-8 max-w-6xl mx-auto">
          <div className="flex-grow relative">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Engage neural pathways..." className="w-full px-10 py-6 rounded-[2.5rem] bg-slate-50 border-transparent outline-none font-bold text-slate-900 focus:bg-white focus:ring-4 focus:ring-indigo-600/5 transition-all text-lg shadow-inner" />
            <div className="absolute right-6 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-3">
               <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest bg-white border border-slate-100 px-4 py-2 rounded-2xl">Neural-Sync Ready</span>
            </div>
          </div>
          <button type="submit" disabled={isLoading || !input.trim()} className="bg-slate-950 text-white px-16 rounded-[2.5rem] font-black uppercase tracking-[0.5em] text-[12px] hover:bg-indigo-600 transition-all shadow-2xl btn-premium disabled:opacity-30">Engage</button>
        </form>
      </div>
    </div>
  );
};

export default TravelChat;