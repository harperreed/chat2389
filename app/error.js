'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({ error, reset }) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Unhandled error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-lg w-full text-center">
        <h1 className="text-3xl font-bold text-red-600 mb-4">Something went wrong!</h1>
        
        <div className="mb-6 text-gray-700">
          <p>We're sorry, but there was an error with your request.</p>
          <p className="mt-2 text-sm text-gray-500">Error details: {error?.message || 'Unknown error'}</p>
        </div>
        
        <div className="flex flex-col gap-4">
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Try again
          </button>
          
          <Link
            href="/"
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
          >
            Go back to home
          </Link>
        </div>
      </div>
    </div>
  );
}