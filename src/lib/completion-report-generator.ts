import { Project, Organization } from '@/types/database.types'
import { documentGenerator, DocumentData } from './document-generator'

export interface CompletionReportData {
  project: Project & {
    client_organization?: Organization
    contractor_organization?: Organization
  }
  contract?: {
    id: string
    bid_amount: number
    start_date: string
    end_date: string
  }
  contractor?: {
    id: string
    display_name: string
    email: string
  }
  completionDate: string
  createdAt: string
}

export async function generateCompletionReportPDF(data: CompletionReportData): Promise<Buffer> {
  const templateData: DocumentData = {
    type: 'completion',
    projectTitle: data.project.title,
    contractorName: data.contractor?.display_name || data.project.contractor_organization?.name || '',
    clientName: data.project.client_organization?.name || '',
    completionDate: data.completionDate,
    createdAt: new Date(data.createdAt).toLocaleDateString('ja-JP')
  }

  console.log('📝 完了届データ:', templateData)
  console.log('🎯 テンプレート検索: completion_template.pdf')
  return await documentGenerator.generateDocument('completion', templateData)
}