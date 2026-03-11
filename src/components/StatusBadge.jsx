import React from 'react';

const StatusBadge = ({ status }) => {
  const statusConfig = {
    // Client statuses
    'Active': {
      bg: 'bg-green-100',
      text: 'text-green-800',
      border: 'border-green-200',
    },
    'On Hold': {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      border: 'border-yellow-200',
    },
    'Completed': {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      border: 'border-blue-200',
    },
    'Cancelled': {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      border: 'border-gray-200',
    },
    // Payment statuses
    'Paid': {
      bg: 'bg-green-100',
      text: 'text-green-800',
      border: 'border-green-200',
    },
    'Partially Paid': {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      border: 'border-yellow-200',
    },
    'Pending': {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      border: 'border-gray-200',
    },
    'Overdue': {
      bg: 'bg-red-100',
      text: 'text-red-800',
      border: 'border-red-200',
    },
    // Maintenance statuses
    'Expired': {
      bg: 'bg-red-100',
      text: 'text-red-800',
      border: 'border-red-200',
    },
  };

  const config = statusConfig[status] || {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    border: 'border-gray-200',
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}
    >
      {status}
    </span>
  );
};

export default StatusBadge;
