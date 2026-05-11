export type UserRole = 'client' | 'agent' | 'admin';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role: UserRole;
  createdAt: number;
}

export interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  type: 'rental' | 'sale';
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  images: string[];
  agentId: string;
  agentName?: string;
  createdAt: number;
  updatedAt: number;
}

export interface SearchFilters {
  location: string;
  minPrice: number;
  maxPrice: number;
  type: 'rental' | 'sale' | 'all';
}
