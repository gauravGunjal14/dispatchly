const User = require('../models/User');
const TechnicianProfile = require('../models/TechnicianProfile');
const TechnicianDocument = require('../models/TechnicianDocument');
const { generateTokens, verifyRefreshToken } = require('../config/jwt');

const DEMO_ACCOUNTS = {
  'admin@dispatchly.com': {
    name: 'Operations Dispatcher',
    role: 'admin',
    phone: '+1 415-555-0100',
  },
  'customer@dispatchly.com': {
    name: 'Alice Customer',
    role: 'customer',
    phone: '+1 415-555-0101',
  },
  'bob.customer@dispatchly.com': {
    name: 'Bob Customer',
    role: 'customer',
    phone: '+1 415-555-0102',
  },
  'mike.customer@dispatchly.com': {
    name: 'Mike Vance',
    role: 'customer',
    phone: '+1 415-555-0103',
  },
  'plumber@dispatchly.com': {
    name: 'David Plumber',
    role: 'technician',
    phone: '+1 415-555-0111',
    category: ['plumbing'],
    status: 'approved',
  },
  'sam.plumber@dispatchly.com': {
    name: 'Sam Plumber',
    role: 'technician',
    phone: '+1 415-555-0112',
    category: ['plumbing'],
    status: 'pending',
  },
  'hvac@dispatchly.com': {
    name: 'Marcus HVAC',
    role: 'technician',
    phone: '+1 415-555-0113',
    category: ['hvac'],
    status: 'approved',
  },
  'courier@dispatchly.com': {
    name: 'Carlos Driver',
    role: 'technician',
    phone: '+1 415-555-0114',
    category: ['delivery'],
    status: 'approved',
  },
};

const register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: { code: 'EMAIL_ALREADY_EXISTS', message: 'An account with this email already exists' },
      });
    }

    const user = new User({
      name,
      email,
      passwordHash: password,
      role: role || 'customer',
      phone: phone || '',
    });

    await user.save();

    const { accessToken, refreshToken } = generateTokens(user);

    return res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
      message: 'Account registered successfully',
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    let user = await User.findOne({ email }).select('+passwordHash');

    // Auto-bootstrap demo accounts on-demand if database was not yet seeded
    if (!user && DEMO_ACCOUNTS[email] && password === 'password123') {
      try {
        const demo = DEMO_ACCOUNTS[email];
        user = await User.create({
          name: demo.name,
          email,
          passwordHash: 'password123',
          role: demo.role,
          phone: demo.phone,
        });

        if (demo.role === 'technician') {
          const profile = await TechnicianProfile.create({
            user: user._id,
            serviceCategories: demo.category || ['plumbing'],
            skills: ['pipe_soldering', 'leak_detection', 'drain_cleaning'],
            qualifications: ['Certified Tradesperson License #CA-88392'],
            experienceYears: 5,
            serviceArea: {
              center: { type: 'Point', coordinates: [-122.4194, 37.7749] },
              radiusKm: 25,
            },
            currentLocation: {
              type: 'Point',
              coordinates: [-122.42, 37.775],
            },
            verificationStatus: demo.status || 'approved',
            isAvailable: demo.status === 'approved',
          });

          await TechnicianDocument.create({
            technician: profile._id,
            docType: 'trade_license',
            filePath: 'documents/trade_license_demo.pdf',
            originalName: 'trade_license_demo.pdf',
            mimeType: 'application/pdf',
            size: 2048,
            status: demo.status || 'approved',
          });
        }
      } catch (bootErr) {
        console.error('Demo auto-bootstrap error:', bootErr.message);
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCOUNT_DEACTIVATED', message: 'Your account has been deactivated' },
      });
    }

    let isMatch = await user.comparePassword(password);
    // If it's a demo account and password is password123, re-sync password hash automatically
    if (!isMatch && DEMO_ACCOUNTS[email] && password === 'password123') {
      user.passwordHash = 'password123';
      await user.save();
      isMatch = true;
    }

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
    }

    const { accessToken, refreshToken } = generateTokens(user);

    return res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
      message: 'Logged in successfully',
    });
  } catch (error) {
    next(error);
  }
};

const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token is expired or invalid' },
      });
    }

    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User does not exist or is inactive' },
      });
    }

    if (decoded.tokenVersion !== (user.tokenVersion || 0)) {
      return res.status(401).json({
        success: false,
        error: { code: 'TOKEN_REVOKED', message: 'Refresh token has been revoked' },
      });
    }

    const tokens = generateTokens(user);

    return res.json({
      success: true,
      data: {
        tokens,
      },
      message: 'Tokens refreshed successfully',
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    return res.json({
      success: true,
      data: {
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          phone: req.user.phone,
          avatar: req.user.avatar,
          createdAt: req.user.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    if (req.user) {
      req.user.tokenVersion = (req.user.tokenVersion || 0) + 1;
      await req.user.save();
    }
    return res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  refresh,
  getMe,
  logout,
};
