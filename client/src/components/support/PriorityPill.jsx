import React from 'react';
import { buildChipStyle } from '../../utils/supportLabels';

const PRIORITY_STYLES = {
  low: { label: 'Low', color: '#22c55e' },
  medium: { label: 'Medium', color: '#f97316' },
  high: { label: 'High', color: '#ef4444' },
};

const PriorityPill = ({ priority, className = '' }) => {
  const config = PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${className}`}
      style={buildChipStyle(config.color, true)}
    >
      {config.label}
    </span>
  );
};

export default PriorityPill;
