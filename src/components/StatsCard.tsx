import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: 'primary' | 'secondary' | 'accent' | 'success' | 'warning';
}

const colorClasses = {
  primary: {
    bg: 'bg-primary/10',
    border: 'border-primary/30',
    text: 'text-primary',
    glow: 'group-hover:shadow-glow-primary',
  },
  secondary: {
    bg: 'bg-secondary/10',
    border: 'border-secondary/30',
    text: 'text-secondary',
    glow: 'group-hover:shadow-[0_0_20px_rgba(56,189,248,0.3)]',
  },
  accent: {
    bg: 'bg-accent/10',
    border: 'border-accent/30',
    text: 'text-accent',
    glow: 'group-hover:shadow-[0_0_20px_rgba(244,114,182,0.3)]',
  },
  success: {
    bg: 'bg-success/10',
    border: 'border-success/30',
    text: 'text-success',
    glow: 'group-hover:shadow-glow-success',
  },
  warning: {
    bg: 'bg-warning/10',
    border: 'border-warning/30',
    text: 'text-warning',
    glow: 'group-hover:shadow-glow-warning',
  },
};

export const StatsCard: React.FC<StatsCardProps> = ({
  icon: Icon,
  label,
  value,
  subValue,
  trend,
  color,
}) => {
  const colors = colorClasses[color];

  return (
    <div className={`group relative p-5 rounded-2xl glass-elevated border border-border hover:border-${color}/30 transition-all duration-300 ${colors.glow}`}>
      {/* Background glow */}
      <div className={`absolute inset-0 rounded-2xl ${colors.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      
      <div className="relative">
        {/* Icon */}
        <div className={`inline-flex p-3 rounded-xl ${colors.bg} ${colors.border} border mb-4`}>
          <Icon className={`w-6 h-6 ${colors.text}`} />
        </div>

        {/* Label */}
        <div className="text-sm text-gray-400 mb-1">{label}</div>

        {/* Value */}
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold text-white">{value}</span>
          {trend && (
            <span className={`text-sm font-medium ${trend.isPositive ? 'text-success' : 'text-error'}`}>
              {trend.isPositive ? '+' : ''}{trend.value}%
            </span>
          )}
        </div>

        {/* Sub value */}
        {subValue && (
          <div className="text-sm text-gray-500 mt-1">{subValue}</div>
        )}
      </div>
    </div>
  );
};
