import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, UserPlus, Trash2, Shield, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Official {
  id: string;
  role: string;
  name: string | null;
  user_id: string | null;
}

interface Player {
  id: string;
  full_name: string;
}

interface OfficialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string;
  allPlayers: { player_id: string; profiles: Player }[];
}

const OFFICIAL_ROLES = [
  { id: 'umpire', name: '1st Umpire', icon: Shield },
  { id: 'second_umpire', name: '2nd Umpire', icon: Shield },
  { id: 'third_umpire', name: '3rd Umpire (TV)', icon: Shield },
  { id: 'scorer', name: '1st Scorer', icon: ClipboardList },
  { id: 'second_scorer', name: '2nd Scorer', icon: ClipboardList },
  { id: 'referee', name: 'Match Referee', icon: Users },
];

const OfficialsDialog: React.FC<OfficialsDialogProps> = ({
  open,
  onOpenChange,
  matchId,
  allPlayers,
}) => {
  const [officials, setOfficials] = useState<Official[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [manualName, setManualName] = useState<string>('');
  const [useManualEntry, setUseManualEntry] = useState(false);

  useEffect(() => {
    if (open) {
      fetchOfficials();
    }
  }, [open, matchId]);

  const fetchOfficials = async () => {
    const { data, error } = await supabase
      .from('match_officials')
      .select('*')
      .eq('match_id', matchId);

    if (error) {
      console.error('Error fetching officials:', error);
      return;
    }

    setOfficials(data || []);
  };

  const handleAddOfficial = async () => {
    if (!selectedRole) {
      toast.error('Please select a role');
      return;
    }

    if (!useManualEntry && !selectedPlayer) {
      toast.error('Please select a player');
      return;
    }

    if (useManualEntry && !manualName.trim()) {
      toast.error('Please enter a name');
      return;
    }

    // Check if role is already filled
    const existingOfficial = officials.find(o => o.role === selectedRole);
    if (existingOfficial) {
      toast.error('This role is already filled');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.from('match_officials').insert({
        match_id: matchId,
        role: selectedRole,
        user_id: useManualEntry ? null : selectedPlayer,
        name: useManualEntry ? manualName.trim() : allPlayers.find(p => p.player_id === selectedPlayer)?.profiles.full_name,
      }).select().single();

      if (error) throw error;

      setOfficials([...officials, data]);
      setSelectedRole('');
      setSelectedPlayer('');
      setManualName('');
      toast.success('Official added successfully');
    } catch (error) {
      console.error('Error adding official:', error);
      toast.error('Failed to add official');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveOfficial = async (officialId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('match_officials')
        .delete()
        .eq('id', officialId);

      if (error) throw error;

      setOfficials(officials.filter(o => o.id !== officialId));
      toast.success('Official removed');
    } catch (error) {
      console.error('Error removing official:', error);
      toast.error('Failed to remove official');
    } finally {
      setLoading(false);
    }
  };

  const getRoleName = (roleId: string) => {
    return OFFICIAL_ROLES.find(r => r.id === roleId)?.name || roleId;
  };

  const getRoleIcon = (roleId: string) => {
    const role = OFFICIAL_ROLES.find(r => r.id === roleId);
    return role?.icon || Users;
  };

  const availableRoles = OFFICIAL_ROLES.filter(
    role => !officials.find(o => o.role === role.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Match Officials
          </DialogTitle>
          <DialogDescription>
            Add umpires, scorers, and match referee
          </DialogDescription>
        </DialogHeader>

        {/* Current Officials */}
        {officials.length > 0 && (
          <ScrollArea className="max-h-[200px]">
            <div className="space-y-2">
              {officials.map((official) => {
                const Icon = getRoleIcon(official.role);
                return (
                  <div
                    key={official.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{official.name || 'Unknown'}</p>
                        <Badge variant="secondary" className="text-xs">
                          {getRoleName(official.role)}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveOfficial(official.id)}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {/* Add New Official */}
        {availableRoles.length > 0 && (
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              <span className="font-medium">Add Official</span>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={!useManualEntry ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setUseManualEntry(false)}
                >
                  Select Player
                </Button>
                <Button
                  variant={useManualEntry ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setUseManualEntry(true)}
                >
                  Enter Name
                </Button>
              </div>

              {useManualEntry ? (
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    placeholder="Enter official's name"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Player</Label>
                  <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select player" />
                    </SelectTrigger>
                    <SelectContent>
                      {allPlayers.map((player) => (
                        <SelectItem key={player.player_id} value={player.player_id}>
                          {player.profiles.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button
                className="w-full"
                onClick={handleAddOfficial}
                disabled={loading || !selectedRole}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Add Official
              </Button>
            </div>
          </div>
        )}

        {availableRoles.length === 0 && officials.length > 0 && (
          <p className="text-center text-muted-foreground text-sm py-4">
            All official roles have been filled
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OfficialsDialog;
