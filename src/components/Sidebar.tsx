import { motion, AnimatePresence } from 'motion/react';
import { X, User, Home, Search, Heart, LayoutDashboard, LogOut, Settings } from 'lucide-react';
import { auth } from '../lib/firebase';
import { UserProfile } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onSignOut: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Sidebar({ isOpen, onClose, user, onSignOut, activeTab, setActiveTab }: SidebarProps) {
  const menuItems = [
    { id: 'explore', label: 'Explore', icon: Search },
    { id: 'saved', label: 'Saved Rooms', icon: Heart },
    { id: 'my-listings', label: 'My Listings', icon: Home, roles: ['agent'] },
    { id: 'dashboard', label: 'Agent Dashboard', icon: LayoutDashboard, roles: ['agent'] },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const filteredMenuItems = menuItems.filter(item => 
    !item.roles || (user && item.roles.includes(user.role))
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 w-80 bg-white shadow-xl z-50 flex flex-col"
          >
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center">
                  <Home className="text-white w-6 h-6" />
                </div>
                <h1 className="font-display text-2xl font-bold text-sky-900 tracking-tight">eRoom Connect</h1>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                id="close-sidebar"
              >
                <X className="w-6 h-6 text-neutral-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
              {user && (
                <div className="mb-8 px-2 flex items-center gap-4">
                  <img 
                    src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                    alt={user.displayName}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-sky-100"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <p className="font-semibold text-neutral-900 leading-tight">{user.displayName}</p>
                    <p className="text-xs text-neutral-500 capitalize">{user.role}</p>
                  </div>
                </div>
              )}

              {filteredMenuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-200 group
                    ${activeTab === item.id 
                      ? 'bg-sky-50 text-sky-600' 
                      : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'
                    }`}
                  id={`sidebar-item-${item.id}`}
                >
                  <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${activeTab === item.id ? 'text-sky-600' : 'text-neutral-400'}`} />
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </div>

            <div className="p-6 border-t border-neutral-100">
              <button
                onClick={onSignOut}
                className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-red-500 hover:bg-red-50 transition-all group"
                id="sign-out-btn"
              >
                <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
