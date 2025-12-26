const TICKET_LABELS = {
  technical: [
    { key: 'bug', name: 'Bug', color: '#ef4444' },
    { key: 'payment', name: 'Payment', color: '#f97316' },
    { key: 'login/auth', name: 'Login/Auth', color: '#8b5cf6' },
    { key: 'performance', name: 'Performance', color: '#3b82f6' },
    { key: 'feature-request', name: 'Feature Request', color: '#22c55e' },
    { key: 'ui/ux', name: 'UI/UX', color: '#14b8a6' },
  ],
  property: [
    { key: 'plumbing', name: 'Plumbing', color: '#3b82f6' },
    { key: 'electrical', name: 'Electrical', color: '#facc15' },
    { key: 'appliance', name: 'Appliance', color: '#f97316' },
    { key: 'cleanliness', name: 'Cleanliness', color: '#14b8a6' },
    { key: 'security/safety', name: 'Security/Safety', color: '#ef4444' },
    { key: 'noise/neighbors', name: 'Noise/Neighbors', color: '#8b5cf6' },
    { key: 'other', name: 'Other', color: '#94a3b8' },
  ],
};

const getLabelForType = (type, key) => {
  if (!type || !key) return null;
  const list = TICKET_LABELS[type] || [];
  return list.find((label) => label.key === key) || null;
};

module.exports = { TICKET_LABELS, getLabelForType };
