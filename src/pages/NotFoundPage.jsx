import React from 'react';
import { Link, useRouteError } from 'react-router-dom';
import { FileSearch } from 'lucide-react';

export default function NotFoundPage() {
  const error = useRouteError();
  const is404 = !error || error.status === 404;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <FileSearch className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          {is404 ? '404' : 'Oops'}
        </h1>
        <p className="text-lg text-gray-600 mb-2">
          {is404 ? 'Page not found' : 'Something went wrong'}
        </p>
        <p className="text-sm text-gray-400 mb-8">
          {is404
            ? "The page you're looking for doesn't exist or has been moved."
            : 'An unexpected error occurred. Please try again.'}
        </p>
        <Link
          to="/"
          className="inline-flex items-center px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
