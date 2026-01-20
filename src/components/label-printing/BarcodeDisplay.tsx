import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeDisplayProps {
  value: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  format?: string;
  className?: string;
}

export function BarcodeDisplay({
  value,
  width = 2,
  height = 50,
  displayValue = true,
  fontSize = 12,
  format = 'CODE128',
  className = '',
}: BarcodeDisplayProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format,
          width,
          height,
          displayValue,
          fontSize,
          margin: 5,
          background: 'transparent',
          lineColor: '#000000',
          font: 'IBM Plex Sans Arabic',
          textAlign: 'center',
          textPosition: 'bottom',
          textMargin: 2,
        });
      } catch (error) {
        console.error('Barcode generation error:', error);
      }
    }
  }, [value, width, height, displayValue, fontSize, format]);

  if (!value) {
    return null;
  }

  return (
    <div className={`flex justify-center ${className}`}>
      <svg ref={svgRef} />
    </div>
  );
}
