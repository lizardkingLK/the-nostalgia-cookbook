import React, { useState, useMemo } from 'react';
import {
  Search,
  Clock,
  ChefHat,
  Heart,
  Users,
  Filter,
  Sparkles,
  BookOpen,
  Calendar,
  UserCheck,
  Printer,
  Trash2,
  Plus
} from 'lucide-react';
import { IRecipe } from '../types/recipe';

interface RecipeBoxProps {
  recipes: IRecipe[];
  onSelectRecipe: (recipe: IRecipe) => void;
  onAddNewClick: () => void;
  onDeleteRecipe: (id: string, e: React.MouseEvent) => void;
}

const CATEGORIES = [
  'All Heirlooms',
  'Sunday Dinners',
  'Baking & Breads',
  'Soups & Stews',
  'Holiday Traditions',
  'Desserts & Sweets',
  'Preserves & Relishes',
] as const;

export const RecipeBox: React.FC<RecipeBoxProps> = ({
  recipes,
  onSelectRecipe,
  onAddNewClick,
  onDeleteRecipe,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All Heirlooms');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFamilyMember, setSelectedFamilyMember] = useState<string>('all');

  // Gather unique family members mentioned across recipes
  const allFamilyMembers = useMemo(() => {
    const set = new Set<string>();
    recipes.forEach((r) => {
      r.nostalgia?.familyMembersMentioned?.forEach((member) => {
        if (member && member.trim()) set.add(member.trim());
      });
    });
    return Array.from(set).sort();
  }, [recipes]);

  // Filter recipes based on category, search, and family member
  const filteredRecipes = useMemo(() => {
    return recipes.filter((r) => {
      // Category filter
      if (selectedCategory !== 'All Heirlooms' && r.category !== selectedCategory) {
        return false;
      }

      // Family member filter
      if (
        selectedFamilyMember !== 'all' &&
        !r.nostalgia?.familyMembersMentioned?.some((m) =>
          m.toLowerCase().includes(selectedFamilyMember.toLowerCase())
        )
      ) {
        return false;
      }

      // Search query filter (title, ingredients, summary, anecdotes, era)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = r.title.toLowerCase().includes(query);
        const matchesSummary = r.nostalgia?.summary?.toLowerCase().includes(query);
        const matchesContext = r.nostalgia?.historicalContext?.toLowerCase().includes(query);
        const matchesIngredients = r.ingredients.some((ing) =>
          ing.item.toLowerCase().includes(query)
        );
        const matchesFamily = r.nostalgia?.familyMembersMentioned?.some((m) =>
          m.toLowerCase().includes(query)
        );

        if (!matchesTitle && !matchesSummary && !matchesContext && !matchesIngredients && !matchesFamily) {
          return false;
        }
      }

      return true;
    });
  }, [recipes, selectedCategory, selectedFamilyMember, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero / Wooden Box Top */}
      <div className="bg-[#4A3525] text-[#FAF7F0] rounded-3xl p-8 sm:p-12 shadow-wooden-box border-4 border-[#705335] relative overflow-hidden">
        {/* Wood grain decorative lines */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#FAF7F0_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-[#705335] pb-8">
          <div>
            <div className="flex items-center gap-2 text-[#E8A692] text-xs font-serif font-bold uppercase tracking-widest mb-2">
              <Sparkles className="w-4 h-4" />
              <span>Grandma&apos;s Wooden Recipe Chest</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-display font-bold text-[#FDFCF7]">
              The Heirloom Recipe Box
            </h1>
            <p className="mt-2 text-sm sm:text-base text-[#D8C3B1] max-w-xl font-serif italic">
              Every card holds a family voice, an era of history, and precise cooking formulas isolated by Gemma.
            </p>
          </div>

          <button
            onClick={onAddNewClick}
            className="flex items-center gap-2.5 px-6 py-3.5 bg-[#C86446] hover:bg-[#94442B] text-white font-serif rounded-2xl font-bold text-sm shadow-md transition-all hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            <span>Add New Family Story</span>
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-8 relative">
            <Search className="w-5 h-5 text-[#D8C3B1] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by recipe name, ingredient, 1974 blizzard, nonna, cinnamon..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-[#2C1D11]/60 border border-[#705335] rounded-2xl text-sm text-[#FDFCF7] placeholder-[#D8C3B1]/60 focus:outline-none focus:border-[#E8A692]"
            />
          </div>

          <div className="md:col-span-4 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#E8A692] flex-shrink-0" />
            <select
              value={selectedFamilyMember}
              onChange={(e) => setSelectedFamilyMember(e.target.value)}
              className="w-full py-3 px-3.5 bg-[#2C1D11]/60 border border-[#705335] rounded-2xl text-xs sm:text-sm text-[#FDFCF7] focus:outline-none focus:border-[#E8A692]"
            >
              <option value="all" className="bg-[#2C1D11]">All Storytellers</option>
              {allFamilyMembers.map((member) => (
                <option key={member} value={member} className="bg-[#2C1D11]">
                  Storyteller: {member}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Wooden Index Divider Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2.5 rounded-t-xl font-serif text-xs sm:text-sm font-semibold transition-all whitespace-nowrap border-t-2 border-x-2 ${
                isSelected
                  ? 'bg-[#FAF7F0] text-[#94442B] border-[#D8C3B1] shadow-sm -mb-0.5 z-10 font-bold'
                  : 'bg-[#E8DEC0]/80 text-[#705335] border-transparent hover:bg-[#FAF7F0]/60'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Recipe Cards Grid */}
      {filteredRecipes.length === 0 ? (
        <div className="text-center py-16 bg-[#FAF7F0] border-2 border-dashed border-[#D8C3B1] rounded-3xl p-8">
          <BookOpen className="w-12 h-12 text-[#D8C3B1] mx-auto mb-3" />
          <h3 className="font-display font-bold text-xl text-[#2C1D11]">No Heirlooms Found</h3>
          <p className="text-sm font-serif text-[#705335] mt-1 max-w-md mx-auto italic">
            No recipes matched your search or filters. Try adjusting keywords or record your first family audio memory above.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All Heirlooms');
              setSelectedFamilyMember('all');
            }}
            className="mt-4 px-4 py-2 bg-[#F3EED9] text-[#4A3525] rounded-xl text-xs font-serif font-bold hover:bg-[#E8DEC0]"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe) => (
            <div
              key={recipe.id}
              onClick={() => onSelectRecipe(recipe)}
              className="group bg-[#FAF7F0] border-2 border-[#D8C3B1] hover:border-[#94442B] rounded-2xl p-6 shadow-recipe-card transition-all duration-200 hover:-translate-y-1.5 cursor-pointer flex flex-col justify-between relative overflow-hidden"
            >
              {/* Top Index Card Header with Category & Era */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-serif mb-3">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#FBECE7] text-[#94442B] border border-[#E8A692] font-semibold">
                    {recipe.category}
                  </span>
                  {recipe.nostalgia?.historicalContext && (
                    <span className="text-[#705335] font-medium flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span className="truncate max-w-[130px]">{recipe.nostalgia.historicalContext}</span>
                    </span>
                  )}
                </div>

                <h3 className="font-display font-bold text-xl sm:text-2xl text-[#2C1D11] group-hover:text-[#94442B] transition-colors leading-snug">
                  {recipe.title}
                </h3>

                {/* Family Lore Teaser */}
                {recipe.nostalgia?.summary && (
                  <p className="text-xs font-serif text-[#705335] mt-3 line-clamp-3 italic leading-relaxed bg-[#FDFCF7] p-3 rounded-xl border border-[#D8C3B1]/60">
                    &ldquo;{recipe.nostalgia.summary}&rdquo;
                  </p>
                )}

                {/* Family Members Tagged */}
                {recipe.nostalgia?.familyMembersMentioned && recipe.nostalgia.familyMembersMentioned.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {recipe.nostalgia.familyMembersMentioned.slice(0, 3).map((member, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md text-[10px] font-serif bg-[#E7ECE8] text-[#3F5645] border border-[#ADC2B2]"
                      >
                        {member}
                      </span>
                    ))}
                    {recipe.nostalgia.familyMembersMentioned.length > 3 && (
                      <span className="text-[10px] text-[#705335] font-serif self-center">
                        +{recipe.nostalgia.familyMembersMentioned.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Quick Stats & Actions */}
              <div className="border-t border-[#D8C3B1] pt-4 mt-6">
                <div className="flex items-center justify-between text-xs text-[#705335] font-serif mb-3">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#C86446]" />
                    <span>Cook: {recipe.cookTime}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ChefHat className="w-3.5 h-3.5 text-[#607D68]" />
                    <span>{recipe.ingredients.length} items</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#705335]" />
                    <span>{recipe.servings}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs font-serif font-bold text-[#94442B] group-hover:underline flex items-center gap-1">
                    Open Card &amp; Story &rarr;
                  </span>

                  <button
                    onClick={(e) => onDeleteRecipe(recipe.id, e)}
                    title="Remove from Recipe Box"
                    className="p-1.5 text-[#D8C3B1] hover:text-[#94442B] rounded-lg hover:bg-[#FBECE7] transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
