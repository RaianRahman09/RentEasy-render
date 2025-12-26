import React from 'react';
import { buildChipStyle } from '../../utils/supportLabels';

const STATUS_STYLES = {
  open: { label: 'Open', color: '#38bdf8' },
  in_progress: { label: 'In Progress', color: '#f97316' },
  resolved: { label: 'Resolved', color: '#22c55e' },
  closed: { label: 'Closed', color: '#94a3b8' },
};

const StatusPill = ({ status, className = '' }) => {
  const config = STATUS_STYLES[status] || STATUS_STYLES.open;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${className}`}
      style={buildChipStyle(config.color, true)}
    >
      {config.label}
    </span>
  );
};

export default StatusPill;
