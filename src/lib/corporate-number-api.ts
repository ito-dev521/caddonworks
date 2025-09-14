// 国税庁法人番号公表サイトAPI
export interface CorporateNumberResponse {
  count: number
  divide_number: string
  divide_size: string
  corporations: CorporateInfo[]
}

export interface CorporateInfo {
  sequenceNumber: string
  corporateNumber: string
  process: string
  correct: string
  updateDate: string
  registrationDate: string
  discontinuationDate: string
  corporateName: string
  corporateNameImageId: string
  kind: string
  prefectureCode: string
  cityCode: string
  streetNumber: string
  addressImageId: string
  prefectureName: string
  cityName: string
  streetName: string
  addressOutside: string
  addressOutsideImageId: string
  closeDate: string
  closeCause: string
  successorCorporateNumber: string
  changeCause: string
  assignmentDate: string
  latest: string
  enCorporateName: string
  enPrefectureName: string
  enCityName: string
  enAddressOutside: string
  furigana: string
  hihyoji: string
}

export async function searchCorporationByName(name: string): Promise<CorporateNumberResponse | null> {
  if (!name || name.length < 2) {
    return null
  }

  try {
    const params = new URLSearchParams({
      name: name
    })

    const response = await fetch(`/api/corporate-search?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      console.error('Corporate search API error:', response.status, response.statusText)
      const errorData = await response.json().catch(() => ({}))
      console.error('Error details:', errorData)
      return null
    }

    const data: CorporateNumberResponse = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching corporate number data:', error)
    return null
  }
}

export async function searchCorporationByNumber(corporateNumber: string): Promise<CorporateNumberResponse | null> {
  if (!corporateNumber || corporateNumber.length !== 13) {
    return null
  }

  try {
    const params = new URLSearchParams({
      number: corporateNumber
    })

    const response = await fetch(`/api/corporate-search?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      console.error('Corporate search API error:', response.status, response.statusText)
      const errorData = await response.json().catch(() => ({}))
      console.error('Error details:', errorData)
      return null
    }

    const data: CorporateNumberResponse = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching corporate number data:', error)
    return null
  }
}

export function formatAddress(corp: CorporateInfo): string {
  const parts = [
    corp.prefectureName,
    corp.cityName,
    corp.streetName
  ].filter(Boolean)

  return parts.join('')
}

export function formatCorporateNumber(number: string): string {
  // 13桁の法人番号を見やすい形式にフォーマット
  if (number.length === 13) {
    return `${number.slice(0, 1)}-${number.slice(1, 5)}-${number.slice(5, 9)}-${number.slice(9)}`
  }
  return number
}