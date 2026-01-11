import React from 'react';

interface WelcomeHeroProps {
  onStart: () => void;
}

const WelcomeHero: React.FC<WelcomeHeroProps> = ({ onStart }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] text-center px-6 relative overflow-hidden pt-20">
      {/* Dynamic Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl aspect-[2/1] bg-gradient-to-br from-indigo-500/10 via-violet-500/5 to-fuchsia-500/5 blur-[120px] rounded-full -z-10 animate-pulse"></div>
      
      <div className="max-w-4xl mx-auto animate-fadeIn">
        <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white border border-slate-200 text-slate-900 text-[10px] font-black uppercase tracking-[0.25em] mb-12 shadow-xl shadow-indigo-900/5">
          <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
          Next-Generation Concierge AI
        </div>
        
        <h1 className="text-6xl md:text-8xl font-extrabold text-slate-900 mb-8 leading-[0.95] tracking-tighter">
          World-class travel <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-tr from-indigo-600 via-indigo-500 to-indigo-400">reimagined.</span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-16 font-medium leading-relaxed">
          Amadea leverages the world's most advanced neural networks to architect journeys that align with your unique travel ethos.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-24">
          <button 
            onClick={onStart}
            className="group btn-premium bg-slate-900 hover:bg-indigo-600 text-white font-black py-5 px-12 rounded-full shadow-2xl transition-all duration-500 flex items-center gap-4 text-[11px] uppercase tracking-[0.3em] active:scale-95"
          >
            <span>Begin Planning</span>
            <svg className="w-5 h-5 transition-transform duration-500 group-hover:translate-x-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>
          
          <div className="flex items-center gap-4 px-6 py-4 glass rounded-[2rem] border border-slate-200/50">
            <div className="flex -space-x-3">
              {[1,2,3].map(i => (
                <div key={i} className="w-9 h-9 rounded-full border-2 border-white bg-slate-100 overflow-hidden shadow-sm">
                  <img src={`https://i.pravatar.cc/100?u=traveler${i}`} alt="user" />
                </div>
              ))}
            </div>
            <div className="text-left">
              <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none">12k+ Active</p>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter mt-1">Itineraries Synced</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full px-4 animate-slideUp">
          {[
            { icon: '🛰️', title: 'GPS Dynamic', desc: 'Real-time adjustments based on proximity and local logistics.' },
            { icon: '🛡️', title: 'Verified Data', desc: 'Recommendations grounded in real-time global news and safety.' },
            { icon: '🎙️', title: 'Neural Voice', desc: 'Interactive, low-latency concierge available 24/7.' }
          ].map((feat, idx) => (
            <div key={idx} className="p-8 bg-white rounded-[2.5rem] border border-slate-100 text-left transition-all hover:shadow-2xl hover:-translate-y-2 group">
              <div className="w-12 h-12 bg-slate-50 text-slate-900 rounded-2xl flex items-center justify-center text-2xl mb-6 shadow-inner transition-transform group-hover:rotate-12">{feat.icon}</div>
              <h3 className="font-black text-slate-900 text-sm uppercase tracking-widest mb-2">{feat.title}</h3>
              <p className="text-[12px] text-slate-500 font-medium leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WelcomeHero;