import { Deps } from './deps';
import { isObject, isEmpty } from '../helper';

const ARRAY_HACK_METHODS = [ 'push', 'pop', 'shift', 'unshift', 'splice', 'sort' ];

export interface IObserverData {
  __ob__?: Observer;

  [ key: string ]: any;
}

function walk(data: IObserverData): void {
  const keys = Object.keys(data);
  for (const key of keys) {
    defineReactive(data, key, data[ key ]);
  }
}

function observeArrayHack(arr: IObserverData) {
  const newArrayProto = Object.create(Array.prototype);
  const arrayPrototype = Array.prototype as Array<any>;

  for (const key of ARRAY_HACK_METHODS) {
    newArrayProto[ key ] = function(...args: any[]) {
      (arrayPrototype[ (key as any) ] as Function).call(arr, ...args);

      if (key === 'push' || key === 'unshift') {
        observe(args[ 0 ]);
      }

      if (key === 'splice') {
        observe(args[ 2 ]);
      }

      (arr.__ob__ as Observer).deps.notify();
    };
  }
}

function defineReactive(target: IObserverData, key: string, value?: any): void {
  const des: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(target, key);
  if (!isEmpty(des) && !((des as PropertyDescriptor).configurable && (des as PropertyDescriptor).writable)) {
    return;
  }

  const getter: Function | undefined = (des as PropertyDescriptor).get;
  const setter: Function | undefined = (des as PropertyDescriptor).set;

  const _deps: Deps = new Deps();
  let _value: any = isEmpty(getter) ? value : (getter as Function)();

  const childOb: Observer | undefined = observe(_value);
  Object.defineProperty(target, key, {
    get(): any {
      if (Deps.Target) {
        _deps.append(Deps.Target);
        if (!isEmpty(childOb)) {
          (childOb as Observer).deps.append(Deps.Target);
        }
      }

      return isEmpty(getter) ? value : (getter as Function).call(target);
    },
    set(v: any): void {
      if (v === _value || (Number.isNaN(v) && Number.isNaN(_value))) {
        return;
      }

      if (isEmpty(setter)) {
        _value = v;
      } else {
        (setter as Function).call(target, v);
      }

      observe(v);
      _deps.notify();
    },
  });
}

export function observe(data: IObserverData): Observer | undefined {
  if (!isObject(data) || Array.isArray(data)) {
    return;
  }

  if (data.__ob__) {
    return data.__ob__;
  }

  const ob = new Observer(data);
  return ob.__ob__;
}

export class Observer {
  deps: Deps = new Deps();
  __ob__: Observer;
  value: IObserverData;

  constructor(data: IObserverData) {
    this.__ob__ = this;
    this.value = data;

    if (Array.isArray(data)) {
      observeArrayHack(data);

      for (const item of data) {
        observe(item);
      }
    } else {
      walk(data);
    }
  }
}




