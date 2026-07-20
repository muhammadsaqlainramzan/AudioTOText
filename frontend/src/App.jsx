import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import toast from 'react-hot-toast';
import LandingPage from './pages/LandingPage.jsx';

export default function App() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authStatus = params.get('auth');
    const authError = params.get('auth_error');
    const name = params.get('name');

    if (authStatus === 'google_success') {
      toast.success(name ? `Signed in with Google as ${name}.` : 'Signed in with Google.');
    }

    if (authError) {
      toast.error(authError);
    }

    if (authStatus || authError) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.hash}`);
    }
  }, []);

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
    </Routes>
  );
}
