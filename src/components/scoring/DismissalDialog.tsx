import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type DismissalType =
  | 'bowled'
  | 'caught'
  | 'lbw'
  | 'run_out'
  | 'stumped'
  | 'hit_wicket'
  | 'retired'
  | 'timed_out'
  | 'handled_ball'
  | 'obstructing_field';

interface Player {
  id: string;
  full_name: string;
}

interface DismissalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bowlerName: string;
  fieldingPlayers: { player_id: string; profiles: Player }[];
  onConfirm: (dismissalType: DismissalType, fielderId?: string) => void;
  loading?: boolean;
}

const dismissalTypes: { value: DismissalType; label: string; needsFielder: boolean }[] = [
  { value: 'bowled', label: 'Bowled', needsFielder: false },
  { value: 'caught', label: 'Caught', needsFielder: true },
  { value: 'lbw', label: 'LBW (Leg Before Wicket)', needsFielder: false },
  { value: 'run_out', label: 'Run Out', needsFielder: true },
  { value: 'stumped', label: 'Stumped', needsFielder: true },
  { value: 'hit_wicket', label: 'Hit Wicket', needsFielder: false },
  { value: 'retired', label: 'Retired', needsFielder: false },
  { value: 'handled_ball', label: 'Handled Ball', needsFielder: false },
  { value: 'obstructing_field', label: 'Obstructing the Field', needsFielder: false },
];

const DismissalDialog: React.FC<DismissalDialogProps> = ({
  open,
  onOpenChange,
  bowlerName,
  fieldingPlayers,
  onConfirm,
  loading,
}) => {
  const [selectedType, setSelectedType] = useState<DismissalType>('bowled');
  const [fielderId, setFielderId] = useState<string>('');

  const selectedDismissal = dismissalTypes.find((d) => d.value === selectedType);
  const needsFielder = selectedDismissal?.needsFielder || false;

  const handleConfirm = () => {
    onConfirm(selectedType, needsFielder ? fielderId : undefined);
  };

  const canConfirm = !needsFielder || (needsFielder && fielderId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Dismissal Type</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <RadioGroup
            value={selectedType}
            onValueChange={(v) => {
              setSelectedType(v as DismissalType);
              setFielderId('');
            }}
          >
            <div className="grid grid-cols-1 gap-2">
              {dismissalTypes.map((type) => (
                <Label
                  key={type.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedType === type.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value={type.value} />
                  <span className="font-medium">{type.label}</span>
                </Label>
              ))}
            </div>
          </RadioGroup>

          {needsFielder && (
            <div className="space-y-2">
              <Label>
                {selectedType === 'caught' && 'Caught by'}
                {selectedType === 'run_out' && 'Run out by'}
                {selectedType === 'stumped' && 'Stumped by'}
              </Label>
              <Select value={fielderId} onValueChange={setFielderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select fielder" />
                </SelectTrigger>
                <SelectContent>
                  {fieldingPlayers.map((player) => (
                    <SelectItem key={player.player_id} value={player.player_id}>
                      {player.profiles.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            Bowler: <span className="font-medium">{bowlerName}</span>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleConfirm}
              disabled={!canConfirm || loading}
            >
              {loading ? 'Recording...' : 'Confirm Wicket'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DismissalDialog;
