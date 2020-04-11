import { isEmpty, isFunction, proxyData } from './helper';
import { Observer } from './observe';
import {
  TNodeType,
  VNode,
  createElement,
} from './vdom/vnode';
import { update } from './vdom';
import { Watcher } from '@/observe/watcher';

let vueId = 0;

export interface IVueOptions {
  data?: Function | object;
  el?: string;
  render?: Function;
  $parent?: Vue;
  $root?: Vue;
}


export class Vue {
  id: number = ++vueId;
  $el: HTMLElement;
  $root: Vue;
  $parent: Vue;
  $options: IVueOptions;
  $vnode: TNodeType;

  constructor(options?: IVueOptions) {
    options = isEmpty(options)
      ? {
        $root: this,
        $parent: null,
      }
      : options;

    this.$options = options;
    this.$parent = options.$parent;
    this.$root = options.$root;

    this.init();
  }

  init(): void {
    this.initData();

    if (!isEmpty(this.$options.el)) {
      this.$mount(this.$options.el);
    }
  }

  initData(): void {
    const data = this.$options.data;
    const _data = isFunction(data)
      ? (data as Function).call(this)
      : isEmpty(data)
        ? {}
        : data;
    proxyData(this, _data);
    Observer.main(_data);
  }

  render(): TNodeType {
    console.warn('组件必须实现自身的render方法');
    return new VNode();
  }

  $mount(el: string): void {
    const ele: HTMLElement = document.querySelector(el);
    this.$el = ele;

    if (ele.nodeName === 'body' || ele.nodeName === 'html') {
      console.warn('不允许使用根元素绑定');
    }

    const _render = this.$options.render;
    new Watcher({
      key: (vm): void => {
        this._update(_render.call(vm, createElement));
      },
      vm: this,
    });
  }

  _update(vnode: TNodeType): void {
    const prevNode: TNodeType = this.$vnode;
    this.$vnode = vnode;
    update(this.$el, prevNode, vnode);
  }
}

export class VueComponent extends Vue {
  protected isComponent = true;

  constructor(options?: IVueOptions) {
    super(options);
  }
}

export type VueComponentConstructor = typeof VueComponent;
