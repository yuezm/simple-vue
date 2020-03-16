import { isEmpty, isFunction, proxyData } from './helper';
import { observe } from './observe';
import {
  ICreateComponent,
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

export type VueComponentConstructor = typeof VueComponent;

export class Vue {
  public $options: IVueOptions;
  public id: number = ++vueId;

  public $parent: Vue;
  public $root: Vue;

  public $el: HTMLElement;
  public $vnode: TNodeType;

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

  init() {
    this.initData();

    if (!isEmpty(this.$options.el)) {
      this.$mount(this.$options.el);
    }
  }

  initData() {
    const data = this.$options.data;
    const _data = isFunction(data)
      ? (data as Function).call(this)
      : isEmpty(data)
        ? {}
        : data;
    proxyData(this, _data);
    observe(_data);
  }

  render(h: ICreateComponent): TNodeType {
    console.warn('组件必须实现自身的render方法');
    return new VNode();
  }

  $mount(el: string) {
    const ele: HTMLElement = document.querySelector(el);
    this.$el = ele;

    if (ele.nodeName === 'body' || ele.nodeName === 'html') {
      console.warn('不允许使用根元素绑定');
    }
    const render = this.$options.render;

    new Watcher({
      key: (vm) => {
        const vnode = render.call(vm, createElement);
        this._update(vnode);
      },
      vm: this,
    });
  }

  _update(vnode: TNodeType) {
    const prevNode: TNodeType = this.$vnode;
    this.$vnode = vnode;
    update(this.$el, prevNode, vnode);
  }
}

export class VueComponent extends Vue {
  protected isComponent: boolean = true;

  constructor(options?: IVueOptions) {
    super(options);
  }
}


const vm = new Vue({
  data: {
    name: 'Keven',
    l: [ 'C', 'A', 'B', 'E' ],
  },
  render(h: ICreateComponent) {
    const nodes = [];
    for (const i of this.l) {
      nodes.push(h('p', { key: i }, i.toString()));
    }
    return h('div', null, nodes);
  },
});
vm.$mount('#app');


setTimeout(() => {
  (vm as any).l = [ 'D', 'A', 'C', 'B' ];
}, 1000);
