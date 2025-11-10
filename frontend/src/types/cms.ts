export interface Testimonial {
  id: string;
  name: string;
  title: string;
  rating: number;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestimonialPayload {
  name: string;
  title: string;
  rating: number;
  content: string;
}

export interface CarouselItem {
  id: string;
  sortOrder: number;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CarouselPayload {
  sortOrder: number;
  content: string;
}

export type LeaderboardType = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface LeaderboardEntry {
  id: string;
  type: LeaderboardType;
  avatar?: string;
  country: string;
  name: string;
  tradeCount: number;
  winRate: number;
  volume: number;
  createdAt: string;
  updatedAt: string;
}

export interface LeaderboardPayload {
  type: LeaderboardType;
  avatar?: string;
  country: string;
  name: string;
  tradeCount: number;
  winRate: number;
  volume: number;
}

export interface TradingPerformanceEntry {
  id: string;
  tradeDuration: number;
  winRate: number;
  createdAt: string;
  updatedAt: string;
}

export interface TradingPerformancePayload {
  tradeDuration: number;
  winRate: number;
}
