import { IObject } from '@Types/index';
import { Vue } from '@/main';

export function isFunction(data: any): boolean {
  return typeof data === 'function';
}

export function isEmpty(data: any): boolean {
  return data === '' || data === undefined || data === null;
}

export function isObject(data: any): boolean {
  return typeof data === 'object' && data !== null;
}


export function getValueFromMultiKeys(target: IObject, key: string): any {
  const keys: string[] = key.includes('.') ? key.split('.') : [ key ];
  const len = keys.length;

  for (let i = 0; i < len; i++) {
    if (isEmpty(target)) return undefined;
    target = target[ keys[ i ] ];
  }
  return target;
}

export function parsePathsToFunction(paths: string) {
  return function(vm: Vue) {
    return getValueFromMultiKeys(vm, paths);
  };
}


export function proxyData(proxy: IObject, target: IObject) {
  const keys = Object.keys(target);
  for (const key of keys) {
    Object.defineProperty(proxy, key, {
      get(): any {
        return target[ key ];
      },
      set(v: any): void {
        target[ key ] = v;
      },
    });
  }
}
