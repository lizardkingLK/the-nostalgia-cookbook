'use client';

import React, { useState } from 'react';
import { LogIn, LogOut, User, ShieldCheck, Heart, Sparkles } from 'lucide-react';

interface GoogleSignInButtonProps {
  userSession?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
  onSignIn?: () => void;
  onSignOut?: () => void;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  userSession,
  onSignIn,
  onSignOut,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);

  // Default handler using NextAuth if available or simulated family login
  const handleSignIn = () => {
    if (onSignIn) {
      onSignIn();
      return;
    }
    try {
      // In Next.js client environment
      const nextAuth = (window as any).nextAuth;
      if (nextAuth?.signIn) {
        nextAuth.signIn('google');
      } else {
        // Direct redirect to NextAuth Google endpoint
        window.location.href = '/api/auth/signin/google';
      }
    } catch {
      window.location.href = '/api/auth/signin/google';
    }
  };

  const handleSignOut = () => {
    if (onSignOut) {
      onSignOut();
      return;
    }
    window.location.href = '/api/auth/signout';
  };

  if (userSession?.email) {
    return (
      <div className="relative font-serif">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2.5 px-3.5 py-1.5 bg-[#FDFCF7] hover:bg-[#F3EED9] border-2 border-[#D8C3B1] rounded-2xl transition-all shadow-sm group"
        >
          {userSession.image ? (
            <img
              src={userSession.image}
              alt={userSession.name || 'User'}
              className="w-7 h-7 rounded-full border border-[#94442B] object-cover"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[#E7ECE8] border border-[#607D68] flex items-center justify-center text-[#3F5645] text-xs font-bold">
              {userSession.name?.charAt(0) || 'F'}
            </div>
          )}
          <div className="text-left hidden sm:block">
            <span className="block text-xs font-bold text-[#2C1D11] leading-tight">
              {userSession.name || 'Family Archivist'}
            </span>
            <span className="block text-[10px] text-[#705335] italic">
              Heirloom Vault Active
            </span>
          </div>
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-2 w-64 bg-[#FAF7F0] border-2 border-[#D8C3B1] rounded-2xl shadow-recipe-card p-4 z-50 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3 pb-3 border-b border-[#D8C3B1]">
              {userSession.image ? (
                <img
                  src={userSession.image}
                  alt={userSession.name || 'User'}
                  className="w-10 h-10 rounded-full border border-[#94442B]"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#E7ECE8] flex items-center justify-center text-[#3F5645] font-bold">
                  {userSession.name?.charAt(0) || 'F'}
                </div>
              )}
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-[#2C1D11] truncate">{userSession.name}</p>
                <p className="text-[10px] text-[#705335] truncate">{userSession.email}</p>
              </div>
            </div>

            <div className="py-2.5 space-y-1 text-xs text-[#705335]">
              <div className="flex items-center gap-2 text-[11px] text-[#607D68] font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Private Family MongoDB Vault</span>
              </div>
              <p className="text-[10px] italic leading-tight text-[#705335]">
                Only your family circle can access your preserved voice recipes and memoirs.
              </p>
            </div>

            <button
              onClick={handleSignOut}
              className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-1.5 bg-[#FBECE7] hover:bg-[#F5D3C8] text-[#94442B] border border-[#E8A692] rounded-xl text-xs font-bold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={handleSignIn}
      className="flex items-center gap-2.5 px-3.5 sm:px-4 py-2 bg-[#FAF7F0] hover:bg-[#FDFCF7] text-[#4A3525] border-2 border-[#D8C3B1] hover:border-[#94442B] rounded-2xl text-xs sm:text-sm font-serif font-semibold transition-all shadow-sm hover:shadow-md group active:scale-95"
    >
      {/* Timeless Vintage Google Emblem */}
      <div className="w-5 h-5 rounded-full bg-white border border-[#D8C3B1] flex items-center justify-center p-0.5 shadow-vintage-inset">
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5">
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.16 0 9.97 0 12s.45 3.84 1.24 5.42l4.04-3.15z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
          />
        </svg>
      </div>
      <span className="group-hover:text-[#94442B] transition-colors">
        Sign in with Google
      </span>
    </button>
  );
};

export default GoogleSignInButton;
