import { useState, useRef, useEffect } from 'react';
import { Search, Plus } from 'lucide-react';

interface Option {
  id: string;
  name: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (id: string) => void;
  options: Option[];
  placeholder: string;
  onAddSpecial?: (query: string) => void;
  addLabel?: string;
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  onAddSpecial,
  addLabel
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.id === value);
  const filtered = options.filter(o => 
    o.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
    setQuery('');
  };

  const toggleDropdown = () => {
    if (!isOpen && selectedOption) {
      setQuery(selectedOption.name);
    }
    setIsOpen(!isOpen);
  };

  const exactMatch = options.find(o => o.name.toLowerCase() === query.trim().toLowerCase());

  return (
    <div className="relative" ref={wrapperRef}>
      <div 
        className="flex items-center gap-2 px-3 py-2 rounded border border-gray-200 bg-white cursor-pointer focus-within:ring-2 focus-within:ring-blue-900"
        onClick={toggleDropdown}
      >
        <Search className="w-4 h-4 text-gray-400" />
        <input
          className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-gray-400"
          value={isOpen ? query : (selectedOption?.name || "")}
          onClick={(e) => e.stopPropagation()}
          onFocus={() => {
            if (!isOpen && selectedOption) {
              setQuery(selectedOption.name);
            }
            setIsOpen(true);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          placeholder={placeholder}
          autoComplete="off"
        />
      </div>

      {isOpen && (
        <div className="absolute z-[60] w-full mt-1 bg-white border border-gray-200 rounded-md shadow-xl max-h-60 overflow-y-auto">
          {filtered.length > 0 ? (
            filtered.map(opt => (
              <div
                key={opt.id}
                className={`px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm ${
                  opt.id === value ? 'bg-blue-50 text-blue-900 font-medium' : 'text-gray-700'
                }`}
                onClick={() => handleSelect(opt.id)}
              >
                {opt.name}
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500 italic">No results found.</div>
          )}

          {onAddSpecial && query.trim() !== '' && !exactMatch && (
            <div
              className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 cursor-pointer text-sm font-semibold border-t border-blue-100 flex items-center gap-2 sticky bottom-0"
              onClick={() => {
                onAddSpecial(query);
                setIsOpen(false);
              }}
            >
              <Plus className="w-4 h-4" /> {addLabel || 'Add'} "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
