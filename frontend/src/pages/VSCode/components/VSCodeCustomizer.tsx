import React, { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Palette, Type, Settings } from 'lucide-react';
import { projectApi } from '../../../services/projectApi';

interface VSCodeCustomizerProps {
  projectId: string;
  onCustomizationApplied?: () => void;
}

export const VSCodeCustomizer: React.FC<VSCodeCustomizerProps> = ({
  projectId,
  onCustomizationApplied
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [customization, setCustomization] = useState({
    theme: 'Default Dark+',
    font_size: 14,
    font_family: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
    tab_size: 2
  });

  const themes = [
    'Default Dark+',
    'Default Light+',
    'Abyss',
    'Kimbie Dark',
    'Monokai',
    'Monokai Dimmed',
    'Red',
    'Solarized Dark',
    'Solarized Light',
    'Tomorrow Night Blue'
  ];

  const fontFamilies = [
    "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
    "'Fira Code', 'Monaco', monospace",
    "'Source Code Pro', 'Monaco', monospace",
    "'JetBrains Mono', 'Monaco', monospace",
    "'Cascadia Code', 'Monaco', monospace"
  ];

  const handleApplyCustomization = async () => {
    setIsLoading(true);
    try {
      await projectApi.customizeVSCode(projectId, customization);
      onCustomizationApplied?.();
    } catch (error) {
      console.error('Failed to apply VS Code customization:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          VS Code Customization
        </CardTitle>
        <CardDescription>
          Customize your VS Code appearance and behavior
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Theme Selection */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Color Theme
          </Label>
          <Select 
            value={customization.theme} 
            onValueChange={(value) => setCustomization(prev => ({ ...prev, theme: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select theme" />
            </SelectTrigger>
            <SelectContent>
              {themes.map(theme => (
                <SelectItem key={theme} value={theme}>
                  {theme}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Font Settings */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Type className="w-4 h-4" />
            Font Settings
          </Label>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Font Size</Label>
              <Input
                type="number"
                min="10"
                max="24"
                value={customization.font_size}
                onChange={(e) => setCustomization(prev => ({ 
                  ...prev, 
                  font_size: parseInt(e.target.value) || 14 
                }))}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Tab Size</Label>
              <Input
                type="number"
                min="1"
                max="8"
                value={customization.tab_size}
                onChange={(e) => setCustomization(prev => ({ 
                  ...prev, 
                  tab_size: parseInt(e.target.value) || 2 
                }))}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Font Family</Label>
            <Select 
              value={customization.font_family} 
              onValueChange={(value) => setCustomization(prev => ({ ...prev, font_family: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select font" />
              </SelectTrigger>
              <SelectContent>
                {fontFamilies.map(font => (
                  <SelectItem key={font} value={font}>
                    {font.split(',')[0].replace(/'/g, '')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Apply Button */}
        <Button 
          onClick={handleApplyCustomization}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Applying...' : 'Apply Customization'}
        </Button>
      </CardContent>
    </Card>
  );
};