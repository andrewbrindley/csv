import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { Auth0Provider } from '@auth0/auth0-react';
import { UserProvider } from './components/UserContext';

const domain = process.env.REACT_APP_AUTH0_DOMAIN;
const clientId = process.env.REACT_APP_AUTH0_CLIENT_ID;
const audience = process.env.REACT_APP_AUTH0_AUDIENCE;

console.log("[index.js] Auth0 Config:", {
  domain,
  clientId: clientId ? "REDACTED" : "MISSING",
  audience,
  origin: window.location.origin
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: audience,
        scope: "openid profile email",
      }}
    >
      <UserProvider>
        <App />
      </UserProvider>
    </Auth0Provider>
  </React.StrictMode>
);

reportWebVitals();
