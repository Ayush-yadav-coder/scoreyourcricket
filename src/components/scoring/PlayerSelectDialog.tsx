import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface Player {
  player_id: string;
  profiles: {
    id: string;
    full_name: string;
  };
}

interface PlayerSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  players: Player[];
  excludePlayerIds?: string[];
  onSelect: (playerId: string) => void;
  loading?: boolean;
}

const PlayerSelectDialog: React.FC<PlayerSelectDialogProps> = ({
  open,
  onOpenChange,
  title,
  players,
  excludePlayerIds = [],
  onSelect,
  loading = false,
}) => {
  const [selectedId, setSelectedId] = useState<string>('');

  const filteredPlayers = players.filter(
    (p) => !excludePlayerIds.includes(p.player_id)
  );

  const handleConfirm = () => {
    if (selectedId) {
      onSelect(selectedId);
      setSelectedId('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-80">
          <RadioGroup value={selectedId} onValueChange={setSelectedId}>
            <div className="space-y-2">
              {filteredPlayers.map((player) => (
                <Label
                  key={player.player_id}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedId === player.player_id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value={player.player_id} />
                  <span className="font-medium">
                    {player.profiles?.full_name || 'Unknown Player'}
                  </span>
                </Label>
              ))}
            </div>
          </RadioGroup>
        </ScrollArea>
        <div className="flex gap-3 mt-4">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleConfirm}
            disabled={!selectedId || loading}
          >
            {loading ? 'Saving...' : 'Confirm'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlayerSelectDialog;
