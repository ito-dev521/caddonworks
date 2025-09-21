// プロジェクトにBOXフォルダIDを設定するテストスクリプト
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://efupwafnxjgslozfjwcw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmdXB3YWZueGpnc2xvemZqd2N3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjc4MDQwMCwiZXhwIjoyMDQ4MzU2NDAwfQ.WEqFGPi9aUNsAR6D8YIdILfnhc5rnCgLGF50qY3rr2E'

const supabase = createClient(supabaseUrl, supabaseKey)

async function updateProjectBoxFolder() {
  try {
    console.log('🔄 Updating project with BOX folder ID...')

    const { data, error } = await supabase
      .from('projects')
      .update({
        box_folder_id: '342134637383'
      })
      .eq('id', 'f32507e6-95ca-4a04-82c7-9e87690d3823')
      .select('id, title, box_folder_id')

    if (error) {
      console.error('❌ Update error:', error)
      return
    }

    console.log('✅ Project updated successfully:', data)
    console.log('🎉 BOX folder linked to project!')

  } catch (error) {
    console.error('❌ Script error:', error)
  }
}

updateProjectBoxFolder()