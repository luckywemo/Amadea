
export interface ItineraryItem {
  day: number;
  title: string;
  activities: string[];
  recommendations: {
    name: string;
    type: 'restaurant' | 'sight' | 'hotel';
    description: string;
  }[];
}

export interface TravelPreferences {
  destination: string;
  duration: number;
  budget: 'budget' | 'mid-range' | 'luxury';
  interests: string[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  groundingLinks?: { title: string; uri: string }[];
}
