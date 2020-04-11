import { Dep, targetMap } from './reactive';


// 理解现在的一个 ReactiveEffect 是原来的一个 watcher

export interface IReactiveEffect {
  (): any;

  handler: Function;
  deps: Dep[];
}

export enum EOperationType {
  GET = 1,
  SET = 2,
  DELETE = 3,
}

export const reactiveEffectsStack: IReactiveEffect[] = [];

export function effect(handler: Function, options?: any): IReactiveEffect {
  const effect: IReactiveEffect = createEffect(handler, options);
  effect();
  return effect;
}

export function createEffect(handler: Function, options: any): IReactiveEffect {
  const effect: IReactiveEffect = function effect(...args): any {
    return run(effect as IReactiveEffect, handler, ...args);
  } as IReactiveEffect;

  effect.handler = handler;
  effect.deps = [];

  return effect;
}

export function run(effect: IReactiveEffect, handle: Function, ...args) {

  if (!reactiveEffectsStack.includes(effect)) {
    // 清空依赖
    if (effect.deps && effect.deps.length > 0) {
      effect.deps.forEach((dep: Dep) => {
        dep.delete(effect);
      });
      effect.deps.length = 0;
    }

    try {
      // 添加新的依赖
      reactiveEffectsStack.push(effect);
      return handle(...args);
    } finally {
      reactiveEffectsStack.pop();
    }
  }
}

export function track(target: any, type: EOperationType, key: string | number | symbol) {
  const effect: IReactiveEffect = reactiveEffectsStack[ reactiveEffectsStack.length - 1 ];

  if (effect) {
    if (!targetMap.has(target)) {
      targetMap.set(target, new Map());
    }
    const deps: Map<any, any> = targetMap.get(target); // 这是整个target的依赖Map

    if (!deps.has(key)) {
      deps.set(key, new Set());
    }
    const dep: Dep = deps.get(key); // 这是当前key值的依赖

    if (!dep.has(effect)) {
      dep.add(effect);
      effect.deps.push(dep);
    }
  }
}

export function trigger(target: any, type: EOperationType, key: string | number | symbol) {
  const dep = targetMap.get(target).get(key);
  const effects = new Set();

  for (const effect of dep) {
    effects.add(effect);
  }

  effects.forEach((effect: IReactiveEffect) => {
    effect();
  });
}
