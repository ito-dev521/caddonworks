"use client"

import React, { useState } from "react"
import { Eye, EyeOff, RefreshCw, Lock } from "lucide-react"
import { generatePassword, evaluatePasswordStrength, getPasswordStrengthColor, getPasswordStrengthLabel } from "@/lib/password-generator"

interface PasswordFieldProps {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  showStrengthIndicator?: boolean
  className?: string
  label?: string
  error?: string
}

export function PasswordField({
  id,
  value,
  onChange,
  placeholder = "••••••••",
  required = false,
  showStrengthIndicator = true,
  className = "",
  label,
  error
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGeneratePassword = async () => {
    setIsGenerating(true)
    try {
      // 少し遅延を追加してローディング状態を表示
      await new Promise(resolve => setTimeout(resolve, 300))
      const newPassword = generatePassword()
      onChange(newPassword)
    } catch (error) {
      console.error('パスワード生成エラー:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const strength = value ? evaluatePasswordStrength(value) : null

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          id={id}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full pl-10 pr-20 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent transition-colors ${error ? 'border-red-500' : ''} ${className}`}
          placeholder={placeholder}
          required={required}
        />
        
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {/* パスワード生成ボタン */}
          <button
            type="button"
            onClick={handleGeneratePassword}
            disabled={isGenerating}
            className="text-gray-400 hover:text-engineering-blue transition-colors disabled:opacity-50"
            title="パスワードを自動生成"
          >
            <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
          </button>
          
          {/* パスワード表示切り替えボタン */}
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title={showPassword ? "パスワードを隠す" : "パスワードを表示"}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* パスワード強度インジケーター */}
      {showStrengthIndicator && value && strength && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">パスワード強度:</span>
            <span className={`font-medium ${getPasswordStrengthColor(strength.strength)}`}>
              {getPasswordStrengthLabel(strength.strength)}
            </span>
          </div>
          
          {/* 強度バー */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                strength.strength === 'weak' ? 'bg-red-500 w-1/4' :
                strength.strength === 'medium' ? 'bg-yellow-500 w-1/2' :
                strength.strength === 'strong' ? 'bg-blue-500 w-3/4' :
                'bg-green-500 w-full'
              }`}
            />
          </div>
          
          {/* フィードバック */}
          {strength.feedback.length > 0 && (
            <div className="text-xs text-gray-600">
              {strength.feedback.map((msg, index) => (
                <div key={index}>• {msg}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* エラーメッセージ */}
      {error && (
        <div className="text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  )
}
