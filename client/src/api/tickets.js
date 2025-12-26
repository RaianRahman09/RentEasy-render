import api from './axios';

export const createTicket = async (payload) => {
  const { data } = await api.post('/tickets', payload);
  return data;
};

export const fetchMyTickets = async (params = {}) => {
  const { data } = await api.get('/tickets/my', { params });
  return data;
};

export const fetchTicket = async (id) => {
  const { data } = await api.get(`/tickets/${id}`);
  return data;
};

export const createTicketMessage = async (id, text) => {
  const { data } = await api.post(`/tickets/${id}/messages`, { text });
  return data;
};

export const markTicketRead = async (id) => {
  const { data } = await api.post(`/tickets/${id}/read`);
  return data;
};

export const updateTicketStatus = async (id, status) => {
  const { data } = await api.patch(`/tickets/${id}/status`, { status });
  return data;
};

export const fetchAdminTickets = async (params = {}) => {
  const { data } = await api.get('/admin/tickets', { params });
  return data;
};

export const fetchLandlordTickets = async (params = {}) => {
  const { data } = await api.get('/landlord/tickets', { params });
  return data;
};

export const fetchTicketUnreadCount = async () => {
  const { data } = await api.get('/tickets/unread-count');
  return data;
};
