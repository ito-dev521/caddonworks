"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  Shield,
  UserCheck,
  Lock,
  Eye,
  Download,
  Edit,
  Share2,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  Settings,
  Calendar,
  Key
} from "lucide-react"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { Switch } from "../ui/switch"

interface AccessControlModalProps {
  fileId: string
  onClose: () => void
}

export function AccessControlModal({ fileId, onClose }: AccessControlModalProps) {
  const [selectedTab, setSelectedTab] = useState<'permissions' | 'history' | 'settings'>('permissions')

  // Mock data - in reality this would be fetched based on fileId
  const fileData = {
    id: fileId,
    name: "道路設計図面_Rev3.dwg",
    project: "東京都道路設計業務",
    owner: "田中太郎",
    permissions: {
      view: { enabled: true, users: ["田中太郎", "佐藤花子", "山田次郎", "監督員"] },
      download: { enabled: true, users: ["田中太郎", "佐藤花子"] },
      edit: { enabled: true, users: ["田中太郎"] },
      share: { enabled: false, users: [] }
    },
    settings: {
      requireApprovalForDownload: true,
      watermarkEnabled: true,
      expirationDate: "2024-06-30",
      ipRestrictions: ["192.168.1.0/24", "10.0.0.0/8"],
      maxDownloads: 50,
      currentDownloads: 12
    }
  }

  const accessHistory = [
    {
      id: "1",
      user: "田中太郎",
      action: "downloaded",
      timestamp: "2024-01-18T14:15:00Z",
      ip: "192.168.1.100",
      approved: true,
      approver: null
    },
    {
      id: "2",
      user: "佐藤花子",
      action: "viewed",
      timestamp: "2024-01-18T11:30:00Z",
      ip: "192.168.1.101",
      approved: true,
      approver: null
    },
    {
      id: "3",
      user: "山田次郎",
      action: "download_requested",
      timestamp: "2024-01-18T09:20:00Z",
      ip: "192.168.1.102",
      approved: false,
      approver: null
    },
    {
      id: "4",
      user: "外部協力者A",
      action: "access_denied",
      timestamp: "2024-01-17T16:45:00Z",
      ip: "203.104.1.50",
      approved: false,
      approver: null
    }
  ]

  const allUsers = [
    { id: "1", name: "田中太郎", role: "プロジェクトマネージャー", department: "設計部", status: "active" },
    { id: "2", name: "佐藤花子", role: "設計エンジニア", department: "設計部", status: "active" },
    { id: "3", name: "山田次郎", role: "CADオペレータ", department: "設計部", status: "active" },
    { id: "4", name: "監督員", role: "品質管理者", department: "品質管理部", status: "active" },
    { id: "5", name: "中村健太", role: "設計エンジニア", department: "設計部", status: "active" }
  ]

  const toggleUserPermission = (permission: string, userId: string) => {
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'viewed':
        return <Eye className="w-4 h-4 text-blue-500" />
      case 'downloaded':
        return <Download className="w-4 h-4 text-green-500" />
      case 'download_requested':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'access_denied':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      default:
        return <Settings className="w-4 h-4 text-gray-500" />
    }
  }

  const getActionLabel = (action: string) => {
    const labels = {
      'viewed': 'プレビュー',
      'downloaded': 'ダウンロード',
      'download_requested': 'ダウンロード要求',
      'access_denied': 'アクセス拒否'
    }
    return labels[action as keyof typeof labels] || action
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-engineering-blue/10 rounded-lg">
                <Shield className="w-5 h-5 text-engineering-blue" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">アクセス制御</h2>
                <p className="text-gray-600">{fileData.name}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex px-6">
              {[
                { id: 'permissions', label: '権限管理', icon: UserCheck },
                { id: 'history', label: 'アクセス履歴', icon: Clock },
                { id: 'settings', label: 'セキュリティ設定', icon: Settings }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                    selectedTab === tab.id
                      ? 'border-engineering-blue text-engineering-blue'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            <AnimatePresence mode="wait">
              {/* Permissions Tab */}
              {selectedTab === 'permissions' && (
                <motion.div
                  key="permissions"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        ユーザー権限マトリックス
                      </CardTitle>
                      <CardDescription>
                        各ユーザーのファイルアクセス権限を管理
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-3 px-4">ユーザー</th>
                              <th className="text-center py-3 px-4">
                                <Eye className="w-4 h-4 mx-auto" />
                                <span className="text-xs block mt-1">閲覧</span>
                              </th>
                              <th className="text-center py-3 px-4">
                                <Download className="w-4 h-4 mx-auto" />
                                <span className="text-xs block mt-1">DL</span>
                              </th>
                              <th className="text-center py-3 px-4">
                                <Edit className="w-4 h-4 mx-auto" />
                                <span className="text-xs block mt-1">編集</span>
                              </th>
                              <th className="text-center py-3 px-4">
                                <Share2 className="w-4 h-4 mx-auto" />
                                <span className="text-xs block mt-1">共有</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {allUsers.map((user, index) => (
                              <motion.tr
                                key={user.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="border-b border-gray-100 hover:bg-gray-50"
                              >
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-engineering-blue text-white rounded-full flex items-center justify-center text-sm font-medium">
                                      {user.name.charAt(0)}
                                    </div>
                                    <div>
                                      <div className="font-medium">{user.name}</div>
                                      <div className="text-sm text-gray-600">{user.role}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <Switch
                                    checked={fileData.permissions.view.users.includes(user.name)}
                                    onCheckedChange={() => toggleUserPermission('view', user.id)}
                                  />
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <Switch
                                    checked={fileData.permissions.download.users.includes(user.name)}
                                    onCheckedChange={() => toggleUserPermission('download', user.id)}
                                  />
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <Switch
                                    checked={fileData.permissions.edit.users.includes(user.name)}
                                    onCheckedChange={() => toggleUserPermission('edit', user.id)}
                                  />
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <Switch
                                    checked={(fileData.permissions.share.users as string[]).includes(user.name)}
                                    onCheckedChange={() => toggleUserPermission('share', user.id)}
                                  />
                                </td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <h3 className="font-semibold mb-2">一括設定</h3>
                        <div className="space-y-2">
                          <Button variant="outline" size="sm" className="w-full justify-start">
                            <UserCheck className="w-4 h-4 mr-2" />
                            チーム全員に閲覧権限
                          </Button>
                          <Button variant="outline" size="sm" className="w-full justify-start">
                            <Lock className="w-4 h-4 mr-2" />
                            管理者のみアクセス
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <h3 className="font-semibold mb-2">テンプレート</h3>
                        <div className="space-y-2">
                          <Button variant="outline" size="sm" className="w-full justify-start">
                            <Settings className="w-4 h-4 mr-2" />
                            設計チーム標準
                          </Button>
                          <Button variant="outline" size="sm" className="w-full justify-start">
                            <Shield className="w-4 h-4 mr-2" />
                            機密ファイル設定
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              )}

              {/* History Tab */}
              {selectedTab === 'history' && (
                <motion.div
                  key="history"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        アクセス履歴
                      </CardTitle>
                      <CardDescription>
                        ファイルへのアクセス履歴と承認状況
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {accessHistory.map((entry, index) => (
                          <motion.div
                            key={entry.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                          >
                            <div className="flex items-center gap-4">
                              <div className="flex-shrink-0">
                                {getActionIcon(entry.action)}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{entry.user}</span>
                                  <span className="text-gray-600">{getActionLabel(entry.action)}</span>
                                </div>
                                <div className="text-sm text-gray-500">
                                  {new Date(entry.timestamp).toLocaleString('ja-JP')} • {entry.ip}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {entry.approved ? (
                                <Badge variant="success" className="flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  承認済み
                                </Badge>
                              ) : entry.action === 'access_denied' ? (
                                <Badge variant="destructive" className="flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  拒否
                                </Badge>
                              ) : (
                                <Badge variant="warning" className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  承認待ち
                                </Badge>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Settings Tab */}
              {selectedTab === 'settings' && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Shield className="w-5 h-5" />
                          セキュリティ設定
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">ダウンロード承認要求</div>
                            <div className="text-sm text-gray-600">管理者承認後にDL可能</div>
                          </div>
                          <Switch
                            checked={fileData.settings.requireApprovalForDownload}
                            onCheckedChange={() => {}}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">透かし表示</div>
                            <div className="text-sm text-gray-600">プレビューに透かしを表示</div>
                          </div>
                          <Switch
                            checked={fileData.settings.watermarkEnabled}
                            onCheckedChange={() => {}}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">
                            アクセス期限
                          </label>
                          <input
                            type="date"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                            value={fileData.settings.expirationDate}
                            onChange={() => {}}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">
                            ダウンロード上限
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                              value={fileData.settings.maxDownloads}
                              onChange={() => {}}
                            />
                            <span className="text-sm text-gray-600">
                              / {fileData.settings.currentDownloads}回使用済み
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Key className="w-5 h-5" />
                          IP制限設定
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">
                              許可IPアドレス/レンジ
                            </label>
                            <div className="space-y-2">
                              {fileData.settings.ipRestrictions.map((ip, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                  <span className="font-mono text-sm">{ip}</span>
                                  <Button variant="ghost" size="sm">
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="192.168.1.0/24"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                            />
                            <Button variant="outline" size="sm">追加</Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Audit Settings */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        監査・ログ設定
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">詳細ログ記録</div>
                            <div className="text-xs text-gray-600">全操作をログに記録</div>
                          </div>
                          <Switch checked={true} onCheckedChange={() => {}} />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">リアルタイム通知</div>
                            <div className="text-xs text-gray-600">アクセス時に即座に通知</div>
                          </div>
                          <Switch checked={true} onCheckedChange={() => {}} />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">月次レポート</div>
                            <div className="text-xs text-gray-600">利用状況の定期レポート</div>
                          </div>
                          <Switch checked={false} onCheckedChange={() => {}} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              最終更新: {new Date().toLocaleString('ja-JP')}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose}>
                キャンセル
              </Button>
              <Button variant="engineering">
                設定を保存
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}