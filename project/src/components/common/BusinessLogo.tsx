import React from 'react';
import { Store, ShoppingBag } from 'lucide-react';

interface BusinessLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  variant?: 'full' | 'icon' | 'text';
  className?: string;
}

const BusinessLogo: React.FC<BusinessLogoProps> = ({ 
  size = 'md', 
  showText = true, 
  variant = 'full',
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-4xl'
  };

  if (variant === 'icon') {
    return (
      <div className={`relative ${className}`}>
        <div className={`${sizeClasses[size]} bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center shadow-lg`}>
          <Store className="h-1/2 w-1/2 text-white" />
          <ShoppingBag className="h-1/3 w-1/3 text-blue-200 absolute bottom-1 right-1" />
        </div>
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <div className={`${className}`}>
        <h1 className={`${textSizeClasses[size]} font-bold text-blue-800`}>
          SREE GADI
        </h1>
        {showText && (
          <p className="text-sm text-gray-600 font-medium">KIRANA STORES</p>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div className={`${sizeClasses[size]} bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center shadow-lg relative`}>
        <Store className="h-1/2 w-1/2 text-white" />
        <ShoppingBag className="h-1/3 w-1/3 text-blue-200 absolute bottom-1 right-1" />
      </div>
      {showText && (
        <div>
          <h1 className={`${textSizeClasses[size]} font-bold text-blue-800 leading-tight`}>
            SREE GADI
          </h1>
          <p className="text-sm text-gray-600 font-medium">KIRANA STORES</p>
          <p className="text-xs text-gray-500">Wholesale Distribution</p>
        </div>
      )}
    </div>
  );
};

export default BusinessLogo;