import { Deps } from './deps';
import { Vue } from '@/main';
import { isEmpty, parsePathsToFunction } from '../helper';

let watcherId = 0;

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
  lazy = false;
  dirty = true;
  // 用两个 set 来删除和更新deps，在一次update后，需清除原来的deps中的依赖，在 _render后，更新deps
  deps: Deps[] = [];
  depsIds: Set<number> = new Set<number>();
  newDeps: Deps[] = [];
  newDepsIds: Set<number> = new Set<number>();

  constructor(options: IWatcherOptions) {
    this.vm = options.vm;
    this.getter = typeof options.key === 'string' ? parsePathsToFunction(options.key) : options.key;
    this.lazy = isEmpty(options.lazy) ? false : (options.lazy as boolean);

    this.value = this.lazy ? undefined : this.get();
  }

  get(): any {
    Deps.SET_TARGET(this);
    const v = this.getter.call(this.vm, this.vm);
    Deps.REMOVE_TARGET();

    // 需要清除 deps 中 原来依赖，后更新 getter 插入新的依赖
    this.cleanDeps();
    return v;
  }

  evaluate(): any {
    if (this.dirty) {
      this.value = this.get();
      this.dirty = false;
    }
    return this.value;
  }


  append(d: Deps): void {
    if (this.newDepsIds.has(d.id)) {
      return;
    }

    d.push(this);
    this.newDepsIds.add(d.id);
    this.newDeps.push(d);

    // 如果出现新的Deps时
    if (!this.depsIds.has(d.id)) {
      this.depsIds.add(d.id);
    }
  }

  update(): void {
    if (this.lazy) {
      this.dirty = true;
    }
    this.get(); // 现在是随便干点啥
  }

  cleanDeps(): void {
    const i = this.deps.length - 1;

    while (i >= 0) {
      const dep: Deps = this.deps[ i ];
      if (!this.newDepsIds.has(dep.id)) {
        dep.remove(this);
      }
    }


    // 交换存储的deps ids
    this.depsIds = this.newDepsIds;
    this.newDepsIds = new Set<number>();

    // 交换存储的deps
    this.newDeps = this.deps;
    this.deps = this.newDeps;
    this.newDeps = [];
  }
}
