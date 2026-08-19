import React from 'react';
// @ts-ignore
import logoImg from '../../assets/images/polytechnic_logo_1787125758758.jpg';

interface PolyLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  textColor?: string;
  subtitle?: string;
}

export const PolyLogo: React.FC<PolyLogoProps> = ({
  size = 'md',
  showText = true,
  textColor = 'text-slate-900',
  subtitle = 'Digital Attendance System',
}) => {
  const containerSizeMap = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return (
    <div className="flex items-center gap-3">
      {/* Exact Official Polytechnic Ibadan Logo */}
      <div className={`shrink-0 ${containerSizeMap[size]}`}>
        <img
          src={logoImg}
          alt="The Polytechnic, Ibadan Logo"
          className="w-full h-full object-contain"
          referrerPolicy="no-referrer"
        />
      </div>

      {showText && (
        <div className="flex flex-col leading-tight">
          <span className={`font-bold tracking-tight ${textColor} ${size === 'lg' || size === 'xl' ? 'text-base sm:text-lg' : 'text-sm'}`}>
            The Polytechnic, Ibadan
          </span>
          <span className="text-xs text-slate-500 font-normal mt-0.5">
            {subtitle}
          </span>
        </div>
      )}
    </div>
  );
};
