const nodemailer = require('nodemailer');
require('dotenv').config();

const createTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER || process.env.SMTP_USER,
      pass: process.env.EMAIL_PASSWORD || process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

const verifyEmailConfig = async () => {
  try {
    const emailUser = process.env.EMAIL_USER || process.env.SMTP_USER;
    const emailPass = process.env.EMAIL_PASSWORD || process.env.SMTP_PASS;

    if (!emailUser || !emailPass) {
      console.log('⚠️  Email configuration missing - EMAIL_USER or EMAIL_PASSWORD not set');
      return false;
    }

    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Gmail SMTP connection verified successfully');
    return true;
  } catch (error) {
    console.error('❌ Gmail SMTP verification failed:', error.message);
    
    // Specific Gmail troubleshooting
    if (error.code === 'EAUTH') {
      console.log('🔧 Gmail Authentication Error - Check:');
      console.log('   1. 2-Factor Authentication is enabled');
      console.log('   2. App Password is correctly generated');
      console.log('   3. Using App Password (not regular password)');
    }
    
    return false;
  }
};

const sendEmail = async (options) => {
  try {
    const emailUser = process.env.EMAIL_USER || process.env.SMTP_USER;
    const emailPass = process.env.EMAIL_PASSWORD || process.env.SMTP_PASS;

    if (!emailUser || !emailPass) {
      console.log('⚠️  Email service not configured - skipping email send');
      return { success: false, error: 'Email service not configured' };
    }

    const transporter = createTransporter();
    
    const emailFrom = process.env.EMAIL_FROM || `"Business Reporting Manager" <${emailUser}>`;

    const emailOptions = {
      from: emailFrom,
      to: options.to,
      subject: options.subject,
      html: options.html || options.text,
      text: options.text,
      attachments: options.attachments || []
    };

    console.log('📧 Sending email to:', options.to);
    console.log('📧 Subject:', options.subject);
    
    const result = await transporter.sendMail(emailOptions);
    
    console.log('✅ Email sent successfully!');
    console.log('📧 Message ID:', result.messageId);
    
    return {
      success: true,
      messageId: result.messageId,
      response: result.response
    };
    
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    
    // Enhanced error logging for Gmail
    if (error.code === 'EAUTH') {
      console.log('🔧 Authentication failed - verify Gmail App Password');
    } else if (error.code === 'ECONNECTION') {
      console.log('🔧 Connection failed - check internet connection');
    } else if (error.code === 'EMESSAGE') {
      console.log('🔧 Message error - check email content and recipients');
    }
    
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
};

// Generate email templates
const generateEmailTemplate = (type, data) => {
  const baseStyle = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Business Reporting Manager</h1>
        <p style="color: #f0f0f0; margin: 10px 0 0 0;">Oracle Database Reporting System</p>
      </div>
      <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px;">
  `;
  
  const baseFooter = `
      </div>
      <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
        <p>This email was sent from Business Reporting Manager</p>
        <p>Oracle Database Reporting System - ${new Date().getFullYear()}</p>
      </div>
    </div>
  `;

  switch (type) {
    case 'report':
      return {
        subject: data.reportName + ' - ' + new Date().toLocaleDateString(),
        html: baseStyle + `
          <h2 style="color: #333; margin-bottom: 20px;">📊 ${data.reportName}</h2>
          <p style="color: #666; line-height: 1.6;">${data.body}</p>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; color: #495057;"><strong>Report Date:</strong> ${data.date}</p>
            <p style="margin: 5px 0 0 0; color: #495057;"><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <p style="color: #666;">Please find the report data attached as an Excel file.</p>
        ` + baseFooter
      };
      
    case 'test':
      return {
        subject: 'Test Email - Business Reporting Manager',
        html: baseStyle + `
          <h2 style="color: #28a745;">✅ Email Configuration Test Successful!</h2>
          <p style="color: #666; line-height: 1.6;">This is a test email to verify your Gmail SMTP configuration is working correctly.</p>
          <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #155724; margin: 0 0 10px 0;">Configuration Details:</h3>
            <ul style="color: #155724; margin: 0; padding-left: 20px;">
              <li>SMTP Host: ${process.env.SMTP_HOST}</li>
              <li>SMTP Port: ${process.env.SMTP_PORT}</li>
              <li>From Email: ${process.env.SMTP_USER}</li>
              <li>Test Time: ${new Date().toLocaleString()}</li>
            </ul>
          </div>
          <p style="color: #666;">Your Gmail SMTP configuration is working perfectly! 🎉</p>
        ` + baseFooter
      };
      
    default:
      return {
        subject: data.subject || 'Business Reporting Manager Notification',
        html: baseStyle + `
          <h2 style="color: #333;">${data.title || 'Notification'}</h2>
          <p style="color: #666; line-height: 1.6;">${data.message || data.body}</p>
        ` + baseFooter
      };
  }
};

module.exports = {
  verifyEmailConfig,
  sendEmail,
  generateEmailTemplate
};