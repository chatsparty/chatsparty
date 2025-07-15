import React from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Checkbox } from '../../../components/ui/checkbox';
import { Card } from '../../../components/ui/card';
import { Separator } from '../../../components/ui/separator';
import { Badge } from '../../../components/ui/badge';

interface FilterOptions {
  category?: string;
  tags?: string[];
  minRating?: number;
  search?: string;
  sortBy?: 'popular' | 'rating' | 'newest' | 'name';
  sortOrder?: 'asc' | 'desc';
}

interface MarketplaceFiltersProps {
  filters: FilterOptions;
  categories: string[];
  onFilterChange: (filters: Partial<FilterOptions>) => void;
  search: string;
  onSearchChange: (search: string) => void;
}

export const MarketplaceFilters: React.FC<MarketplaceFiltersProps> = ({
  filters,
  categories,
  onFilterChange,
  search,
  onSearchChange,
}) => {
  const { t } = useTranslation();

  const handleCategoryChange = (category: string, checked: boolean) => {
    if (checked) {
      onFilterChange({ category });
    } else {
      onFilterChange({ category: undefined });
    }
  };

  const handleTagToggle = (tag: string) => {
    const currentTags = filters.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    
    onFilterChange({ tags: newTags });
  };

  const handleMinRatingChange = (rating: number) => {
    onFilterChange({ minRating: rating === filters.minRating ? undefined : rating });
  };

  const clearFilters = () => {
    onFilterChange({
      category: undefined,
      tags: [],
      minRating: undefined,
    });
    onSearchChange('');
  };

  const popularTags = [
    'brainstorming',
    'writing',
    'analysis',
    'creative',
    'business',
    'technical',
    'research',
    'strategy',
  ];

  const activeFiltersCount = 
    (filters.category ? 1 : 0) +
    (filters.tags?.length || 0) +
    (filters.minRating ? 1 : 0) +
    (search ? 1 : 0);

  return (
    <Card className="p-6 h-fit sticky top-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">{t('marketplace.filters')}</h3>
        {activeFiltersCount > 0 && (
          <div className="flex items-center space-x-2">
            <Badge variant="secondary">{activeFiltersCount}</Badge>
            <button
              onClick={clearFilters}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {t('marketplace.clearFilters')}
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="mb-6">
        <Label htmlFor="search" className="text-sm font-medium mb-2 block">
          {t('marketplace.search')}
        </Label>
        <Input
          id="search"
          placeholder={t('marketplace.searchPlaceholder')}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full"
        />
      </div>

      <Separator className="my-4" />

      {/* Categories */}
      <div className="mb-6">
        <Label className="text-sm font-medium mb-3 block">
          {t('marketplace.categories')}
        </Label>
        <div className="space-y-2">
          {categories.map((category) => (
            <div key={category} className="flex items-center space-x-2">
              <Checkbox
                id={category}
                checked={filters.category === category}
                onCheckedChange={(checked) => handleCategoryChange(category, checked as boolean)}
              />
              <Label htmlFor={category} className="text-sm capitalize cursor-pointer">
                {t(`marketplace.category.${category}`, category)}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Separator className="my-4" />

      {/* Tags */}
      <div className="mb-6">
        <Label className="text-sm font-medium mb-3 block">
          {t('marketplace.tags')}
        </Label>
        <div className="flex flex-wrap gap-2">
          {popularTags.map((tag) => (
            <Badge
              key={tag}
              variant={filters.tags?.includes(tag) ? 'default' : 'outline'}
              className="cursor-pointer hover:bg-accent"
              onClick={() => handleTagToggle(tag)}
            >
              {t(`marketplace.tag.${tag}`, tag)}
            </Badge>
          ))}
        </div>
      </div>

      <Separator className="my-4" />

      {/* Rating */}
      <div className="mb-6">
        <Label className="text-sm font-medium mb-3 block">
          {t('marketplace.minRating')}
        </Label>
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => (
            <div key={rating} className="flex items-center space-x-2">
              <Checkbox
                id={`rating-${rating}`}
                checked={filters.minRating === rating}
                onCheckedChange={() => handleMinRatingChange(rating)}
              />
              <Label htmlFor={`rating-${rating}`} className="text-sm cursor-pointer flex items-center">
                <div className="flex items-center space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`w-4 h-4 ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                  <span className="ml-2">{t('marketplace.andUp')}</span>
                </div>
              </Label>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};