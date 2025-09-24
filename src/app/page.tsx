"use client"

import React, { useEffect } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  Shield,
  Zap,
  Users,
  FileText,
  BarChart3,
  CheckCircle,
  Building,
  Globe,
  Award
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"

export default function LandingPage() {
  const { userRole, loading, getRedirectPath } = useAuth()
  const router = useRouter()

  // 自動リダイレクトを無効化（ユーザーが明示的にランディングページを見たい場合もある）
  // useEffect(() => {
  //   if (!loading && userRole) {
  //     const redirectPath = getRedirectPath()
  //     router.push(redirectPath)
  //   }
  // }, [userRole, loading, router, getRedirectPath])
  const features = [
    {
      icon: <Shield className="w-8 h-8" />,
      title: "セキュアなファイル管理",
      description: "Box API連携によるVDR機能で、図面やドキュメントを安全に管理。ウイルススキャンや暗号化で完全保護。",
      color: "text-blue-600"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "AI自動検査",
      description: "バッチ処理による図面検査、縮尺チェック、数量整合性の自動確認で品質向上と作業効率化を実現。",
      color: "text-yellow-600"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "プロジェクトマッチング",
      description: "発注者と受注者の最適なマッチング。スキル、実績、評価に基づいた高品質な案件配分。",
      color: "text-green-600"
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "包括的会計システム",
      description: "運営会社による支払い代行、自動請求書発行、透明性の高い会計フローで安心の取引。",
      color: "text-purple-600"
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: "土木専門評価",
      description: "品質・基準適合・数量整合・納期・コミュニケーションなど土木業務に特化した多角的評価システム。",
      color: "text-red-600"
    },
    {
      icon: <Award className="w-8 h-8" />,
      title: "監査ログ・コンプライアンス",
      description: "全操作の完全記録、WORM相当の監査ログで法的要件をクリア。透明性の高い業務運営。",
      color: "text-indigo-600"
    }
  ]

  const stats = [
    { value: "500+", label: "登録企業" },
    { value: "2,400+", label: "完了プロジェクト" },
    { value: "¥18億+", label: "累計取引額" },
    { value: "4.8", label: "平均評価" }
  ]

  return (
    <div className="min-h-screen bg-gradient-mesh">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-engineering-blue rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">土</span>
              </div>
              <div>
                <h1 className="font-bold text-xl text-engineering-blue">
                  土木設計業務プラットフォーム
                </h1>
                <p className="text-sm text-gray-600">Civil Engineering Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/auth/login">
                <Button variant="outline">ログイン</Button>
              </Link>
              <div className="flex items-center gap-2">
                <Link href="/auth/register-organization">
                  <Button variant="engineering" size="sm">
                    <Building className="w-4 h-4 mr-2" />
                    発注者登録
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button variant="engineering" size="sm">
                    <Users className="w-4 h-4 mr-2" />
                    受注者登録
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <Badge variant="engineering" className="mb-6">
              🚀 次世代土木設計プラットフォーム
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              土木設計業務を
              <span className="bg-gradient-engineering bg-clip-text text-transparent">
                革新する
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              セキュアなファイル管理、AI自動検査、包括的会計システムで、
              土木設計業務の発注から完了まで全工程をデジタル化。
              効率性と品質を同時に実現する次世代プラットフォームです。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register-organization">
                <Button variant="engineering" size="lg" className="group">
                  <Building className="w-5 h-5 mr-2" />
                  発注者として登録
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button variant="engineering" size="lg" className="group">
                  <Users className="w-5 h-5 mr-2" />
                  受注者として登録
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 1, scale: 1 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <p className="text-4xl md:text-5xl font-bold text-engineering-blue mb-2">
                  {stat.value}
                </p>
                <p className="text-gray-600 font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 1, y: 0 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              プラットフォームの特徴
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              土木設計業務に特化した機能で、従来の課題を解決し、
              新たな価値を創造します。
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 1, y: 0 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <Card className="h-full hover-lift border-engineering-blue/20">
                  <CardHeader>
                    <div className={`${feature.color} mb-4`}>
                      {feature.icon}
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="py-20 bg-gradient-to-br from-engineering-blue/5 to-engineering-green/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 1, y: 0 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              シンプルなワークフロー
            </h2>
            <p className="text-xl text-gray-600">
              8つのステップで完結する効率的な業務フロー
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              "案件登録・基準設定",
              "入札・マッチング",
              "契約・NDA締結",
              "設計・中間提出",
              "AI自動検査",
              "最終提出・承認",
              "納品・相互評価",
              "支払・会計処理"
            ].map((step, index) => (
              <motion.div
                key={step}
                initial={{ opacity: 1, scale: 1 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                <Card className="text-center hover-lift">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-engineering-blue text-white rounded-full flex items-center justify-center font-bold text-lg mb-4 mx-auto">
                      {index + 1}
                    </div>
                    <h3 className="font-semibold text-gray-900">{step}</h3>
                  </CardContent>
                </Card>
                {index < 7 && (
                  <ArrowRight className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 text-engineering-blue w-6 h-6" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 1, y: 0 }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              今すぐ始めませんか？
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              土木設計業務の未来を体験してください。
              無料トライアルでプラットフォームの価値を実感できます。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register-organization">
                <Button variant="engineering" size="lg" className="group">
                  <Building className="w-5 h-5 mr-2" />
                  発注者として開始
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button variant="gradient" size="lg" className="group">
                  <Users className="w-5 h-5 mr-2" />
                  受注者として開始
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
            <div className="mt-4 flex justify-center">
              <Link href="/contact">
                <Button variant="outline" size="lg">
                  資料請求・お問い合わせ
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-engineering-blue rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">土</span>
                </div>
                <h3 className="text-xl font-bold">土木設計業務プラットフォーム</h3>
              </div>
              <p className="text-gray-400 mb-4">
                土木設計業務のデジタル変革を推進し、
                効率性と品質の向上を実現するプラットフォームです。
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">プラットフォーム</h4>
              <ul className="space-y-2 text-gray-400">
                <li>機能紹介</li>
                <li>料金プラン</li>
                <li>導入事例</li>
                <li>API ドキュメント</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">サポート</h4>
              <ul className="space-y-2 text-gray-400">
                <li>ヘルプセンター</li>
                <li>お問い合わせ</li>
                <li>
                  <Link href="/terms" className="hover:text-white transition-colors">
                    利用規約
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-white transition-colors">
                    プライバシーポリシー
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Civil Engineering Platform. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}