import React from 'react';
import { BookOpen, Mic, ShieldCheck, Sparkles, Utensils, RotateCcw } from 'lucide-react';
import { GoogleSignInButton } from './GoogleSignInButton';

interface NavbarProps {
  activeTab: 'box' | 'record' | 'privacy';
  setActiveTab: (tab: 'box' | 'record' | 'privacy') => void;
  recipesCount: number;
  onClearRecipes?: () => void;
  userSession?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
  onSessionChange?: (session: { name: string; email: string; image: string } | null) => void;
  onSignIn?: () => void;
  onSignOut?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  recipesCount,
  onClearRecipes,
  userSession,
  onSessionChange,
  onSignIn,
  onSignOut,
}) => {
  return (
    <header className="app-header bg-[#FAF7F0] border-b-2 border-[#D8C3B1] sticky top-0 z-30 shadow-sm backdrop-blur-sm bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Branding */}
          <div
            onClick={() => setActiveTab('box')}
            className="flex items-center gap-3.5 cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-xl bg-[#4A3525] border-2 border-[#705335] flex items-center justify-center text-[#FDFCF7] shadow-md group-hover:scale-105 transition-transform">
              <Utensils className="w-6 h-6 text-[#E8A692]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-2xl text-[#2C1D11] tracking-tight group-hover:text-[#94442B] transition-colors">
                  The Nostalgia Cookbook
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-serif bg-[#FBECE7] text-[#94442B] border border-[#E8A692] rounded-full font-semibold">
                  Open Heritage AI
                </span>
              </div>
              <p className="text-xs font-serif text-[#705335] italic">
                Preserving oral family memories into kitchen cards &amp; story journals
              </p>
            </div>
          </div>

          {/* Action Buttons & Google Sign In */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setActiveTab('box')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-serif text-sm font-semibold transition-all ${
                activeTab === 'box'
                  ? 'bg-[#4A3525] text-[#FAF7F0] shadow-md'
                  : 'bg-[#F3EED9] text-[#4A3525] hover:bg-[#E8DEC0]'
              }`}
            >
              <BookOpen className="w-4 h-4 text-[#E8A692]" />
              <span className="hidden md:inline">Recipe Box</span>
              <span className="px-1.5 py-0.2 text-xs rounded-full bg-[#705335] text-[#FDFCF7]">
                {recipesCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('record')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-serif text-sm font-semibold transition-all ${
                activeTab === 'record'
                  ? 'bg-[#94442B] text-white shadow-md'
                  : 'bg-[#C86446] hover:bg-[#94442B] text-white shadow-sm'
              }`}
            >
              <Mic className="w-4 h-4 text-[#FDFCF7]" />
              <span className="hidden sm:inline">Record / Ingest</span>
            </button>

            <button
              onClick={() => setActiveTab('privacy')}
              title="Gemma Privacy Architecture"
              className={`p-2 sm:px-3 sm:py-2 rounded-xl font-serif text-sm font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'privacy'
                  ? 'bg-[#3F5645] text-white'
                  : 'bg-[#E7ECE8] text-[#3F5645] hover:bg-[#D0DBD2]'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-[#607D68]" />
              <span className="hidden lg:inline text-xs font-semibold">Gemma Privacy</span>
            </button>

            {/* Google Authentication Button (Timeless Vintage Style) */}
            <GoogleSignInButton
              userSession={userSession}
              onSessionChange={onSessionChange}
              onSignIn={onSignIn}
              onSignOut={onSignOut}
            />

            {onClearRecipes && recipesCount > 0 && (
              <button
                onClick={onClearRecipes}
                title="Clear All Saved Recipes"
                className="p-2 rounded-xl text-[#705335] hover:text-[#94442B] hover:bg-[#FBECE7] border border-[#D8C3B1] transition-all"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
