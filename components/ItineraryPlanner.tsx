import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";

interface Review {
  userName: string;
  comment: string;
}

interface Place {
  name: string;
  lat: number;
  lng: number;
  reviews: Review[];
  aiSummary?: string;
  estimatedLocalCost?: number;
  previewImageUrl?: string;
}

interface Booking {
  id: string;
  placeName: string;
  ref: string;
  time: string;
  day: number;
  estimatedLocalCost?: number;
}

interface CurrencyInfo {
  code: string;
  symbol: string;
  rateToHome: number;
}

const SUPPORTED_HOME_CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen' },
];

const TRAVEL_STYLES = [
  { id: 'Adventure', icon: '🧗', label: 'Adventure' },
  { id: 'Relaxing', icon: '🧘', label: 'Relaxing' },
  { id: 'Cultural', icon: '🏛️', label: 'Cultural' },
  { id: 'Family-Friendly', icon: '👨‍👩-👧‍👦', label: 'Family' },
];

const DEFAULT_PLACE_IMAGE = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=1200';

const ItineraryPlanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [loading, setLoading] = useState(false);
  const [itinerary, setItinerary] = useState<any[] | null>(() => {
    const saved = localStorage.getItem('amadea_itinerary');
    return saved ? JSON.parse(saved) : null;
  });
  const [favorites, setFavorites] = useState<Place[]>(() => {
    const saved = localStorage.getItem('amadea_favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [bookings, setBookings] = useState<Booking[]>(() => {
    const saved = localStorage.getItem('amadea_bookings');
    return saved ? JSON.parse(saved) : [];
  });
  const [currencyInfo, setCurrencyInfo] = useState<CurrencyInfo | null>(() => {
    const saved = localStorage.getItem('amadea_currency');
    return saved ? JSON.parse(saved) : null;
  });
  const [homeCurrency, setHomeCurrency] = useState('USD');
  const [formData, setFormData] = useState({
    destination: '',
    duration: 3,
    budget: 350, 
    interests: 'sightseeing, food',
    travelStyle: 'Cultural'
  });

  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [bookingModal, setBookingModal] = useState<{place: Place, day: number} | null>(null);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);
  const [activeMapDay, setActiveMapDay] = useState<number>(1);

  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const polylineRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem('amadea_itinerary', JSON.stringify(itinerary));
    localStorage.setItem('amadea_favorites', JSON.stringify(favorites));
    localStorage.setItem('amadea_bookings', JSON.stringify(bookings));
    localStorage.setItem('amadea_currency', JSON.stringify(currencyInfo));
  }, [itinerary, favorites, bookings, currencyInfo]);

  const toggleFavorite = (place: Place) => {
    setFavorites(prev => {
      const exists = prev.find(p => p.name === place.name);
      if (exists) return prev.filter(p => p.name !== place.name);
      return [...prev, place];
    });
  };

  const confirmBooking = (place: Place, day: number) => {
    const refId = `AM-${Math.floor(10000 + Math.random() * 90000)}`;
    const newBooking: Booking = {
      id: Math.random().toString(36).substr(2, 9),
      placeName: place.name,
      ref: refId,
      time: "10:30 AM",
      day,
      estimatedLocalCost: place.estimatedLocalCost
    };
    setBookings(prev => [...prev, newBooking]);
    setConfirmationMessage(`Priority secured for ${place.name}! Ref: ${refId}`);
    setBookingModal(null);
    setTimeout(() => setConfirmationMessage(null), 5000);
  };

  const getFormattedPrice = (localCost: number | undefined) => {
    if (localCost === undefined || !currencyInfo) return null;
    const homeCost = localCost * currencyInfo.rateToHome;
    const selectedHome = SUPPORTED_HOME_CURRENCIES.find(c => c.code === homeCurrency);
    return {
      local: `${currencyInfo.symbol}${localCost.toLocaleString()}`,
      home: `${selectedHome?.symbol || homeCurrency}${homeCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    };
  };

  const updateItemCoords = (dayIndex: number, itemType: 'activities' | 'diningOptions', itemIndex: number, lat: number, lng: number) => {
    if (!itinerary) return;
    const newItinerary = [...itinerary];
    newItinerary[dayIndex][itemType][itemIndex].lat = lat;
    newItinerary[dayIndex][itemType][itemIndex].lng = lng;
    setItinerary(newItinerary);
  };

  const reorderDayItems = (dayIndex: number, startIndex: number, endIndex: number) => {
    if (!itinerary) return;
    const newItinerary = [...itinerary];
    const day = newItinerary[dayIndex];
    const items = [...day.activities];
    const [removed] = items.splice(startIndex, 1);
    items.splice(endIndex, 0, removed);
    day.activities = items;
    setItinerary(newItinerary);
  };

  const generateItinerary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.destination.trim()) return;
    setLoading(true);
    setItinerary(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Plan a ${formData.duration}-day ${formData.travelStyle} trip to ${formData.destination} with a $${formData.budget}/day budget. Interests: ${formData.interests}. 
      Return JSON with destinationCurrencyCode, destinationCurrencySymbol, exchangeRateToHomeCurrency (1 local unit = ? ${homeCurrency}), and itinerary array. 
      Each day MUST include a 'travelTips' array of 3 specific contextual tips.
      Places should have: name, lat, lng, estimatedLocalCost, previewImageUrl, and 2 reviews.`;

      const res = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: prompt,
        config: { 
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          thinkingConfig: { thinkingBudget: 4000 },
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              destinationCurrencyCode: { type: Type.STRING },
              destinationCurrencySymbol: { type: Type.STRING },
              exchangeRateToHomeCurrency: { type: Type.NUMBER },
              itinerary: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    day: { type: Type.NUMBER },
                    title: { type: Type.STRING },
                    travelTips: { type: Type.ARRAY, items: { type: Type.STRING } },
                    activities: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, lat: { type: Type.NUMBER }, lng: { type: Type.NUMBER }, estimatedLocalCost: { type: Type.NUMBER }, previewImageUrl: { type: Type.STRING }, reviews: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { userName: { type: Type.STRING }, comment: { type: Type.STRING } } } } } } },
                    diningOptions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, lat: { type: Type.NUMBER }, lng: { type: Type.NUMBER }, estimatedLocalCost: { type: Type.NUMBER }, previewImageUrl: { type: Type.STRING }, reviews: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { userName: { type: Type.STRING }, comment: { type: Type.STRING } } } } } } },
                  }
                }
              }
            }
          }
        }
      });
      const data = JSON.parse(res.text);
      setCurrencyInfo({ code: data.destinationCurrencyCode, symbol: data.destinationCurrencySymbol, rateToHome: data.exchangeRateToHomeCurrency });
      setItinerary(data.itinerary);
      setViewMode('list');
      setActiveMapDay(1);
    } catch (err) { 
      setConfirmationMessage("Neural synchronization interrupted. Please re-engage synthesis."); 
      setTimeout(() => setConfirmationMessage(null), 5000);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (viewMode === 'map' && itinerary && mapContainerRef.current) {
      if (mapRef.current) mapRef.current.remove();
      const L = (window as any).L;
      const map = L.map(mapContainerRef.current, { zoomControl: false }).setView([0, 0], 2);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
      
      const dayData = itinerary.find(d => d.day === activeMapDay) || itinerary[0];
      const dayIndex = itinerary.findIndex(d => d.day === activeMapDay);
      const points: any[] = [];
      const markers: any[] = [];

      const addPlaceMarkers = (items: any[], type: string, listKey: 'activities' | 'diningOptions') => {
        items.forEach((item, itemIdx) => {
          if (!item.lat || !item.lng) return;
          const prices = getFormattedPrice(item.estimatedLocalCost);
          const color = type === 'Dining' ? '#f97316' : '#4f46e5';
          const icon = L.divIcon({
            html: `<div class="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-2xl border-4 border-white transition-all transform hover:scale-110 active:cursor-grabbing" style="background: ${color}">${type === 'Dining' ? '🍽️' : '🏛️'}</div>`,
            className: 'custom-map-marker', iconSize: [48, 48], iconAnchor: [24, 48], popupAnchor: [0, -50]
          });
          
          const marker = L.marker([item.lat, item.lng], { icon, draggable: true }).addTo(map);
          marker.on('dragend', (e: any) => {
            const { lat, lng } = e.target.getLatLng();
            updateItemCoords(dayIndex, listKey, itemIdx, lat, lng);
          });

          marker.bindPopup(`
            <div class="overflow-hidden bg-white rounded-3xl animate-fadeIn">
              <div class="relative h-40">
                <img src="${item.previewImageUrl || DEFAULT_PLACE_IMAGE}" class="w-full h-full object-cover" />
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                <div class="absolute bottom-5 left-6 text-white">
                  <p class="text-[10px] font-black uppercase tracking-[0.2em] mb-1.5 opacity-80">${type}</p>
                  <h4 class="font-bold text-xl tracking-tight">${item.name}</h4>
                </div>
              </div>
              <div class="p-6">
                <div class="flex justify-between items-center mb-4 text-slate-900">
                  <span class="text-[11px] font-black text-slate-400 uppercase tracking-widest">Pricing</span>
                  <p class="text-sm font-bold">${prices ? prices.local : 'Live Quote'}</p>
                </div>
                <button class="w-full py-4 bg-slate-950 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-indigo-600">Architect Route</button>
              </div>
            </div>
          `);
          points.push([item.lat, item.lng]);
          markers.push(marker);
        });
      };

      addPlaceMarkers(dayData.activities, 'Activity', 'activities');
      addPlaceMarkers(dayData.diningOptions, 'Dining', 'diningOptions');

      if (points.length > 1) {
        if (polylineRef.current) polylineRef.current.remove();
        polylineRef.current = L.polyline(points, { color: '#4f46e5', weight: 4, opacity: 0.6, dashArray: '10, 15', lineJoin: 'round' }).addTo(map);
        map.fitBounds(L.featureGroup(markers).getBounds().pad(0.3));
      } else if (points.length === 1) map.setView(points[0], 15);
      mapRef.current = map;
    }
  }, [viewMode, itinerary, activeMapDay]);

  const renderCard = (place: Place, day: number, type: 'activity' | 'dining') => {
    const isBooked = bookings.some(b => b.placeName === place.name);
    const isFav = favorites.some(f => f.name === place.name);
    const prices = getFormattedPrice(place.estimatedLocalCost);

    return (
      <div className={`group card-premium flex flex-col h-full relative ${isBooked ? 'ring-4 ring-emerald-500 ring-offset-8' : ''}`}>
        <div className="relative h-64 overflow-hidden bg-slate-100 rounded-t-[3rem]">
          <img 
            src={place.previewImageUrl || DEFAULT_PLACE_IMAGE} 
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
            alt={place.name}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-transparent to-transparent" />
          <div className="absolute top-6 right-6">
            <button onClick={() => toggleFavorite(place)} className={`w-12 h-12 flex items-center justify-center glass rounded-2xl text-xl shadow-lg transition-all hover:scale-110 active:scale-90 ${isFav ? 'text-red-500' : 'text-white'}`}>
              {isFav ? '❤️' : '🤍'}
            </button>
          </div>
          <div className="absolute bottom-6 left-8 text-white">
            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.25em] ${type === 'activity' ? 'bg-indigo-600/70' : 'bg-orange-500/70'} backdrop-blur-md`}>
              {type}
            </span>
            <h4 className="font-bold mt-3 text-2xl leading-tight tracking-tight pr-6">{place.name}</h4>
          </div>
        </div>
        
        <div className="p-10 flex flex-col flex-grow">
          <div className="flex items-center justify-between mb-8">
            {prices ? (
              <div className="flex flex-col">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Market Quote</span>
                <p className="text-base font-bold text-slate-900">{prices.local} <span className="text-indigo-600 font-medium">/ {prices.home}</span></p>
              </div>
            ) : <div />}
            {isBooked && (
              <div className="flex items-center gap-2.5 px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                <span className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse"></span>
                <span className="text-[11px] font-black uppercase tracking-widest">Secured</span>
              </div>
            )}
          </div>

          <div className="flex-grow space-y-5">
            {place.reviews?.[0] && (
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-inner">
                <p className="text-[12px] text-slate-600 italic leading-relaxed">"{place.reviews[0].comment}"</p>
                <p className="text-[10px] font-black text-slate-400 mt-4 uppercase tracking-[0.2em]">— {place.reviews[0].userName}</p>
              </div>
            )}
          </div>

          <button 
            onClick={() => setBookingModal({ place, day })}
            className={`w-full mt-10 py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] transition-all btn-premium shadow-2xl ${
              isBooked ? 'bg-emerald-600 text-white shadow-emerald-900/20' : 'bg-slate-950 text-white hover:bg-indigo-600 shadow-indigo-900/20'
            }`}
          >
            {isBooked ? 'Review Logistics' : 'Initialize Access'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-24 animate-fadeIn relative pb-40">
      
      {/* Planner Interface */}
      <section className="bg-white p-10 sm:p-20 rounded-[4.5rem] shadow-2xl shadow-indigo-900/5 border border-slate-100 max-w-5xl mx-auto animate-slideUp">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-3 px-5 py-2 bg-indigo-50 text-indigo-600 text-[11px] font-black uppercase tracking-[0.3em] rounded-full mb-8">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-600"></span>
            </span>
            Neural Synthesis Engine
          </div>
          <h2 className="text-5xl sm:text-6xl font-[900] tracking-tighter text-slate-900 leading-[0.95] mb-6">Architect Your <br/>Next Chapter.</h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed">Sophisticated, hyper-personalized itinerary engineering for the modern globalist.</p>
        </div>
        
        <form onSubmit={generateItinerary} className="space-y-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-4">
              <label className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em] ml-3">Destination Alpha</label>
              <div className="relative group">
                <input type="text" required placeholder="e.g. Kyoto, Japan" className="input-premium pl-16 py-5 text-lg" value={formData.destination} onChange={e => setFormData({...formData, destination: e.target.value})} />
                <span className="absolute left-7 top-1/2 -translate-y-1/2 text-2xl grayscale group-focus-within:grayscale-0 transition-all">🌍</span>
              </div>
            </div>
            <div className="space-y-4">
              <label className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em] ml-3">Baseline Currency</label>
              <div className="relative">
                <select className="input-premium appearance-none pr-14 py-5 text-lg font-bold" value={homeCurrency} onChange={e => setHomeCurrency(e.target.value)}>
                  {SUPPORTED_HOME_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} ({c.symbol}) — {c.label}</option>)}
                </select>
                <span className="absolute right-7 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-sm">▼</span>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <label className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em] ml-3 text-center block">Neural Persona Alignment</label>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              {TRAVEL_STYLES.map(style => (
                <button
                  key={style.id} type="button" onClick={() => setFormData({...formData, travelStyle: style.id})}
                  className={`flex flex-col items-center justify-center p-8 rounded-[3rem] border-2 transition-all duration-700 group ${
                    formData.travelStyle === style.id ? 'bg-indigo-600 border-indigo-600 shadow-2xl shadow-indigo-900/20 text-white' : 'bg-slate-50 border-transparent hover:bg-slate-100 hover:border-slate-200 text-slate-500'
                  }`}
                >
                  <span className={`text-5xl mb-4 transition-transform duration-700 group-hover:scale-110 ${formData.travelStyle === style.id ? 'filter-none' : 'grayscale'}`}>{style.icon}</span>
                  <span className="text-[12px] font-black uppercase tracking-wider">{style.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 pt-8">
             <div className="space-y-8">
                <div className="flex justify-between items-center px-6">
                  <label className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em]">Temporal Scope</label>
                  <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-5 py-2 rounded-full border border-indigo-100">{formData.duration} Days</span>
                </div>
                <input type="range" min="1" max="14" className="w-full h-2.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600" value={formData.duration} onChange={e => setFormData({...formData, duration: parseInt(e.target.value)})} />
             </div>
             <div className="space-y-8">
                <div className="flex justify-between items-center px-6">
                  <label className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em]">Capital Deployment</label>
                  <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-5 py-2 rounded-full border border-indigo-100">${formData.budget} / Day</span>
                </div>
                <input type="range" min="50" max="2500" step="50" className="w-full h-2.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600" value={formData.budget} onChange={e => setFormData({...formData, budget: parseInt(e.target.value)})} />
             </div>
          </div>

          <button type="submit" disabled={loading || !isOnline} className={`w-full py-8 rounded-[3rem] bg-slate-950 text-white font-black uppercase tracking-[0.5em] shadow-2xl transition-all btn-premium group ${loading ? 'opacity-50' : 'hover:bg-indigo-600'}`}>
            {loading ? (
              <div className="flex items-center gap-5">
                <div className="w-7 h-7 border-[4px] border-white/20 border-t-white rounded-full animate-spin" />
                <span>Simulating Pathways...</span>
              </div>
            ) : (
              <div className="flex items-center gap-5">
                <span>Engage Synthesis</span>
                <svg className="w-7 h-7 transition-transform group-hover:translate-x-3 duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </div>
            )}
          </button>
        </form>
      </section>

      {/* Deployment Section */}
      {itinerary && (
        <div className="space-y-24 animate-fadeIn">
          
          <div className="flex flex-col items-center gap-10">
            <div className="bg-white p-2 rounded-full border border-slate-200 flex gap-1.5 shadow-2xl ring-1 ring-slate-100">
              <button onClick={() => setViewMode('list')} className={`px-14 py-4 rounded-full text-[12px] font-black uppercase tracking-[0.25em] transition-all duration-500 ${viewMode === 'list' ? 'bg-slate-950 text-white shadow-2xl' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}>Timeline</button>
              <button onClick={() => setViewMode('map')} className={`px-14 py-4 rounded-full text-[12px] font-black uppercase tracking-[0.25em] transition-all duration-500 ${viewMode === 'map' ? 'bg-slate-950 text-white shadow-2xl' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}>Explorer</button>
            </div>
          </div>

          {viewMode === 'list' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 items-stretch px-6">
              {itinerary.map((day: any, idx: number) => (
                <div key={idx} className="space-y-12 flex flex-col relative">
                  {idx < itinerary.length - 1 && <div className="hidden lg:block absolute top-32 -right-16 w-16 border-t-4 border-dotted border-slate-200" />}
                  
                  <div className="flex items-center gap-8 group">
                    <div className="w-20 h-20 rounded-[2.5rem] bg-slate-950 text-white flex items-center justify-center font-[900] text-3xl shadow-2xl group-hover:bg-indigo-600 transition-all duration-500 group-hover:rotate-12 group-hover:scale-110">
                      {day.day}
                    </div>
                    <div>
                      <h3 className="font-[900] text-slate-900 text-3xl tracking-tighter leading-none mb-2">{day.title}</h3>
                      <p className="text-[12px] font-black text-indigo-500 uppercase tracking-[0.3em]">Operational Phase</p>
                    </div>
                  </div>

                  <div className="space-y-12 flex-grow">
                    {/* Insights Hub */}
                    {day.travelTips && (
                      <div className="bg-indigo-50/50 p-10 rounded-[3rem] border border-indigo-100/50 shadow-inner">
                        <div className="flex items-center gap-3 mb-6">
                          <span className="text-2xl">💡</span>
                          <span className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.4em]">Neural Insights</span>
                        </div>
                        <ul className="space-y-5">
                          {day.travelTips.map((tip: string, tIdx: number) => (
                            <li key={tIdx} className="flex gap-4">
                              <span className="w-2 h-2 rounded-full bg-indigo-400 mt-2 shrink-0"></span>
                              <p className="text-[13px] text-slate-600 font-semibold leading-relaxed">{tip}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="space-y-10">
                      <div className="flex items-center gap-4 px-4">
                         <div className="w-2 h-8 bg-indigo-600 rounded-full"></div>
                         <span className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em]">Logistics Protocol</span>
                      </div>
                      <div className="grid grid-cols-1 gap-10">
                        {day.activities.map((a: any, i: number) => <React.Fragment key={i}>{renderCard(a, day.day, 'activity')}</React.Fragment>)}
                      </div>
                    </div>
                    
                    <div className="space-y-10">
                      <div className="flex items-center gap-4 px-4">
                         <div className="w-2 h-8 bg-orange-500 rounded-full"></div>
                         <span className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em]">Culinary Deployment</span>
                      </div>
                      <div className="grid grid-cols-1 gap-10">
                        {day.diningOptions.map((d: any, i: number) => <React.Fragment key={i}>{renderCard(d, day.day, 'dining')}</React.Fragment>)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[85vh] w-full rounded-[5rem] shadow-[0_80px_150px_-30px_rgba(0,0,0,0.2)] border-[12px] border-white overflow-hidden relative mx-auto max-w-[96vw] animate-scaleIn ring-1 ring-slate-100">
              <div ref={mapContainerRef} className="w-full h-full" />
              
              <div className="absolute top-12 left-12 z-[1000] space-y-6">
                 <div className="glass px-10 py-7 rounded-[2.5rem] shadow-2xl backdrop-blur-3xl border-white/50">
                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] mb-2.5">Hyper-local Explorer</p>
                    <h4 className="font-[900] text-slate-900 text-3xl tracking-tighter mb-5">{formData.destination}</h4>
                    <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar max-w-[300px]">
                      {itinerary.map(d => (
                        <button key={d.day} onClick={() => setActiveMapDay(d.day)} className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs transition-all ${activeMapDay === d.day ? 'bg-indigo-600 text-white shadow-lg scale-110' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>D{d.day}</button>
                      ))}
                    </div>
                 </div>

                 <div className="glass px-8 py-7 rounded-[2.5rem] shadow-2xl backdrop-blur-3xl border-white/50 w-[340px]">
                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] mb-6">Interactive Flow</p>
                    <div className="space-y-3">
                       {(itinerary.find(d => d.day === activeMapDay)?.activities || []).map((item: any, idx: number) => (
                         <div key={idx} draggable onDragStart={(e) => e.dataTransfer.setData('idx', idx.toString())} onDragOver={(e) => e.preventDefault()} onDrop={(e) => {
                             const fromIdx = parseInt(e.dataTransfer.getData('idx'));
                             reorderDayItems(itinerary.findIndex(d => d.day === activeMapDay), fromIdx, idx);
                           }} className="flex items-center gap-4 p-4 rounded-2xl bg-white/60 border border-slate-100 cursor-move hover:bg-white hover:shadow-xl transition-all group">
                           <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 text-[11px] font-black flex items-center justify-center">{idx + 1}</span>
                           <p className="text-[13px] font-bold text-slate-900 truncate flex-grow tracking-tight">{item.name}</p>
                           <span className="text-slate-300 group-hover:text-indigo-600 transition-colors">⋮⋮</span>
                         </div>
                       ))}
                       <p className="text-[10px] text-slate-400 mt-5 text-center font-bold uppercase tracking-widest">Drag items to optimize route</p>
                    </div>
                 </div>
              </div>

              <button onClick={() => setViewMode('list')} className="absolute bottom-12 left-1/2 -translate-x-1/2 z-[1000] bg-slate-950 text-white px-16 py-6 rounded-full font-black text-[12px] uppercase tracking-[0.5em] shadow-2xl active:scale-95 transition-all hover:bg-indigo-600">Back to Timeline</button>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Toast */}
      {confirmationMessage && (
        <div className="fixed bottom-14 left-1/2 -translate-x-1/2 z-[5000] animate-slideUp px-8 w-full max-w-xl">
           <div className="glass-dark text-white px-10 py-7 rounded-[3rem] shadow-2xl flex items-center gap-10 relative overflow-hidden">
             <div className="w-16 h-16 bg-indigo-600 text-white rounded-3xl flex items-center justify-center text-4xl shadow-2xl">✅</div>
             <div className="flex-grow">
               <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-2 leading-none">Intelligence Hub</p>
               <p className="text-base font-bold leading-snug">{confirmationMessage}</p>
             </div>
             <div className="absolute bottom-0 left-0 h-2 bg-indigo-600/30 w-full"><div className="h-full bg-indigo-600 animate-timer" style={{transformOrigin: 'left'}}></div></div>
           </div>
        </div>
      )}

      {/* Booking Modal */}
      {bookingModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-2xl z-[6000] flex items-center justify-center p-8 animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-[4.5rem] p-16 shadow-2xl animate-scaleIn relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full -mr-32 -mt-32 -z-10 animate-pulseSoft"></div>
             <div className="text-center space-y-12">
                <div className="w-28 h-28 bg-indigo-600 text-white rounded-[3rem] flex items-center justify-center mx-auto text-6xl shadow-2xl">✨</div>
                <div>
                  <h3 className="text-4xl font-[900] text-slate-900 tracking-tighter">Engage Access?</h3>
                  <p className="text-base text-slate-500 mt-5 leading-relaxed font-medium">Prioritize booking architecture for <br/><span className="font-[900] text-slate-900 underline decoration-indigo-500 decoration-[6px] underline-offset-8 transition-colors">{bookingModal.place.name}</span></p>
                </div>
                <div className="bg-slate-50 rounded-[2.5rem] p-10 text-left space-y-6 border border-slate-100 shadow-inner">
                   <div className="flex justify-between items-center">
                     <span className="text-[12px] font-black text-slate-400 uppercase tracking-[0.4em]">Channel</span>
                     <span className="text-[11px] font-black text-indigo-700 bg-indigo-100/50 px-5 py-2 rounded-full tracking-widest uppercase">Amadeus Elite</span>
                   </div>
                   <div className="flex justify-between items-center">
                     <span className="text-[12px] font-black text-slate-400 uppercase tracking-[0.4em]">Latency</span>
                     <span className="text-[11px] font-black text-slate-900">Synchronous</span>
                   </div>
                </div>
                <div className="flex flex-col gap-5 pt-4">
                   <button onClick={() => confirmBooking(bookingModal.place, bookingModal.day)} className="w-full py-7 bg-slate-950 text-white rounded-3xl font-black text-[13px] uppercase tracking-[0.5em] shadow-2xl btn-premium hover:bg-indigo-600">Confirm Access</button>
                   <button onClick={() => setBookingModal(null)} className="w-full py-5 text-slate-400 font-bold text-[13px] uppercase tracking-widest hover:text-slate-900 transition-all">Abort Request</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Floating Portfolio FAB */}
      <button onClick={() => setIsWalletOpen(!isWalletOpen)} className="fixed bottom-14 right-14 z-[4000] w-28 h-28 bg-slate-950 text-white rounded-[3rem] shadow-2xl flex items-center justify-center text-5xl transition-all transform hover:rotate-12 hover:scale-110 active:scale-90 border-4 border-white group">
        <div className="relative">
          👜
          {bookings.length > 0 && <span className="absolute -top-6 -right-6 w-11 h-11 bg-indigo-600 rounded-full text-sm font-black border-[6px] border-slate-950 flex items-center justify-center shadow-2xl">{bookings.length}</span>}
        </div>
      </button>

      {/* Sidebar Overlay */}
      {isWalletOpen && (
        <>
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xl z-[7000] animate-fadeIn" onClick={() => setIsWalletOpen(false)} />
          <div className="fixed inset-y-0 right-0 w-full sm:max-w-2xl bg-white shadow-2xl z-[7001] animate-slideUp flex flex-col border-l border-slate-100 rounded-l-[5rem]">
            <div className="p-14 border-b flex justify-between items-center bg-slate-50/50 rounded-tl-[5rem]">
              <div>
                <h3 className="text-5xl font-[900] text-slate-950 tracking-tighter leading-none mb-4">Portfolio.</h3>
                <p className="text-[12px] font-black text-indigo-600 uppercase tracking-[0.4em]">Secured Operational Assets</p>
              </div>
              <button onClick={() => setIsWalletOpen(false)} className="w-20 h-20 rounded-[2.5rem] bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-3xl transition-all shadow-sm">✕</button>
            </div>

            <div className="flex-grow overflow-y-auto p-14 space-y-16 hide-scrollbar bg-white">
              <section className="space-y-10">
                <div className="flex items-center justify-between border-b border-slate-100 pb-7">
                  <h4 className="text-[13px] font-black uppercase tracking-[0.4em] text-slate-400">Deployed Logistics</h4>
                  <span className="bg-emerald-50 text-emerald-600 px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-widest">{bookings.length} Active</span>
                </div>
                {bookings.length === 0 ? (
                  <div className="py-24 text-center bg-slate-50 rounded-[4rem] border-2 border-dashed border-slate-200 opacity-50">
                    <p className="text-5xl mb-8">🎟️</p>
                    <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest">No active deployments</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {bookings.map((b, i) => (
                      <div key={i} className="p-10 bg-slate-950 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 -mr-20 -mt-20 rounded-full group-hover:scale-150 transition-all duration-1000"></div>
                        <div className="flex justify-between items-start mb-8 relative z-10">
                          <span className="text-[12px] font-black bg-indigo-600 px-5 py-2 rounded-full shadow-2xl">{b.ref}</span>
                          <span className="text-[12px] font-black text-slate-500 uppercase tracking-widest">Day {b.day}</span>
                        </div>
                        <h5 className="font-[900] text-2xl tracking-tight relative z-10 leading-none pr-10">{b.placeName}</h5>
                        <p className="text-[12px] font-bold text-slate-500 mt-4 uppercase tracking-[0.3em]">Verified Access</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-10">
                 <div className="flex items-center justify-between border-b border-slate-100 pb-7">
                  <h4 className="text-[13px] font-black uppercase tracking-[0.4em] text-slate-400">Wishlist Pipeline</h4>
                </div>
                {favorites.length === 0 ? (
                  <p className="text-base text-slate-400 font-medium italic opacity-60">Architect your wishlist by selecting locations in the planner.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {favorites.map((f, i) => (
                      <div key={i} className="flex items-center gap-8 p-7 rounded-[2.5rem] bg-slate-50 border border-slate-100 group transition-all hover:bg-white hover:shadow-2xl">
                        <div className="w-24 h-24 rounded-[2rem] overflow-hidden shadow-2xl shrink-0">
                          <img src={f.previewImageUrl || DEFAULT_PLACE_IMAGE} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-grow min-w-0">
                          <h5 className="font-bold text-lg text-slate-900 truncate tracking-tight mb-2">{f.name}</h5>
                          <button onClick={() => toggleFavorite(f)} className="text-[11px] font-black text-red-500 uppercase tracking-[0.3em] flex items-center gap-2 group-hover:gap-3 transition-all">✕ De-prioritize</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <div className="p-14 bg-slate-950 text-white rounded-t-[5rem] shadow-[0_-50px_100px_rgba(0,0,0,0.2)]">
              <div className="flex justify-between items-center mb-12">
                <span className="text-[13px] font-black uppercase tracking-[0.5em] text-slate-500">Gross Estimate</span>
                <div className="text-right">
                  <p className="text-5xl font-[900] text-white tracking-tighter leading-none">{currencyInfo?.symbol}{bookings.reduce((sum, b) => sum + (b.estimatedLocalCost || 0), 0).toLocaleString()}</p>
                  <p className="text-[12px] font-black text-indigo-500 uppercase tracking-[0.4em] mt-3">Portfolio Valuation</p>
                </div>
              </div>
              <button onClick={() => setIsWalletOpen(false)} className="w-full py-7 bg-indigo-600 rounded-[2.5rem] font-black text-[13px] uppercase tracking-[0.6em] shadow-2xl btn-premium hover:shadow-indigo-500/20">Resume Architecting</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ItineraryPlanner;