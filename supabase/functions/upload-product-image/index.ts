// Supabase Edge Function: uploads a product image to Storage.
//
// Takes the file as base64 rather than multipart/form-data — simpler to parse
// in Deno and plenty for the tiny (<25KB) images this app allows. Verifies
// the caller is actually an ADMIN with the service-role key before writing,
// the same pattern as add_product() in schema.sql — the anon key alone must
// never be trusted to gate a write.
//
// Deploy: supabase functions deploy upload-product-image

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MAX_BYTES = 25 * 1024 // 25KB, enforced here too — never trust client-side checks alone.
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { adminUserId, fileName, contentType, fileBase64 } = await req.json()

    if (!adminUserId || !fileName || !contentType || !fileBase64) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    if (!ALLOWED_TYPES.includes(contentType)) {
      return new Response(JSON.stringify({ error: 'Unsupported image type' }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    )

    const { data: admin } = await supabaseAdmin
      .from('User')
      .select('userType')
      .eq('userID', adminUserId)
      .maybeSingle()

    if (!admin || admin.userType !== 'ADMIN') {
      return new Response(JSON.stringify({ error: 'NOT_AUTHORIZED' }), {
        status: 403,
        headers: corsHeaders,
      })
    }

    const bytes = Uint8Array.from(atob(fileBase64), (c) => c.charCodeAt(0))
    if (bytes.length > MAX_BYTES) {
      return new Response(JSON.stringify({ error: 'Image must be smaller than 25KB' }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${crypto.randomUUID()}-${safeName}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from('product-images')
      .upload(path, bytes, { contentType, upsert: false })

    if (uploadError) {
      return new Response(JSON.stringify({ error: uploadError.message }), {
        status: 500,
        headers: corsHeaders,
      })
    }

    const { data: publicUrlData } = supabaseAdmin.storage.from('product-images').getPublicUrl(path)

    return new Response(JSON.stringify({ url: publicUrlData.publicUrl }), {
      status: 200,
      headers: corsHeaders,
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
  }
})
