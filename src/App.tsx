import { useState, useEffect, useMemo } from 'react';
import { 
  onAuthStateChanged, 
  signOut, 
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  onSnapshot,
  addDoc,
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { Plus, Menu, User as UserIcon, Home, MapPin, Search, LogIn, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { auth, db, signInWithGoogle, handleFirestoreError, OperationType } from './lib/firebase';
import { UserProfile, Property, SearchFilters, UserRole } from './types';
import Sidebar from './components/Sidebar';
import Filters from './components/Filters';
import PropertyCard from './components/PropertyCard';
import UploadModal from './components/UploadModal';

// Dummy data for initial view or offline mode
const DUMMY_PROPERTIES: Property[] = [
  {
    id: '1',
    title: 'Blue Horizon Penthouse',
    description: 'Breathtaking 360-degree views of the coastline.',
    price: 4500,
    type: 'rental',
    address: 'Bay View Road, Cape Town',
    location: { lat: -33.9249, lng: 18.4241 },
    images: ['https://picsum.photos/seed/lux1/1920/1080'],
    agentId: 'agent1',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: '2',
    title: 'White Stone Guest Room',
    description: 'A cozy minimalist room with all essentials included.',
    price: 3500,
    type: 'rental',
    address: 'Sunset Strip, Johannesburg',
    location: { lat: -26.2041, lng: 28.0473 },
    images: ['https://picsum.photos/seed/lux2/1920/1080'],
    agentId: 'agent2',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: '3',
    title: 'Skyline Modern Loft',
    description: 'Perfect industrial-chic living in the heart of downtown.',
    price: 3200,
    type: 'rental',
    address: '5th Ave, New York',
    location: { lat: 40.7128, lng: -74.0060 },
    images: ['https://picsum.photos/seed/lux3/1920/1080'],
    agentId: 'agent1',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('explore');
  const [properties, setProperties] = useState<Property[]>(DUMMY_PROPERTIES);
  const [filters, setFilters] = useState<SearchFilters>({
    location: '',
    minPrice: 0,
    maxPrice: 0,
    type: 'all'
  });

  // Auth Effect
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUser(userDoc.data() as UserProfile);
          } else {
            // New user - default to client role
            const newUser: UserProfile = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || 'Anonymous',
              email: firebaseUser.email || '',
              photoURL: firebaseUser.photoURL || undefined,
              role: 'client',
              createdAt: Date.now(),
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
            setUser(newUser);
          }
        } catch (error) {
          console.error("Error setting up user profile", error);
          // Fallback user if Firebase setup failed
          setUser({
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || 'User',
            email: firebaseUser.email || '',
            role: 'client',
            createdAt: Date.now()
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Properties Fetch Effect
  useEffect(() => {
    try {
      const q = query(collection(db, 'properties'), orderBy('createdAt', 'desc'), limit(50));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property));
        if (fetched.length > 0) {
          setProperties(fetched);
        }
      }, (error) => {
        console.warn("Firestore error (likely setup incomplete):", error);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("Firestore collection not available yet.");
    }
  }, []);

  const filteredProperties = useMemo(() => {
    return properties.filter(p => {
      const matchesLocation = p.address.toLowerCase().includes(filters.location.toLowerCase()) || 
                             p.title.toLowerCase().includes(filters.location.toLowerCase());
      const matchesMinPrice = !filters.minPrice || p.price >= filters.minPrice;
      const matchesMaxPrice = !filters.maxPrice || p.price <= filters.maxPrice;
      const matchesType = filters.type === 'all' || p.type === filters.type;
      
      return matchesLocation && matchesMinPrice && matchesMaxPrice && matchesType;
    });
  }, [properties, filters]);

  const handleSignOut = () => {
    auth.signOut();
    setIsSidebarOpen(false);
  };

  const handleUpload = async (newProperty: Partial<Property>) => {
    if (!user || user.role !== 'agent') return;
    
    try {
      await addDoc(collection(db, 'properties'), {
        ...newProperty,
        agentId: user.uid,
        agentName: user.displayName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'properties');
    }
  };

  const switchRole = async (role: UserRole) => {
    if (!user) return;
    try {
      const updatedUser = { ...user, role };
      await setDoc(doc(db, 'users', user.uid), updatedUser);
      setUser(updatedUser);
    } catch (e) {
      console.error("Failed to update role", e);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-16 h-16 bg-sky-500 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/20"
        >
          <Home className="text-white w-8 h-8" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-24 lg:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-30 px-6 py-4 flex items-center justify-between bg-white/80 backdrop-blur-xl border-b border-neutral-100/50">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-3 bg-neutral-100 rounded-2xl hover:bg-neutral-200 transition-colors shadow-sm"
          >
            <Menu className="w-6 h-6 text-neutral-600" />
          </button>
          <div className="hidden sm:block">
            <h1 className="font-display text-2xl font-bold text-sky-900 tracking-tight">eRoom Connect</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!user ? (
            <button 
              onClick={() => signInWithGoogle()}
              className="flex items-center gap-2 px-6 py-3 bg-sky-500 text-white rounded-2xl font-semibold hover:bg-sky-600 shadow-lg shadow-sky-500/20 transition-all active:scale-95"
            >
              <LogIn className="w-5 h-5" />
              <span>Login</span>
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-neutral-900 leading-none">{user.displayName}</p>
                <button 
                  onClick={() => switchRole(user.role === 'agent' ? 'client' : 'agent')}
                  className="text-[10px] uppercase tracking-widest font-bold text-sky-500 hover:text-sky-600 transition-colors"
                >
                  Switch to {user.role === 'agent' ? 'Buyer' : 'Agent'}
                </button>
              </div>
              <img 
                src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                alt={user.displayName}
                className="w-11 h-11 rounded-xl object-cover ring-2 ring-sky-50 shadow-sm"
                referrerPolicy="no-referrer"
              />
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 lg:grid lg:grid-cols-[380px,1fr] lg:gap-12">
        {/* Search & Filters */}
        <section className="space-y-8 mb-12 lg:mb-0 lg:sticky lg:top-32 lg:h-fit">
          <div className="space-y-2">
            <h2 className="font-display text-4xl lg:text-5xl font-bold text-neutral-900 leading-tight">
              Find your <span className="text-sky-500">Dream</span> room.
            </h2>
            <p className="text-neutral-500 font-medium tracking-wide">
              Secure, verified real estate directly from premium agents.
            </p>
          </div>

          <Filters filters={filters} setFilters={setFilters} />
          
          <div className="hidden lg:block pt-8 border-t border-neutral-100">
             <div className="bg-sky-50 rounded-[2.5rem] p-8 space-y-4">
                <h3 className="font-display text-xl font-bold text-sky-900">Invite Friends</h3>
                <p className="text-sky-700/70 text-sm leading-relaxed">
                  Refer friends and get zero commission on your first purchase.
                </p>
                <button className="w-full py-3 px-4 bg-sky-500 text-white rounded-2xl font-bold text-sm shadow-md shadow-sky-500/20 hover:bg-sky-600 transition-all">
                  Share App
                </button>
             </div>
          </div>
        </section>

        {/* Content Area */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-2xl font-bold text-neutral-900 flex items-center gap-2">
              Discover Rooms
              <span className="text-xs font-bold px-2 py-1 bg-neutral-200 rounded-lg text-neutral-600">
                {filteredProperties.length}
              </span>
            </h3>
            <div className="flex gap-2">
              {['Newest', 'Popular'].map(t => (
                <button 
                  key={t}
                  className={`text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-xl transition-all
                    ${t === 'Newest' ? 'bg-neutral-900 text-white' : 'text-neutral-400 hover:text-neutral-600'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {filteredProperties.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-6 pb-20">
              <AnimatePresence mode="popLayout">
                {filteredProperties.map((property) => (
                  <div key={property.id}>
                    <PropertyCard 
                      property={property} 
                      onSelect={() => {}} 
                    />
                  </div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="bg-white rounded-[2.5rem] p-12 text-center border-2 border-dashed border-neutral-100">
               <Search className="w-12 h-12 text-neutral-200 mx-auto mb-4" />
               <h4 className="font-display text-xl font-bold text-neutral-900 mb-2">No rooms found</h4>
               <p className="text-neutral-400">Try adjusting your filters or location search.</p>
               <button 
                onClick={() => setFilters({ location: '', minPrice: 0, maxPrice: 0, type: 'all' })}
                className="mt-6 text-sky-500 font-bold hover:underline"
               >
                 Reset all filters
               </button>
            </div>
          )}
        </section>
      </main>

      {/* Floating Action / Mobile Nav */}
      <div className="fixed bottom-0 left-0 right-0 p-6 z-40 sm:flex sm:justify-center">
        <div className="flex items-center justify-between gap-4 p-2 pl-6 bg-neutral-900/90 backdrop-blur-xl rounded-full shadow-2xl shadow-black/20 sm:w-min sm:min-w-[400px]">
          <div className="flex gap-6 pr-6 border-r border-white/10">
            <button 
              className={`p-2 transition-all ${activeTab === 'explore' ? 'text-sky-400' : 'text-neutral-400 hover:text-white'}`}
              onClick={() => setActiveTab('explore')}
            >
              <Search className="w-6 h-6" />
            </button>
            <button 
              className={`p-2 transition-all ${activeTab === 'saved' ? 'text-sky-400' : 'text-neutral-400 hover:text-white'}`}
              onClick={() => setActiveTab('saved')}
            >
              <Heart className="w-6 h-6" />
            </button>
          </div>
          
          {user?.role === 'agent' ? (
            <button 
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-2 px-6 py-4 bg-sky-500 text-white rounded-full font-bold shadow-lg shadow-sky-500/40 hover:bg-sky-600 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-6 h-6" />
              <span className="hidden sm:inline">Add Room</span>
            </button>
          ) : (
            <button className="flex items-center gap-2 pr-6 text-neutral-400 hover:text-white transition-colors">
              <UserIcon className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        user={user} 
        onSignOut={handleSignOut}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <UploadModal 
        isOpen={isUploadOpen} 
        onClose={() => setIsUploadOpen(false)} 
        onUpload={handleUpload} 
      />
    </div>
  );
}
