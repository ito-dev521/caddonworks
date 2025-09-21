const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://rxnozwuamddqlcwysxag.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY環境変数が設定されていません')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// BOX API関数（lib/box.tsから抜粋）
async function getAppAuthAccessToken() {
  const jwt = require('jsonwebtoken')
  const crypto = require('crypto')

  const clientID = 'jac5va3v32chli4biniryhh5hjgeoi85'
  const clientSecret = 'ampStWdgoOC1e7L9L7AOTWcmZzz8Ieds'
  const enterpriseId = '1344510016'
  const privateKey = `-----BEGIN ENCRYPTED PRIVATE KEY-----
MIIFNTBfBgkqhkiG9w0BBQ0wUjAxBgkqhkiG9w0BBQwwJAQQ1O57JN+2veFv4z0u
JC/ZIgICCAAwDAYIKoZIhvcNAgkFADAdBglghkgBZQMEASoEEHadCIU3DKD72dVj
utp52hQEggTQ80Q86e2thS1tgPH+e/wODfEpAW9xlgAi6Y+PJfv7/onDshVBXn9h
UvQd9V0ATqJCjjHf+Wa5AepyMR/IH+V4GMHaYw9nYieh8rkFPqbPmnYFAbooEPr1
yqZTf23bfZW42It3oADSUjyBjxbZ5KHU8OidoznbfM3ywqjgsQMwVUmFLTIwBnU6
QL00Uy4HSNSaxl81vmzWu05zMd1OIxq1oEzfJ9Dfjs7wgvluqpnYLBlSEsrubayQ
0WDqzujfyss+6rJEtox4uzophvZhALi5ZJljbmiVtGeuhu8z9cRL+K+UbayxP11R
u+AzMQ93gxswDtRgDbQ0fAUCEEEdFUxK25uNAJ63Q/U5f6rGBaMA+srtkD0FvWss
ZrJbi6IjhhVPHcvPUq7twMiviBJwClAh5CHzF0JgGzZK5liElIbv4xOIRcdzBqgN
0V4oj9+APknNdI5oDxeCDpUqer7olHa18OXDmfc5hraMrzJ/TRD7f2YulOzCg8tc
qdEMMOxVq3nyGbPGLZdohC/uzagwx+kyPjLo5dQdH8is0Z6wnONfvYi8pzYxWU4c
sNam6i9emWEGD5gZTlyutpI9yoqOmiOop7g9lSaPtelWbtwu+GMHas+s5+VWTyWi
Gtr0TTNo0X+EZeyjb4SkWHljXg4QjZtdMgMohyH4Q39sILpPwHIrrmV7ZQh4B4iK
jPRAdslhmeXivgVUSd7KPV5tLMCFwsrDMijsG/lr1ps8kwC27Rf7svcE1ZDc/BYU
HhDNfjS8/Cj7VUgPZK/nV4LKxRkrIuL/7XhGygWZZWOydCaQokPp8YnCrDpsdBDL
CjUbEkLNBG4qgnq/Nj+pwcxj3jFZ7X6duWxNsaCY0od6gU3SRojWGVriCTKAG4yU
2nhm4Fp0opkGiBKxdG+hPJXRiLgWMR88dWFE3Tu1k6oY3HLDTKms1JV+CDkY5xn+
VUQBYf96LX5oi6Ezwk9PmPhVuO582GDRNVvo05IimKyg/p6imYZPYVEgpYdiLweZ
t756andinMUFM6SSPR0ZIxfGAkN4tkJ1G90eueZURtqIFxrbvWehlejtD+37zT58
2ja6Z1Moh//cLOAv5CRQFs6++COW53GHImhiXqGHd0B9B7+uw3HL6D6lknOAY0jX
SSp/2Z8JZsDWNe0fGovil0gwICe9nmgRKzQlbq7jYN0oaX9sZZFms5Kdc48MRiGg
RANyAKw1LoAOg3ljQMgtpwz+7WLHRALPrXz3JEWrjX/YjIviig/K+MqbrC+v5J08
M/pIxOwHinQEzWRpNxZ3BDJnxdRf21+lpOH0aqJiGT3NOdZuV+LQ8c1UwzfC9pZe
mil2b+NvnKLEswfEgcaisHUkyUE5mGXxA0Pa95quhfxkI+sLkZ3oHpnReetzMpY0
8C0I+Gnb8oYaoAHCf0MG+z7e0G3r5q1yuiyfxO93QV/pRcpuTPongq7IBFhI4X2x
dmGhZM2onFW3juAtvKnyyJqIdcnexBVazUcKqFB6Yishl5hTQpBjeu9KZKkNLS9N
2tQcSeED9ebAqTWNsIiaQVGAwROwwi2txHJLTKspPx8k0ZjS3dLS9GsOv7y3hHe3
6FCo70uQ8AmeXRu2MZj4S/QKqQ4c8uVak4bummrURWd7KlGTZJx8uXU=
-----END ENCRYPTED PRIVATE KEY-----`
  const passphrase = 'aa242548bc092ef1df71c6126c02d5d4'
  const publicKeyId = '9jn2uecc'

  const now = Math.floor(Date.now() / 1000)
  const jti = crypto.randomBytes(16).toString('hex')

  const claims = {
    iss: clientID,
    sub: enterpriseId,
    box_sub_type: 'enterprise',
    aud: 'https://api.box.com/oauth2/token',
    iat: now,
    exp: now + 30,
    jti
  }

  const signOptions = {
    algorithm: 'RS256',
    header: { alg: 'RS256', kid: publicKeyId }
  }

  const assertion = jwt.sign(claims, { key: privateKey, passphrase }, signOptions)

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    client_id: clientID,
    client_secret: clientSecret,
    assertion
  })

  const res = await fetch('https://api.box.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  })

  if (!res.ok) {
    throw new Error(`BOX認証に失敗: ${res.status}`)
  }

  const json = await res.json()
  return json.access_token
}

