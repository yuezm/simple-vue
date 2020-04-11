// 存储target 和 proxy 防止重复
import { EOperationType, IReactiveEffect, track, trigger } from './effect';

const targetToProxy = new WeakMap<any, ProxyConstructor>();
const proxyToTarget = new WeakMap<ProxyConstructor, any>();


// 存储依赖收集
export type Dep = Set<IReactiveEffect>;
export const targetMap = new WeakMap<any, Map<any, Dep>>();


// 排除的 symbol 属性
const proxyExcludeSymbols: Set<symbol> = new Set(
  Object.getOwnPropertyNames(Symbol)
    .map((key: string) => Symbol[ key ])
    .filter((value: any) => typeof value === 'symbol'),
);

export function reactive(target: any) {

  // 如果目标已经存在 proxy 了
  if (targetToProxy.has(target)) {
    return targetToProxy.get(target);
  }

  // 如果目标本本身就是 proxy
  if (proxyToTarget.has(target)) {
    return target;
  }

  const observed = new Proxy(target, {
    get(target: any, key: string | number | symbol, receiver: any): any {
      const res: any = Reflect.get(target, key, receiver);

      // 需要排除特殊symbol，如果不排除，会造成无限调用
      if (typeof key === 'symbol' && proxyExcludeSymbols.has(key)) {
        return res;
      }

      track(target, EOperationType.GET, key);


      if (res !== null && typeof res === 'object') {
        reactive(res);
      }

      return res;
    },
    set(target: any, key: string | number | symbol, value: any, receiver: any): boolean {
      const oldValue = target[ key ];
      if (oldValue === value) {
        return true;
      }

      const result = Reflect.set(target, key, value, receiver); // 设置新的值

      if (result) {
        // set 会存在两种触发，一种为 新增属性，一种为编辑属性
        trigger(target, EOperationType.SET, key);
      }

      return result;
    },
  });

  targetToProxy.set(target, observed);
  proxyToTarget.set(observed, target);

  if (!targetMap.has(target)) {
    targetMap.set(target, new Map());
  }

  return observed;
}
