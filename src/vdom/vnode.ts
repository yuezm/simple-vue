export enum VNodeType {
  HTML_FLAG = 1,
  HTML_SVG_FLAG = 1 << 1,

  COMPONENT_FLAG = 1 << 2,

  TEXT_FLAG = 1 << 3,
}

export interface IVNodeData {
  className: string[];
  id: string;
  attrs: object;
  props: object;
  nativeProps: object;
  on: object;
  scopeSlots: object;
  key: string | number;
}

export class VNode {
  isVNode: boolean = true;
  tag?: string; // 组件名或HTML标签名
  data?: IVNodeData;
  nodeType: VNodeType; // VNode类型
  children?: VNode[]; // 子项
  text?: string; // 文本节点内容
}
