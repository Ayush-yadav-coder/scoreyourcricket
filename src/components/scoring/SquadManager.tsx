import React, { useState, useEffect } from 'react';
import { Search, Plus, X, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Profile {
  id: string;
  full_name: string;
  phone: string;
  avatar_url: string | null;
}

interface TeamMember {
  id: string;
  player_id: string;
  profiles: Profile;
}

interface SquadManagerProps {
  teamId: string;
  teamName: string;
  onSquadUpdated?: () => void;
}

const SquadManager: React.FC<SquadManagerProps> = ({ teamId, teamName, onSquadUpdated }) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (teamId) {
      fetchTeamMembers();
    }
  }, [teamId]);

  const fetchTeamMembers = async () => {
    const { data, error } = await supabase
      .from('team_members')
      .select('id, player_id, profiles(id, full_name, phone, avatar_url)')
      .eq('team_id', teamId);

    if (data) {
      setMembers(data as unknown as TeamMember[]);
    }
  };

  const searchPlayers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, phone, avatar_url')
      .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%`)
      .limit(10);

    if (data) {
      // Filter out already added members
      const memberIds = members.map(m => m.player_id);
      setSearchResults(data.filter(p => !memberIds.includes(p.id)));
    }
    setSearching(false);
  };

  const addPlayerToTeam = async (player: Profile) => {
    setLoading(true);
    const { error } = await supabase
      .from('team_members')
      .insert({
        team_id: teamId,
        player_id: player.id,
      });

    if (error) {
      toast.error('Failed to add player');
    } else {
      toast.success(`${player.full_name} added to team`);
      await fetchTeamMembers();
      setSearchQuery('');
      setSearchResults([]);
      onSquadUpdated?.();
    }
    setLoading(false);
  };

  const removePlayerFromTeam = async (memberId: string, playerName: string) => {
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      toast.error('Failed to remove player');
    } else {
      toast.success(`${playerName} removed from team`);
      await fetchTeamMembers();
      onSquadUpdated?.();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{teamName} Squad</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowAddPlayer(true)}>
            <UserPlus className="h-4 w-4 mr-1" />
            Add Player
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No players added yet
          </p>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-2 bg-secondary/50 rounded-lg"
              >
                <span className="font-medium">{member.profiles?.full_name || 'Unknown'}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removePlayerFromTeam(member.id, member.profiles?.full_name || 'Player')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <Dialog open={showAddPlayer} onOpenChange={setShowAddPlayer}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Player to {teamName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or phone..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchPlayers(e.target.value);
                  }}
                  className="pl-10"
                />
              </div>

              <ScrollArea className="h-64">
                {searching ? (
                  <div className="text-center py-4 text-muted-foreground">Searching...</div>
                ) : searchResults.length === 0 && searchQuery.length >= 2 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No players found. Make sure they have registered in the app.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {searchResults.map((player) => (
                      <div
                        key={player.id}
                        className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg hover:bg-secondary transition-colors"
                      >
                        <div>
                          <p className="font-medium">{player.full_name}</p>
                          <p className="text-sm text-muted-foreground">{player.phone}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => addPlayerToTeam(player)}
                          disabled={loading}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default SquadManager;
