// ── Price Alerts ────────────────────────────────────────────────────────────
// Horizontal alert lines that fire a callback when price crosses the level.

export interface PriceAlert {
  id: string;
  price: number;
  direction: 'crossing' | 'above' | 'below';
  triggered: boolean;
  label: string;
}

let alertId = 1;

export class AlertManager {
  private alerts = new Map<string, PriceAlert>();
  private onTrigger: (alert: PriceAlert) => void;

  constructor(onTrigger: (alert: PriceAlert) => void) {
    this.onTrigger = onTrigger;
  }

  add(price: number, direction: PriceAlert['direction'] = 'crossing', label?: string): string {
    const id = `alert_${alertId++}`;
    this.alerts.set(id, {
      id, price, direction, triggered: false,
      label: label ?? `Alert @ ${price.toFixed(2)}`,
    });
    return id;
  }

  remove(id: string): void {
    this.alerts.delete(id);
  }

  getAll(): PriceAlert[] {
    return Array.from(this.alerts.values()).filter(a => !a.triggered);
  }

  /** Check if price crossed any alerts */
  check(prevPrice: number, currentPrice: number): void {
    for (const alert of this.alerts.values()) {
      if (alert.triggered) continue;

      let fired = false;
      switch (alert.direction) {
        case 'crossing':
          fired = (prevPrice < alert.price && currentPrice >= alert.price) ||
                  (prevPrice > alert.price && currentPrice <= alert.price);
          break;
        case 'above':
          fired = prevPrice <= alert.price && currentPrice > alert.price;
          break;
        case 'below':
          fired = prevPrice >= alert.price && currentPrice < alert.price;
          break;
      }

      if (fired) {
        alert.triggered = true;
        this.onTrigger(alert);
      }
    }
  }

  clear(): void {
    this.alerts.clear();
  }
}
