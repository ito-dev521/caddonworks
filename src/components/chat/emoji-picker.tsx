"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Smile } from "lucide-react"
import { Button } from "../ui/button"

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void
  className?: string
}

const emojiCategories = {
  "よく使う": ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳"],
  "感情": ["😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕"],
  "ジェスチャー": ["👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👋", "🤚", "🖐️", "✋", "🖖", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💅", "🤳", "💪", "🦾", "🦿", "🦵", "🦶", "👂", "🦻", "👃", "🧠", "🦷", "🦴", "👀", "👁️", "👅", "👄"],
  "食べ物": ["🍎", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🍆", "🥑", "🥦", "🥬", "🥒", "🌶️", "🫑", "🌽", "🥕", "🫒", "🧄", "🧅", "🥔", "🍠", "🥐", "🥖", "🍞", "🥨", "🥯", "🧀", "🥚", "🍳", "🧈", "🥞", "🧇", "🥓", "🥩", "🍗", "🍖", "🦴", "🌭", "🍔", "🍟", "🍕"],
  "活動": ["⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🎱", "🪀", "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "🪃", "🥅", "⛳", "🪁", "🏹", "🎣", "🤿", "🥊", "🥋", "🎽", "🛹", "🛷", "⛸️", "🥌", "🎿", "⛷️", "🏂", "🪂", "🏋️‍♀️", "🏋️", "🏋️‍♂️", "🤼‍♀️", "🤼", "🤼‍♂️", "🤸‍♀️", "🤸", "🤸‍♂️", "⛹️‍♀️", "⛹️", "⛹️‍♂️", "🤺", "🤾‍♀️", "🤾", "🤾‍♂️", "🏌️‍♀️", "🏌️", "🏌️‍♂️", "🏇", "🧘‍♀️", "🧘", "🧘‍♂️", "🏄‍♀️", "🏄", "🏄‍♂️", "🏊‍♀️", "🏊", "🏊‍♂️", "🤽‍♀️", "🤽", "🤽‍♂️", "🚣‍♀️", "🚣", "🚣‍♂️", "🧗‍♀️", "🧗", "🧗‍♂️", "🚵‍♀️", "🚵", "🚵‍♂️", "🚴‍♀️", "🚴", "🚴‍♂️", "🏆", "🥇", "🥈", "🥉", "🏅", "🎖️", "🏵️", "🎗️", "🎫", "🎟️", "🎪", "🤹", "🤹‍♀️", "🤹‍♂️", "🎭", "🩰", "🎨", "🎬", "🎤", "🎧", "🎼", "🎵", "🎶", "🪘", "🥁", "🪗", "🎸", "🪕", "🎺", "🎷", "🪗", "🎻", "🪈", "🎲", "♠️", "♥️", "♦️", "♣️", "♟️", "🃏", "🀄", "🎴", "🎯", "🎳", "🎮", "🕹️", "🎰", "🎲", "🧩", "🃏", "🎯", "🎳", "🎮", "🕹️", "🎰", "🎲", "🧩"]
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onEmojiSelect, className }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof emojiCategories>("よく使う")

  const handleEmojiClick = (emoji: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    onEmojiSelect(emoji)
    setIsOpen(false)
  }

  // キーボードイベントを処理してフォーム送信を防ぐ
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isOpen) {
      e.stopPropagation()
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }
  }

  return (
    <div className={`relative ${className}`} onKeyDown={handleKeyDown}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="hover:bg-gray-100"
      >
        <Smile className="w-4 h-4" />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* オーバーレイ */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* 絵文字ピッカー */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute bottom-full right-0 mb-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
              onKeyDown={handleKeyDown}
            >
              {/* カテゴリタブ */}
              <div className="flex border-b border-gray-200 p-2">
                {Object.keys(emojiCategories).map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category as keyof typeof emojiCategories)}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      selectedCategory === category
                        ? "bg-engineering-blue text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>

              {/* 絵文字グリッド */}
              <div className="p-3 max-h-64 overflow-y-auto">
                <div className="grid grid-cols-8 gap-1">
                  {emojiCategories[selectedCategory].map((emoji, index) => (
                    <button
                      key={index}
                      onClick={(e) => handleEmojiClick(emoji, e)}
                      className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 rounded-md transition-colors"
                      type="button"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
