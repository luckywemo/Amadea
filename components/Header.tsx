import React, { useState, useEffect } from 'react';

enum AppView {
  WELCOME = 'welcome',
  PLANNER = 'planner',
  ASSISTANT = 'assistant',
  VOICE = 'voice'
}

interface HeaderProps {
  currentView: AppView;
  setView: (view: AppView) => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, setView }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { id: AppView.WELCOME, label: 'Explore', icon: '🏠' },
    { id: AppView.PLANNER, label: 'Planner', icon: '📅' },
    { id: AppView.ASSISTANT, label: 'Chat', icon: '💬' },
    { id: AppView.VOICE, label: 'Voice', icon: '🎧' },
  ];

  const handleNav = (id: AppView) => {
    setView(id);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className={`fixed top-0 z-[100] w-full transition-all duration-300 px-4 sm:px-8 ${isScrolled ? 'pt-2' : 'pt-4'}`}>
      <div className={`max-w-7xl mx-auto flex items-center justify-between glass px-6 py-2.5 rounded-full border border-white/40 shadow-2xl transition-all ${isScrolled ? 'shadow-indigo-900/5 py-2' : 'shadow-none'}`}>
        
        {/* Logo */}
        <div 
          className="flex items-center gap-3 cursor-pointer group" 
          onClick={() => handleNav(AppView.WELCOME)}
        >
          <div className="bg-slate-900 p-2.5 rounded-2xl transition-all duration-500 group-hover:bg-indigo-600 shadow-xl shadow-indigo-900/10">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </div>
          <span className="text-xl font-extrabold text-slate-900 tracking-tight brand-font hidden sm:block">Amadea</span>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100/40 p-1 rounded-full border border-slate-200/50">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`px-5 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all duration-300 flex items-center gap-2 ${
                currentView === item.id 
                  ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <span className="text-sm">{item.icon}</span>
              <span className="hidden lg:inline">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Status / Action */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
            </span>
            <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Neural Link Active</span>
          </div>

          <button 
            className="md:hidden p-2.5 rounded-xl bg-slate-900 text-white transition-all active:scale-90 shadow-lg"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-x-4 top-24 z-[101] glass rounded-[2.5rem] p-4 border border-white/40 shadow-2xl animate-scaleIn">
          <div className="flex flex-col gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`flex items-center gap-4 px-6 py-4 rounded-[1.5rem] text-sm font-bold transition-all ${
                  currentView === item.id 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="uppercase tracking-widest text-[11px] font-black">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;