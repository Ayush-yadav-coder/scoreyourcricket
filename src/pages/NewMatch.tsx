import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Plus, Users, MapPin, Circle, Loader2 } from 'lucide-react';
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
type BallType = 'leather' | 'tennis' | 'rubber' | 'other';

interface Team {
  id: string;
  name: string;
}

const NewMatch: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Teams
  const [teams, setTeams] = useState<Team[]>([]);
  const [team1Id, setTeam1Id] = useState('');
  const [team2Id, setTeam2Id] = useState('');
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  
  // Match details
  const [matchType, setMatchType] = useState<MatchType>('T20');
  const [overs, setOvers] = useState('20');
  const [groundName, setGroundName] = useState('');
  const [groundLocation, setGroundLocation] = useState('');
  const [ballType, setBallType] = useState<BallType>('leather');
  
  // Toss
  const [tossWinner, setTossWinner] = useState('');
  const [tossDecision, setTossDecision] = useState<'bat' | 'bowl'>('bat');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchTeams();
  }, [user, navigate]);

  const fetchTeams = async () => {
    const { data } = await supabase.from('teams').select('id, name').order('name');
    if (data) setTeams(data);
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
      setTeams([...teams, data]);
      setNewTeamName('');
      setShowCreateTeam(false);
      toast.success('Team created successfully!');
    }
    setLoading(false);
  };

  const createMatch = async () => {
    if (!team1Id || !team2Id) {
      toast.error('Please select both teams');
      return;
    }

    if (team1Id === team2Id) {
      toast.error('Please select different teams');
      return;
    }

    setLoading(true);

    // Create ground if provided
    let groundId = null;
    if (groundName.trim()) {
      const { data: groundData } = await supabase
        .from('grounds')
        .insert({ name: groundName, location: groundLocation })
        .select()
        .single();
      if (groundData) groundId = groundData.id;
    }

    // Create match
    const { data: matchData, error } = await supabase
      .from('matches')
      .insert({
        team1_id: team1Id,
        team2_id: team2Id,
        match_type: matchType,
        overs: matchType === 'test' ? null : parseInt(overs),
        ground_id: groundId,
        ball_type: ballType,
        toss_winner_id: tossWinner,
        toss_decision: tossDecision,
        status: 'live',
        created_by: user?.id,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create match');
      setLoading(false);
      return;
    }

    // Create first innings
    const battingTeam = tossDecision === 'bat' ? tossWinner : (tossWinner === team1Id ? team2Id : team1Id);
    const bowlingTeam = battingTeam === team1Id ? team2Id : team1Id;

    await supabase.from('innings').insert({
      match_id: matchData.id,
      batting_team_id: battingTeam,
      bowling_team_id: bowlingTeam,
      innings_number: 1,
    });

    setLoading(false);
    toast.success('Match started!');
    navigate(`/scoring/${matchData.id}`);
  };

  const renderStep1 = () => (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="font-display text-xl font-bold mb-4">Select Teams</h2>
        
        <div className="space-y-4">
          <div>
            <Label>Team 1</Label>
            <Select value={team1Id} onValueChange={setTeam1Id}>
              <SelectTrigger>
                <SelectValue placeholder="Select team 1" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id} disabled={team.id === team2Id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-center text-muted-foreground font-semibold">VS</div>

          <div>
            <Label>Team 2</Label>
            <Select value={team2Id} onValueChange={setTeam2Id}>
              <SelectTrigger>
                <SelectValue placeholder="Select team 2" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id} disabled={team.id === team1Id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Create New Team */}
        {!showCreateTeam ? (
          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={() => setShowCreateTeam(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create New Team
          </Button>
        ) : (
          <Card className="mt-4">
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
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 animate-fade-in">
      <h2 className="font-display text-xl font-bold">Match Details</h2>

      {/* Match Type */}
      <div className="space-y-3">
        <Label>Match Type</Label>
        <RadioGroup value={matchType} onValueChange={(v) => setMatchType(v as MatchType)}>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'test', label: 'Test Match' },
              { value: 'odi', label: 'ODI (50 overs)' },
              { value: 'T20', label: 'T20 (20 overs)' },
              { value: 'box_cricket', label: 'Box Cricket' },
              { value: 'custom', label: 'Custom' },
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

      {/* Overs (not for test) */}
      {matchType !== 'test' && (
        <div>
          <Label>Number of Overs</Label>
          <Input
            type="number"
            value={overs}
            onChange={(e) => setOvers(e.target.value)}
            min="1"
            max="50"
          />
        </div>
      )}

      {/* Ground */}
      <div className="space-y-4">
        <div>
          <Label className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Ground Name
          </Label>
          <Input
            value={groundName}
            onChange={(e) => setGroundName(e.target.value)}
            placeholder="e.g., Local Stadium"
          />
        </div>
        <div>
          <Label>Location</Label>
          <Input
            value={groundLocation}
            onChange={(e) => setGroundLocation(e.target.value)}
            placeholder="e.g., Mumbai, India"
          />
        </div>
      </div>

      {/* Ball Type */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Circle className="h-4 w-4" />
          Ball Type
        </Label>
        <RadioGroup value={ballType} onValueChange={(v) => setBallType(v as BallType)}>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'leather', label: 'Leather' },
              { value: 'tennis', label: 'Tennis' },
              { value: 'rubber', label: 'Rubber' },
              { value: 'other', label: 'Other' },
            ].map((type) => (
              <Label
                key={type.value}
                className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  ballType === type.value
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
    </div>
  );

  const renderStep3 = () => {
    const team1 = teams.find((t) => t.id === team1Id);
    const team2 = teams.find((t) => t.id === team2Id);

    return (
      <div className="space-y-6 animate-fade-in">
        <h2 className="font-display text-xl font-bold">Toss</h2>

        <div className="space-y-4">
          <Label>Who won the toss?</Label>
          <RadioGroup value={tossWinner} onValueChange={setTossWinner}>
            <div className="grid grid-cols-2 gap-4">
              <Label
                className={`flex items-center justify-center gap-2 p-6 rounded-xl border-2 cursor-pointer transition-all ${
                  tossWinner === team1Id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <RadioGroupItem value={team1Id} className="sr-only" />
                <span className="font-display text-lg font-bold">{team1?.name}</span>
              </Label>
              <Label
                className={`flex items-center justify-center gap-2 p-6 rounded-xl border-2 cursor-pointer transition-all ${
                  tossWinner === team2Id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <RadioGroupItem value={team2Id} className="sr-only" />
                <span className="font-display text-lg font-bold">{team2?.name}</span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {tossWinner && (
          <div className="space-y-4 animate-fade-in">
            <Label>Elected to?</Label>
            <RadioGroup value={tossDecision} onValueChange={(v) => setTossDecision(v as 'bat' | 'bowl')}>
              <div className="grid grid-cols-2 gap-4">
                <Label
                  className={`flex items-center justify-center gap-2 p-6 rounded-xl border-2 cursor-pointer transition-all ${
                    tossDecision === 'bat'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value="bat" className="sr-only" />
                  <span className="font-display text-lg font-bold">🏏 Bat</span>
                </Label>
                <Label
                  className={`flex items-center justify-center gap-2 p-6 rounded-xl border-2 cursor-pointer transition-all ${
                    tossDecision === 'bowl'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value="bowl" className="sr-only" />
                  <span className="font-display text-lg font-bold">⚾ Bowl</span>
                </Label>
              </div>
            </RadioGroup>
          </div>
        )}
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-2xl">Start New Match</CardTitle>
            <CardDescription>
              Step {step} of 3:{' '}
              {step === 1 ? 'Select Teams' : step === 2 ? 'Match Details' : 'Toss'}
            </CardDescription>
            <div className="flex gap-2 mt-4">
              {[1, 2, 3].map((s) => (
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

            <div className="flex justify-between mt-8">
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep(step - 1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
              )}
              {step < 3 ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  className="ml-auto"
                  disabled={step === 1 && (!team1Id || !team2Id)}
                >
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={createMatch}
                  className="ml-auto"
                  disabled={!tossWinner || loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    'Start Match'
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default NewMatch;
