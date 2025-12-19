const nodemailer = require('nodemailer');

const mailUser = process.env.EMAIL_USER;
// Google app passwords are shown with spaces; strip them for reliability.
const mailPass = (process.env.EMAIL_PASS || 'iwsm fjmi dikn glei').replace(/\s+/g, '');
const mailFrom = process.env.EMAIL_FROM || mailUser;

const transporter =
  mailUser && mailPass
    ? nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: mailUser,
          pass: mailPass,
        },
      })
    : null;

const sendMail = async ({ to, subject, html }) => {
  if (!transporter || !mailUser) {
    console.error('Email not sent: EMAIL_USER (and optional EMAIL_PASS) not configured.');
    return;
  }
  try {
    await transporter.sendMail({
      from: mailFrom,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error('Email send failed', err);
  }
};

module.exports = { sendMail };
