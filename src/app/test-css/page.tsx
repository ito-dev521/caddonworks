export default function TestCSSPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">
          CSS テスト
        </h1>

        {/* Basic Tailwind Test */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold text-blue-600 mb-2">基本カラー</h2>
            <div className="space-y-2">
              <div className="w-full h-4 bg-blue-500 rounded"></div>
              <div className="w-full h-4 bg-green-500 rounded"></div>
              <div className="w-full h-4 bg-red-500 rounded"></div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold text-green-600 mb-2">エンジニアリングカラー</h2>
            <div className="space-y-2">
              <div className="w-full h-4 bg-engineering-blue rounded"></div>
              <div className="w-full h-4 bg-engineering-green rounded"></div>
              <div className="w-full h-4 bg-engineering-slate rounded"></div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold text-purple-600 mb-2">グラデーション</h2>
            <div className="space-y-2">
              <div className="w-full h-4 gradient-engineering rounded"></div>
              <div className="w-full h-4 bg-gradient-radial rounded"></div>
            </div>
          </div>
        </div>

        {/* Glass Effect Test */}
        <div className="mb-8">
          <div className="glass p-6 rounded-xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">ガラス効果テスト</h2>
            <p className="text-gray-700">
              このボックスはガラス効果（glass morphism）を使用しています。
              背景がぼかされ、透明感のあるデザインになっているはずです。
            </p>
          </div>
        </div>

        {/* Animation Test */}
        <div className="mb-8">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">アニメーション テスト</h2>
            <div className="space-y-4">
              <div className="w-16 h-16 bg-blue-500 rounded-full animate-pulse"></div>
              <div className="w-16 h-16 bg-green-500 rounded-full float"></div>
              <div className="w-16 h-16 bg-purple-500 rounded-full animate-spin"></div>
            </div>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">ステータスインジケーター</h2>
          <div className="flex flex-wrap gap-4">
            <div className="status-dot status-active"></div>
            <div className="status-dot status-pending"></div>
            <div className="status-dot status-inactive"></div>
          </div>
        </div>
      </div>
    </div>
  )
}