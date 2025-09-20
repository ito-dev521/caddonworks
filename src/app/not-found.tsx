import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
        <div className="flex items-center justify-center w-16 h-16 mx-auto bg-gray-100 rounded-full mb-4">
          <svg
            className="w-8 h-8 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">404</h1>
        <h2 className="text-lg font-semibold text-gray-700 mb-4">
          ページが見つかりません
        </h2>
        <p className="text-gray-600 mb-6">
          お探しのページは存在しないか、移動された可能性があります。
        </p>
        <Link
          href="/"
          className="inline-block bg-engineering-blue text-white px-6 py-2 rounded-lg hover:bg-engineering-blue/90 transition-colors"
        >
          ホームに戻る
        </Link>
      </div>
    </div>
  )
}











