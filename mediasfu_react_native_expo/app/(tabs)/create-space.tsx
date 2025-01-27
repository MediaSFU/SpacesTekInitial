import React from 'react';
import RequireProfile from './require-profile';
import CreateSpace from '@/components/CreateSpace';

export default function HomeScreen() {
  return (
    <RequireProfile>
      <CreateSpace />
    </RequireProfile>
  );
}


