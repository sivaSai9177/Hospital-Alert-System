import React from 'react';

interface LoadingProps {
  message?: string;
  type?: 'spinner' | 'skeleton';
  skeletonRows?: number;
}

function Loading({ message = 'Loading...', type = 'spinner', skeletonRows = 3 }: LoadingProps) {
  if (type === 'skeleton') {
    return (
      <div className="loading-skeleton">
        {Array.from({ length: skeletonRows }).map((_, index) => (
          <div key={index} className="skeleton-row">
            <div className="skeleton-line skeleton-title" />
            <div className="skeleton-line skeleton-text" />
            <div className="skeleton-line skeleton-text skeleton-short" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="loading-overlay">
      <div className="spinner" />
      <p>{message}</p>
    </div>
  );
}

export default Loading;