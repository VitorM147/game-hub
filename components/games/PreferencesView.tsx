"use client";

import { Button } from "@/components/ui/Button";
import { useFavorites, useHistory, usePrefs } from "@/hooks/useStore";
import { clearFavorites, clearHistory, resetAll, setPref, type Prefs } from "@/lib/store";
import { toast } from "@/lib/toast";

function Switch({ id, label, hint, checked, onChange }: { id: string; label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-6 py-5">
      <div>
        <label htmlFor={id} className="font-display text-xl font-semibold">
          {label}
        </label>
        <p id={`${id}-hint`} className="mt-1 max-w-md text-[13px] text-mute">
          {hint}
        </p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={`${id}-hint`}
        onClick={() => onChange(!checked)}
        className={`relative mt-1 h-7 w-12 shrink-0 rounded-xs border transition-colors ${checked ? "border-accent bg-accent" : "border-line bg-surface"}`}
      >
        <span
          aria-hidden="true"
          className={`absolute top-[3px] h-5 w-5 rounded-[1px] transition-all ${checked ? "left-[25px] bg-accent-ink" : "left-[3px] bg-mute"}`}
        />
        <span className="sr-only">{checked ? "Ligado" : "Desligado"}</span>
      </button>
    </div>
  );
}

export function PreferencesView() {
  const prefs = usePrefs();
  const favorites = useFavorites();
  const history = useHistory();

  const toggle = (key: keyof Prefs) => (v: boolean) => setPref(key, v);

  return (
    <div className="max-w-3xl space-y-12">
      <section aria-labelledby="exibicao">
        <h2 id="exibicao" className="border-b border-line pb-3 font-display text-[28px] font-bold uppercase">
          Exibição
        </h2>
        <div className="divide-y divide-line-soft">
          <Switch
            id="pref-motion"
            label="Reduzir animações"
            hint="Desliga transições e efeitos de movimento. Já vem ativado se o seu sistema pede menos movimento."
            checked={prefs.reduceMotion}
            onChange={toggle("reduceMotion")}
          />
          <Switch
            id="pref-compact"
            label="Grade compacta"
            hint="Cards menores na página Explorar, para ver mais jogos de uma vez."
            checked={prefs.compactGrid}
            onChange={toggle("compactGrid")}
          />
          <Switch
            id="pref-controls"
            label="Mostrar controles ao abrir um jogo"
            hint="Abre o painel de controles na tela de jogo. Você pode abri-lo e fechá-lo a qualquer momento."
            checked={prefs.showControlsHint}
            onChange={toggle("showControlsHint")}
          />
        </div>
      </section>

      <section aria-labelledby="dados">
        <h2 id="dados" className="border-b border-line pb-3 font-display text-[28px] font-bold uppercase">
          Dados neste navegador
        </h2>
        <p className="mt-4 text-[14px] text-mute">
          Não existe conta. Favoritos, histórico e preferências são guardados no armazenamento local do navegador e nunca saem dele.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            disabled={history.length === 0}
            onClick={() => {
              clearHistory();
              toast("Histórico apagado");
            }}
          >
            Apagar histórico ({history.length})
          </Button>
          <Button
            disabled={favorites.length === 0}
            onClick={() => {
              clearFavorites();
              toast("Favoritos apagados");
            }}
          >
            Apagar favoritos ({favorites.length})
          </Button>
          <Button
            variant="ghost"
            className="text-alert hover:text-alert"
            onClick={() => {
              resetAll();
              toast("Dados locais restaurados ao padrão");
            }}
          >
            Restaurar tudo
          </Button>
        </div>
      </section>
    </div>
  );
}
