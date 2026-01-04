import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Plus, Loader2, Trophy, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import SquadManager from '@/components/scoring/SquadManager';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type MatchType = 'test' | 'odi' | 'T20' | 'box_cricket' | 'custom';

interface Team {
  id: string;
  name: string;
}

const NewSeries: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Series details
  const [seriesName, setSeriesName] = useState('');
  const [matchType, setMatchType] = useState<MatchType>('T20');
  const [totalMatches, setTotalMatches] = useState(3);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Teams
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [team1Id, setTeam1Id] = useState('');
  const [team2Id, setTeam2Id] = useState('');
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');

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

  const startSeries = async () => {
    if (!seriesName.trim()) {
      toast.error('Please enter series name');
      return;
    }
    if (!team1Id || !team2Id) {
      toast.error('Please select both teams');
      return;
    }

    setLoading(true);

    try {
      const { data: seriesData, error } = await supabase
        .from('series')
        .insert({
          name: seriesName,
          series_type: matchType,
          team1_id: team1Id,
          team2_id: team2Id,
          total_matches: totalMatches,
          start_date: startDate || null,
          end_date: endDate || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Series created!');
      navigate(`/view-matches`); // Navigate to matches to start individual matches
    } catch (error) {
      console.error('Error creating series:', error);
      toast.error('Failed to create series');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6 animate-fade-in">
      <h2 className="font-display text-xl font-bold">Select Teams for Series</h2>
      <p className="text-muted-foreground text-sm">
        Choose the two teams that will compete in this series
      </p>

      <div className="space-y-4">
        <div>
          <Label>Team 1</Label>
          <Select value={team1Id} onValueChange={setTeam1Id}>
            <SelectTrigger>
              <SelectValue placeholder="Select first team" />
            </SelectTrigger>
            <SelectContent>
              {allTeams.filter(t => t.id !== team2Id).map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Team 2</Label>
          <Select value={team2Id} onValueChange={setTeam2Id}>
            <SelectTrigger>
              <SelectValue placeholder="Select second team" />
            </SelectTrigger>
            <SelectContent>
              {allTeams.filter(t => t.id !== team1Id).map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 animate-fade-in">
      <h2 className="font-display text-xl font-bold">Series Details</h2>

      <div>
        <Label>Series Name</Label>
        <Input
          value={seriesName}
          onChange={(e) => setSeriesName(e.target.value)}
          placeholder="Enter series name (e.g., India vs Australia 2024)"
        />
      </div>

      <div className="space-y-3">
        <Label>Series Type</Label>
        <RadioGroup value={matchType} onValueChange={(v) => setMatchType(v as MatchType)}>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'test', label: 'Test Series' },
              { value: 'odi', label: 'ODI Series' },
              { value: 'T20', label: 'T20 Series' },
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

      <div>
        <Label>Number of Matches</Label>
        <Select value={String(totalMatches)} onValueChange={(v) => setTotalMatches(Number(v))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2, 3, 4, 5, 6, 7].map((num) => (
              <SelectItem key={num} value={String(num)}>
                {num} Match{num > 1 ? 'es' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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

  const renderStep3 = () => {
    const team1 = allTeams.find(t => t.id === team1Id);
    const team2 = allTeams.find(t => t.id === team2Id);

    return (
      <div className="space-y-6 animate-fade-in">
        <h2 className="font-display text-xl font-bold">Setup Full Squads</h2>
        <p className="text-muted-foreground text-sm">
          Add players to each team's full squad for the series. You can select playing XI for each match later.
        </p>

        <div className="space-y-4">
          {team1 && (
            <SquadManager
              teamId={team1Id}
              teamName={team1.name}
            />
          )}
          {team2 && (
            <SquadManager
              teamId={team2Id}
              teamName={team2.name}
            />
          )}
        </div>
      </div>
    );
  };

  const renderStep4 = () => {
    const team1 = allTeams.find(t => t.id === team1Id);
    const team2 = allTeams.find(t => t.id === team2Id);

    return (
      <div className="space-y-6 animate-fade-in">
        <h2 className="font-display text-xl font-bold">Review & Start Series</h2>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Series Name</span>
              <span className="font-medium">{seriesName || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Teams</span>
              <span className="font-medium">{team1?.name} vs {team2?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Match Type</span>
              <span className="font-medium capitalize">{matchType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Matches</span>
              <span className="font-medium">{totalMatches}</span>
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
          onClick={startSeries}
          disabled={loading || !seriesName || !team1Id || !team2Id}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Trophy className="h-4 w-4 mr-2" />
          )}
          Start Series
        </Button>
      </div>
    );
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return team1Id && team2Id;
      case 2:
        return seriesName.trim() && totalMatches > 0;
      case 3:
        return true; // Squad setup is optional
      case 4:
        return seriesName.trim() && team1Id && team2Id;
      default:
        return false;
    }
  };

  return (
    <MainLayout>
      <div className="max-w-lg mx-auto py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold">New Series</h1>
            <p className="text-sm text-muted-foreground">Step {step} of 4</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}

        {step < 4 && (
          <Button
            className="w-full"
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
          >
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </MainLayout>
  );
};

export default NewSeries;
