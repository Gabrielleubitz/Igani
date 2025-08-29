import React from 'react';
import IganiMark from './IganiMark';

const IganiMarkDemo: React.FC = () => {
  return (
    <div className="p-8 space-y-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          IganiMark Logo Component
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          A customizable logo component for your Igani brand
        </p>
      </div>

      {/* Size variations */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Size Variations</h2>
        <div className="flex items-center justify-center space-x-8">
          <div className="text-center">
            <IganiMark size={32} />
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Small (32px)</p>
          </div>
          <div className="text-center">
            <IganiMark size={48} />
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Medium (48px)</p>
          </div>
          <div className="text-center">
            <IganiMark size={64} />
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Large (64px)</p>
          </div>
          <div className="text-center">
            <IganiMark size={80} />
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Extra Large (80px)</p>
          </div>
        </div>
      </div>

      {/* Variant variations */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Animation Variants</h2>
        <div className="flex items-center justify-center space-x-8">
          <div className="text-center">
            <IganiMark variant="glow" size={64} />
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Glow Only</p>
          </div>
          <div className="text-center">
            <IganiMark variant="spin" size={64} />
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Spin Only</p>
          </div>
          <div className="text-center">
            <IganiMark variant="both" size={64} />
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Both Effects</p>
          </div>
        </div>
      </div>

      {/* Hover effects */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Hover Effects</h2>
        <div className="flex items-center justify-center space-x-8">
          <div className="text-center">
            <IganiMark size={64} animateOnHover={true} />
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Hover Enabled</p>
          </div>
          <div className="text-center">
            <IganiMark size={64} animateOnHover={false} />
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Hover Disabled</p>
          </div>
        </div>
      </div>

      {/* Custom styling */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Custom Styling</h2>
        <div className="flex items-center justify-center space-x-8">
          <div className="text-center">
            <IganiMark className="drop-shadow-lg" size={64} />
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Drop Shadow</p>
          </div>
          <div className="text-center">
            <IganiMark className="scale-110" size={64} />
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Scaled Up</p>
          </div>
          <div className="text-center">
            <IganiMark className="opacity-80" size={64} />
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Reduced Opacity</p>
          </div>
        </div>
      </div>

      {/* Usage example */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Usage Example</h3>
        <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded text-sm overflow-x-auto">
{`import IganiMark from './components/IganiMark';

// Basic usage
<IganiMark />

// With custom size
<IganiMark size={64} />

// With animation variant
<IganiMark variant="glow" />

// With hover effects disabled
<IganiMark animateOnHover={false} />

// With custom styling
<IganiMark className="drop-shadow-lg" size={80} />

// Combined props
<IganiMark 
  size={64} 
  variant="both" 
  animateOnHover={true}
  className="scale-110" 
/>`}
        </pre>
      </div>
    </div>
  );
};

export default IganiMarkDemo;
