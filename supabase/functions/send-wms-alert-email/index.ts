import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AlertEmailRequest {
  alertType: 'low_stock' | 'expiring' | 'critical';
  recipientEmail: string;
  recipientName?: string;
  alerts: Array<{
    productName: string;
    sku: string;
    quantity?: number;
    minStock?: number;
    expiryDate?: string;
    daysUntilExpiry?: number;
    locationCode?: string;
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { alertType, recipientEmail, recipientName, alerts }: AlertEmailRequest = await req.json();

    if (!recipientEmail || !alerts || alerts.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Build email content based on alert type
    let subject = '';
    let htmlContent = '';

    const baseStyles = `
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8c 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f8f9fa; padding: 20px; }
        .alert-item { background: white; border-radius: 8px; padding: 15px; margin-bottom: 10px; border-right: 4px solid; }
        .low-stock { border-color: #f59e0b; }
        .expiring { border-color: #ef4444; }
        .critical { border-color: #dc2626; }
        .product-name { font-weight: bold; font-size: 16px; margin-bottom: 5px; }
        .product-details { color: #6b7280; font-size: 14px; }
        .footer { background: #1e3a5f; color: white; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        .badge-warning { background: #fef3c7; color: #92400e; }
        .badge-danger { background: #fee2e2; color: #991b1b; }
      </style>
    `;

    if (alertType === 'low_stock') {
      subject = `🔔 تنبيه: ${alerts.length} منتج تحت الحد الأدنى للمخزون`;
      htmlContent = `
        ${baseStyles}
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">⚠️ تنبيه المخزون المنخفض</h1>
            <p style="margin: 10px 0 0;">يوجد ${alerts.length} منتج تحت الحد الأدنى للمخزون</p>
          </div>
          <div class="content">
            ${alerts.map(alert => `
              <div class="alert-item low-stock">
                <div class="product-name">${alert.productName}</div>
                <div class="product-details">
                  <span>SKU: ${alert.sku}</span> | 
                  <span>الكمية الحالية: <strong style="color: #f59e0b;">${alert.quantity}</strong></span> | 
                  <span>الحد الأدنى: ${alert.minStock}</span>
                  ${alert.locationCode ? `| <span>الموقع: ${alert.locationCode}</span>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
          <div class="footer">
            <p>تم إرسال هذا الإشعار تلقائياً من نظام إدارة المستودعات</p>
          </div>
        </div>
      `;
    } else if (alertType === 'expiring') {
      subject = `⏰ تنبيه: ${alerts.length} منتج قريب الانتهاء`;
      htmlContent = `
        ${baseStyles}
        <div class="container">
          <div class="header" style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);">
            <h1 style="margin: 0;">📅 تنبيه انتهاء الصلاحية</h1>
            <p style="margin: 10px 0 0;">يوجد ${alerts.length} منتج يحتاج إلى مراجعة</p>
          </div>
          <div class="content">
            ${alerts.map(alert => `
              <div class="alert-item expiring">
                <div class="product-name">
                  ${alert.productName}
                  <span class="badge ${(alert.daysUntilExpiry || 0) <= 0 ? 'badge-danger' : 'badge-warning'}">
                    ${(alert.daysUntilExpiry || 0) <= 0 ? 'منتهي' : `${alert.daysUntilExpiry} يوم`}
                  </span>
                </div>
                <div class="product-details">
                  <span>SKU: ${alert.sku}</span> | 
                  <span>تاريخ الانتهاء: <strong>${alert.expiryDate}</strong></span> | 
                  <span>الكمية: ${alert.quantity}</span>
                  ${alert.locationCode ? `| <span>الموقع: ${alert.locationCode}</span>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
          <div class="footer">
            <p>تم إرسال هذا الإشعار تلقائياً من نظام إدارة المستودعات</p>
          </div>
        </div>
      `;
    } else {
      subject = `🚨 تنبيه حرج: مشاكل في المستودع تتطلب اهتمام فوري`;
      htmlContent = `
        ${baseStyles}
        <div class="container">
          <div class="header" style="background: linear-gradient(135deg, #991b1b 0%, #dc2626 100%);">
            <h1 style="margin: 0;">🚨 تنبيه حرج</h1>
            <p style="margin: 10px 0 0;">يوجد مشاكل تتطلب اهتمام فوري</p>
          </div>
          <div class="content">
            ${alerts.map(alert => `
              <div class="alert-item critical">
                <div class="product-name">${alert.productName}</div>
                <div class="product-details">
                  <span>SKU: ${alert.sku}</span>
                  ${alert.quantity !== undefined ? `| <span>الكمية: ${alert.quantity}</span>` : ''}
                  ${alert.expiryDate ? `| <span>تاريخ الانتهاء: ${alert.expiryDate}</span>` : ''}
                  ${alert.locationCode ? `| <span>الموقع: ${alert.locationCode}</span>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
          <div class="footer">
            <p>تم إرسال هذا الإشعار تلقائياً من نظام إدارة المستودعات</p>
          </div>
        </div>
      `;
    }

    const emailResponse = await resend.emails.send({
      from: "WMS Alerts <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-wms-alert-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
