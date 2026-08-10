// Supabase Edge Function: sends an order-confirmation email via Resend.
//
// Deliberately takes only { orderId } from the client — the order and the
// recipient's email are both looked up here with the service-role key, so a
// caller can never make this send to an arbitrary address; it only ever
// sends to whatever email is already on file for that order's owner.
//
// Deploy: supabase functions deploy send-order-confirmation
// Secrets needed: RESEND_API_KEY, RESEND_FROM_EMAIL (see project README/plan for exact steps)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function renderEmailHtml({ firstName, orderId, items, billAmount }) {
  const rows = items
    .map(
      (item) =>
        `<tr><td style="padding:4px 8px;">${item.name}</td><td style="padding:4px 8px;">${item.quantity}</td><td style="padding:4px 8px;">₹${item.price}</td></tr>`
    )
    .join('')

  return `
    <div style="font-family:sans-serif;color:#263a1b;">
      <h2>Thanks for your order${firstName ? `, ${firstName}` : ''}!</h2>
      <p style="color:#6c4624;font-size:13px;">Order ID: ${orderId}</p>
      <table style="border-collapse:collapse;width:100%;max-width:420px;">
        <thead>
          <tr style="text-align:left;border-bottom:1px solid #c6ddb2;">
            <th style="padding:4px 8px;">Item</th>
            <th style="padding:4px 8px;">Qty</th>
            <th style="padding:4px 8px;">Price</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top:12px;font-size:16px;"><strong>Total: ₹${Number(billAmount).toFixed(0)}</strong></p>
      <p style="color:#497230;">We're getting your organic order ready. Thanks for shopping with Harit Kheti!</p>
    </div>
  `
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { orderId } = await req.json()
    if (!orderId) {
      return new Response(JSON.stringify({ error: 'orderId is required' }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    )

    const { data: order, error: orderError } = await supabaseAdmin
      .from('Order')
      .select('orderID, billAmount, productBasket, userID')
      .eq('orderID', orderId)
      .maybeSingle()

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: corsHeaders,
      })
    }

    const { data: user } = await supabaseAdmin
      .from('User')
      .select('email, firstName')
      .eq('userID', order.userID)
      .maybeSingle()

    if (!user?.email) {
      return new Response(JSON.stringify({ skipped: true, reason: 'No email on file for this user' }), {
        status: 200,
        headers: corsHeaders,
      })
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev',
        to: user.email,
        subject: `Order confirmed — ${order.orderID}`,
        html: renderEmailHtml({
          firstName: user.firstName,
          orderId: order.orderID,
          items: order.productBasket || [],
          billAmount: order.billAmount,
        }),
      }),
    })

    const resendData = await resendResponse.json()
    if (!resendResponse.ok) {
      return new Response(JSON.stringify({ error: resendData }), { status: 502, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ success: true, id: resendData.id }), {
      status: 200,
      headers: corsHeaders,
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
  }
})
