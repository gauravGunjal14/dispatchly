/**
 * Notification Service
 * Creates and delivers real-time user and dispatcher notifications.
 */

const Notification = require('../models/Notification');
const User = require('../models/User');
const { emitToUser, emitToAdmin } = require('./socketService');

/**
 * Creates a notification for a user and pushes it via Socket.IO.
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.type
 * @param {string} params.title
 * @param {string} params.body
 * @param {object} [params.data]
 * @returns {Promise<object>}
 */
const createNotification = async ({ userId, type, title, body, data = {} }) => {
  if (!userId) return null;

  try {
    const notification = await Notification.create({
      user: userId,
      type,
      title,
      body,
      data,
    });

    emitToUser(userId, 'notification:new', {
      _id: notification._id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      createdAt: notification.createdAt,
      readAt: notification.readAt,
    });

    return notification;
  } catch (err) {
    console.error('[Notification Service Error]', err);
    return null;
  }
};

/**
 * Dispatches a notification to all administrators.
 * @param {object} params
 * @param {string} params.type
 * @param {string} params.title
 * @param {string} params.body
 * @param {object} [params.data]
 */
const notifyAdmins = async ({ type, title, body, data = {} }) => {
  try {
    const admins = await User.find({ role: 'admin' });
    const promises = admins.map((admin) =>
      createNotification({
        userId: admin._id,
        type,
        title,
        body,
        data,
      })
    );
    await Promise.all(promises);

    emitToAdmin('notification:admin', {
      type,
      title,
      body,
      data,
      createdAt: new Date(),
    });
  } catch (err) {
    console.error('[Notify Admins Error]', err);
  }
};

/**
 * Marks one or all notifications as read for a given user.
 * @param {string} userId
 * @param {string|null} notificationId
 * @returns {Promise<{ updatedCount: number }>}
 */
const markAsRead = async (userId, notificationId = null) => {
  const query = { user: userId, readAt: null };
  if (notificationId) {
    query._id = notificationId;
  }

  const result = await Notification.updateMany(query, {
    $set: { readAt: new Date() },
  });

  return { updatedCount: result.modifiedCount || 0 };
};

/**
 * Retrieves paginated notifications and unread count for a user.
 * @param {string} userId
 * @param {object} options { page, limit, unreadOnly }
 */
const getUserNotifications = async (userId, { page = 1, limit = 20, unreadOnly = false } = {}) => {
  const filter = { user: userId };
  if (unreadOnly) {
    filter.readAt = null;
  }

  const skip = (Math.max(1, page) - 1) * limit;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: userId, readAt: null }),
  ]);

  return {
    notifications,
    unreadCount,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / limit) || 1,
    },
  };
};

module.exports = {
  createNotification,
  notifyAdmins,
  markAsRead,
  getUserNotifications,
};
