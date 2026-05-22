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
import AuthModal from './components/AuthModal';

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
  const [splashVisible, setSplashVisible] = useState(true);
  const [splashStep, setSplashStep] = useState(0);

  // Splash Screen steps timer for beautiful launching experience
  useEffect(() => {
    const steps = [
      "Accessing local hoods...",
      "Securing tenant portal...",
      "Fetching affordable rooms...",
      "Welcome to eRoom Connect!"
    ];
    
    const interval = setInterval(() => {
      setSplashStep(prev => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 2400 / steps.length);

    const timer = setTimeout(() => {
      setSplashVisible(false);
    }, 2400);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, []);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('explore');
  const [preferredRole, setPreferredRole] = useState<UserRole>('client');
  const [properties, setProperties] = useState<Property[]>(() => {
    try {
      const cached = localStorage.getItem('eroom_properties');
      return cached ? JSON.parse(cached) : DUMMY_PROPERTIES;
    } catch {
      return DUMMY_PROPERTIES;
    }
  });
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
        // 1. Immediately look for locally cached profile to enable instant offline preview/load
        const cachedUserStr = localStorage.getItem(`eroom_user_${firebaseUser.uid}`);
        if (cachedUserStr) {
          try {
            setUser(JSON.parse(cachedUserStr));
          } catch (e) {
            console.warn("Error parsing cached user profile:", e);
          }
        }

        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as UserProfile;
            setUser(userData);
            localStorage.setItem(`eroom_user_${firebaseUser.uid}`, JSON.stringify(userData));
          } else {
            // New user - use preferred role from AuthModal
            const newUser: UserProfile = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || 'Anonymous',
              email: firebaseUser.email || '',
              photoURL: firebaseUser.photoURL || undefined,
              role: preferredRole,
              createdAt: Date.now(),
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
            setUser(newUser);
            localStorage.setItem(`eroom_user_${firebaseUser.uid}`, JSON.stringify(newUser));
          }
        } catch (error) {
          console.warn("Could not retrieve online user profile, using fallback/local profile:", error);
          
          // 2. If no local cached profile exists, construct a robust offline-capable fallback
          if (!localStorage.getItem(`eroom_user_${firebaseUser.uid}`)) {
            const fallbackUser: UserProfile = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || 'User',
              email: firebaseUser.email || '',
              role: 'client', // Default fallback role
              createdAt: Date.now()
            };
            setUser(fallbackUser);
          }
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [preferredRole]);

  // Properties Fetch Effect
  useEffect(() => {
    try {
      const q = query(collection(db, 'properties'), orderBy('createdAt', 'desc'), limit(50));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property));
        if (fetched.length > 0) {
          setProperties(fetched);
          localStorage.setItem('eroom_properties', JSON.stringify(fetched));
        }
      }, (error) => {
        console.warn("Firestore onSnapshot error (likely client is offline or setup incomplete):", error);
        // Try getting from local state or localStorage automatically handled by lazy initial state
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("Firestore collection not available yet, using offline/cached data.");
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
    if (!user) return;
    
    // Create direct local optimistic update representing the new room listing
    const localProp: Property = {
      id: `local_${Date.now()}`,
      title: newProperty.title || 'Untitled Room',
      description: newProperty.description || '',
      price: newProperty.price || 0,
      type: newProperty.type || 'rental',
      address: newProperty.address || '',
      location: newProperty.location || { lat: 0, lng: 0 },
      images: newProperty.images || [],
      agentId: user.uid,
      agentName: user.displayName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Optimistically prepend the listing
    const updatedList = [localProp, ...properties];
    setProperties(updatedList);
    localStorage.setItem('eroom_properties', JSON.stringify(updatedList));

    try {
      await addDoc(collection(db, 'properties'), {
        ...newProperty,
        agentId: user.uid,
        agentName: user.displayName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.warn("Failed to publish room online (client may be offline), room has been saved locally:", error);
    }
  };

  const switchRole = async (role: UserRole) => {
    if (!user) return;
    try {
      const updatedUser = { ...user, role };
      setUser(updatedUser);
      localStorage.setItem(`eroom_user_${user.uid}`, JSON.stringify(updatedUser));
      await setDoc(doc(db, 'users', user.uid), updatedUser);
    } catch (e) {
      console.warn("Failed to sync role update online (client may be offline), role updated locally:", e);
    }
  };

  if (loading || splashVisible) {
    const steps = [
      "Accessing local hoods...",
      "Securing tenant portal...",
      "Fetching affordable rooms...",
      "Welcome to eRoom Connect!"
    ];

    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-white p-6 overflow-hidden select-none">
        <div className="flex flex-col items-center max-w-sm text-center space-y-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
            className="relative"
          >
            <div className="absolute -inset-4 bg-sky-300/10 rounded-full blur-xl animate-pulse" />
            <div className="absolute -inset-10 bg-sky-200/5 rounded-full blur-2xl" />
            
            <img 
              src="/src/assets/images/eroom_logo_1779482177717.png" 
              alt="eRoom Connect Logo" 
              className="relative w-36 h-36 rounded-[2.5rem] object-cover shadow-2xl shadow-sky-500/10 ring-4 ring-sky-100/50"
              referrerPolicy="no-referrer"
            />
          </motion.div>

          <div className="space-y-4">
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="font-display text-4xl font-extrabold text-neutral-900 tracking-tight">
                eRoom <span className="text-sky-500">Connect</span>
              </h2>
              <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest mt-1">
                Your Hood's Portal
              </p>
            </motion.div>

            <div className="w-48 h-1 bg-neutral-100 rounded-full overflow-hidden mx-auto">
              <motion.div 
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 2.4, ease: "easeInOut" }}
                className="h-full bg-sky-500 rounded-full"
              />
            </div>

            <motion.p
              key={splashStep}
              initial={{ y: 5, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -5, opacity: 0 }}
              className="text-neutral-500 font-medium text-sm h-5"
            >
              {steps[splashStep]}
            </motion.p>
          </div>
        </div>

        <div className="absolute bottom-10 flex flex-col items-center text-center gap-1.5 opacity-60">
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
            Securely encrypted portal
          </p>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              Offline Cache Ready
            </span>
          </div>
        </div>
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
          <div className="flex items-center gap-2.5">
            <img 
              src="/src/assets/images/eroom_logo_1779482177717.png" 
              alt="eRoom Connect Logo" 
              className="w-10 h-10 rounded-xl object-cover shadow-sm ring-1 ring-sky-100"
              referrerPolicy="no-referrer"
            />
            <h1 className="font-display text-lg sm:text-2xl font-bold text-sky-900 tracking-tight">eRoom Connect</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!user ? (
            <button 
              onClick={() => setIsAuthOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-sky-500 text-white rounded-2xl font-semibold hover:bg-sky-600 shadow-lg shadow-sky-500/20 transition-all active:scale-95"
            >
              <LogIn className="w-5 h-5" />
              <span>Login / Register</span>
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

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(role) => setPreferredRole(role)}
      />
    </div>
  );
}
