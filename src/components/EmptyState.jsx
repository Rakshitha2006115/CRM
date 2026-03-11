import React from 'react';

const EmptyState = ({ message = 'No data available', icon: Icon }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {Icon ? (
        <Icon className="w-16 h-16 text-gray-400 mb-4" />
      ) : (
        <svg
          className="w-16 h-16 text-gray-400 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      )}
      <p className="text-gray-500 text-lg font-medium">{message}</p>
      <p className="text-gray-400 text-sm mt-2">Get started by adding your first item</p>
    </div>
  );
};

export default EmptyState;
