// Supabase Edge Function: emails a password-reset link via Resend.
//
// The link's base URL comes from the SITE_URL secret (set once by you), never
// from the client request — accepting a client-supplied origin would let an
// attacker have us email a real user a "reset" link pointing at a phishing
// domain of their choosing.
//
// Deploy: supabase functions deploy send-password-reset
// Secrets needed: RESEND_API_KEY, RESEND_FROM_EMAIL (optional), SITE_URL

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email } = await req.json()
    if (!email) {
      return new Response(JSON.stringify({ error: 'email is required' }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    )

    const { data: user } = await supabaseAdmin
      .from('User')
      .select('userID, firstName, email')
      .ilike('email', email.trim())
      .maybeSingle()

    // Always respond success-shaped whether or not the email is registered —
    // avoids leaking which emails exist in the system.
    if (!user) {
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders })
    }

    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()

    await supabaseAdmin
      .from('User')
      .update({ passwordResetToken: token, passwordResetExpiresAt: expiresAt })
      .eq('userID', user.userID)

    const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:5173'
    const resetLink = `${siteUrl}/reset-password?token=${token}`

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev',
        to: user.email,
        subject: 'Reset your Harit Kheti password',
        html: `
          <div style="font-family:sans-serif;color:#263a1b;">
            <h2>Reset your password${user.firstName ? `, ${user.firstName}` : ''}</h2>
            <p>Click the link below to set a new password. This link expires in 30 minutes.</p>
            <p><a href="${resetLink}" style="color:#497230;font-weight:bold;">Reset my password</a></p>
            <p style="color:#6c4624;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
      }),
    })

    if (!resendResponse.ok) {
      const resendData = await resendResponse.json()
      return new Response(JSON.stringify({ error: resendData }), { status: 502, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
  }
})
