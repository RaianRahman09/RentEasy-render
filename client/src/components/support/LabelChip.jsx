import React from 'react';
import { buildChipStyle } from '../../utils/supportLabels';

const LabelChip = ({ label, className = '' }) => {
  if (!label) return null;
  const color = label.color || label.labelColor || '#94a3b8';
  const name = label.name || label.labelName || label.labelKey || label.key;
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${className}`}
      style={buildChipStyle(color, true)}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {name}
    </span>
  );
};

export default LabelChip;
