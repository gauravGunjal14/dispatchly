/**
 * Notification Controller
 * Handles paginated notification feeds and read acknowledgement.
 */

const { getUserNotifications, markAsRead } = require('../services/notificationService');

const getMyNotifications = async (req, res, next) => {
  try {
    const { page, limit, unreadOnly } = req.query;
    const result = await getUserNotifications(req.user._id, {
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      unreadOnly: unreadOnly === 'true' || unreadOnly === true,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const markNotificationsRead = async (req, res, next) => {
  try {
    const { id, all } = req.body;
    const notificationId = all ? null : id;

    const result = await markAsRead(req.user._id, notificationId);

    return res.json({
      success: true,
      data: result,
      message: 'Notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyNotifications,
  markNotificationsRead,
};
