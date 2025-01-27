import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SpacesList } from './components/SpacesList';
import { SpaceDetails } from './components/SpaceDetails';
import { CreateSpace } from './components/CreateSpace';
import { WelcomePage} from './components/WelcomePage';
import { Header } from './components/Header';
import './styles/globals.css';

/** 
 * A wrapper to ensure user has selected a profile.
 * If not, redirect to /welcome
 */

const RequireProfile: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const currentUserId = localStorage.getItem('currentUserId');
  if (!currentUserId) {
    return <Navigate to="/welcome" replace />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/welcome" element={<WelcomePage />} />
        
        <Route 
          path="/" 
          element={
            <RequireProfile>
              <SpacesList />
            </RequireProfile>
          } 
        />
        <Route 
          path="/space/:spaceId" 
          element={
            <RequireProfile>
              <SpaceDetails />
            </RequireProfile>
          } 
        />
        <Route 
          path="/create-space" 
          element={
            <RequireProfile>
              <CreateSpace />
            </RequireProfile>
          } 
        />
      </Routes>
    </Router>
  );
};

export default App;

