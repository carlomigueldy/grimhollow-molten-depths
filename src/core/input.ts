export class Input {
  private held = new Set<string>();
  private attackQueued = false;

  constructor() {
    window.addEventListener("keydown", (e) => {
      this.held.add(e.code);
      if (e.code === "Space") {
        e.preventDefault();
        this.attackQueued = true;
      }
    });
    window.addEventListener("keyup", (e) => this.held.delete(e.code));
    window.addEventListener("mousedown", (e) => {
      if (e.button === 0) this.attackQueued = true;
    });
    window.addEventListener("blur", () => this.held.clear());
  }

  isDown(code: string): boolean {
    return this.held.has(code);
  }

  set(code: string, down: boolean): void {
    if (down) this.held.add(code);
    else this.held.delete(code);
  }

  consumeAttack(): boolean {
    if (this.attackQueued) {
      this.attackQueued = false;
      return true;
    }
    return false;
  }

  queueAttack(): void {
    this.attackQueued = true;
  }

  moveVector(): { x: number; z: number } {
    let x = 0;
    let z = 0;
    if (this.isDown("KeyW") || this.isDown("ArrowUp")) z -= 1;
    if (this.isDown("KeyS") || this.isDown("ArrowDown")) z += 1;
    if (this.isDown("KeyA") || this.isDown("ArrowLeft")) x -= 1;
    if (this.isDown("KeyD") || this.isDown("ArrowRight")) x += 1;
    return { x, z };
  }

  isRunning(): boolean {
    return this.isDown("ShiftLeft") || this.isDown("ShiftRight");
  }
}
