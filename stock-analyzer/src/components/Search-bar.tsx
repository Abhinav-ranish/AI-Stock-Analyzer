import debounce from "lodash.debounce";
import axios from "axios";
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function TickerSearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (ticker: string) => void;
}) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const skipNextSearch = useRef(false);

  const search = debounce(async (text: string) => {
    if (text.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    try {
      const res = await axios.get(`/api/search?q=${encodeURIComponent(text)}`);
      setResults(res.data.quotes || []);
      setShowDropdown(true);
    } catch (err) {
      console.error("Error fetching ticker suggestions", err);
    }
  }, 300);

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }

    search(query);
    return () => search.cancel();
  }, [query]);

  const handleSelect = (symbol: string) => {
    skipNextSearch.current = true;
    onChange(symbol);
    setQuery(symbol);
    setShowDropdown(false);
  };

  return (
    <div className="relative w-full group">
      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
        <Search className="w-5 h-5" />
      </div>
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
        }}
        onFocus={() => {
          if (results.length > 0) setShowDropdown(true);
        }}
        onBlur={() => {
          // Delay blur to allow clicks to register on dropdown items
          setTimeout(() => setShowDropdown(false), 200);
        }}
        className="pl-10 h-14 text-lg bg-background/50 backdrop-blur-md border-border/50 focus-visible:ring-primary/50 shadow-sm rounded-xl transition-all"
        placeholder="Search ticker or company name..."
      />
      
      {showDropdown && results.length > 0 && (
        <ul className="absolute z-50 bg-background/80 backdrop-blur-xl border border-border/50 shadow-2xl w-full mt-2 rounded-xl max-h-72 overflow-y-auto">
          {results.map((r: any) => (
            <li
              key={r.symbol}
              onClick={() => handleSelect(r.symbol)}
              className="px-4 py-3 hover:bg-primary/10 transition-colors cursor-pointer flex justify-between items-center"
            >
              <span className="font-semibold">{r.symbol}</span>
              <span className="text-sm text-muted-foreground truncate ml-4">{r.shortname}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
