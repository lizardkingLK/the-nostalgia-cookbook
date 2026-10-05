import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { RecipeBox } from './components/RecipeBox';
import { RecipeCard } from './components/RecipeCard';
import { AudioRecorder } from './components/AudioRecorder';
import { PrivacyModal } from './components/PrivacyModal';
import { IRecipe } from './types/recipe';
import { BookOpen } from 'lucide-react';

export default function App() {
  // Empty initial recipes state - NO SEED DATA
  const [recipes, setRecipes] = useState<IRecipe[]>([]);
  const [activeTab, setActiveTab] = useState<'box' | 'record' | 'privacy'>('box');
  const [selectedRecipe, setSelectedRecipe] = useState<IRecipe | null>(null);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [userSession, setUserSession] = useState<{
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null>(null);

  // Fetch real user recipes from MongoDB / backend
  const fetchRecipes = useCallback(async (email?: string | null) => {
    try {
      const url = email ? `/api/recipes?email=${encodeURIComponent(email)}` : '/api/recipes';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setRecipes(data);
        }
      }
    } catch (err) {
      console.warn('Failed to load recipes from backend:', err);
    }
  }, []);

  // Check session and load recipes on mount
  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.user) {
          setUserSession(data.user);
          fetchRecipes(data.user.email);
        } else {
          fetchRecipes();
        }
      })
      .catch(() => {
        fetchRecipes();
      });
  }, [fetchRecipes]);

  // Handle session change from Google Sign In
  const handleSessionChange = (newSession: { name: string; email: string; image: string } | null) => {
    setUserSession(newSession);
    if (newSession?.email) {
      fetchRecipes(newSession.email);
    } else {
      fetchRecipes();
    }
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
      console.warn('Server delete notice:', err);
    }

    setRecipes((prev) => prev.filter((r) => r.id !== id));
    if (selectedRecipe?.id === id) {
      setSelectedRecipe(null);
    }
  };

  // Clear all recipes in this box
  const handleClearRecipes = async () => {
    if (!window.confirm('Clear all recipes from your recipe box?')) return;
    try {
      await fetch('/api/clear-recipes', { method: 'POST' });
    } catch {
      // Ignore
    }
    setRecipes([]);
    setSelectedRecipe(null);
    setActiveTab('box');
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
        onClearRecipes={handleClearRecipes}
        userSession={userSession}
        onSessionChange={handleSessionChange}
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
            <span className="text-[#607D68]">Open-Source Gemma &amp; Gemini Vault</span>
          </div>
          <p className="italic">
            Private oral family archivist. Authenticated with Google &amp; persisted to MongoDB Atlas.
          </p>
        </div>
      </footer>
    </div>
  );
}
