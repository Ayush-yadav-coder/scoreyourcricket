import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { MapPin, Search, Plus, Trophy, Loader2, ChevronRight, GitCompare } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import GroundComparison from '@/components/match/GroundComparison';
interface Ground {
  id: string;
  name: string;
  location: string | null;
  city: string | null;
  country: string | null;
  capacity: number | null;
  matchCount?: number;
}

const Grounds: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [grounds, setGrounds] = useState<Ground[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newGround, setNewGround] = useState({
    name: '',
    city: '',
    country: '',
    capacity: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchGrounds();
  }, []);

  const fetchGrounds = async () => {
    setLoading(true);

    const { data: groundsData, error } = await supabase
      .from('grounds')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      toast.error('Failed to load grounds');
      setLoading(false);
      return;
    }

    // Get match counts for each ground
    const { data: matchCounts } = await supabase
      .from('matches')
      .select('ground_id')
      .not('ground_id', 'is', null);

    const countMap: Record<string, number> = {};
    matchCounts?.forEach(m => {
      countMap[m.ground_id] = (countMap[m.ground_id] || 0) + 1;
    });

    const groundsWithCounts = groundsData.map(g => ({
      ...g,
      matchCount: countMap[g.id] || 0,
    }));

    // Sort by match count
    groundsWithCounts.sort((a, b) => (b.matchCount || 0) - (a.matchCount || 0));

    setGrounds(groundsWithCounts);
    setLoading(false);
  };

  const handleAddGround = async () => {
    if (!newGround.name.trim()) {
      toast.error('Please enter a ground name');
      return;
    }

    setSaving(true);

    const { error } = await supabase.from('grounds').insert({
      name: newGround.name.trim(),
      city: newGround.city.trim() || null,
      country: newGround.country.trim() || null,
      capacity: newGround.capacity ? parseInt(newGround.capacity) : null,
    });

    if (error) {
      toast.error('Failed to add ground');
    } else {
      toast.success('Ground added successfully!');
      setShowAddDialog(false);
      setNewGround({ name: '', city: '', country: '', capacity: '' });
      fetchGrounds();
    }

    setSaving(false);
  };

  const filteredGrounds = grounds.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.country?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold">Cricket Grounds</h1>
              <p className="text-muted-foreground">Explore venues, compare conditions & statistics</p>
            </div>
          </div>

          {user && (
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Ground
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Ground</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Ground Name *</Label>
                    <Input
                      placeholder="e.g., Wankhede Stadium"
                      value={newGround.name}
                      onChange={(e) => setNewGround({ ...newGround, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input
                        placeholder="e.g., Mumbai"
                        value={newGround.city}
                        onChange={(e) => setNewGround({ ...newGround, city: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <Input
                        placeholder="e.g., India"
                        value={newGround.country}
                        onChange={(e) => setNewGround({ ...newGround, country: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Capacity</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 33000"
                      value={newGround.capacity}
                      onChange={(e) => setNewGround({ ...newGround, capacity: e.target.value })}
                    />
                  </div>
                  <Button className="w-full" onClick={handleAddGround} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Add Ground
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Tabs for Browse and Compare */}
        <Tabs defaultValue="browse" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="browse" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Browse Grounds
            </TabsTrigger>
            <TabsTrigger value="compare" className="flex items-center gap-2">
              <GitCompare className="h-4 w-4" />
              Head-to-Head
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-4 mt-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search grounds..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
        </div>

        {/* Grounds List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredGrounds.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No grounds found matching your search' : 'No grounds added yet'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredGrounds.map(ground => (
              <Card
                key={ground.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/ground/${ground.id}`)}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <MapPin className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{ground.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {ground.city && <span>{ground.city}</span>}
                        {ground.country && <Badge variant="outline" className="text-xs">{ground.country}</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-primary">
                        <Trophy className="h-4 w-4" />
                        <span className="font-bold">{ground.matchCount}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">matches</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
          </TabsContent>

          <TabsContent value="compare" className="mt-4">
            <GroundComparison />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Grounds;
