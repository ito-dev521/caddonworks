import { documentGenerator, DocumentData } from './document-generator'

interface CompletionReportOrganization {
  id: string
  name: string
}

interface CompletionReportProject {
  id: string
  title: string
  client_organization?: CompletionReportOrganization | null
  contractor_organization?: CompletionReportOrganization | null
}

export interface CompletionReportData {
  project: CompletionReportProject
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