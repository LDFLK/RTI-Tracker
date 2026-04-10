import React from 'react';

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 text-sm font-medium rounded border transition-colors ${
        active
          ? 'bg-blue-50 text-blue-900 border-blue-200 border-l-4 border-l-blue-900'
          : 'text-gray-700 border-transparent hover:bg-gray-50 hover:border-gray-200'
      }`}
    >
      {children}
    </button>
  );
}
