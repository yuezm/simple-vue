import { Watcher } from './watcher';
import { isEmpty } from '@/helper';

let depsId: number = 0;

export class Deps {
  subs: Set<Watcher> = new Set<Watcher>();
  id: number = ++depsId;

  append(w: Watcher) {
    if (isEmpty(w)) {
      return;
    }
    w.append(this);
  }

  push(w: Watcher) {
    this.subs.add(w);
  }

  del(w: Watcher) {
    this.subs.delete(w);
  }

  clear() {
    this.subs.clear();
  }

  notify() {
    this.subs.forEach((w: Watcher) => {
      w.update();
    });
  }

  static Target: Watcher | undefined;

  static SET_TARGET(w: Watcher) {
    Deps.Target = w;
  }

  static REMOVE_TARGET() {
    Deps.Target = undefined;
  }
}
