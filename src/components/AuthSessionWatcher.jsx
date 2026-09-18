import { useCallback } from 'react';

import { getStoredToken, redirectToLogin } from '../routes/globalApi';
import { useAppSocketEvent } from '../realtime/AppSocketProvider';

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
  const handleUserEvent = useCallback((event) => {
    const token = getStoredToken();
    const userId = currentUserId();
    if (!token || !userId) return;

    const action = String(event?.action || '').trim().toUpperCase();
    const changedUserId = String(event?.id || '');
    if (changedUserId !== userId) return;

    if (action === 'DISABLED' || action === 'DELETED') {
      redirectToLogin('accountDisabled');
      return;
    }

    if (action === 'ACCESS_CHANGED' || action === 'SESSION_REVOKED') {
      redirectToLogin('sessionRevoked');
    }
  }, []);

  useAppSocketEvent('USER', handleUserEvent);
  return null;
}
