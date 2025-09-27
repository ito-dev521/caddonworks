// ファイル管理アーカイブ機能
// プロジェクト完了後30日でファイル表示を非表示にする（BOX内は保持）

export interface ArchiveSettings {
  file_retention_days: number // デフォルト30日
  enable_auto_archive: boolean
  admin_override: boolean
}

export interface ProjectArchiveStatus {
  project_id: string
  completed_at: string | null
  status: 'active' | 'completed' | 'archived' | 'cancelled'
  files_visible: boolean
  archive_date: string | null
  days_until_archive: number | null
}

// デフォルト設定
export const DEFAULT_ARCHIVE_SETTINGS: ArchiveSettings = {
  file_retention_days: 30,
  enable_auto_archive: true,
  admin_override: false
}

// プロジェクトが完了してから指定日数経過しているかチェック
export function isProjectArchiveDue(
  completedAt: string | null,
  retentionDays: number = 30
): boolean {
  if (!completedAt) return false

  const completedDate = new Date(completedAt)
  const archiveDate = new Date(completedDate)
  archiveDate.setDate(archiveDate.getDate() + retentionDays)

  return new Date() >= archiveDate
}

// アーカイブまでの残り日数を計算
export function getDaysUntilArchive(
  completedAt: string | null,
  retentionDays: number = 30
): number | null {
  if (!completedAt) return null

  const completedDate = new Date(completedAt)
  const archiveDate = new Date(completedDate)
  archiveDate.setDate(archiveDate.getDate() + retentionDays)

  const diffTime = archiveDate.getTime() - new Date().getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return Math.max(0, diffDays)
}

// プロジェクトのアーカイブ状態を判定
export function getProjectArchiveStatus(
  project: {
    id: string
    status: string
    completed_at?: string | null
    updated_at: string
  },
  settings: ArchiveSettings = DEFAULT_ARCHIVE_SETTINGS
): ProjectArchiveStatus {
  const completedAt = project.completed_at ||
    (project.status === 'completed' ? project.updated_at : null)

  const isCompleted = ['completed', 'archived', 'cancelled'].includes(project.status)
  const isArchiveDue = completedAt ? isProjectArchiveDue(completedAt, settings.file_retention_days) : false
  const daysUntilArchive = completedAt ? getDaysUntilArchive(completedAt, settings.file_retention_days) : null

  let filesVisible = true
  let archiveDate = null

  if (isCompleted && completedAt && settings.enable_auto_archive) {
    filesVisible = !isArchiveDue || settings.admin_override
    if (isArchiveDue) {
      const completed = new Date(completedAt)
      archiveDate = new Date(completed)
      archiveDate.setDate(archiveDate.getDate() + settings.file_retention_days)
    }
  }

  return {
    project_id: project.id,
    completed_at: completedAt,
    status: project.status as any,
    files_visible: filesVisible,
    archive_date: archiveDate?.toISOString() || null,
    days_until_archive: daysUntilArchive
  }
}

// BOXファイルをフィルタリング（非表示対象を除外）
export function filterVisibleFiles(
  files: any[],
  archiveStatus: ProjectArchiveStatus
): any[] {
  if (archiveStatus.files_visible) {
    return files
  }

  // アーカイブ対象の場合は空配列を返す（BOX内は保持）
  return []
}

// アーカイブ警告メッセージを生成
export function getArchiveWarningMessage(
  archiveStatus: ProjectArchiveStatus
): string | null {
  if (!archiveStatus.files_visible) {
    return 'このプロジェクトのファイルは保持期間を過ぎたため非表示になっています。BOX内にはファイルが保持されています。'
  }

  if (archiveStatus.days_until_archive !== null && archiveStatus.days_until_archive <= 7) {
    return `このプロジェクトのファイルは${archiveStatus.days_until_archive}日後に非表示になります。`
  }

  return null
}

// 30日経過プロジェクトの自動削除処理
export async function processAutoArchiveDeletion(
  projectId: string,
  supabaseAdmin: any
): Promise<{ success: boolean; error?: string }> {
  try {
    // プロジェクトの詳細を取得
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id, title, status, completed_at, box_folder_id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return { success: false, error: 'プロジェクトが見つかりません' }
    }

    // 30日経過チェック
    if (!isProjectArchiveDue(project.completed_at)) {
      return { success: false, error: 'アーカイブ対象期間に達していません' }
    }

    // プロジェクト削除（Box フォルダは保持）
    // auto_archive フラグを使用してBox保持を指定
    const deleteUrl = `/api/projects/${projectId}?deleteType=auto_archive`

    console.log(`🔄 Auto-archiving project ${projectId} (preserving Box folder)`)

    // NOTE: この関数は通常バックグラウンド処理で呼ばれることを想定
    // 実際のAPI呼び出しは呼び出し元で行う
    return {
      success: true,
      error: `Project ${project.title} scheduled for auto-archive deletion with Box preservation`
    }

  } catch (error: any) {
    console.error('Auto-archive deletion error:', error)
    return {
      success: false,
      error: error.message || 'Auto-archive deletion failed'
    }
  }
}

// 30日経過プロジェクトを検索
export async function findProjectsForAutoArchive(
  supabaseAdmin: any,
  retentionDays: number = 30
): Promise<string[]> {
  try {
    const { data: projects, error } = await supabaseAdmin
      .from('projects')
      .select('id, completed_at')
      .in('status', ['completed', 'cancelled'])
      .not('completed_at', 'is', null)

    if (error) {
      console.error('Error fetching projects for auto-archive:', error)
      return []
    }

    const archiveCandidates = projects.filter(project =>
      isProjectArchiveDue(project.completed_at, retentionDays)
    )

    return archiveCandidates.map(p => p.id)

  } catch (error) {
    console.error('Error in findProjectsForAutoArchive:', error)
    return []
  }
}