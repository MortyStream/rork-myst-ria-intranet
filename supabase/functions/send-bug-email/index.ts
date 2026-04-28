import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { subject, body, screenshotUrls } = await req.json();

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured in Supabase secrets");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build HTML body
    const htmlBody = buildHtmlEmail(body, screenshotUrls ?? []);

    const emailPayload = {
      from: "Mystéria Intranet <noreply@mysteriaevent.ch>",
      to: ["Kevin.perret@mysteriaevent.ch"],
      subject,
      html: htmlBody,
      text: body,
    };

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend API error:", data);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: data }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: error.message ?? "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function buildHtmlEmail(body: string, screenshotUrls: string[]): string {
  const escapedBody = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");

  let screenshotsSection = "";
  if (screenshotUrls.length > 0) {
    const images = screenshotUrls
      .map(
        (url) =>
          `<div style="margin-bottom:12px;">
            <img src="${url}" alt="Capture d'écran" style="max-width:320px;border-radius:8px;border:1px solid #e0e0e0;" />
          </div>`
      )
      .join("");

    screenshotsSection = `
      <hr style="border:none;border-top:1px solid #e0e0e0;margin:24px 0;" />
      <p style="font-weight:600;margin-bottom:12px;">📷 Captures d'écran jointes :</p>
      ${images}
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8" /></head>
    <body style="font-family: Arial, sans-serif; font-size: 14px; color: #333; max-width: 600px; margin: 0 auto; padding: 24px;">
      <div style="background: #f03e3e; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
        <h2 style="margin:0;">🐛 Rapport de bug — Mystéria Intranet</h2>
      </div>
      <div style="background: #fff; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px; padding: 24px;">
        <p style="white-space: pre-wrap;">${escapedBody}</p>
        ${screenshotsSection}
        <hr style="border:none;border-top:1px solid #e0e0e0;margin:24px 0;" />
        <p style="color:#999;font-size:12px;">Envoyé automatiquement depuis l'app Mystéria Intranet</p>
      </div>
    </body>
    </html>
  `;
}
