import jwt from 'jsonwebtoken';

export const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const generateUniqueCode = () => {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
};

export const generateQRCode = async (data) => {
  const QRCode = (await import('qrcode')).default;
  try {
    return await QRCode.toDataURL(data);
  } catch (error) {
    throw new Error('Failed to generate QR code');
  }
};
