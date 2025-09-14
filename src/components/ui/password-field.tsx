"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { Eye, EyeOff, Lock, RefreshCw, CheckCircle, XCircle } from "lucide-react"
import { Button } from "./button"

interface PasswordFieldProps {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  required?: boolean
  showStrengthIndicator?: boolean
  className?: string
}

export function PasswordField({
  value,
  onChange,
  label = "パスワード",
  placeholder = "••••••••",
  required = false,
  showStrengthIndicator = false,
  className = ""
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false)

  const generateSecurePassword = () => {
    // 文字セット定義
    const lowercase = 'abcdefghijklmnopqrstuvwxyz'
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const numbers = '0123456789'
    const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?'

    const allChars = lowercase + uppercase + numbers + specialChars
    let password = ''

    // 各文字種から最低1文字を保証
    password += lowercase[Math.floor(Math.random() * lowercase.length)]
    password += uppercase[Math.floor(Math.random() * uppercase.length)]
    password += numbers[Math.floor(Math.random() * numbers.length)]
    password += specialChars[Math.floor(Math.random() * specialChars.length)]

    // 残りの文字をランダムに追加（合計12文字）
    for (let i = 4; i < 12; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)]
    }

    // 文字をシャッフル
    const passwordArray = password.split('')
    for (let i = passwordArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]]
    }

    return passwordArray.join('')
  }

  const handleGeneratePassword = () => {
    const newPassword = generateSecurePassword()
    onChange(newPassword)
  }

  const getPasswordStrength = (password: string) => {
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      numbers: /\d/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    }

    const score = Object.values(checks).filter(Boolean).length

    if (score <= 2) return { strength: 'weak', color: 'bg-red-500', text: '弱い', checks }
    if (score <= 3) return { strength: 'medium', color: 'bg-yellow-500', text: '普通', checks }
    if (score <= 4) return { strength: 'good', color: 'bg-blue-500', text: '良い', checks }
    return { strength: 'strong', color: 'bg-green-500', text: '強い', checks }
  }

  const passwordStrength = showStrengthIndicator && value ? getPasswordStrength(value) : null

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && "*"}
      </label>
      <div className="space-y-2">
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type={showPassword ? "text" : "password"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
            placeholder={placeholder}
            required={required}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGeneratePassword}
          className="w-full flex items-center gap-2 text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          安全なパスワードを自動生成
        </Button>

        {showStrengthIndicator && value && passwordStrength && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(Object.values(passwordStrength.checks).filter(Boolean).length / 5) * 100}%` }}
                  className={`h-full ${passwordStrength.color} transition-all duration-300`}
                />
              </div>
              <span className="text-xs font-medium text-gray-600">
                {passwordStrength.text}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
              <div className={`flex items-center gap-1 ${passwordStrength.checks.length ? 'text-green-600' : 'text-gray-400'}`}>
                {passwordStrength.checks.length ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                8文字以上
              </div>
              <div className={`flex items-center gap-1 ${passwordStrength.checks.lowercase ? 'text-green-600' : 'text-gray-400'}`}>
                {passwordStrength.checks.lowercase ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                小文字を含む
              </div>
              <div className={`flex items-center gap-1 ${passwordStrength.checks.uppercase ? 'text-green-600' : 'text-gray-400'}`}>
                {passwordStrength.checks.uppercase ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                大文字を含む
              </div>
              <div className={`flex items-center gap-1 ${passwordStrength.checks.numbers ? 'text-green-600' : 'text-gray-400'}`}>
                {passwordStrength.checks.numbers ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                数字を含む
              </div>
              <div className={`flex items-center gap-1 ${passwordStrength.checks.special ? 'text-green-600' : 'text-gray-400'}`}>
                {passwordStrength.checks.special ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                特殊文字を含む
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-gray-500">
          8文字以上、大文字・小文字・数字・特殊文字を含む
        </p>
      </div>
    </div>
  )
}