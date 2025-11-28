// B1: Import thư viện Nodemailer
import nodemailer from "nodemailer";

const sendEmail = async ({ from, to, subject, text }) => {
  let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587, // Cổng cho TLS (bảo mật)
    secure: false, // true cho cổng 465, false cho các cổng khác
    auth: {
      user: "ninh56085@gmail.com", // Email Gmail của bạn
      pass: "hnsm tpfx aufa aylr", // Mật khẩu ứng dụng bạn vừa tạo
    },
  });
  let mailOptions = {
    from: from, // Email người gửi
    to: to, // Email người nhận
    subject: subject, // Tiêu đề
    text: text, // Nội dung text
    html: "<h1>Xin chào!</h1><p>Email này được gửi tự động từ <b>Node.js</b>!</p>",
  };

  try {
    // 3. Gửi email
    console.log("Đang chuẩn bị gửi email...");
    let info = await transporter.sendMail(mailOptions);

    console.log("Đã gửi email thành công!");
    console.log("Message ID:", info.messageId);
  } catch (error) {
    console.error("Lỗi khi gửi email:", error);
  }
};

export default sendEmail;
