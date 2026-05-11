import { Search, MapPin, Coins, Filter } from 'lucide-react';
import { SearchFilters } from '../types';

interface FiltersProps {
  filters: SearchFilters;
  setFilters: (filters: SearchFilters) => void;
}

export default function Filters({ filters, setFilters }: FiltersProps) {
  return (
    <div className="space-y-6">
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5 group-focus-within:text-sky-500 transition-colors" />
        <input 
          type="text" 
          placeholder="Search by neighborhood..." 
          className="w-full pl-12 pr-4 py-4 input-field text-lg"
          value={filters.location}
          onChange={(e) => setFilters({ ...filters, location: e.target.value })}
          id="search-input"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-neutral-500 px-1 flex items-center gap-1">
            <Coins className="w-3 h-3" /> Min Price (R)
          </label>
          <input 
            type="number" 
            placeholder="Min" 
            className="w-full input-field py-3"
            value={filters.minPrice || ''}
            onChange={(e) => setFilters({ ...filters, minPrice: Number(e.target.value) })}
            id="min-price-input"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-neutral-500 px-1 flex items-center gap-1">
            <Coins className="w-3 h-3" /> Max Price (R)
          </label>
          <input 
            type="number" 
            placeholder="Max" 
            className="w-full input-field py-3"
            value={filters.maxPrice || ''}
            onChange={(e) => setFilters({ ...filters, maxPrice: Number(e.target.value) })}
            id="max-price-input"
          />
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-neutral-100 rounded-2xl">
        {(['all', 'rental'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilters({ ...filters, type })}
            className={`flex-1 py-3 px-4 rounded-xl font-medium capitalize transition-all
              ${filters.type === type 
                ? 'bg-white text-sky-600 shadow-sm' 
                : 'text-neutral-500 hover:text-neutral-700'
              }`}
            id={`filter-type-${type}`}
          >
            {type}
          </button>
        ))}
      </div>
    </div>
  );
}
