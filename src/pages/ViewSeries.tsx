import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';

interface Series {
  id: string;
  name: string;
  series_type: string;
  total_matches: number;
  start_date: string | null;
  end_date: string | null;
  created_by: string;
  team1: { id: string; name: string };
  team2: { id: string; name: string };
}

const ViewSeries: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchSeries();
  }, []);

  const fetchSeries = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('series')
      .select(`
        id,
        name,
        series_type,
        total_matches,
        start_date,
        end_date,
        created_by,
        team1:teams!series_team1_id_fkey(id, name),
        team2:teams!series_team2_id_fkey(id, name)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      setSeriesList(data as unknown as Series[]);
    }
    setLoading(false);
  };

  const filterSeries = (tab: string) => {
    if (tab === 'all') return seriesList;
    if (tab === 'my') return seriesList.filter(s => s.created_by === user?.id);
    return seriesList;
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-display text-2xl font-bold">Series</h1>
          </div>
          <Link to="/new-series">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Series
            </Button>
          </Link>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1">All Series</TabsTrigger>
            <TabsTrigger value="my" className="flex-1">My Series</TabsTrigger>
          </TabsList>

          {['all', 'my'].map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-4 space-y-4">
              {filterSeries(tab).length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No series found</p>
                    <Link to="/new-series">
                      <Button className="mt-4">Create a Series</Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                filterSeries(tab).map((series) => (
                  <Card
                    key={series.id}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/series/${series.id}`)}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{series.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {series.team1?.name} vs {series.team2?.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{series.total_matches} matches</Badge>
                            <Badge variant="secondary" className="capitalize">
                              {series.series_type?.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                        {series.start_date && (
                          <div className="text-right text-sm text-muted-foreground">
                            <p>{new Date(series.start_date).toLocaleDateString()}</p>
                            {series.end_date && (
                              <p>to {new Date(series.end_date).toLocaleDateString()}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default ViewSeries;
