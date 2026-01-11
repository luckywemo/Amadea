import React, { useState } from 'react';
import Header from './components/Header';
import ItineraryPlanner from './components/ItineraryPlanner';
import TravelChat from './components/TravelChat';
import VoiceConcierge from './components/VoiceConcierge';
import WelcomeHero from './components/WelcomeHero';

enum AppView {
  WELCOME = 'welcome',
  PLANNER = 'planner',
  ASSISTANT = 'assistant',
  VOICE = 'voice'
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.WELCOME);

  const renderContent = () => {
    switch (currentView) {
      case AppView.WELCOME:
        return <WelcomeHero onStart={() => setCurrentView(AppView.PLANNER)} />;
      case AppView.PLANNER:
        return <ItineraryPlanner />;
      case AppView.ASSISTANT:
        return <TravelChat />;
      case AppView.VOICE:
        return <VoiceConcierge />;
      default:
        return <WelcomeHero onStart={() => setCurrentView(AppView.PLANNER)} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      <Header currentView={currentView} setView={setCurrentView} />
      
      <main className="flex-grow container mx-auto px-4 sm:px-6 py-12 max-w-7xl pt-24 sm:pt-32">
        <div key={currentView} className="animate-fadeIn">
          {renderContent()}
        </div>
      </main>

      <footer className="bg-white border-t border-slate-100 py-16">
        <div className="max-w-7xl mx-auto px-10 flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="flex flex-col items-center md:items-start">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-slate-950 p-2 rounded-xl">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
              <span className="text-xl font-black text-slate-900 tracking-tighter brand-font">Amadea</span>
            </div>
            <p className="text-xs font-medium text-slate-400 text-center md:text-left leading-relaxed">
              Sophisticated AI Travel Infrastructure.<br/>Empowering elite journeys since 2024.
            </p>
          </div>
          
          <div className="flex gap-12 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            <span className="hover:text-indigo-600 cursor-pointer transition-colors">Documentation</span>
            <span className="hover:text-indigo-600 cursor-pointer transition-colors">Neural Sync</span>
            <span className="hover:text-indigo-600 cursor-pointer transition-colors">Privacy</span>
          </div>

          <div className="text-center md:text-right">
             <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">Amadeus Hackathon Edition</p>
             <p className="text-xs font-medium text-slate-400 italic">Synthesized by Gemini Intelligence</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;