'use client';

import React from 'react';

interface TrendDataPoint {
  date: string;
  value: number;
  interpretation: string;
}

interface ResultTrendChartProps {
  data: TrendDataPoint[];
  unit?: string;
  referenceMin?: number;
  referenceMax?: number;
}

export function ResultTrendChart({ data, unit, referenceMin, referenceMax }: ResultTrendChartProps) {
  if (data.length < 2) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-500">Not enough data points for trend chart</p>
      </div>
    );
  }

  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const width = 500;
  const height = 200;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values, referenceMin ?? Infinity) * 0.9;
  const maxVal = Math.max(...values, referenceMax ?? -Infinity) * 1.1;
  const range = maxVal - minVal || 1;

  const scaleX = (i: number) => padding.left + (i / (data.length - 1)) * chartWidth;
  const scaleY = (v: number) => padding.top + chartHeight - ((v - minVal) / range) * chartHeight;

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(d.value)}`).join(' ');

  const interpretColor = (interp: string) => {
    if (interp === 'CRITICAL') return '#ef4444';
    if (interp === 'ABNORMAL') return '#f59e0b';
    return '#22c55e';
  };

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-lg" preserveAspectRatio="xMidYMid meet">
        {/* Reference range band */}
        {referenceMin !== undefined && referenceMax !== undefined && (
          <rect
            x={padding.left}
            y={scaleY(referenceMax)}
            width={chartWidth}
            height={scaleY(referenceMin) - scaleY(referenceMax)}
            fill="#22c55e"
            opacity={0.1}
          />
        )}

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const val = minVal + frac * range;
          const y = scaleY(val);
          return (
            <g key={frac}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e5e7eb" strokeWidth={1} />
              <text x={padding.left - 5} y={y + 4} textAnchor="end" className="text-[10px] fill-gray-400">
                {val.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Line */}
        <path d={linePath} fill="none" stroke="#16a34a" strokeWidth={2} />

        {/* Data points */}
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={scaleX(i)} cy={scaleY(d.value)} r={5} fill={interpretColor(d.interpretation)} stroke="white" strokeWidth={2} />
            <text x={scaleX(i)} y={height - 10} textAnchor="middle" className="text-[9px] fill-gray-500">
              {new Date(d.date).toLocaleDateString('en-ZM', { month: 'short', day: 'numeric' })}
            </text>
          </g>
        ))}

        {/* Unit label */}
        {unit && (
          <text x={5} y={padding.top - 5} className="text-[10px] fill-gray-400">{unit}</text>
        )}
      </svg>
    </div>
  );
}
