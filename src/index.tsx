import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { Auth0Provider } from '@auth0/auth0-react';


const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <Auth0Provider
    domain={process.env.REACT_APP_AUTH_DOMAIN as string} 
    clientId={process.env.REACT_APP_AUTH_CLIENT_ID as string} 
    authorizationParams={{
      redirect_uri: window.location.origin,
      audience: "https://i-cura.com",
      // scope: "openid profile email"
    }}
    cacheLocation="localstorage"
  >
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </Auth0Provider>
);

