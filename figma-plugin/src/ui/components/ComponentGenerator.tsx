import React, { useState } from 'react';
import { ComponentGenerationOptions } from '../../types/messages';

interface ComponentGeneratorProps {
  onGenerate: (options: ComponentGenerationOptions) => void;
}

function ComponentGenerator({ onGenerate }: ComponentGeneratorProps) {
  const [options, setOptions] = useState<ComponentGenerationOptions>({
    platform: 'universal',
    includeTypes: true,
    includeProps: true,
    includeAnimations: true,
    useNativeWind: true
  });

  const [prompt, setPrompt] = useState('');

  const handleGenerate = () => {
    onGenerate(options);
  };

  return (
    <div className="component-generator">
      <h2>Generate Component Code</h2>
      
      <div className="generator-instructions">
        <p>Select a component in Figma and configure the generation options below.</p>
      </div>

      <div className="generator-options">
        <div className="form-group">
          <label>Target Platform</label>
          <select 
            className="form-control"
            value={options.platform}
            onChange={(e) => setOptions({ ...options, platform: e.target.value as any })}
          >
            <option key="universal" value="universal">Universal (React Native + Web)</option>
            <option key="react-native" value="react-native">React Native Only</option>
            <option key="web" value="web">Web Only</option>
          </select>
        </div>

        <div className="form-group">
          <label>AI Prompt (Optional)</label>
          <textarea
            className="form-control"
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="E.g., 'Make this component accessible with ARIA labels' or 'Add loading and error states'"
          />
        </div>

        <div className="generator-features">
          <h3>Include in Generation</h3>
          
          <label className="checkbox-option">
            <input 
              type="checkbox"
              checked={options.includeTypes}
              onChange={(e) => setOptions({ ...options, includeTypes: e.target.checked })}
            />
            TypeScript Types
          </label>

          <label className="checkbox-option">
            <input 
              type="checkbox"
              checked={options.includeProps}
              onChange={(e) => setOptions({ ...options, includeProps: e.target.checked })}
            />
            Component Props
          </label>

          <label className="checkbox-option">
            <input 
              type="checkbox"
              checked={options.includeAnimations}
              onChange={(e) => setOptions({ ...options, includeAnimations: e.target.checked })}
            />
            Animations (Reanimated)
          </label>

          <label className="checkbox-option">
            <input 
              type="checkbox"
              checked={options.useNativeWind}
              onChange={(e) => setOptions({ ...options, useNativeWind: e.target.checked })}
            />
            Use NativeWind/Tailwind
          </label>
        </div>
      </div>

      <button 
        className="button"
        onClick={handleGenerate}
      >
        Generate Component
      </button>

      <div className="generator-examples">
        <h3>Generated Code Example</h3>
        <pre className="code-preview">
{`import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useAnimation } from '@/hooks/useAnimation';

interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  onPress?: () => void;
  children: React.ReactNode;
}

export function Button({ 
  variant = 'primary', 
  size = 'md',
  onPress,
  children 
}: ButtonProps) {
  const { animate } = useAnimation();
  
  return (
    <TouchableOpacity
      className={\`btn btn-\${variant} btn-\${size}\`}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text className="btn-text">{children}</Text>
    </TouchableOpacity>
  );
}`}</pre>
      </div>
    </div>
  );
}

export default ComponentGenerator;