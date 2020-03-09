import { isEmpty, isFunction, proxyData } from './helper';
import { observe } from './observe';

let vueId = 0;

export interface IVueOptions {
  data?: Function | object;
  el?: string;
  render: Function;
}

export class Vue {
  public $options: IVueOptions;
  id: number = ++vueId;

  constructor(options: IVueOptions) {
    this.$options = options;

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
    const _data = isFunction(data) ? (data as Function).call(this) : isEmpty(data) ? {} : data;
    proxyData(this, _data);
    observe(_data);
  }

  $mount(el: string) {
    const ele: Element = document.querySelector(el);
  }
}
