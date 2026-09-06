import { Navigate } from 'react-router-dom';

import { hasAuthTokens } from '../auth/tokenStorage';


function ProtectedRoute({ children }) {
  if (!hasAuthTokens()) {
    return <Navigate to="/login" replace />;
  }

  return children;
}


export default ProtectedRoute;