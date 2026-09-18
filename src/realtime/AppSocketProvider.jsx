import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

import { API_BASE_URL } from '../config';
import { getStoredToken } from '../routes/globalApi';
import { shouldSuppressLocalRealtimeEvent } from './localMutationRegistry';

const AppSocketContext = createContext({ connected: false, lastEvent: null });

const normalizeModule = (value) => String(value || '').trim().toUpperCase();
const normalizeBuyerKey = (value) => String(value || '').trim().toUpperCase();

/**
 * One shared STOMP connection for the whole SPA.
 * REST remains the source of truth; socket messages only invalidate currently displayed data.
 */
export function AppSocketProvider({ children }) {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const sequenceRef = useRef(0);

  useEffect(() => {
    const token = getStoredToken();

    // AppSocketProvider also wraps the login route. Do not open a reconnecting
    // SockJS/STOMP connection until a valid login session exists. Login performs
    // a full-page reload after persisting the token, so the provider will mount
    // again with the authenticated token.
    if (!token) {
      setConnected(false);
      return undefined;
    }

    const client = new Client({
      webSocketFactory: () => new SockJS(`${API_BASE_URL}/ws`),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: () => {},
      beforeConnect: () => {
        const currentToken = getStoredToken();
        client.connectHeaders = currentToken ? { Authorization: `Bearer ${currentToken}` } : {};
      },
      onConnect: () => {
        setConnected(true);
        client.subscribe('/topic/app-events', (message) => {
          try {
            const parsed = JSON.parse(message.body || '{}');
            sequenceRef.current += 1;
            setLastEvent({
              ...parsed,
              module: normalizeModule(parsed?.module),
              action: String(parsed?.action || '').trim().toUpperCase(),
              id: String(parsed?.id || ''),
              buyerKey: normalizeBuyerKey(parsed?.buyerKey),
              _sequence: sequenceRef.current
            });
          } catch {
            sequenceRef.current += 1;
            setLastEvent({ module: 'ALL', action: 'CHANGED', id: 'ALL', _sequence: sequenceRef.current });
          }
        });
      },
      onDisconnect: () => setConnected(false),
      onWebSocketClose: () => setConnected(false),
      onStompError: () => setConnected(false)
    });

    client.activate();
    return () => {
      setConnected(false);
      client.deactivate();
    };
  }, []);

  const value = useMemo(() => ({ connected, lastEvent }), [connected, lastEvent]);
  return <AppSocketContext.Provider value={value}>{children}</AppSocketContext.Provider>;
}

export const useAppSocket = () => useContext(AppSocketContext);

export function useAppSocketEvent(modules, callback) {
  const { lastEvent } = useAppSocket();
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const moduleKey = Array.isArray(modules) ? modules.join('|') : String(modules || '');
  const acceptedModules = useMemo(() => {
    const values = Array.isArray(modules) ? modules : [modules];
    return new Set(values.map(normalizeModule).filter(Boolean));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleKey]);

  useEffect(() => {
    if (!lastEvent) return;
    const eventBuyerKey = normalizeBuyerKey(lastEvent.buyerKey);
    const selectedBuyerKey = normalizeBuyerKey(localStorage.getItem('selectedBuyerKey'));
    if (eventBuyerKey && selectedBuyerKey && eventBuyerKey !== selectedBuyerKey) return;

    const moduleName = normalizeModule(lastEvent.module);
    if (!acceptedModules.has('ALL') && moduleName !== 'ALL' && !acceptedModules.has(moduleName)) return;
    callbackRef.current?.(lastEvent);
  }, [acceptedModules, lastEvent]);
}

/** Debounced refresh helper so several related socket events collapse into one REST reload. */
export function useRealtimeRefresh(modules, refresh, delay = 160) {
  const refreshRef = useRef(refresh);
  const timerRef = useRef(null);
  refreshRef.current = refresh;

  const onEvent = useCallback((event) => {
    // The current tab already refreshes after its own successful REST mutation.
    // Ignore the matching socket invalidation so Add/Edit/Delete/Import does not
    // trigger a second refresh and visible loading flicker. Other tabs/users are
    // unaffected because this registry exists only in this browser tab.
    if (shouldSuppressLocalRealtimeEvent(event)) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => refreshRef.current?.(event), delay);
  }, [delay]);

  useAppSocketEvent(modules, onEvent);

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);
}

export const masterDataSocketModule = (type) => ({
  vendor: 'VENDOR_CODE',
  matInfo: 'MAT_INFO',
  loss: 'LOSS',
  shipTo: 'SHIP_TO',
  materialShipTo: 'MATERIAL_SHIP_TO',
  currency: 'CURRENCY',
  supplier: 'VENDOR_CODE'
}[type] || String(type || '').trim().toUpperCase());
