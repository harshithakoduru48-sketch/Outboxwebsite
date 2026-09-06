import React from 'react';
import { Search, RotateCw, Database, Sparkles } from 'lucide-react';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  onRefresh: () => void;
  isSearching: boolean;
  searchSource: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onRefresh,
  isSearching,
  searchSource,
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-center justify-between mb-6 bg-[#0f1424]/60 p-3 rounded-xl border border-slate-800/80">
      {/* Search Input */}
      <div className="relative w-full sm:max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search recipient, subject, or content (Elasticsearch)..."
          className="w-full pl-9 pr-24 py-2 text-xs bg-[#0c101d] border border-slate-700/80 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
        />
        {searchSource && (
          <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
              {searchSource === 'elasticsearch' ? (
                <>
                  <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                  <span>ES</span>
                </>
              ) : (
                <>
                  <Database className="w-2.5 h-2.5 text-slate-400" />
                  <span>DB</span>
                </>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Filter & Refresh Controls */}
      <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="px-3 py-2 text-xs bg-[#0c101d] border border-slate-700/80 rounded-lg text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="PROCESSING">Processing</option>
          <option value="SENT">Sent</option>
          <option value="RATE_LIMITED">Rate Limited</option>
          <option value="FAILED">Failed</option>
        </select>

        <button
          onClick={onRefresh}
          disabled={isSearching}
          className="p-2 text-slate-400 hover:text-white bg-[#0c101d] hover:bg-slate-800 border border-slate-700/80 rounded-lg transition-all active:scale-95 disabled:opacity-50"
          title="Refresh Data"
        >
          <RotateCw className={`w-4 h-4 ${isSearching ? 'animate-spin text-indigo-400' : ''}`} />
        </button>
      </div>
    </div>
  );
};
