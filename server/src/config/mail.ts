import nodemailer, { Transporter } from "nodemailer";

const transporter: Transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "ngenx2831@gmail.com",
    pass: "iwakxdrxopazhwtl",
  },
});

export default transporter;
