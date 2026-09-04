// Supabase Edge Function: deletes a product image from Storage.
//
// Used when an admin replaces or removes a product's image, so stale files
// don't pile up in the bucket. Same trust pattern as the other admin
// functions — verifies ADMIN status server-side with the service-role key
// before deleting anything; the anon key alone is never trusted to gate this.
//
// Silently no-ops (returns { skipped: true }) for URLs that aren't actually
// in our "product-images" bucket — e.g. the seed products' picsum.photos
// URLs — since there's nothing of ours to delete there.
//
// Deploy: supabase functions deploy delete-product-image

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { adminUserId, imageUrl } = await req.json()

    if (!adminUserId || !imageUrl) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
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

    const marker = '/product-images/'
    const markerIndex = imageUrl.indexOf(marker)
    if (markerIndex === -1) {
      return new Response(JSON.stringify({ skipped: true }), { status: 200, headers: corsHeaders })
    }

    const path = decodeURIComponent(imageUrl.slice(markerIndex + marker.length))
    const { error } = await supabaseAdmin.storage.from('product-images').remove([path])

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
  }
})
