import debounce from "lodash.debounce";
import axios from "axios";
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";

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
    if (text.length < 2) return;
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
    <div className="relative w-full">
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value); // keep parent in sync
        }}
        placeholder="Enter ticker or company name..."
      />
      {showDropdown && results.length > 0 && (
        <ul className="absolute z-50 dark:bg-black bg-white border shadow w-full mt-1 rounded-md max-h-60 overflow-y-auto">
          {results.map((r: any) => (
            <li
              key={r.symbol}
              onClick={() => handleSelect(r.symbol)}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
            >
              {r.shortname} ({r.symbol})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
