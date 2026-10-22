import React, { useEffect, useState } from 'react';

export default function ItemThumb({ item, size = 36 }) {
  const src = item?.image;
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [src]);
  if (src && !imageFailed) {
    return (
      <img
        src={src}
        alt={item?.name || 'item'}
        onError={() => setImageFailed(true)}
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
          borderRadius: 8,
          background: '#0f172a',
          flexShrink: 0
        }}
      />
    );
  }
  return (
    <span role="img" aria-label={item?.name || 'item'} style={{ fontSize: size * 0.7, width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {item?.icon || '🥤'}
    </span>
  );
}