async function createCompanyFolder(companyName) {
  const accessToken = await getAppAuthAccessToken()
  const parentFolderId = '342069286897' // BOX_PROJECTS_ROOT_FOLDER_ID

  const res = await fetch('https://api.box.com/2.0/folders', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: companyName,
      parent: { id: parentFolderId }
    })
  })

  if (!res.ok) {
    if (res.status === 409) {
      // フォルダが既に存在する場合は、既存フォルダのIDを取得
      const listRes = await fetch(`https://api.box.com/2.0/folders/${parentFolderId}/items`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })

      if (listRes.ok) {
        const listData = await listRes.json()
        const existingFolder = listData.entries.find(item => item.type === 'folder' && item.name === companyName)
        if (existingFolder) {
          return { id: existingFolder.id }
        }
      }
    }
    const errorText = await res.text()
    throw new Error(`フォルダ作成失敗 ${res.status}: ${errorText}`)
  }

  const folder = await res.json()
  return { id: folder.id }
}

async function createCompanyFoldersForExistingOrgs() {
  try {
    console.log('=== 既存組織の会社フォルダ作成 ===')

    // 1. 既存組織を取得
    const { data: organizations, error } = await supabase
      .from('organizations')
      .select('id, name, active')
      .eq('active', true)

    if (error) {
      console.error('組織取得エラー:', error)
      return
    }

    console.log(`アクティブな組織: ${organizations.length}件`)

    // 2. 各組織の会社フォルダを作成
    for (const org of organizations) {
      console.log(`\n🏢 "${org.name}" のフォルダ作成中...`)

      try {
        const { id: folderId } = await createCompanyFolder(org.name)
        console.log(`   ✅ フォルダ作成成功: ${folderId}`)

        // TODO: DBのbox_folder_idカラムが作成されたら有効化
        // const { error: updateError } = await supabase
        //   .from('organizations')
        //   .update({ box_folder_id: folderId })
        //   .eq('id', org.id)

        console.log(`   ℹ️  フォルダID: ${folderId} (DBには未保存 - approval_statusカラム作成後に対応)`)

      } catch (error) {
        console.error(`   ❌ エラー: ${error.message}`)
      }

      // レート制限回避のため1秒待機
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    console.log('\n=== 完了 ===')
    console.log('すべての組織の会社フォルダ作成を試行しました。')
    console.log('approval_statusカラム作成後、DBへの保存も行ってください。')

  } catch (error) {
    console.error('処理エラー:', error)
  }
}

createCompanyFoldersForExistingOrgs()