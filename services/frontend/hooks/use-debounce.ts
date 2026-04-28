import { useState, useEffect } from "react";

export function useDebounce<T>(value: T): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setDebouncedValue(value);
    });

    return () => cancelAnimationFrame(id);
  }, [value]);

  return debouncedValue;
}
