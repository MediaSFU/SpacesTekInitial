import React from 'react';
import RequireProfile from '../require-profile';
import SpaceDetails from '@/components/SpaceDetails';

export default function HomeScreen() {
  return (
    <RequireProfile>
      <SpaceDetails />
    </RequireProfile>
  );
}


