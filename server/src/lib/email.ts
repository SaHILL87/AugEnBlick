import ejs from "ejs";
import nodemailer from "nodemailer";
import transporter from "../config/mail";

// Utility function to send emails
export const sendEmail = async (
  to: string,
  subject: string,
  templatePath: string,
  templateData: Record<string, any>
): Promise<void> => {
  try {
    const html = await ejs.renderFile(templatePath, templateData);

    const mailOptions: nodemailer.SendMailOptions = {
      from: "ngenx2831@gmail.com",
      to,
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

export const sendVerification = async (
  to: string,
  code: number
): Promise<void> => {
  try {
    const mailOptions: nodemailer.SendMailOptions = {
      from: "ngenx2831@gmail.com",
      to,
      subject: "Email Verification",
      html: `<!DOCTYPE html>
<html>
  <head>
      <link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Chonburi&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap" rel="stylesheet">

    <style>
      .chonburi-regular {
  font-family: "Chonburi", serif;
  font-weight: 400;
  font-style: normal;
}
      body {
        font-family: 'Inter', sans-serif;
        line-height: 1.6;
        color: #333333;
        margin: 0;
        padding: 0;
        background-color: #f9f9f9;
      }
      .email-container {
        max-width: 600px;
        margin: 20px auto;
        background: #ffffff;
        border-radius: 8px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        overflow: hidden;
        text-align: center;
        padding: 20px;
      }
      .email-header {
        background: #ff0073;
        color: #ffffff;
        padding: 20px;
        border-radius: 8px 8px 0 0;
        font-size: 24px;
        font-weight: bold;
      }
      .email-content {
        padding: 20px;
        font-size: 18px;
      }
      .verification-code {
        display: inline-block;
        background: #f1f1f1;
        color: #333333;
        font-size: 32px;
        font-weight: bold;
        padding: 10px 20px;
        border-radius: 5px;
        margin: 20px 0;
        letter-spacing: 2px;
      }
      .email-footer {
        margin-top: 20px;
        font-size: 14px;
        color: #666666;
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <!-- Header -->
      <div class="email-header">
        Your Verification Code
      </div>

      <!-- Content -->
      <div class="email-content">
        <p>Use the code below to verify your account:</p>
        <div class="verification-code">${code}</div>
        <p>
          Please note: This code is valid for the next 10 minutes. If you didn't request this, you can safely ignore this email.
        </p>
      </div>

      <!-- Footer -->
      <div class="email-footer">
        <p>Thank you for choosing <span class="chonburi-regular"><strong class="chonburi-regular">yaadein</strong></p>!</span>
      </div>
    </div>
  </body>
</html>
`,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

export const sendCapsuleEmail = async ({
  email,
  creatorName,
  creatorEmail,
  title,
  description,
  unlockDate,
  accessLink,
  accessCode,
  isPermanentLock,
  message,
}: {
  email: string;
  creatorName: string;
  creatorEmail: string;
  title: string;
  description: string;
  unlockDate: Date;
  accessLink?: string;
  accessCode?: string;
  isPermanentLock?: boolean;
  message: string;
}) => {
  const emailContent = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <p>Hello,</p>
      <p>${creatorName} (${creatorEmail}) has shared a Time Capsule with you.</p>
      <h3>${title}</h3>
      <p>${description}</p>
      <p><strong>Unlock Date:</strong> ${new Date(
        unlockDate
      ).toLocaleString()}</p>
      <p>${message}</p>
      ${
        isPermanentLock
          ? `<p>The Time Capsule is <strong>permanently locked</strong>. No further access codes are required.</p>`
          : `
            ${
              accessLink
                ? `<p><strong>Access Link:</strong> <a href="${accessLink}" target="_blank">${accessLink}</a></p>`
                : ""
            }
            ${
              accessCode
                ? `<p><strong>Access Code:</strong> ${accessCode}</p>`
                : ""
            }
          `
      }
      <p>If you have any questions, please reach out to ${creatorName} at ${creatorEmail}.</p>
      <p>Thank you!</p>
    </div>
  `;

  const mailOptions = {
    from: `"Time Capsule" <"ngenx2831@gmail.com">`,
    to: email,
    subject: `You’ve been invited to the Time Capsule: ${title}`,
    html: emailContent,
  };

  await transporter.sendMail(mailOptions);
};

export const sendCollaboratorEmail = async ({
  creatorEmail,
  creatorName,
  description,
  email,
  message,
  title,
  accessLink,
}: {
  email: string;
  creatorName: string;
  creatorEmail: string;
  title: string;
  description: string;
  message: string;
  accessLink?: string;
}) => {
  const emailContent = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <p>Hello,</p>
      <p>${creatorName} (${creatorEmail}) has invited you to collaborate on a Time Capsule.</p>
      <h3>${title}</h3>
      <p>${description}</p>
      <p>${message}</p>
      ${
        accessLink
          ? `<p><strong>Access Link:</strong> <a href="${accessLink}" target="_blank">${accessLink}</a></p>`
          : ""
      }
      <p>If you have any questions, please reach out to ${creatorName} at ${creatorEmail}.</p>
      <p>Thank you!</p>
    </div>
  `;

  const mailOptions = {
    from: `"Time Capsule" <"ngenx2831@gmail.com">`,
    to: email,
    subject: `You’ve been invited to the Time Capsule: ${title}`,
    html: emailContent,
  };

  await transporter.sendMail(mailOptions);
};
