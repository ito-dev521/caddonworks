"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { Users, Settings, Info, X } from "lucide-react"
import { Button } from "../ui/button"
import { ChatRoomList } from "./chat-room-list"
import { ChatMessageInterface } from "./chat-message-interface"
import { ChatParticipants } from "./chat-participants"
import { cn } from "@/lib/utils"

interface ChatLayoutProps {
  className?: string
}

export function ChatLayout({ className = "" }: ChatLayoutProps) {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [showParticipants, setShowParticipants] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Check if mobile on mount
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleRoomSelect = (roomId: string) => {
    setSelectedRoomId(roomId)
  }

  return (
    <div className={cn("flex h-full bg-gray-50", className)}>
      {/* Room List Sidebar */}
      <motion.div
        initial={false}
        animate={{
          width: isMobile ? (selectedRoomId ? 0 : '100%') : 320,
          opacity: isMobile ? (selectedRoomId ? 0 : 1) : 1
        }}
        className={cn(
          "border-r border-gray-200 bg-white overflow-hidden",
          isMobile && selectedRoomId && "hidden"
        )}
      >
        <ChatRoomList
          selectedRoomId={selectedRoomId || undefined}
          onRoomSelect={handleRoomSelect}
          className="h-full"
        />
      </motion.div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedRoomId ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center gap-3">
                {isMobile && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedRoomId(null)}
                  >
                    ←
                  </Button>
                )}
                <div>
                  <h2 className="font-semibold text-gray-900">チャットルーム</h2>
                  <p className="text-sm text-gray-500">プロジェクト関連のディスカッション</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowParticipants(!showParticipants)}
                  className={cn(
                    "transition-colors",
                    showParticipants && "bg-engineering-blue/10 text-engineering-blue"
                  )}
                >
                  <Users className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Message Interface */}
              <div className="flex-1 flex flex-col">
                <ChatMessageInterface
                  roomId={selectedRoomId}
                  className="flex-1"
                />
              </div>

              {/* Participants Sidebar */}
              <motion.div
                initial={false}
                animate={{
                  width: showParticipants ? 280 : 0,
                  opacity: showParticipants ? 1 : 0
                }}
                className="border-l border-gray-200 bg-white overflow-hidden"
              >
                <ChatParticipants
                  roomId={selectedRoomId}
                  onClose={() => setShowParticipants(false)}
                  className="h-full"
                />
              </motion.div>
            </div>
          </>
        ) : (
          /* No Room Selected */
          <div className="flex-1 flex items-center justify-center bg-white">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                チャットルームを選択してください
              </h3>
              <p className="text-gray-500 mb-6">
                左のリストからチャットルームを選択して、
                プロジェクト関係者とのコミュニケーションを開始してください。
              </p>
              <div className="space-y-2 text-sm text-gray-400">
                <p>💬 リアルタイムメッセージング</p>
                <p>📁 ファイル共有</p>
                <p>👥 プロジェクト関係者との連携</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}