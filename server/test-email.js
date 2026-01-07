const { verifyEmailConfig, sendEmail } = require('./config/email');
require('dotenv').config();

async function testEmail() {
  try {
    console.log('🧪 Testing Gmail email configuration...');
    console.log('📧 SMTP User:', process.env.SMTP_USER);
    console.log('📧 SMTP Host:', process.env.SMTP_HOST);
    console.log('📧 SMTP Port:', process.env.SMTP_PORT);
    
    // Test email configuration
    const isValid = await verifyEmailConfig();
    if (!isValid) {
      console.log('❌ Email configuration failed');
      return;
    }
    
    console.log('✅ Email configuration verified successfully');
    
    // Send test email
    console.log('📧 Sending test email...');
    const result = await sendEmail({
      to: process.env.SMTP_USER, // Send to yourself for testing
      subject: 'Test Email from Business Reporting Manager',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Test Email Successful! 🎉</h2>
          <p>This is a test email from your Business Reporting Manager application.</p>
          <p><strong>Configuration Details:</strong></p>
          <ul>
            <li>SMTP Host: ${process.env.SMTP_HOST}</li>
            <li>SMTP Port: ${process.env.SMTP_PORT}</li>
            <li>From Email: ${process.env.SMTP_USER}</li>
          </ul>
          <p>Your Gmail SMTP configuration is working correctly!</p>
          <hr style="margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            Sent from Business Reporting Manager - Oracle Database System
          </p>
        </div>
      `
    });
    
    if (result.success) {
      console.log('✅ Test email sent successfully!');
      console.log('📧 Message ID:', result.messageId);
      console.log('📧 Check your inbox:', process.env.SMTP_USER);
    } else {
      console.log('❌ Test email failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
  }
}

// Run the test
testEmail();