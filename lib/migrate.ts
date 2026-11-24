/**
 * Migração de armazenamento local: Game Hub (gamehub:v1) → JoyStation (joystation:v1).
 * Função pura (recebe um objeto com getItem) para poder ser testada sem navegador.
 * A chave antiga NUNCA é apagada: se algo der errado, os dados do usuário continuam lá.
 */
export interface StorageLike {
  getItem(key: string): string | null;
}

/** Devolve o JSON bruto a usar: o da chave atual; senão o da primeira chave antiga válida; senão null. */
export function pickStoredValue(storage: StorageLike, key: string, legacyKeys: readonly string[]): { raw: string; migrated: boolean } | null {
  const current = storage.getItem(key);
  if (current) return { raw: current, migrated: false };
  for (const legacy of legacyKeys) {
    const raw = storage.getItem(legacy);
    if (!raw) continue;
    try {
      JSON.parse(raw);
      return { raw, migrated: true };
    } catch {
      // JSON corrompido: ignora e tenta a próxima.
    }
  }
  return null;
}
