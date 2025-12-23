import api from './axios';

export const fetchNotifications = async ({ limit = 20, cursor } = {}) => {
  const params = { limit };
  if (cursor) params.cursor = cursor;
  const { data } = await api.get('/notifications', { params });
  return data;
};

export const fetchUnreadCount = async () => {
  const { data } = await api.get('/notifications/unread-count');
  return data;
};

export const markRead = async ({ ids }) => {
  const { data } = await api.patch('/notifications/mark-read', { ids });
  return data;
};

export const markAllRead = async () => {
  const { data } = await api.patch('/notifications/mark-read', { all: true });
  return data;
};

export const markOneRead = async (id) => {
  const { data } = await api.patch(`/notifications/${id}/read`);
  return data;
};
