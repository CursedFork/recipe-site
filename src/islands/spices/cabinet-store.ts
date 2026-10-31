/* ---------------------------------------------------------------------------
   The saved cabinet, shared by every island on every Spices page.

   A tiny store in the shape React's useSyncExternalStore wants. It is the one
   place that touches localStorage, and every access is inside try/catch: the
   calls throw outright in some private-browsing modes and when site data is
   blocked. When saving fails the cabinet still works for the visit, and
   saveFailed says so, so the page can be honest that it will be forgotten.

   Nothing is sent anywhere. No cookies, no accounts.
   --------------------------------------------------------------------------- */

import { useSyncExternalStore } from "react";

import {
  CABINET_KEY,
  emptyCabinet,
  parseCabinet,
  serializeCabinet,
  type Cabinet,
} from "../../lib/spices/cabinet";

export interface CabinetState extends Cabinet {
  /** True once a save was refused, so the page can say it will not last. */
  saveFailed: boolean;
}

const serverState: CabinetState = { ...emptyCabinet, saveFailed: false };

let state: CabinetState = serverState;
let loaded = false;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function load() {
  if (loaded) return;
  loaded = true;

  try {
    state = { ...parseCabinet(localStorage.getItem(CABINET_KEY)), saveFailed: false };
  } catch {
    state = { ...emptyCabinet, saveFailed: true };
  }
}

/** Replace the cabinet and save it. */
export function setCabinet(next: Cabinet): void {
  load();

  let saveFailed = false;
  try {
    localStorage.setItem(CABINET_KEY, serializeCabinet(next));
  } catch {
    saveFailed = true;
  }

  state = { ...next, saveFailed };
  notify();
}

/** The current cabinet, for code that acts on it from an event handler. */
export function getCabinet(): Cabinet {
  load();
  return state;
}

function onStorage(event: StorageEvent) {
  // Another tab changed the cabinet.
  if (event.key !== CABINET_KEY && event.key !== null) return;

  try {
    state = { ...parseCabinet(localStorage.getItem(CABINET_KEY)), saveFailed: false };
  } catch {
    return;
  }
  notify();
}

function subscribe(listener: () => void): () => void {
  load();
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);

  // The state may have been read after this component rendered on the server.
  // Telling it again makes the real saved cabinet replace the empty one.
  queueMicrotask(listener);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

/**
 * The cabinet as React state. The server and the first client render both see
 * an empty cabinet, so hydration always matches, and the saved one arrives a
 * moment later.
 */
export function useCabinet(): CabinetState {
  return useSyncExternalStore(
    subscribe,
    () => {
      load();
      return state;
    },
    () => serverState,
  );
}
