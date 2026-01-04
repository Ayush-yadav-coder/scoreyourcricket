import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Share2, Image, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface ScorecardExportProps {
  matchData: {
    team1Name: string;
    team2Name: string;
    team1Score: number;
    team1Wickets: number;
    team1Overs: number;
    team2Score: number;
    team2Wickets: number;
    team2Overs: number;
    matchType: string;
    venue?: string;
    date?: string;
    result?: string;
    battingScorecard: {
      batsman_name: string;
      runs: number;
      balls_faced: number;
      fours: number;
      sixes: number;
      strike_rate: number;
      is_out: boolean;
      dismissal_type?: string;
      bowler_name?: string;
    }[];
    bowlingScorecard: {
      bowler_name: string;
      overs: number;
      maidens: number;
      runs_conceded: number;
      wickets: number;
      economy: number;
    }[];
  };
}

const ScorecardExport: React.FC<ScorecardExportProps> = ({ matchData }) => {
  const scorecardRef = useRef<HTMLDivElement>(null);

  const generateScorecardHTML = () => {
    const css = `
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', sans-serif; background: #1a1a2e; color: white; padding: 20px; }
        .scorecard { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 24px; max-width: 600px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #e94560; }
        .teams { font-size: 24px; font-weight: bold; }
        .vs { color: #e94560; margin: 0 8px; }
        .score-box { display: flex; justify-content: space-around; margin: 16px 0; }
        .team-score { text-align: center; padding: 12px 24px; background: rgba(233, 69, 96, 0.1); border-radius: 12px; }
        .team-name { font-size: 14px; color: #888; margin-bottom: 4px; }
        .score { font-size: 32px; font-weight: bold; }
        .overs { font-size: 12px; color: #666; }
        .result { text-align: center; font-size: 14px; color: #e94560; margin: 16px 0; font-weight: 500; }
        .section { margin-top: 20px; }
        .section-title { font-size: 14px; font-weight: 600; color: #e94560; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px 4px; text-align: left; font-size: 12px; }
        th { color: #888; font-weight: 500; border-bottom: 1px solid #333; }
        td { border-bottom: 1px solid #222; }
        .runs { font-weight: bold; color: #e94560; }
        .meta { text-align: center; margin-top: 20px; font-size: 11px; color: #666; }
        .watermark { text-align: center; margin-top: 16px; font-size: 10px; color: #444; }
      </style>
    `;

    const battingRows = matchData.battingScorecard.map(b => `
      <tr>
        <td>${b.batsman_name}</td>
        <td class="runs">${b.runs}</td>
        <td>${b.balls_faced}</td>
        <td>${b.fours}</td>
        <td>${b.sixes}</td>
        <td>${b.strike_rate.toFixed(1)}</td>
      </tr>
    `).join('');

    const bowlingRows = matchData.bowlingScorecard.map(b => `
      <tr>
        <td>${b.bowler_name}</td>
        <td>${b.overs}</td>
        <td>${b.maidens}</td>
        <td>${b.runs_conceded}</td>
        <td class="runs">${b.wickets}</td>
        <td>${b.economy.toFixed(2)}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>${css}</head>
      <body>
        <div class="scorecard">
          <div class="header">
            <div class="teams">
              ${matchData.team1Name}<span class="vs">vs</span>${matchData.team2Name}
            </div>
            <div style="font-size: 12px; color: #666; margin-top: 8px;">
              ${matchData.matchType.toUpperCase()}${matchData.venue ? ` • ${matchData.venue}` : ''}
            </div>
          </div>
          
          <div class="score-box">
            <div class="team-score">
              <div class="team-name">${matchData.team1Name}</div>
              <div class="score">${matchData.team1Score}/${matchData.team1Wickets}</div>
              <div class="overs">(${matchData.team1Overs} ov)</div>
            </div>
            <div class="team-score">
              <div class="team-name">${matchData.team2Name}</div>
              <div class="score">${matchData.team2Score}/${matchData.team2Wickets}</div>
              <div class="overs">(${matchData.team2Overs} ov)</div>
            </div>
          </div>
          
          ${matchData.result ? `<div class="result">${matchData.result}</div>` : ''}
          
          <div class="section">
            <div class="section-title">Batting</div>
            <table>
              <thead>
                <tr><th>Batsman</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr>
              </thead>
              <tbody>${battingRows}</tbody>
            </table>
          </div>
          
          <div class="section">
            <div class="section-title">Bowling</div>
            <table>
              <thead>
                <tr><th>Bowler</th><th>O</th><th>M</th><th>R</th><th>W</th><th>Econ</th></tr>
              </thead>
              <tbody>${bowlingRows}</tbody>
            </table>
          </div>
          
          <div class="meta">
            ${matchData.date || new Date().toLocaleDateString()}
          </div>
          <div class="watermark">CricScore</div>
        </div>
      </body>
      </html>
    `;
  };

  const exportAsImage = async () => {
    try {
      const html = generateScorecardHTML();
      
      // Create a temporary iframe to render the scorecard
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.width = '650px';
      iframe.style.height = '800px';
      document.body.appendChild(iframe);
      
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(html);
        iframeDoc.close();
        
        // Wait for content to render
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Use html2canvas if available, otherwise show download as HTML
        try {
          const html2canvas = (await import('html2canvas')).default;
          const canvas = await html2canvas(iframeDoc.body.querySelector('.scorecard') as HTMLElement, {
            backgroundColor: '#1a1a2e',
            scale: 2,
          });
          
          const link = document.createElement('a');
          link.download = `${matchData.team1Name}_vs_${matchData.team2Name}_scorecard.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
          
          toast.success('Scorecard exported as image!');
        } catch {
          // Fallback to HTML download
          downloadAsHTML();
        }
      }
      
      document.body.removeChild(iframe);
    } catch (error) {
      console.error('Error exporting image:', error);
      toast.error('Failed to export image. Downloading as HTML instead.');
      downloadAsHTML();
    }
  };

  const downloadAsHTML = () => {
    const html = generateScorecardHTML();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${matchData.team1Name}_vs_${matchData.team2Name}_scorecard.html`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Scorecard exported as HTML!');
  };

  const shareScorecard = async () => {
    const shareText = `🏏 ${matchData.team1Name} vs ${matchData.team2Name}\n\n${matchData.team1Name}: ${matchData.team1Score}/${matchData.team1Wickets} (${matchData.team1Overs} ov)\n${matchData.team2Name}: ${matchData.team2Score}/${matchData.team2Wickets} (${matchData.team2Overs} ov)\n\n${matchData.result || ''}\n\nScored with CricScore`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${matchData.team1Name} vs ${matchData.team2Name}`,
          text: shareText,
        });
        toast.success('Shared successfully!');
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          copyToClipboard(shareText);
        }
      }
    } else {
      copyToClipboard(shareText);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Scorecard copied to clipboard!');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export Scorecard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Export or share the match scorecard
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="gap-2" onClick={exportAsImage}>
            <Image className="h-4 w-4" />
            Save as Image
          </Button>
          <Button variant="outline" className="gap-2" onClick={downloadAsHTML}>
            <FileText className="h-4 w-4" />
            Save as HTML
          </Button>
        </div>
        <Button variant="secondary" className="w-full gap-2" onClick={shareScorecard}>
          <Share2 className="h-4 w-4" />
          Share Scorecard
        </Button>
      </CardContent>
    </Card>
  );
};

export default ScorecardExport;
