export default function TestSimplePage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          簡単CSSテスト
        </h1>

        {/* 基本的なTailwindクラス */}
        <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
          <h2 className="text-2xl font-semibold text-blue-600 mb-4">
            基本Tailwindクラス
          </h2>
          <div className="space-y-2">
            <div className="w-full h-4 bg-blue-500 rounded"></div>
            <div className="w-full h-4 bg-green-500 rounded"></div>
            <div className="w-full h-4 bg-red-500 rounded"></div>
          </div>
        </div>

        {/* カスタムエンジニアリングクラス */}
        <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
          <h2 className="text-2xl font-semibold text-engineering-blue mb-4">
            カスタムエンジニアリングクラス
          </h2>
          <div className="space-y-2">
            <div className="w-full h-4 bg-engineering-blue rounded"></div>
            <div className="w-full h-4 bg-engineering-green rounded"></div>
            <div className="w-full h-4 bg-engineering-slate rounded"></div>
          </div>
        </div>

        {/* ボタンテスト */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            ボタンテスト
          </h2>
          <div className="space-y-4">
            <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              標準ボタン
            </button>
            <br />
            <button className="bg-engineering-blue hover:bg-engineering-blue-dark text-white font-bold py-2 px-4 rounded">
              エンジニアリングボタン
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}