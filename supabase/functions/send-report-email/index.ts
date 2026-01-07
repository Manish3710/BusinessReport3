import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRequest {
  to: string[];
  from: string;
  subject: string;
  htmlBody: string;
  excelData: {
    filename: string;
    data: any[];
    headers: string[];
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const emailRequest: EmailRequest = await req.json();

    if (!emailRequest.to || emailRequest.to.length === 0) {
      throw new Error('No recipients specified');
    }

    if (!emailRequest.excelData || !emailRequest.excelData.data) {
      throw new Error('No data provided for email attachment');
    }

    // Convert data to CSV format
    const csvContent = convertToCSV(emailRequest.excelData.headers, emailRequest.excelData.data);

    // Get Gmail credentials from environment
    const gmailUser = Deno.env.get('GMAIL_USER') || 'manishwakade10@gmail.com';
    const gmailAppPassword = Deno.env.get('GMAIL_APP_PASSWORD');

    if (!gmailAppPassword) {
      throw new Error('Gmail app password not configured. Please set GMAIL_APP_PASSWORD environment variable.');
    }

    // Send email using Gmail SMTP
    const result = await sendEmailWithSMTP({
      to: emailRequest.to,
      from: emailRequest.from || gmailUser,
      subject: emailRequest.subject,
      htmlBody: emailRequest.htmlBody,
      attachmentName: emailRequest.excelData.filename,
      attachmentContent: csvContent,
      smtpConfig: {
        host: 'smtp.gmail.com',
        port: 587,
        username: gmailUser,
        password: gmailAppPassword,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Email sent successfully to ${emailRequest.to.length} recipient(s)`,
        recipients: emailRequest.to,
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
    console.error('Error in send-report-email function:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to send email',
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

function convertToCSV(headers: string[], data: any[]): string {
  const rows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    rows.push(values.join(','));
  }

  return rows.join('\r\n');
}

interface SMTPConfig {
  host: string;
  port: number;
  username: string;
  password: string;
}

interface EmailOptions {
  to: string[];
  from: string;
  subject: string;
  htmlBody: string;
  attachmentName: string;
  attachmentContent: string;
  smtpConfig: SMTPConfig;
}

async function sendEmailWithSMTP(options: EmailOptions): Promise<void> {
  const { to, from, subject, htmlBody, attachmentName, attachmentContent, smtpConfig } = options;

  // Create multipart email with attachment
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const base64Attachment = btoa(attachmentContent);

  const emailMessage = [
    `From: ${from}`,
    `To: ${to.join(', ')}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: quoted-printable',
    '',
    htmlBody,
    '',
    `--${boundary}`,
    `Content-Type: text/csv; name="${attachmentName}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${attachmentName}"`,
    '',
    base64Attachment,
    '',
    `--${boundary}--`,
  ].join('\r\n');

  try {
    // Connect to SMTP server
    console.log(`Connecting to ${smtpConfig.host}:${smtpConfig.port}...`);
    const conn = await Deno.connect({
      hostname: smtpConfig.host,
      port: smtpConfig.port,
    });

    // Read initial greeting
    await readSMTPResponse(conn);

    // EHLO command
    await sendSMTPCommand(conn, `EHLO ${smtpConfig.host}\r\n`);

    // STARTTLS command
    await sendSMTPCommand(conn, 'STARTTLS\r\n');

    // Upgrade to TLS
    console.log('Upgrading to TLS...');
    const tlsConn = await Deno.startTls(conn, { hostname: smtpConfig.host });

    // EHLO again after TLS
    await sendSMTPCommand(tlsConn, `EHLO ${smtpConfig.host}\r\n`);

    // AUTH LOGIN
    await sendSMTPCommand(tlsConn, 'AUTH LOGIN\r\n');
    await sendSMTPCommand(tlsConn, `${btoa(smtpConfig.username)}\r\n`);
    await sendSMTPCommand(tlsConn, `${btoa(smtpConfig.password)}\r\n`);

    // MAIL FROM
    await sendSMTPCommand(tlsConn, `MAIL FROM:<${from}>\r\n`);

    // RCPT TO for each recipient
    for (const recipient of to) {
      await sendSMTPCommand(tlsConn, `RCPT TO:<${recipient}>\r\n`);
    }

    // DATA command
    await sendSMTPCommand(tlsConn, 'DATA\r\n');

    // Send email content
    await sendSMTPCommand(tlsConn, `${emailMessage}\r\n.\r\n`);

    // QUIT
    await sendSMTPCommand(tlsConn, 'QUIT\r\n');

    tlsConn.close();
    console.log('Email sent successfully!');
  } catch (error) {
    console.error('SMTP Error:', error);
    throw new Error(`SMTP Error: ${error.message}`);
  }
}

async function sendSMTPCommand(conn: Deno.Conn, command: string): Promise<string> {
  const encoder = new TextEncoder();
  await conn.write(encoder.encode(command));
  return await readSMTPResponse(conn);
}

async function readSMTPResponse(conn: Deno.Conn): Promise<string> {
  const decoder = new TextDecoder();
  const buffer = new Uint8Array(4096);
  const bytesRead = await conn.read(buffer);

  if (!bytesRead) {
    throw new Error('Connection closed by server');
  }

  const response = decoder.decode(buffer.subarray(0, bytesRead));
  console.log('SMTP Response:', response.trim());

  // Check for error responses (4xx or 5xx)
  const statusCode = response.substring(0, 3);
  if (statusCode.startsWith('4') || statusCode.startsWith('5')) {
    throw new Error(`SMTP Error: ${response.trim()}`);
  }

  return response;
}
