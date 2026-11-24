type Listener = (message: string) => void;
const listeners = new Set<Listener>();

export function subscribeToast(l: Listener): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function toast(message: string) {
  listeners.forEach((l) => l(message));
}
