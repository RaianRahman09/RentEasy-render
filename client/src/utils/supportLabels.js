export const TICKET_LABELS = {
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

export const getLabelForType = (type, key) => {
  if (!type || !key) return null;
  const list = TICKET_LABELS[type] || [];
  return list.find((label) => label.key === key) || null;
};

export const hexToRgba = (hex, alpha = 0.2) => {
  if (!hex) return `rgba(148, 163, 184, ${alpha})`;
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return `rgba(148, 163, 184, ${alpha})`;
  const value = Number.parseInt(normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const buildChipStyle = (color, active = false) => ({
  borderColor: color,
  color,
  backgroundColor: hexToRgba(color, active ? 0.25 : 0.12),
});
