const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const { createNotification } = require('../services/notificationService');

const countUnread = (userId) => Notification.countDocuments({ userId, isRead: false });

exports.listNotifications = async (req, res) => {
  try {
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || 20, 50);
    const query = { userId: req.user.id };
    if (req.query.cursor) {
      const cursorDate = new Date(req.query.cursor);
      if (Number.isNaN(cursorDate.getTime())) {
        return res.status(400).json({ message: 'Invalid cursor' });
      }
      query.createdAt = { $lt: cursorDate };
    }

    const results = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1);
    const hasMore = results.length > limit;
    const notifications = hasMore ? results.slice(0, limit) : results;
    const nextCursor = hasMore ? notifications[notifications.length - 1].createdAt.toISOString() : null;

    return res.json({ notifications, nextCursor });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load notifications' });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await countUnread(req.user.id);
    return res.json({ unreadCount });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load unread count' });
  }
};

exports.markRead = async (req, res) => {
  try {
    const { ids, all } = req.body || {};
    const userId = req.user.id;

    if (all) {
      await Notification.updateMany({ userId, isRead: false }, { $set: { isRead: true } });
    } else if (Array.isArray(ids) && ids.length) {
      const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
      if (!validIds.length) {
        return res.status(400).json({ message: 'No valid notification ids' });
      }
      await Notification.updateMany({ userId, _id: { $in: validIds } }, { $set: { isRead: true } });
    } else {
      return res.status(400).json({ message: 'Provide ids or all:true' });
    }

    const unreadCount = await countUnread(userId);
    return res.json({ unreadCount });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to mark notifications as read' });
  }
};

exports.markOneRead = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid notification id' });
    }
    const userId = req.user.id;

    const updated = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { $set: { isRead: true } },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    const unreadCount = await countUnread(userId);
    return res.json({ unreadCount });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to mark notification as read' });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid notification id' });
    }

    const deleted = await Notification.findOneAndDelete({ _id: id, userId: req.user.id });
    if (!deleted) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    return res.json({ message: 'Notification deleted' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to delete notification' });
  }
};

exports.createDevNotification = async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ message: 'Not found' });
  }

  try {
    const {
      type = 'SUPPORT',
      title = 'Test notification',
      body = '',
      link = '/',
      metadata,
      eventType,
      eventId,
    } = req.body || {};
    const { notification } = await createNotification({
      userId: req.user.id,
      actorId: req.user.id,
      type,
      eventType: eventType || 'DEV_NOTIFICATION',
      eventId: eventId || `${req.user.id}:${Date.now()}`,
      title,
      body,
      link,
      metadata,
    });

    return res.status(201).json({ notification });
  } catch (err) {
    console.error(err);
    return res.status(err.status || 500).json({ message: err.message || 'Failed to create notification' });
  }
};
