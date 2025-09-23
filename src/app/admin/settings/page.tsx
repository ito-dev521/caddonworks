"use client"

import React, { useEffect, useState } from "react"
import { Navigation } from "@/components/layouts/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { AuthGuard } from "@/components/auth/auth-guard"

interface Settings {
  support_fee_percent: number
}

interface SystemSetting {
  id: number
  setting_key: string
  setting_value: string
  setting_type: string
  description: string
  is_public: boolean
  parsed_value: any
}

function AdminSettingsPageContent() {
  const [percent, setPercent] = useState<number>(8)

  // システム設定用
  const [systemSettings, setSystemSettings] = useState<SystemSetting[]>([])
  const [systemFee, setSystemFee] = useState<number>(50000)
  const [platformName, setPlatformName] = useState<string>('CADDON')
  const [supportEmail, setSupportEmail] = useState<string>('support@caddon.jp')
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false)
  const [systemLoading, setSystemLoading] = useState(false)
  const [systemMessage, setSystemMessage] = useState<string | null>(null)

  const fetchSettings = async () => {
    try {
      // システム設定からサポート手数料を取得
      const response = await fetch('/api/admin/system-settings')
      const data = await response.json()
      if (response.ok) {
        // サポート手数料の設定を探す
        const supportFeeSetting = data.settings.find((s: SystemSetting) => s.setting_key === 'support_fee_percent')
        if (supportFeeSetting) {
          setPercent(supportFeeSetting.parsed_value)
        }
      }
    } catch (e) {
      // エラーの場合はデフォルト値を使用
    }
  }

  const fetchSystemSettings = async () => {
    try {
      const response = await fetch('/api/admin/system-settings')
      const data = await response.json()
      if (response.ok) {
        setSystemSettings(data.settings)
        // 各設定値を個別のstateに設定
        const systemFeeSetting = data.settings.find((s: SystemSetting) => s.setting_key === 'default_system_fee')
        if (systemFeeSetting) {
          setSystemFee(systemFeeSetting.parsed_value)
        }

        const platformNameSetting = data.settings.find((s: SystemSetting) => s.setting_key === 'platform_name')
        if (platformNameSetting) {
          setPlatformName(platformNameSetting.parsed_value)
        }

        const supportEmailSetting = data.settings.find((s: SystemSetting) => s.setting_key === 'support_email')
        if (supportEmailSetting) {
          setSupportEmail(supportEmailSetting.parsed_value)
        }

        const maintenanceModeSetting = data.settings.find((s: SystemSetting) => s.setting_key === 'maintenance_mode')
        if (maintenanceModeSetting) {
          setMaintenanceMode(maintenanceModeSetting.parsed_value)
        }
      } else {
        setSystemMessage(data.message || 'システム設定の取得に失敗しました')
      }
    } catch (error) {
      setSystemMessage('システム設定の取得中にエラーが発生しました')
    }
  }

  useEffect(() => {
    fetchSettings()
    fetchSystemSettings()
  }, [])


  const saveSystemSetting = async (key: string, value: any, type: string, description: string, isPublic: boolean = true) => {
    try {
      setSystemLoading(true)
      setSystemMessage(null)
      const response = await fetch('/api/admin/system-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setting_key: key,
          setting_value: value,
          setting_type: type,
          description: description,
          is_public: isPublic
        })
      })
      const data = await response.json()
      if (response.ok) {
        setSystemMessage(`${description}を保存しました`)
        await fetchSystemSettings() // 設定を再取得
      } else {
        setSystemMessage(data.message || `${description}の保存に失敗しました`)
      }
    } catch (error) {
      setSystemMessage(`${description}の保存中にエラーが発生しました`)
    } finally {
      setSystemLoading(false)
    }
  }

  const saveSystemFee = () => saveSystemSetting('default_system_fee', systemFee, 'number', 'デフォルトシステム利用料（円）')
  const savePlatformName = () => saveSystemSetting('platform_name', platformName, 'string', 'プラットフォーム名')
  const saveSupportEmail = () => saveSystemSetting('support_email', supportEmail, 'string', 'サポートメールアドレス')
  const saveSupportFeePercent = () => saveSystemSetting('support_fee_percent', percent, 'number', 'サポート手数料（％）')
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="flex-1 ml-0 lg:ml-64 transition-all duration-200">
        <div className="px-4 py-8 max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">システム設定</h1>

          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {/* サポート手数料設定 */}
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">サポート手数料</h2>
            <label className="block text-sm font-medium text-gray-700 mb-2">サポート手数料（％）</label>
            <input
              type="number"
              min={0}
              max={100}
              value={percent}
              onChange={(e) => setPercent(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
            />
            <div className="mt-4">
              <Button onClick={saveSupportFeePercent} variant="engineering" disabled={systemLoading}>
                {systemLoading ? '保存中...' : '保存'}
              </Button>
            </div>
            {systemMessage && <p className="mt-3 text-sm text-gray-600">{systemMessage}</p>}
          </div>

          {/* システム利用料設定 */}
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">システム利用料</h2>
            <label className="block text-sm font-medium text-gray-700 mb-2">デフォルトシステム利用料（円）</label>
            <input
              type="text"
              value={systemFee.toLocaleString()}
              onChange={(e) => {
                const value = e.target.value.replace(/,/g, '')
                if (!isNaN(Number(value))) {
                  setSystemFee(Number(value))
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <p className="text-sm text-gray-500 mt-2">
              組織登録時に表示されるデフォルトのシステム利用料金です。
            </p>
            <div className="mt-4">
              <Button onClick={saveSystemFee} variant="engineering" disabled={systemLoading}>
                {systemLoading ? '保存中...' : '保存'}
              </Button>
            </div>
            {systemMessage && <p className="mt-3 text-sm text-gray-600">{systemMessage}</p>}
          </div>

          {/* プラットフォーム名設定 */}
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">プラットフォーム名</h2>
            <label className="block text-sm font-medium text-gray-700 mb-2">プラットフォーム名</label>
            <input
              type="text"
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-2">
              システム全体で表示されるプラットフォーム名です。
            </p>
            <div className="mt-4">
              <Button onClick={savePlatformName} variant="engineering" disabled={systemLoading}>
                {systemLoading ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>

          {/* サポートメール設定 */}
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">サポートメールアドレス</h2>
            <label className="block text-sm font-medium text-gray-700 mb-2">サポートメールアドレス</label>
            <input
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-2">
              ユーザーからの問い合わせ先として表示されるメールアドレスです。
            </p>
            <div className="mt-4">
              <Button onClick={saveSupportEmail} variant="engineering" disabled={systemLoading}>
                {systemLoading ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>

          {/* メンテナンスモード設定 */}
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">メンテナンスモード</h2>
            <p className="text-sm text-gray-500 mb-4">
              有効にすると、システムメンテナンス中の表示になります。
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setMaintenanceMode(true)
                  saveSystemSetting('maintenance_mode', true, 'boolean', 'メンテナンスモード', false)
                }}
                disabled={systemLoading}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  maintenanceMode
                    ? 'bg-red-100 text-red-700 border border-red-200'
                    : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-red-50 hover:text-red-600'
                } ${systemLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className="mr-2">▶</span>
                有効化
              </button>
              <button
                onClick={() => {
                  setMaintenanceMode(false)
                  saveSystemSetting('maintenance_mode', false, 'boolean', 'メンテナンスモード', false)
                }}
                disabled={systemLoading}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  !maintenanceMode
                    ? 'bg-green-100 text-green-700 border border-green-200'
                    : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-green-50 hover:text-green-600'
                } ${systemLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className="mr-2">■</span>
                無効化
              </button>
            </div>
            {systemMessage && <p className="mt-3 text-sm text-gray-600">{systemMessage}</p>}
          </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminSettingsPage() {
  return (
    <AuthGuard allowedRoles={['Admin', 'OrgAdmin']}>
      <AdminSettingsPageContent />
    </AuthGuard>
  )
}
