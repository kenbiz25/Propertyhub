
// src/pages/Unauthorized.tsx
export default function Unauthorized() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <h1 className="text-3xl font-bold mb-4">Unauthorized</h1>
      <p className="text-gray-600 mb-6">
        You do not have permission to access this page.
      </p>
      <a
        href="/"
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Go Back Home
      </a>
    </div>
  );
}
