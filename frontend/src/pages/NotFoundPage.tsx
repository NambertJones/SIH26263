import React from 'react';
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export const NotFoundPage: React.FC = () => (
  <div className="py-16 text-center text-slate-600">
    <Compass className="w-8 h-8 mx-auto text-slate-400" aria-hidden="true" />
    <h1 className="mt-2 text-base font-bold text-slate-900">Page not found</h1>
    <p className="mt-1 text-xs">This address does not match any page.</p>
    <Link to="/dashboard" className="inline-block mt-4 text-xs font-semibold text-blue-700 hover:underline">
      Go to Overview
    </Link>
  </div>
);
