import { AuthGuard } from "@/components/auth/auth-guard"
import { ChatLayout } from "@/components/chat/chat-layout"

export default function ChatPage() {
  return (
    <AuthGuard allowedRoles={["OrgAdmin", "Staff", "Contractor", "Reviewer"]}>
      <div className="h-screen">
        <ChatLayout className="h-full" />
      </div>
    </AuthGuard>
  )
}