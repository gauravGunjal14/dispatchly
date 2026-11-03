const jwt = require('jsonwebtoken');

const getAccessSecret = () => process.env.JWT_ACCESS_SECRET || 'default_access_secret_12345';
const getRefreshSecret = () => process.env.JWT_REFRESH_SECRET || 'default_refresh_secret_67890';
const getAccessExpiry = () => process.env.JWT_ACCESS_EXPIRY || '15m';
const getRefreshExpiry = () => process.env.JWT_REFRESH_EXPIRY || '7d';

const generateTokens = (user) => {
  const payload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
    name: user.name,
    tokenVersion: user.tokenVersion || 0,
  };

  const accessToken = jwt.sign(payload, getAccessSecret(), {
    expiresIn: getAccessExpiry(),
  });

  const refreshToken = jwt.sign(
    { userId: user._id.toString(), tokenVersion: user.tokenVersion || 0 },
    getRefreshSecret(),
    { expiresIn: getRefreshExpiry() }
  );

  return { accessToken, refreshToken };
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, getAccessSecret());
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, getRefreshSecret());
};

module.exports = {
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
};
