export interface HudState {
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  level: number;
  xp: number;
  xpToNext: number;
  gold: number;
  boss: { name: string; hp: number; maxHp: number } | null;
}

export class Hud {
  private root: HTMLElement;
  private hpFill!: HTMLElement;
  private manaFill!: HTMLElement;
  private xpFill!: HTMLElement;
  private levelLabel!: HTMLElement;
  private goldLabel!: HTMLElement;
  private bossBar!: HTMLElement;
  private bossFill!: HTMLElement;
  private bossName!: HTMLElement;
  private toastEl!: HTMLElement;
  private overlay!: HTMLElement;
  private overlayTitle!: HTMLElement;
  private overlaySub!: HTMLElement;
  private overlayButton!: HTMLButtonElement;
  private toastTimer: number | undefined;

  constructor(mount: HTMLElement) {
    this.root = mount;
  }

  mount(onOverlayAction: () => void): void {
    this.root.innerHTML = `
      <div class="hud-boss" id="hud-boss">
        <div class="hud-boss-name" id="hud-boss-name"></div>
        <div class="hud-boss-track"><div class="hud-boss-fill" id="hud-boss-fill"></div></div>
      </div>
      <div class="hud-toast" id="hud-toast"></div>
      <div class="hud-bars">
        <div class="hud-row">HP <div class="hud-bar-track"><div class="hud-bar-fill hp" id="hud-hp"></div></div></div>
        <div class="hud-row">MP <div class="hud-bar-track"><div class="hud-bar-fill mana" id="hud-mana"></div></div></div>
        <div class="hud-row">XP <div class="hud-bar-track"><div class="hud-bar-fill xp" id="hud-xp"></div></div></div>
        <div class="hud-meta">
          <span>Level <span id="hud-level">1</span></span>
          <span class="hud-gold"><span id="hud-gold">0</span> gold</span>
        </div>
      </div>
      <div class="hud-controls">
        <div><b>WASD</b> move · <b>Shift</b> run</div>
        <div><b>Space</b> / click attack</div>
      </div>
      <div class="hud-overlay" id="hud-overlay">
        <div class="hud-overlay-title" id="hud-overlay-title"></div>
        <div class="hud-overlay-sub" id="hud-overlay-sub"></div>
        <button id="hud-overlay-btn"></button>
      </div>
    `;

    this.hpFill = this.q("#hud-hp");
    this.manaFill = this.q("#hud-mana");
    this.xpFill = this.q("#hud-xp");
    this.levelLabel = this.q("#hud-level");
    this.goldLabel = this.q("#hud-gold");
    this.bossBar = this.q("#hud-boss");
    this.bossFill = this.q("#hud-boss-fill");
    this.bossName = this.q("#hud-boss-name");
    this.toastEl = this.q("#hud-toast");
    this.overlay = this.q("#hud-overlay");
    this.overlayTitle = this.q("#hud-overlay-title");
    this.overlaySub = this.q("#hud-overlay-sub");
    this.overlayButton = this.q("#hud-overlay-btn") as HTMLButtonElement;
    this.overlayButton.addEventListener("click", () => {
      this.hideOverlay();
      onOverlayAction();
    });
  }

  private q<T extends HTMLElement = HTMLElement>(selector: string): T {
    const el = this.root.querySelector<T>(selector);
    if (!el) throw new Error(`HUD element not found: ${selector}`);
    return el;
  }

  update(state: HudState): void {
    this.hpFill.style.width = `${clampPct(state.hp, state.maxHp)}%`;
    this.manaFill.style.width = `${clampPct(state.mana, state.maxMana)}%`;
    this.xpFill.style.width = `${clampPct(state.xp, state.xpToNext)}%`;
    this.levelLabel.textContent = String(state.level);
    this.goldLabel.textContent = String(state.gold);

    if (state.boss) {
      this.bossBar.classList.add("is-visible");
      this.bossName.textContent = state.boss.name;
      this.bossFill.style.width = `${clampPct(state.boss.hp, state.boss.maxHp)}%`;
    } else {
      this.bossBar.classList.remove("is-visible");
    }
  }

  toast(message: string, durationMs = 3200): void {
    this.toastEl.textContent = message;
    this.toastEl.classList.add("is-visible");
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.remove("is-visible"), durationMs);
  }

  showVictory(): void {
    this.overlayTitle.textContent = "Victory";
    this.overlayTitle.className = "hud-overlay-title victory";
    this.overlaySub.textContent = "The Molten Colossus falls. Grimhollow is yours.";
    this.overlayButton.textContent = "Play Again";
    this.overlay.classList.add("is-visible");
  }

  showDeath(): void {
    this.overlayTitle.textContent = "You Have Fallen";
    this.overlayTitle.className = "hud-overlay-title death";
    this.overlaySub.textContent = "The depths claim another soul. Respawning at the entrance.";
    this.overlayButton.textContent = "Continue";
    this.overlay.classList.add("is-visible");
  }

  hideOverlay(): void {
    this.overlay.classList.remove("is-visible");
  }

  spawnFloatingText(screenX: number, screenY: number, text: string): void {
    const el = document.createElement("div");
    el.className = "hud-floating-text";
    el.textContent = text;
    el.style.left = `${screenX}px`;
    el.style.top = `${screenY}px`;
    this.root.appendChild(el);
    const start = performance.now();
    const animate = (t: number) => {
      const elapsed = t - start;
      const progress = Math.min(1, elapsed / 800);
      el.style.top = `${screenY - progress * 40}px`;
      el.style.opacity = String(1 - progress);
      if (progress < 1) requestAnimationFrame(animate);
      else el.remove();
    };
    requestAnimationFrame(animate);
  }
}

function clampPct(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (value / max) * 100));
}
