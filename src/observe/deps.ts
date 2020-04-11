import { Watcher } from './watcher';
import { isEmpty } from '@/helper';

let depsId = 0;

export class Deps {
  private subs: Set<Watcher>;
  id: number = ++depsId;

  constructor() {
    this.subs = new Set<Watcher>();
  }


  append(w: Watcher): void {
    if (!isEmpty(w)) {
      w.append(this);
    }
  }

  push(w: Watcher): void {
    this.subs.add(w);
  }

  remove(w: Watcher): void {
    this.subs.delete(w);
  }

  clear(): void {
    this.subs.clear();
  }

  notify(): void {
    this.subs.forEach((w: Watcher) => w.update());
  }

  static Target: Watcher | undefined;

  static SET_TARGET(w: Watcher): void {
    Deps.Target = w;
  }

  static REMOVE_TARGET(): void {
    Deps.Target = undefined;
  }
}
