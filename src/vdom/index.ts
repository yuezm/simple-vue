import { TNodeType } from './vnode';
import { isEmpty } from '@/helper';
import { patch } from './patch';
import { mount } from './mount';

export function update(ele: HTMLElement, oldNode: TNodeType, newNode: TNodeType) {
  if (isEmpty(oldNode)) {
    mount(ele, newNode); // 不存在旧节点表示第一次挂载
  } else if (isEmpty(newNode)) {
    ele.removeChild(oldNode.el); // 不存在新节点表示全部删除
  } else {
    patch(ele, oldNode, newNode); // 否则进行diff算法
  }
}
