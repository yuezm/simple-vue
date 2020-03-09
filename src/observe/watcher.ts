import { Deps } from './deps';
import { Vue } from '@/main';
import { getValueFromMultiKeys, isEmpty } from '../helper';

let watcherId: number = 0;

export interface IWatcherOptions {
  lazy?: boolean;
  key: string;
  vm: Vue;
}

export class Watcher {
  id: number = ++watcherId;
  value: any;
  vm: Vue;
  key: string;
  lazy: boolean = false;
  dirty: boolean = true;
  hasJoinDepsIdSet: Set<number> = new Set<number>();

  constructor(options: IWatcherOptions) {
    this.vm = options.vm;
    this.key = options.key;
    this.lazy = isEmpty(options.lazy) ? false : (options.lazy as boolean);
    this.value = this.lazy ? undefined : this.getValue();
  }

  getValue() {
    Deps.SET_TARGET(this);
    const v = getValueFromMultiKeys(this.vm, this.key);
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
  }
}
