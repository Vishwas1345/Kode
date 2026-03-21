"use client";

import { useEffect } from "react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const ErrorPage = ({ error, reset }: ErrorPageProps) => {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0A0A] text-white gap-6 p-8">
      <div className="flex flex-col items-center gap-4 max-w-md text-center">
        <h1 className="text-2xl font-bold text-red-400">Something went wrong</h1>
        <p className="text-[#A0A0A0] text-sm">
          An unexpected error occurred. Please try again or go back to the dashboard.
        </p>
      </div>
      <div className="flex gap-4">
        <button
          onClick={reset}
          className="px-6 py-2 bg-[#00FF88] text-black font-semibold rounded-lg hover:bg-[#00CC6A] transition-colors"
        >
          Try again
        </button>
        <a
          href="/"
          className="px-6 py-2 border border-[#1F1F1F] text-[#A0A0A0] rounded-lg hover:text-white hover:border-[#333] transition-colors"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  );
};

export default ErrorPage;
