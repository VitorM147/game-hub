import type { Category } from "@/types/game";

/** Categorias suportadas. A interface só mostra as que têm pelo menos um jogo no catálogo. */
export const CATEGORIES: Category[] = [
  { id: "acao", label: "Ação", short: "Ação", description: "Reflexo, combate e ritmo rápido." },
  { id: "aventura", label: "Aventura", short: "Aventura", description: "Exploração, narrativa e progressão." },
  { id: "arcade", label: "Arcade e clássicos", short: "Arcade", description: "Pontuação, recorde e partidas curtas." },
  { id: "puzzle", label: "Puzzle", short: "Puzzle", description: "Lógica, padrões e raciocínio." },
  { id: "estrategia", label: "Estratégia", short: "Estratégia", description: "Planejamento e decisões." },
  { id: "corrida", label: "Corrida", short: "Corrida", description: "Velocidade, circuitos e desvios." },
  { id: "rpg", label: "RPG", short: "RPG", description: "Personagens, evolução e escolhas." },
  { id: "plataforma", label: "Plataforma", short: "Plataforma", description: "Saltos, fases e precisão." },
  { id: "narrativo", label: "Narrativos", short: "Narrativos", description: "A história guia a experiência." },
  { id: "indie", label: "Jogos indie", short: "Indie", description: "Projetos independentes e autorais." },
];
