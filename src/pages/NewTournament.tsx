import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Plus, Trash2, Users, Loader2, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type MatchType = 'test' | 'odi' | 'T20' | 'box_cricket' | 'custom';

interface Team {
  id: string;
  name: string;
}

interface TournamentGroup {
  id: string;
  name: string;
  teamIds: string[];
}

const NewTournament: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Tournament details
  const [tournamentName, setTournamentName] = useState('');
  const [matchType, setMatchType] = useState<MatchType>('T20');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Teams
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');

  // Groups
  const [useGroups, setUseGroups] = useState<'single' | 'groups'>('single');
  const [groups, setGroups] = useState<TournamentGroup[]>([]);
  const [newGroupName, setNewGroupName] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchTeams();
  }, [user, navigate]);

  const fetchTeams = async () => {
    const { data } = await supabase.from('teams').select('id, name').order('name');
    if (data) setAllTeams(data);
  };

  const createTeam = async () => {
    if (!newTeamName.trim()) {
      toast.error('Please enter a team name');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('teams')
      .insert({ name: newTeamName, created_by: user?.id })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create team');
    } else {
      setAllTeams([...allTeams, data]);
      setNewTeamName('');
      setShowCreateTeam(false);
      toast.success('Team created!');
    }
    setLoading(false);
  };

  const toggleTeamSelection = (teamId: string) => {
    if (selectedTeamIds.includes(teamId)) {
      setSelectedTeamIds(selectedTeamIds.filter((id) => id !== teamId));
      // Remove from groups if present
      setGroups(groups.map(g => ({
        ...g,
        teamIds: g.teamIds.filter(id => id !== teamId)
      })));
    } else {
      setSelectedTeamIds([...selectedTeamIds, teamId]);
    }
  };

  const addGroup = () => {
    if (!newGroupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }
    setGroups([...groups, { id: crypto.randomUUID(), name: newGroupName, teamIds: [] }]);
    setNewGroupName('');
  };

  const removeGroup = (groupId: string) => {
    setGroups(groups.filter((g) => g.id !== groupId));
  };

  const addTeamToGroup = (groupId: string, teamId: string) => {
    // Remove from other groups first
    const updatedGroups = groups.map(g => ({
      ...g,
      teamIds: g.id === groupId 
        ? [...g.teamIds, teamId]
        : g.teamIds.filter(id => id !== teamId)
    }));
    setGroups(updatedGroups);
  };

  const removeTeamFromGroup = (groupId: string, teamId: string) => {
    setGroups(groups.map(g => 
      g.id === groupId 
        ? { ...g, teamIds: g.teamIds.filter(id => id !== teamId) }
        : g
    ));
  };

  const getUnassignedTeams = () => {
    const assignedIds = groups.flatMap(g => g.teamIds);
    return selectedTeamIds.filter(id => !assignedIds.includes(id));
  };

  const startTournament = async () => {
    if (!tournamentName.trim()) {
      toast.error('Please enter tournament name');
      return;
    }
    if (selectedTeamIds.length < 2) {
      toast.error('Please select at least 2 teams');
      return;
    }

    setLoading(true);

    try {
      // Create tournament
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .insert({
          name: tournamentName,
          tournament_type: useGroups === 'groups' ? 'group_stage' : 'league',
          match_type: matchType,
          start_date: startDate || null,
          end_date: endDate || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (tournamentError) throw tournamentError;

      // Add teams to tournament
      const teamInserts = selectedTeamIds.map((teamId) => ({
        tournament_id: tournamentData.id,
        team_id: teamId,
      }));

      const { error: teamsError } = await supabase
        .from('tournament_teams')
        .insert(teamInserts);

      if (teamsError) throw teamsError;

      // Create groups if using group stage
      if (useGroups === 'groups' && groups.length > 0) {
        for (const group of groups) {
          const { data: groupData, error: groupError } = await supabase
            .from('tournament_groups')
            .insert({
              tournament_id: tournamentData.id,
              name: group.name,
            })
            .select()
            .single();

          if (groupError) throw groupError;

          // Add teams to group
          if (group.teamIds.length > 0) {
            const groupTeamInserts = group.teamIds.map((teamId) => ({
              group_id: groupData.id,
              team_id: teamId,
            }));

            const { error: groupTeamsError } = await supabase
              .from('tournament_group_teams')
              .insert(groupTeamInserts);

            if (groupTeamsError) throw groupTeamsError;
          }
        }
      }

      toast.success('Tournament created!');
      navigate(`/tournament/${tournamentData.id}`);
    } catch (error) {
      console.error('Error creating tournament:', error);
      toast.error('Failed to create tournament');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6 animate-fade-in">
      <h2 className="font-display text-xl font-bold">Tournament Details</h2>

      <div>
        <Label>Tournament Name</Label>
        <Input
          value={tournamentName}
          onChange={(e) => setTournamentName(e.target.value)}
          placeholder="Enter tournament name"
        />
      </div>

      <div className="space-y-3">
        <Label>Match Type</Label>
        <RadioGroup value={matchType} onValueChange={(v) => setMatchType(v as MatchType)}>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'T20', label: 'T20' },
              { value: 'odi', label: 'ODI' },
              { value: 'test', label: 'Test' },
              { value: 'box_cricket', label: 'Box Cricket' },
            ].map((type) => (
              <Label
                key={type.value}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  matchType === type.value
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
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Start Date</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <Label>End Date</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 animate-fade-in">
      <h2 className="font-display text-xl font-bold">Select Teams</h2>
      <p className="text-muted-foreground text-sm">
        Select all teams that will participate in this tournament
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
        {allTeams.map((team) => (
          <div
            key={team.id}
            onClick={() => toggleTeamSelection(team.id)}
            className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
              selectedTeamIds.includes(team.id)
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <p className="font-medium truncate">{team.name}</p>
          </div>
        ))}
      </div>

      {!showCreateTeam ? (
        <Button variant="outline" className="w-full" onClick={() => setShowCreateTeam(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create New Team
        </Button>
      ) : (
        <Card>
          <CardContent className="pt-4 space-y-4">
            <div>
              <Label>Team Name</Label>
              <Input
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Enter team name"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={createTeam} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
              </Button>
              <Button variant="outline" onClick={() => setShowCreateTeam(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-sm text-muted-foreground text-center">
        {selectedTeamIds.length} team{selectedTeamIds.length !== 1 ? 's' : ''} selected
      </p>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6 animate-fade-in">
      <h2 className="font-display text-xl font-bold">Group Settings</h2>

      <RadioGroup value={useGroups} onValueChange={(v) => setUseGroups(v as 'single' | 'groups')}>
        <div className="space-y-3">
          <Label
            className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
              useGroups === 'single'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <RadioGroupItem value="single" />
            <div>
              <p className="font-medium">Single Group (League)</p>
              <p className="text-sm text-muted-foreground">All teams play in one group</p>
            </div>
          </Label>
          <Label
            className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
              useGroups === 'groups'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <RadioGroupItem value="groups" />
            <div>
              <p className="font-medium">Multiple Groups</p>
              <p className="text-sm text-muted-foreground">Divide teams into groups</p>
            </div>
          </Label>
        </div>
      </RadioGroup>

      {useGroups === 'groups' && (
        <div className="space-y-4 mt-6">
          <div className="flex gap-2">
            <Input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Group name (e.g., Group A)"
            />
            <Button onClick={addGroup}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {groups.map((group) => (
            <Card key={group.id}>
              <CardHeader className="py-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base">{group.name}</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeGroup(group.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {/* Teams in group */}
                <div className="flex flex-wrap gap-2">
                  {group.teamIds.map((teamId) => {
                    const team = allTeams.find((t) => t.id === teamId);
                    return (
                      <div
                        key={teamId}
                        className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded text-sm"
                      >
                        <span>{team?.name}</span>
                        <button
                          onClick={() => removeTeamFromGroup(group.id, teamId)}
                          className="text-destructive hover:text-destructive/80"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Add team dropdown */}
                <Select
                  onValueChange={(teamId) => addTeamToGroup(group.id, teamId)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Add team to group" />
                  </SelectTrigger>
                  <SelectContent>
                    {getUnassignedTeams().map((teamId) => {
                      const team = allTeams.find((t) => t.id === teamId);
                      return (
                        <SelectItem key={teamId} value={teamId}>
                          {team?.name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          ))}

          {getUnassignedTeams().length > 0 && groups.length > 0 && (
            <p className="text-sm text-destructive">
              {getUnassignedTeams().length} team(s) not assigned to any group
            </p>
          )}
        </div>
      )}
    </div>
  );

  const renderStep4 = () => {
    const assignedTeamsCount = useGroups === 'groups' 
      ? groups.reduce((acc, g) => acc + g.teamIds.length, 0)
      : selectedTeamIds.length;

    return (
      <div className="space-y-6 animate-fade-in">
        <h2 className="font-display text-xl font-bold">Review & Start</h2>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tournament Name</span>
              <span className="font-medium">{tournamentName || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Match Type</span>
              <span className="font-medium capitalize">{matchType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Teams</span>
              <span className="font-medium">{selectedTeamIds.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Format</span>
              <span className="font-medium">
                {useGroups === 'groups' ? `${groups.length} Groups` : 'Single Group'}
              </span>
            </div>
            {startDate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Start Date</span>
                <span className="font-medium">{startDate}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Button
          className="w-full"
          size="lg"
          onClick={startTournament}
          disabled={loading || !tournamentName || selectedTeamIds.length < 2}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Trophy className="h-4 w-4 mr-2" />
          )}
          Start Tournament
        </Button>
      </div>
    );
  };

  const canProceedToStep2 = tournamentName.trim() !== '';
  const canProceedToStep3 = selectedTeamIds.length >= 2;
  const canProceedToStep4 = useGroups === 'single' || (groups.length > 0 && getUnassignedTeams().length === 0);

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-2xl">Create Tournament</CardTitle>
            <CardDescription>
              Step {step} of 4:{' '}
              {step === 1 ? 'Details' : step === 2 ? 'Teams' : step === 3 ? 'Groups' : 'Review'}
            </CardDescription>
            <div className="flex gap-2 mt-4">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`h-2 flex-1 rounded-full transition-colors ${
                    s <= step ? 'bg-primary' : 'bg-border'
                  }`}
                />
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}

            <div className="flex justify-between mt-8">
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep(step - 1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
              )}
              {step < 4 && (
                <Button
                  onClick={() => setStep(step + 1)}
                  className="ml-auto"
                  disabled={
                    (step === 1 && !canProceedToStep2) ||
                    (step === 2 && !canProceedToStep3) ||
                    (step === 3 && !canProceedToStep4)
                  }
                >
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default NewTournament;
