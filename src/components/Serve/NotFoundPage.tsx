import React from 'react'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center font-poppins">
      <h1
        className="mb-6 text-9xl font-extrabold"
        style={{
          background: 'linear-gradient(to right, #3F51B5, #FF4081, #00BFA5)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        404
      </h1>
      <p className="mb-4 text-2xl text-text">Oops! Page Not Found.</p>
      <p className="mb-10 max-w-md text-base text-text">
        The page you are looking for doesn’t exist or has been moved.
      </p>
      <button
        onClick={() => (window.location.href = '/')}
        className="animation-smoothPulse rounded-xl bg-primary px-8 py-3 font-semibold text-white shadow-btn transition duration-300 hover:bg-secondary"
      >
        Go Home
      </button>
    </div>
  )
}
