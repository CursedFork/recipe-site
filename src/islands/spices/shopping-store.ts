/* ---------------------------------------------------------------------------
   The saved shopping list, shared by every island on every Spices page.

   The same shape as the cabinet store: one place that touches localStorage,
   every access inside try/catch, an empty list on the server and on the first
   client render so hydration matches. Nothing is sent anywhere.
   --------------------------------------------------------------------------- */

import { useSyncExternalStore } from "react";

import {
  SHOPPING_KEY,
  emptyList,
  parseList,
  serializeList,
  type ShoppingList,
} from "../../lib/spices/shopping";

export interface ShoppingState extends ShoppingList {
  /** True once a save was refused, so the page can say it will not last. */
  saveFailed: boolean;
}

const serverState: ShoppingState = { ...emptyList, saveFailed: false };

let state: ShoppingState = serverState;
let loaded = false;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function load() {
  if (loaded) return;
  loaded = true;

  try {
    state = { ...parseList(localStorage.getItem(SHOPPING_KEY)), saveFailed: false };
  } catch {
    state = { ...emptyList, saveFailed: true };
  }
}

/** Replace the list and save it. */
export function setShopping(next: ShoppingList): void {
  load();

  let saveFailed = false;
  try {
    localStorage.setItem(SHOPPING_KEY, serializeList(next));
  } catch {
    saveFailed = true;
  }

  state = { ...next, saveFailed };
  notify();
}

/** The current list, for code that acts on it from an event handler. */
export function getShopping(): ShoppingList {
  load();
  return state;
}

function onStorage(event: StorageEvent) {
  if (event.key !== SHOPPING_KEY && event.key !== null) return;

  try {
    state = { ...parseList(localStorage.getItem(SHOPPING_KEY)), saveFailed: false };
  } catch {
    return;
  }
  notify();
}

function subscribe(listener: () => void): () => void {
  load();
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  queueMicrotask(listener);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

export function useShopping(): ShoppingState {
  return useSyncExternalStore(
    subscribe,
    () => {
      load();
      return state;
    },
    () => serverState,
  );
}
