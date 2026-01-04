import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Cloud, Coffee, Sun, Timer, MoreHorizontal, TestTube, Pause } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface MatchBreaksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string;
  onBreakSet: (breakType: string) => void;
  onMatchDeleted: () => void;
}

const BREAK_TYPES = [
  { id: 'rain', name: 'Rain', icon: Cloud, color: 'text-blue-500', description: 'Match delayed due to rain' },
  { id: 'lunch', name: 'Lunch', icon: Coffee, color: 'text-amber-500', description: 'Lunch break' },
  { id: 'tea', name: 'Tea', icon: Coffee, color: 'text-orange-500', description: 'Tea break' },
  { id: 'drinks', name: 'Innings Break', icon: Timer, color: 'text-green-500', description: 'Break between innings' },
  { id: 'other', name: 'Other', icon: MoreHorizontal, color: 'text-gray-500', description: 'Other break type' },
  { id: 'testing', name: 'Testing', icon: TestTube, color: 'text-red-500', description: 'Delete match (testing/practice)' },
];

const MatchBreaksDialog: React.FC<MatchBreaksDialogProps> = ({
  open,
  onOpenChange,
  matchId,
  onBreakSet,
  onMatchDeleted,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleBreakSelect = async (breakType: string) => {
    if (breakType === 'testing') {
      setShowDeleteConfirm(true);
      return;
    }

    setLoading(true);
    try {
      // Insert match break record
      const { error } = await supabase.from('match_breaks').insert({
        match_id: matchId,
        break_type: breakType as any,
      });

      if (error) throw error;

      toast.success(`${breakType.charAt(0).toUpperCase() + breakType.slice(1)} break set`);
      onBreakSet(breakType);
      onOpenChange(false);
    } catch (error) {
      console.error('Error setting break:', error);
      toast.error('Failed to set break');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMatch = async () => {
    setLoading(true);
    try {
      // Delete match and all related data (cascades should handle related tables)
      const { error } = await supabase.from('matches').delete().eq('id', matchId);

      if (error) throw error;

      toast.success('Match deleted successfully');
      onMatchDeleted();
    } catch (error) {
      console.error('Error deleting match:', error);
      toast.error('Failed to delete match');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
      onOpenChange(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pause className="h-5 w-5" />
              Set Match Break
            </DialogTitle>
            <DialogDescription>
              Select a break type to pause the match or delete if testing
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-4">
            {BREAK_TYPES.map((breakType) => {
              const Icon = breakType.icon;
              return (
                <Button
                  key={breakType.id}
                  variant={breakType.id === 'testing' ? 'destructive' : 'outline'}
                  className={`h-auto py-4 flex flex-col items-center gap-2 ${
                    breakType.id === 'testing' ? 'col-span-2' : ''
                  }`}
                  onClick={() => handleBreakSelect(breakType.id)}
                  disabled={loading}
                >
                  <Icon className={`h-6 w-6 ${breakType.color}`} />
                  <span className="font-medium">{breakType.name}</span>
                  <span className="text-xs opacity-70 text-center">{breakType.description}</span>
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Match?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the match and all its scoring data.
              Only use this option if you were testing or practicing with the scoring system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMatch}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? 'Deleting...' : 'Delete Match'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MatchBreaksDialog;
