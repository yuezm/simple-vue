import { isEmpty } from '@/helper';
import { VueComponent, VueComponentConstructor } from '@/main';
import { IObject } from '@Types/index';

// 节点类型
export enum ENType {
  HTML_FLAG = 1, // 普通HTML节点
  HTML_SVG_FLAG = 1 << 2, // HTML SVG  节点

  COMPONENT_FLAG = 1 << 3, // 有状态组件
  COMPONENT_FUNCTIONAL_FLAG = 1 << 4, // 无状态组件

  TEXT_FLAG = 1 << 5, // 文本节点
}

// 子节点类型
export enum ECType {
  NO_CHILDREN = 1, // 无子元素
  SINGLE_CHILDREN = 1 << 1, // 一个子元素
  LIST_CHILDREN_KEYS = 1 << 2, // 多个含KEY子元素
}

export interface IVNodeData {
  class?: string[];
  style?: IObject;
  id?: string;
  attrs?: object;
  props?: object;
  nativeProps?: object; // 有一些特殊的属性无法通过 attrs 修改
  on?: object; // 存储事件绑定
  scopeSlots?: object; // slots 传值
  key?: string | number;
}

export interface ICreateComponent {
  (tag?: string | VueComponentConstructor, data?: IVNodeData, children?: VNode[] | string): VNode;
}

export type TNodeType = VNode | VTextNode | VHtmlNode | VComponentNode;

export class VNode {
  isVNode: boolean;
  tag?: string | VueComponentConstructor | undefined; // 组件名或HTML标签名
  nType: ENType; // VNode类型
  data?: IVNodeData | undefined;
  children?: VNode[] | undefined; // 子项
  cType: ECType;
  text?: string | undefined; // 文本节点内容
  el?: HTMLElement | Text | undefined;
  key?: string | number; // key值为必填项，如果没key值，则给出默认key值

  constructor(tag?: string | VueComponentConstructor, data?: IVNodeData, children?: VNode[]) {
    this.tag = tag;
    this.data = data;
    this.children = children;
    this.key = data ? data.key : undefined;

    if (!children || children.length < 1) {
      this.cType = ECType.NO_CHILDREN;
    } else {
      this.cType =
        children.length > 1
          ? ECType.LIST_CHILDREN_KEYS
          : ECType.SINGLE_CHILDREN;
    }
  }
}

export class VTextNode extends VNode {
  tag: undefined;
  data: undefined;
  children: undefined;
  nType: ENType = ENType.TEXT_FLAG;
  cType: ECType = ECType.NO_CHILDREN;
  text: string;
  el: Text;

  constructor(text: string) {
    super();
    this.text = text;
  }
}

export class VHtmlNode extends VNode {
  tag: string;
  nType: ENType = ENType.HTML_FLAG; // VNode类型
  el: HTMLElement;

  constructor(tag: string, data?: IVNodeData, children?: VNode[]) {
    super(tag, data, children);
  }
}

export class VComponentNode extends VNode {
  tag: VueComponentConstructor;
  nType: ENType = ENType.COMPONENT_FLAG; // VNode类型
  el: HTMLElement;

  constructor(tag: VueComponentConstructor, data?: IVNodeData, children?: VNode[]) {
    super(tag, data, children);
  }
}

export function createElement(tag?: string | VueComponentConstructor, data?: IVNodeData, children?: VNode[] | string): VNode {
  const cNodes: VNode[] | undefined = serializeChildren(children);

  // 认为是Component
  if (tag instanceof VueComponent) {
    return createComponent(tag as VueComponentConstructor, data, cNodes);
  }

  // 认为是html标签
  if (typeof tag === 'string') {
    return new VHtmlNode(tag, data, cNodes);
  }

  // 认为是text
  return cNodes && cNodes.length > 0 ? cNodes[ 0 ] : createEmptyNode();
}

export function createComponent(tag: VueComponentConstructor, data?: IVNodeData, children?: VNode[]): VNode {
  return new VComponentNode(tag, data, children);
}

export function createEmptyNode() {
  return new VNode();
}

function serializeChildren(children?: VNode | (VNode | string)[] | string): VNode[] | undefined {
  if (isEmpty(children)) return;

  if (Array.isArray(children)) {
    const res = [];
    for (let i = 0; i < children.length; i++) {
      const cn = formatStringNode(children[ i ]);
      if (!cn.key) cn.key = `KEY-${ i }`;
      res.push(cn);
    }
    return res;
  }
  return [ formatStringNode(children) ];
}

function formatStringNode(t: string | VNode): VNode {
  if (typeof t === 'string') {
    return new VTextNode(t as string);
  }
  return t;
}
