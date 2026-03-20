import React from 'react';

const UnsavedChangesBadge = ({ visible }: { visible: boolean }) => {
  if (!visible) return null;

  return (
    <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
      Unsaved changes
    </span>
  );
};

export default UnsavedChangesBadge;
