import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendBookingConfirmation = async (booking, hotel) => {
  try {
    const mailOptions = {
      from: `"Kaara Hotels" <${process.env.EMAIL_USER}>`,
      to: booking.email,
      subject: `Booking Confirmed: ${hotel?.name || 'Kaara Hotel'}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
          <div style="background-color: #C9A15E; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Booking Confirmed!</h1>
          </div>
          <div style="padding: 20px; color: #333;">
            <p>Dear ${booking.guestName},</p>
            <p>Thank you for choosing Kaara Hotels. Your reservation at <strong>${hotel?.name || 'Kaara Gurgaon'}</strong> is confirmed.</p>
            
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #C9A15E;">Reservation Details</h3>
              <p><strong>Booking ID:</strong> ${booking.externalReservationId || booking._id}</p>
              <p><strong>Check-in:</strong> ${new Date(booking.from).toLocaleDateString()}</p>
              <p><strong>Check-out:</strong> ${new Date(booking.to).toLocaleDateString()}</p>
              <p><strong>Total Amount:</strong> ₹${booking.total}</p>
            </div>
            
            <p>We look forward to welcoming you!</p>
            <p style="margin-bottom: 0;">Warm regards,</p>
            <p style="margin-top: 5px;"><strong>The Kaara Hotels Team</strong></p>
          </div>
          <div style="background-color: #f1f1f1; padding: 15px; text-align: center; font-size: 12px; color: #777;">
            <p>© 2026 Kaara Hotels & Resorts. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Booking confirmation email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending booking confirmation email:', error);
    throw error;
  }
};
