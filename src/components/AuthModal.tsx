import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, LogIn, UserPlus, Home, CheckCircle2 } from 'lucide-react';
import { signInWithGoogle } from '../lib/firebase';
import { UserRole } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (role: UserRole) => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [selectedRole, setSelectedRole] = useState<UserRole>('client');
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      onSuccess(selectedRole);
      onClose();
    } catch (error) {
      console.error("Auth error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-neutral-900/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-center mb-8 relative">
              <div className="text-center">
                <img 
                  src="/src/assets/images/eroom_logo_1779482177717.png" 
                  alt="eRoom Connect Logo" 
                  className="w-16 h-16 rounded-2xl object-cover mx-auto mb-3 shadow-lg shadow-sky-500/10 ring-2 ring-sky-100"
                  referrerPolicy="no-referrer"
                />
                <h2 className="font-display text-2xl font-bold text-neutral-900">eRoom Connect</h2>
                <p className="text-neutral-400 text-sm">Join the hood's favorite portal</p>
              </div>
              <button 
                onClick={onClose}
                className="absolute -top-2 -right-2 p-2 hover:bg-neutral-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-neutral-400" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-neutral-100 rounded-2xl mb-8">
              <button
                onClick={() => setMode('login')}
                className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2
                  ${mode === 'login' ? 'bg-white text-sky-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
              >
                <LogIn className="w-4 h-4" />
                Login
              </button>
              <button
                onClick={() => setMode('register')}
                className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2
                  ${mode === 'register' ? 'bg-white text-sky-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
              >
                <UserPlus className="w-4 h-4" />
                Register
              </button>
            </div>

            {/* Role Selection for Registration */}
            {mode === 'register' && (
              <div className="space-y-4 mb-8">
                <p className="text-center text-sm font-semibold text-neutral-500 uppercase tracking-wider">Choose your role</p>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: 'client', label: 'I want a room', sub: 'Tenant' },
                    { id: 'agent', label: 'I have a room', sub: 'Landlord' }
                  ].map((role) => (
                    <button
                      key={role.id}
                      onClick={() => setSelectedRole(role.id as UserRole)}
                      className={`relative p-4 rounded-2xl border-2 transition-all text-left group
                        ${selectedRole === role.id 
                          ? 'border-sky-500 bg-sky-50' 
                          : 'border-neutral-100 hover:border-sky-200 bg-white'}`}
                    >
                      {selectedRole === role.id && (
                        <CheckCircle2 className="absolute top-2 right-2 w-4 h-4 text-sky-500" />
                      )}
                      <p className={`font-bold transition-colors ${selectedRole === role.id ? 'text-sky-700' : 'text-neutral-900 group-hover:text-sky-600'}`}>
                        {role.label}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                        {role.sub}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Button */}
            <button
              onClick={handleAuth}
              disabled={loading}
              className="w-full btn-primary py-4 text-lg shadow-lg shadow-sky-500/25 flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              <img 
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                alt="Google" 
                className="w-6 h-6 bg-white p-1 rounded-full"
              />
              <span>{loading ? 'Authenticating...' : mode === 'login' ? 'Sign in with Google' : 'Register with Google'}</span>
            </button>

            <p className="mt-6 text-center text-[10px] text-neutral-400 leading-relaxed uppercase tracking-widest font-medium">
              By continuing, you agree to our <br/>
              <span className="text-neutral-600 underline">Terms of Service</span> & <span className="text-neutral-600 underline">Privacy Policy</span>
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
