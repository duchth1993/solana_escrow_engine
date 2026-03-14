import React from 'react';

export const FloatingParticles: React.FC = () => {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    delay: `${Math.random() * 20}s`,
    duration: `${15 + Math.random() * 10}s`,
    size: `${2 + Math.random() * 4}px`,
    opacity: 0.1 + Math.random() * 0.3,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full bg-primary"
          style={{
            left: particle.left,
            top: particle.top,
            width: particle.size,
            height: particle.size,
            opacity: particle.opacity,
            animation: `float ${particle.duration} ease-in-out infinite`,
            animationDelay: particle.delay,
          }}
        />
      ))}
    </div>
  );
};
