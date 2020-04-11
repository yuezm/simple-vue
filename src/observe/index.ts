import { Deps } from './deps';
import { isObject, isEmpty } from '../helper';

const ARRAY_HACK_METHODS: string[] = [ 'push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse' ];

export interface IObserverData {
  __ob__?: Observer;

  [ key: string ]: any;
}


export class Observer {
  deps: Deps = new Deps();
  value: IObserverData;

  constructor(data: IObserverData) {
    Object.defineProperty(data, '__ob__', {
      enumerable: false,
      writable: true,
      configurable: true,
      value: this,
    });

    this.value = data;

    if (Array.isArray(data)) {
      Observer.observeArrayHack(data);

      for (const item of data) {
        Observer.main(item);
      }
    } else {
      Observer.walk(data);
    }
  }

  static main(data: IObserverData): Observer | undefined {
    if (!isObject(data)) {
      return;
    }

    if (data.__ob__) {
      return data.__ob__;
    }

    return new Observer(data);
  }

  static walk(data: IObserverData): void {
    const keys = Object.keys(data);
    for (const key of keys) {
      Observer.defineReactive(data, key, data[ key ]);
    }
  }

  static defineReactive(target: IObserverData, key: string, value?: any): void {
    const des: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(target, key) as PropertyDescriptor;

    if (!isEmpty(des) && !((des as PropertyDescriptor).configurable && (des as PropertyDescriptor).writable)) {
      return;
    }

    const getter: Function | undefined = (des as PropertyDescriptor).get;
    const setter: Function | undefined = (des as PropertyDescriptor).set;

    const _deps: Deps = new Deps();
    let _value: any = isEmpty(getter) ? value : (getter as Function)();
    const childOb: Observer | undefined = Observer.main(_value);

    Object.defineProperty(target, key, {
      // 在 getter 是依赖收集
      get(): any {
        // 由于作用域关系，此处无法访问 *哪一个 Watcher 在获取属性*，所以使用静态属性来标识
        if (Deps.Target) {
          // 收集依赖
          _deps.append(Deps.Target);

          if (!isEmpty(childOb)) {
            // 该步骤是结合 observeArrayHack 来使用的，如果属性值为数组，则调用 ob.deps 而非 闭包中的 _deps
            (childOb as Observer).deps.append(Deps.Target);
          }
        }

        return isEmpty(getter) ? _value : (getter as Function).call(target);
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
        Observer.main(v);
        // 派发更新
        _deps.notify();
      },
    });
  }

  static observeArrayHack(arr: IObserverData): void {
    // 处理数据，主要要劫持当前对象的方法，通过 setPrototypeOf 进行劫持
    const newArrayProto: object = Object.create(Array.prototype);
    const arrayPrototype: any[] = Array.prototype;

    for (const key of ARRAY_HACK_METHODS) {
      newArrayProto[ key ] = (...args: any[]): void => {
        (arrayPrototype[ (key as any) ] as Function).call(arr, ...args);

        if (key === 'push' || key === 'unshift') {
          Observer.main(args[ 0 ]);
        }

        if (key === 'splice') {
          Observer.main(args[ 2 ]);
        }

        (arr.__ob__ as Observer).deps.notify();
      };
    }
    Object.setPrototypeOf(arr, newArrayProto);
  }
}





