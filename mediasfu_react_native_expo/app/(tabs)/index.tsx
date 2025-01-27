import React from 'react';
import RequireProfile from './require-profile';
import SpacesList from '@/components/SpacesList';

export default function HomeScreen() {
  return (
    <RequireProfile>
      <SpacesList />
    </RequireProfile>
  );
}


