import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { contactSchema } from '@/lib/validators';

export async function POST(req: NextRequest) {
  const parsed = contactSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 422 });
  }
  const { name, email, subject, message } = parsed.data;

  try {
    const transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
      port:   Number(process.env.SMTP_PORT) || 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from:    `"Portfolio Thomas" <${process.env.SMTP_USER}>`,
      to:      process.env.CONTACT_EMAIL || 'leloupthomas.pro@gmail.com',
      replyTo: email,
      subject: `[Portfolio] ${subject} — ${name}`,
      text:    `De: ${name} (${email})\n\n${message}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#7C3AED">Nouveau message — Portfolio</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px;font-weight:bold;width:100px">Nom</td><td>${name}</td></tr>
            <tr><td style="padding:8px;font-weight:bold">Email</td><td><a href="mailto:${email}">${email}</a></td></tr>
            <tr><td style="padding:8px;font-weight:bold">Objet</td><td>${subject}</td></tr>
          </table>
          <div style="margin-top:20px;padding:16px;background:#f5f5f5;border-radius:8px;white-space:pre-wrap">${message}</div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Email error:', err);
    return NextResponse.json({ error: 'Erreur envoi email' }, { status: 500 });
  }
}
