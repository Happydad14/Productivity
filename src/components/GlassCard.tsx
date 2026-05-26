import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  accentColor?: string; // Optional CSS color value for a subtle glow border
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  style = {},
  accentColor,
}) => {
  const cardStyle: React.CSSProperties = {
    background: 'var(--glass-bg)',
    backdropFilter: 'var(--glass-blur)',
    WebkitBackdropFilter: 'var(--glass-blur)',
    border: accentColor ? `1px solid rgba(${accentColor}, 0.25)` : '1px solid var(--glass-border)',
    borderRadius: '16px',
    boxShadow: accentColor 
      ? `inset 0 1px 0 0 rgba(255, 255, 255, 0.25), inset 0 0 0 1px rgba(255, 255, 255, 0.08), inset 0 -1px 0 0 rgba(255, 255, 255, 0.1), 0 20px 45px rgba(0, 0, 0, 0.55), 0 0 35px 2px rgba(${accentColor}, 0.18)`
      : 'inset 0 1px 0 0 rgba(255, 255, 255, 0.25), inset 0 0 0 1px rgba(255, 255, 255, 0.08), inset 0 -1px 0 0 rgba(255, 255, 255, 0.1), var(--glass-shadow)',
    padding: '14px 16px',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    ...style,
  };

  return (
    <div 
      className={`glass-card ${className}`} 
      style={cardStyle}
    >
      {children}
    </div>
  );
};
