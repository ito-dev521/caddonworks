import { AuthGuard } from "@/components/auth/auth-guard"
import { ChatLayout } from "@/components/chat/chat-layout"

export default function ChatPage() {
  return (
    <AuthGuard allowedRoles={["OrgAdmin", "Staff", "Member", "Contractor", "Reviewer", "Auditor"]}>
      <div className="h-screen bg-gradient-mesh">
        {/* サイドバーを非表示にして、チャットレイアウトを全画面表示 */}
        <ChatLayout className="h-full" />
      </div>
    </AuthGuard>
  )
}