import { useEffect } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

import { API_BASE_URL } from '../config';
import { getStoredToken, redirectToLogin } from '../routes/globalApi';

const currentUserId = () => {
  const storedId = localStorage.getItem('userId');
  if (storedId) return String(storedId);

  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return String(user?.id || user?.userId || user?._id || '');
  } catch {
    return '';
  }
};

/**
 * Keeps the authenticated browser session synchronized with User Management.
 * When an administrator disables, deletes, or revokes access for the current
 * user, the backend publishes a USER event and this component logs that user
 * out without waiting for the next API call.
 */
export default function AuthSessionWatcher() {
  useEffect(() => {
    const token = getStoredToken();
    const userId = currentUserId();

    if (!token || !userId) return undefined;

    let redirected = false;
    const logoutOnce = (reason) => {
      if (redirected) return;
      redirected = true;
      redirectToLogin(reason);
    };

    const client = new Client({
      webSocketFactory: () => new SockJS(`${API_BASE_URL}/ws`),
      reconnectDelay: 5000,
      debug: () => {},
      onConnect: () => {
        client.subscribe('/topic/app-events', (message) => {
          let event = {};
          try {
            event = JSON.parse(message.body || '{}');
          } catch {
            return;
          }

          const moduleName = String(event?.module || '').trim().toUpperCase();
          const action = String(event?.action || '').trim().toUpperCase();
          const changedUserId = String(event?.id || '');

          if (moduleName !== 'USER' || changedUserId !== userId) return;

          if (action === 'DISABLED' || action === 'DELETED') {
            logoutOnce('accountDisabled');
            return;
          }

          if (action === 'ACCESS_CHANGED' || action === 'SESSION_REVOKED') {
            logoutOnce('sessionRevoked');
          }
        });
      }
    });

    client.activate();

    return () => {
      client.deactivate();
    };
  }, []);

  return null;
}
