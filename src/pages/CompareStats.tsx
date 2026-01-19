import React from 'react';
import { useSearchParams } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import PlayerComparison from '@/components/player/PlayerComparison';

const CompareStats: React.FC = () => {
  const [searchParams] = useSearchParams();
  const player1 = searchParams.get('player1') || undefined;
  const player2 = searchParams.get('player2') || undefined;

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <h1 className="font-display text-2xl font-bold mb-6">Compare Players</h1>
        <PlayerComparison 
          initialPlayer1Id={player1} 
          initialPlayer2Id={player2} 
        />
      </div>
    </MainLayout>
  );
};

export default CompareStats;
