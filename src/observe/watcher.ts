import { Deps } from './deps';
import { Vue } from '@/main';
import { isEmpty, parsePathsToFunction } from '../helper';
import { update } from '@/vdom';

let watcherId: number = 0;

export interface IWatcherOptions {
  lazy?: boolean;
  key: string | Function;
  vm: Vue;
}

export class Watcher {
  id: number = ++watcherId;
  value: any;
  vm: Vue;
  getter: Function;
  lazy: boolean = false;
  dirty: boolean = true;
  hasJoinDepsIdSet: Set<number> = new Set<number>();

  constructor(options: IWatcherOptions) {
    this.vm = options.vm;
    this.getter = typeof options.key === 'string' ? parsePathsToFunction(options.key) : options.key;
    this.lazy = isEmpty(options.lazy) ? false : (options.lazy as boolean);

    this.value = this.lazy ? undefined : this.getValue();
  }

  getValue() {
    Deps.SET_TARGET(this);
    const v = this.getter.call(this.vm, this.vm);
    Deps.REMOVE_TARGET();
    return v;
  }

  evaluate() {
    if (this.dirty) {
      this.value = this.getValue();
      this.dirty = false;
    }
    return this.value;
  }


  append(d: Deps) {
    if (this.hasJoinDepsIdSet.has(d.id)) {
      return;
    }
    d.push(this);
  }

  update() {
    if (this.lazy) {
      this.dirty = true;
    }
    // 干点啥
    this.getValue();
  }
}
