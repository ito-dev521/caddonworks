"use client"

import React from "react"
import { Navigation } from "@/components/layouts/navigation"

export default function AdminSettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">システム設定</h1>
        <p className="text-gray-600">システム設定は準備中です。</p>
      </div>
    </div>
  )
}


