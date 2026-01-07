import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Checking for scheduled reports to send...');

    const { data: reports, error: reportsError } = await supabase
      .from('auto_mail_reports')
      .select('*')
      .eq('is_active', true)
      .lte('next_run_at', new Date().toISOString());

    if (reportsError) {
      console.error('Error fetching reports:', reportsError);
      throw reportsError;
    }

    console.log(`Found ${reports?.length || 0} reports to process`);

    const results = [];

    for (const report of reports || []) {
      try {
        console.log(`Processing report: ${report.report_name} (ID: ${report.id})`);

        const { data: queryResult, error: queryError } = await supabase
          .rpc('execute_sql', { query: report.query_text });

        if (queryError) {
          console.error(`Query error for report ${report.id}:`, queryError);
          results.push({
            reportId: report.id,
            success: false,
            error: `Query failed: ${queryError.message}`,
          });
          continue;
        }

        if (!queryResult || queryResult.length === 0) {
          console.log(`No data returned for report ${report.id}`);
          results.push({
            reportId: report.id,
            success: false,
            error: 'No data returned from query',
          });
          continue;
        }

        const extractedData = queryResult.map((row: any) => row.result);
        const headers = Object.keys(extractedData[0]);

        const defaultHtmlBody = `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
                  ${report.report_name}
                </h2>
                <p style="margin: 20px 0;">
                  This is your scheduled report generated on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}.
                </p>
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <p style="margin: 5px 0;"><strong>Report Name:</strong> ${report.report_name}</p>
                  <p style="margin: 5px 0;"><strong>Frequency:</strong> ${report.schedule_frequency}</p>
                  <p style="margin: 5px 0;"><strong>Records:</strong> ${extractedData.length}</p>
                </div>
                <p style="margin: 20px 0;">
                  Please find the complete report data in the attached CSV file.
                </p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                <p style="font-size: 12px; color: #6b7280;">
                  This is an automated email. Please do not reply to this message.
                </p>
              </div>
            </body>
          </html>
        `;

        const emailData = {
          to: report.mail_to,
          from: report.mail_from || Deno.env.get('GMAIL_USER') || 'manishwakade10@gmail.com',
          subject: report.mail_subject || `Scheduled Report: ${report.report_name}`,
          htmlBody: report.mail_body || defaultHtmlBody,
          excelData: {
            filename: `${report.report_name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`,
            data: extractedData,
            headers: headers,
          },
        };

        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-report-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify(emailData),
        });

        if (!emailResponse.ok) {
          const errorData = await emailResponse.json();
          console.error(`Email sending failed for report ${report.id}:`, errorData);
          results.push({
            reportId: report.id,
            success: false,
            error: `Email failed: ${errorData.error || 'Unknown error'}`,
          });
          continue;
        }

        const nextRun = calculateNextRun(report.schedule_frequency, report.schedule_time, report.schedule_day);

        const { error: updateError } = await supabase
          .from('auto_mail_reports')
          .update({
            last_run_at: new Date().toISOString(),
            next_run_at: nextRun,
          })
          .eq('id', report.id);

        if (updateError) {
          console.error(`Error updating report ${report.id}:`, updateError);
        }

        results.push({
          reportId: report.id,
          reportName: report.report_name,
          success: true,
          recordsSent: extractedData.length,
          nextRun: nextRun,
        });

        console.log(`Successfully processed report ${report.id}`);
      } catch (error: any) {
        console.error(`Error processing report ${report.id}:`, error);
        results.push({
          reportId: report.id,
          success: false,
          error: error.message || 'Unknown error',
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.length} report(s)`,
        results: results,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Error in process-scheduled-reports:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to process scheduled reports',
        details: error.toString(),
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

function calculateNextRun(frequency: string, time: string, day?: string): string {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;

  const [hours, minutes] = time.split(':').map(Number);

  const nowUTC = now.getTime();
  const nowIST = new Date(nowUTC + istOffset);

  const year = nowIST.getUTCFullYear();
  const month = nowIST.getUTCMonth();
  const date = nowIST.getUTCDate();

  let nextRunIST = new Date(Date.UTC(year, month, date, hours, minutes, 0, 0));

  switch (frequency) {
    case 'daily':
      if (nextRunIST.getTime() <= nowIST.getTime()) {
        nextRunIST = new Date(nextRunIST.getTime() + 24 * 60 * 60 * 1000);
      }
      break;

    case 'weekly':
      const targetDay = day === 'monday' ? 1 : 0;
      while (nextRunIST.getUTCDay() !== targetDay || nextRunIST.getTime() <= nowIST.getTime()) {
        nextRunIST = new Date(nextRunIST.getTime() + 24 * 60 * 60 * 1000);
      }
      break;

    case 'monthly':
      nextRunIST.setUTCDate(1);
      if (nextRunIST.getTime() <= nowIST.getTime()) {
        nextRunIST.setUTCMonth(nextRunIST.getUTCMonth() + 1);
      }
      break;

    case 'quarterly':
      nextRunIST.setUTCDate(1);
      const currentMonth = nextRunIST.getUTCMonth();
      const nextQuarterMonth = Math.floor(currentMonth / 3) * 3 + 3;
      nextRunIST.setUTCMonth(nextQuarterMonth);
      if (nextRunIST.getTime() <= nowIST.getTime()) {
        nextRunIST.setUTCMonth(nextRunIST.getUTCMonth() + 3);
      }
      break;
  }

  const nextRunUTC = new Date(nextRunIST.getTime() - istOffset);
  return nextRunUTC.toISOString();
}
