import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  level?: 'L' | 'M' | 'Q' | 'H';
  className?: string;
  includeMargin?: boolean;
}

export function QRCodeDisplay({
  value,
  size = 80,
  level = 'M',
  className = '',
  includeMargin = false,
}: QRCodeDisplayProps) {
  if (!value) {
    return null;
  }

  return (
    <div className={`flex justify-center ${className}`}>
      <QRCodeSVG
        value={value}
        size={size}
        level={level}
        includeMargin={includeMargin}
        bgColor="transparent"
        fgColor="#000000"
      />
    </div>
  );
}
