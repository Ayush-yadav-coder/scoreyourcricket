import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Copy, Code, Eye, Palette } from 'lucide-react';

interface EmbedCodeGeneratorProps {
  matchId: string;
}

const themes = [
  { value: 'dark', label: 'Dark', bg: '#111827', text: '#ffffff' },
  { value: 'light', label: 'Light', bg: '#ffffff', text: '#111827' },
  { value: 'ipl', label: 'IPL Style', bg: '#1e3a5f', text: '#f7d046' },
  { value: 'bcci', label: 'BCCI Blue', bg: '#0a4f9c', text: '#ffffff' },
  { value: 'cricket', label: 'Cricket Green', bg: '#1b4d3e', text: '#ffffff' },
  { value: 'minimal', label: 'Minimal', bg: '#f8fafc', text: '#0f172a' },
  { value: 'neon', label: 'Neon', bg: '#0a0a0a', text: '#39ff14' },
  { value: 'retro', label: 'Retro', bg: '#2d1b69', text: '#ff6b6b' },
];

const EmbedCodeGenerator: React.FC<EmbedCodeGeneratorProps> = ({ matchId }) => {
  const [theme, setTheme] = useState('dark');
  const [width, setWidth] = useState('400');
  const [height, setHeight] = useState('200');
  const [showBorder, setShowBorder] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState('30');

  const baseUrl = window.location.origin;
  const embedUrl = `${baseUrl}/embed/ticker?match=${matchId}&theme=${theme}&refresh=${refreshInterval}`;

  const iframeCode = `<iframe
  src="${embedUrl}"
  width="${width}"
  height="${height}"
  frameborder="${showBorder ? '1' : '0'}"
  style="border-radius: 8px;${showBorder ? ' border: 1px solid #333;' : ''}"
  title="Live Cricket Score"
  loading="lazy"
></iframe>`;

  const scriptCode = `<!-- Cric Score Widget -->
<div id="cricscore-widget-${matchId}" style="width: ${width}px;"></div>
<script>
(function() {
  var container = document.getElementById('cricscore-widget-${matchId}');
  var iframe = document.createElement('iframe');
  iframe.src = '${embedUrl}';
  iframe.width = '${width}';
  iframe.height = '${height}';
  iframe.frameBorder = '${showBorder ? '1' : '0'}';
  iframe.style.borderRadius = '8px';
  ${showBorder ? "iframe.style.border = '1px solid #333';" : ''}
  container.appendChild(iframe);
})();
</script>`;

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Embed code copied to clipboard!');
  };

  const selectedTheme = themes.find(t => t.value === theme);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Code className="h-5 w-5 text-primary" />
          Embed Live Score Widget
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Customization Options */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Theme
            </Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {themes.map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: t.bg }}
                      />
                      {t.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Width (px)</Label>
            <Input
              type="number"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              min="250"
              max="800"
            />
          </div>

          <div className="space-y-2">
            <Label>Height (px)</Label>
            <Input
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              min="150"
              max="400"
            />
          </div>

          <div className="space-y-2">
            <Label>Refresh (sec)</Label>
            <Select value={refreshInterval} onValueChange={setRefreshInterval}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10s</SelectItem>
                <SelectItem value="30">30s</SelectItem>
                <SelectItem value="60">1 min</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Preview
          </Label>
          <div 
            className="rounded-lg p-4 flex items-center justify-center"
            style={{ 
              backgroundColor: selectedTheme?.bg,
              minHeight: '220px',
            }}
          >
            <iframe
              src={embedUrl}
              width={Math.min(Number(width), 400)}
              height={Math.min(Number(height), 200)}
              frameBorder={showBorder ? '1' : '0'}
              style={{ 
                borderRadius: '8px',
                border: showBorder ? '1px solid #333' : 'none',
              }}
              title="Live Cricket Score Preview"
            />
          </div>
        </div>

        {/* Embed Code Tabs */}
        <Tabs defaultValue="iframe">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="iframe">HTML iframe</TabsTrigger>
            <TabsTrigger value="script">JavaScript</TabsTrigger>
          </TabsList>

          <TabsContent value="iframe" className="space-y-2">
            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto max-h-40">
                <code>{iframeCode}</code>
              </pre>
              <Button
                size="sm"
                variant="secondary"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(iframeCode)}
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="script" className="space-y-2">
            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto max-h-40">
                <code>{scriptCode}</code>
              </pre>
              <Button
                size="sm"
                variant="secondary"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(scriptCode)}
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Direct URL */}
        <div className="space-y-2">
          <Label>Direct URL</Label>
          <div className="flex gap-2">
            <Input value={embedUrl} readOnly className="text-xs" />
            <Button
              variant="outline"
              onClick={() => copyToClipboard(embedUrl)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmbedCodeGenerator;
