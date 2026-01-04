import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Palette, Image, Save, Type } from 'lucide-react';

interface TickerCustomizerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTicker: string;
  onSave: (customization: TickerCustomization) => void;
}

export interface TickerCustomization {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  team1Logo?: string;
  team2Logo?: string;
  fontStyle: 'modern' | 'classic' | 'bold';
}

const DEFAULT_CUSTOMIZATION: TickerCustomization = {
  primaryColor: '#1a237e',
  secondaryColor: '#283593',
  accentColor: '#e91e63',
  textColor: '#ffffff',
  fontStyle: 'modern',
};

const COLOR_PRESETS = [
  { name: 'Blue & Pink', primary: '#1a237e', secondary: '#283593', accent: '#e91e63' },
  { name: 'Green & Gold', primary: '#2e7d32', secondary: '#388e3c', accent: '#ffd700' },
  { name: 'Orange & Dark', primary: '#ff6f00', secondary: '#ff8f00', accent: '#1a1a2e' },
  { name: 'Red & White', primary: '#c62828', secondary: '#d32f2f', accent: '#ffffff' },
  { name: 'Purple & Teal', primary: '#6a1b9a', secondary: '#8e24aa', accent: '#00bcd4' },
  { name: 'Black & Gold', primary: '#1a1a2e', secondary: '#2d2d44', accent: '#ffd700' },
];

const TickerCustomizer: React.FC<TickerCustomizerProps> = ({
  open,
  onOpenChange,
  selectedTicker,
  onSave,
}) => {
  const [customization, setCustomization] = useState<TickerCustomization>(DEFAULT_CUSTOMIZATION);

  const handleColorChange = (key: keyof TickerCustomization, value: string) => {
    setCustomization(prev => ({ ...prev, [key]: value }));
  };

  const applyPreset = (preset: typeof COLOR_PRESETS[0]) => {
    setCustomization(prev => ({
      ...prev,
      primaryColor: preset.primary,
      secondaryColor: preset.secondary,
      accentColor: preset.accent,
    }));
  };

  const handleSave = () => {
    onSave(customization);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Customize Ticker
          </DialogTitle>
          <DialogDescription>
            Customize colors and logos for the {selectedTicker} ticker style
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="colors" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="colors">
              <Palette className="h-4 w-4 mr-2" />
              Colors
            </TabsTrigger>
            <TabsTrigger value="logos">
              <Image className="h-4 w-4 mr-2" />
              Logos
            </TabsTrigger>
            <TabsTrigger value="font">
              <Type className="h-4 w-4 mr-2" />
              Font
            </TabsTrigger>
          </TabsList>

          <TabsContent value="colors" className="space-y-4 py-4">
            {/* Color Presets */}
            <div className="space-y-2">
              <Label>Quick Presets</Label>
              <div className="grid grid-cols-3 gap-2">
                {COLOR_PRESETS.map((preset) => (
                  <Button
                    key={preset.name}
                    variant="outline"
                    size="sm"
                    className="h-auto py-2 flex flex-col items-center gap-1"
                    onClick={() => applyPreset(preset)}
                  >
                    <div className="flex gap-1">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: preset.primary }}
                      />
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: preset.accent }}
                      />
                    </div>
                    <span className="text-xs">{preset.name}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Colors */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={customization.primaryColor}
                    onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={customization.primaryColor}
                    onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Secondary Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={customization.secondaryColor}
                    onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={customization.secondaryColor}
                    onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Accent Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={customization.accentColor}
                    onChange={(e) => handleColorChange('accentColor', e.target.value)}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={customization.accentColor}
                    onChange={(e) => handleColorChange('accentColor', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Text Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={customization.textColor}
                    onChange={(e) => handleColorChange('textColor', e.target.value)}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={customization.textColor}
                    onChange={(e) => handleColorChange('textColor', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label>Preview</Label>
              <div 
                className="h-12 rounded-lg flex items-center justify-center text-sm font-medium"
                style={{
                  background: `linear-gradient(to right, ${customization.primaryColor}, ${customization.secondaryColor})`,
                  color: customization.textColor,
                }}
              >
                <span 
                  className="px-3 py-1 rounded"
                  style={{ backgroundColor: customization.accentColor }}
                >
                  TEAM 123-4
                </span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="logos" className="space-y-4 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Team 1 Logo URL</Label>
                <Input
                  placeholder="https://example.com/team1-logo.png"
                  value={customization.team1Logo || ''}
                  onChange={(e) => handleColorChange('team1Logo' as any, e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Team 2 Logo URL</Label>
                <Input
                  placeholder="https://example.com/team2-logo.png"
                  value={customization.team2Logo || ''}
                  onChange={(e) => handleColorChange('team2Logo' as any, e.target.value)}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Tip: Use small square images (around 32x32px) for best results
              </p>
            </div>
          </TabsContent>

          <TabsContent value="font" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Font Style</Label>
              <div className="grid grid-cols-3 gap-3">
                {(['modern', 'classic', 'bold'] as const).map((style) => (
                  <Button
                    key={style}
                    variant={customization.fontStyle === style ? 'default' : 'outline'}
                    onClick={() => setCustomization(prev => ({ ...prev, fontStyle: style }))}
                    className={`h-16 flex flex-col items-center justify-center ${
                      style === 'modern' ? 'font-sans' : 
                      style === 'classic' ? 'font-serif' : 
                      'font-bold'
                    }`}
                  >
                    <span className="text-lg">Aa</span>
                    <span className="text-xs capitalize">{style}</span>
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save Customization
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TickerCustomizer;
