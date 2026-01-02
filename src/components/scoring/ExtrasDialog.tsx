import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

type ExtraType = 'wide' | 'no_ball' | 'bye' | 'leg_bye';

interface ExtrasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extraType: ExtraType;
  onConfirm: (runs: number) => void;
  loading?: boolean;
}

const ExtrasDialog: React.FC<ExtrasDialogProps> = ({
  open,
  onOpenChange,
  extraType,
  onConfirm,
  loading,
}) => {
  const [additionalRuns, setAdditionalRuns] = useState(0);

  const getTitle = () => {
    switch (extraType) {
      case 'wide':
        return 'Wide Ball';
      case 'no_ball':
        return 'No Ball';
      case 'bye':
        return 'Bye';
      case 'leg_bye':
        return 'Leg Bye';
    }
  };

  const getDescription = () => {
    switch (extraType) {
      case 'wide':
        return '1 run + any additional runs taken. Ball does not count.';
      case 'no_ball':
        return '1 run + any runs scored. Ball does not count.';
      case 'bye':
        return 'Runs scored without bat contact. Ball counts.';
      case 'leg_bye':
        return 'Runs scored off body. Ball counts.';
    }
  };

  const getTotalRuns = () => {
    if (extraType === 'wide' || extraType === 'no_ball') {
      return 1 + additionalRuns;
    }
    return additionalRuns;
  };

  const handleConfirm = () => {
    onConfirm(getTotalRuns());
    setAdditionalRuns(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">{getDescription()}</p>

          <div className="space-y-3">
            <Label>Additional Runs</Label>
            <div className="grid grid-cols-5 gap-2">
              {[0, 1, 2, 3, 4].map((run) => (
                <Button
                  key={run}
                  variant={additionalRuns === run ? 'default' : 'outline'}
                  className="h-12"
                  onClick={() => setAdditionalRuns(run)}
                >
                  {run}
                </Button>
              ))}
            </div>
          </div>

          <div className="p-4 bg-secondary rounded-lg text-center">
            <p className="text-sm text-muted-foreground">Total Extras</p>
            <p className="text-3xl font-bold">{getTotalRuns()}</p>
            {(extraType === 'wide' || extraType === 'no_ball') && (
              <p className="text-xs text-muted-foreground mt-1">
                (Ball does not count)
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                onOpenChange(false);
                setAdditionalRuns(0);
              }}
            >
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleConfirm} disabled={loading}>
              {loading ? 'Recording...' : 'Confirm'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExtrasDialog;
