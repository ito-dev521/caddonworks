import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase'

interface BadgeData {
  projects?: number
  chat?: number
  contracts?: number
  jobs?: number
  deliverables?: number
  reviews?: number
}

export function useNavigationBadges() {
  const { userRole, user } = useAuth()
  const [badges, setBadges] = useState<BadgeData>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBadges = async () => {
      if (!user || !userRole) {
        setLoading(false)
        return
      }

      try {
        // 認証トークンを取得
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          setLoading(false)
          return
        }

        const headers = {
          'Authorization': `Bearer ${session.access_token}`
        }

        const badgeData: BadgeData = {}

        // ユーザーロールに応じて必要なバッジデータを取得
        switch (userRole) {
          case 'OrgAdmin':
            // 発注者: 案件管理、チャット、契約管理
            try {
              const [projectsRes, chatRes, contractsRes] = await Promise.all([
                fetch('/api/projects', { headers }),
                fetch('/api/chat/rooms', { headers }),
                fetch('/api/contracts', { headers })
              ])

              if (projectsRes.ok) {
                const projectsData = await projectsRes.json()
                badgeData.projects = projectsData.projects?.length || 0
              }

              if (chatRes.ok) {
                const chatData = await chatRes.json()
                badgeData.chat = chatData.rooms?.filter((room: any) => room.unread_count > 0).length || 0
              }

              if (contractsRes.ok) {
                const contractsData = await contractsRes.json()
                badgeData.contracts = contractsData.contracts?.length || 0
              }
            } catch (error) {
              console.error('OrgAdmin badges fetch error:', error)
            }
            break

          case 'Contractor':
            // 受注者: 案件一覧、チャット、契約管理、提出物
            try {
              const [jobsRes, chatRes, contractsRes, deliverablesRes] = await Promise.all([
                fetch('/api/jobs', { headers }),
                fetch('/api/chat/rooms', { headers }),
                fetch('/api/contracts', { headers }),
                fetch('/api/deliverables', { headers })
              ])

              if (jobsRes.ok) {
                const jobsData = await jobsRes.json()
                badgeData.jobs = jobsData.jobs?.length || 0
              }

              if (chatRes.ok) {
                const chatData = await chatRes.json()
                badgeData.chat = chatData.rooms?.filter((room: any) => room.unread_count > 0).length || 0
              }

              if (contractsRes.ok) {
                const contractsData = await contractsRes.json()
                badgeData.contracts = contractsData.contracts?.length || 0
              }

              if (deliverablesRes.ok) {
                const deliverablesData = await deliverablesRes.json()
                badgeData.deliverables = deliverablesData.deliverables?.length || 0
              }
            } catch (error) {
              console.error('Contractor badges fetch error:', error)
            }
            break

          case 'Reviewer':
            // 監督員: 審査案件、チャット
            try {
              const [reviewsRes, chatRes] = await Promise.all([
                fetch('/api/reviews', { headers }),
                fetch('/api/chat/rooms', { headers })
              ])

              if (reviewsRes.ok) {
                const reviewsData = await reviewsRes.json()
                badgeData.reviews = reviewsData.reviews?.length || 0
              }

              if (chatRes.ok) {
                const chatData = await chatRes.json()
                badgeData.chat = chatData.rooms?.filter((room: any) => room.unread_count > 0).length || 0
              }
            } catch (error) {
              console.error('Reviewer badges fetch error:', error)
            }
            break
        }

        setBadges(badgeData)
      } catch (error) {
        console.error('Badges fetch error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchBadges()

    // 定期的にバッジを更新（30秒間隔）
    const interval = setInterval(fetchBadges, 30000)

    return () => clearInterval(interval)
  }, [user, userRole])

  return { badges, loading }
}
