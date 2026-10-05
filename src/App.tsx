import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { RecipeBox } from './components/RecipeBox';
import { RecipeCard } from './components/RecipeCard';
import { AudioRecorder } from './components/AudioRecorder';
import { PrivacyModal } from './components/PrivacyModal';
import { IRecipe } from './types/recipe';
import { INITIAL_RECIPES } from './data/sampleRecipes';
import { BookOpen, Sparkles, Heart } from 'lucide-react';

export default function App() {
  const [recipes, setRecipes] = useState<IRecipe[]>(INITIAL_RECIPES);
  const [activeTab, setActiveTab] = useState<'box' | 'record' | 'privacy'>('box');
  const [selectedRecipe, setSelectedRecipe] = useState<IRecipe | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [userSession, setUserSession] = useState<{
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null>(null);

  // Load recipes and check session on mount
  useEffect(() => {
    fetch('/api/recipes')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Failed to load recipes');
      })
      .then((data: IRecipe[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setRecipes(data);
        }
      })
      .catch((err) => {
        console.warn('Using client-side sample recipes fallback:', err);
      });

    // Check for active NextAuth session
    fetch('/api/auth/session')
      .then((res) => (res.ok ? res.json() : null))
      .then((session) => {
        if (session && session.user) {
          setUserSession(session.user);
        }
      })
      .catch(() => {
        // Fallback for development/preview
      });
  }, []);

  const handleSignIn = () => {
    // Demonstration/Preview sign in if NextAuth server is not connected to live Google credentials
    setUserSession({
      name: 'Eleanor Vance',
      email: 'eleanor.vance@familyarchive.com',
      image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    });
  };

  const handleSignOut = () => {
    setUserSession(null);
  };

  // Handler when a recipe is synthesized
  const handleRecipeCreated = (newRecipe: IRecipe) => {
    setRecipes((prev) => [newRecipe, ...prev.filter((r) => r.id !== newRecipe.id)]);
    setSelectedRecipe(newRecipe);
    setActiveTab('box');
  };

  // Delete recipe handler
  const handleDeleteRecipe = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to remove this family recipe card?')) {
      return;
    }

    try {
      await fetch(`/api/recipes/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Server delete note:', err);
    }

    setRecipes((prev) => prev.filter((r) => r.id !== id));
    if (selectedRecipe?.id === id) {
      setSelectedRecipe(null);
    }
  };

  // Reset to default sample heirlooms
  const handleResetSamples = async () => {
    if (!window.confirm('Restore initial sample family recipes?')) return;
    try {
      setIsResetting(true);
      const res = await fetch('/api/reset-samples', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.recipes) setRecipes(data.recipes);
      } else {
        setRecipes(INITIAL_RECIPES);
      }
    } catch {
      setRecipes(INITIAL_RECIPES);
    } finally {
      setIsResetting(false);
      setSelectedRecipe(null);
      setActiveTab('box');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-[#FBECE7] selection:text-[#94442B]">
      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'privacy') {
            setShowPrivacyModal(true);
          } else {
            setActiveTab(tab);
            if (tab === 'box') {
              setSelectedRecipe(null);
            }
          }
        }}
        recipesCount={recipes.length}
        onResetSamples={handleResetSamples}
        isResetting={isResetting}
        userSession={userSession}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      />

      {/* Main View Router */}
      <main className="flex-grow pb-16">
        {selectedRecipe ? (
          <RecipeCard
            recipe={selectedRecipe}
            onBack={() => setSelectedRecipe(null)}
          />
        ) : activeTab === 'record' ? (
          <div className="py-10 px-4">
            <AudioRecorder onRecipeCreated={handleRecipeCreated} />
          </div>
        ) : (
          <RecipeBox
            recipes={recipes}
            onSelectRecipe={(recipe) => setSelectedRecipe(recipe)}
            onAddNewClick={() => setActiveTab('record')}
            onDeleteRecipe={handleDeleteRecipe}
          />
        )}
      </main>

      {/* Privacy & Architecture Modal */}
      {showPrivacyModal && (
        <PrivacyModal onClose={() => setShowPrivacyModal(false)} />
      )}

      {/* Footer */}
      <footer className="no-print bg-[#FAF7F0] border-t border-[#D8C3B1] py-8 text-center text-xs text-[#705335] font-serif">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <div className="flex items-center justify-center gap-2 font-bold text-[#4A3525]">
            <BookOpen className="w-4 h-4 text-[#94442B]" />
            <span>The Nostalgia Cookbook</span>
            <span className="text-[#D8C3B1]">&bull;</span>
            <span className="text-[#607D68]">Hacktoberfest Edition</span>
          </div>
          <p className="italic">
            Building for family members using Open-Source AI principles. Multimodal audio ingestion powered by Gemini; private culinary restorer powered by Gemma.
          </p>
        </div>
      </footer>
    </div>
  );
}
