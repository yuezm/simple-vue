import { ECType, TNodeType } from './vnode';
import { mount, mountChildren, mountData } from './mount';
import { isEmpty } from '@/helper';

export function patch(ele: HTMLElement, oldNode: TNodeType, newNode: TNodeType) {
  if (oldNode.nType !== newNode.nType || oldNode.tag !== newNode.tag) {
    // 节点类型或节点名称不一致，则直接替换
    ele.removeChild(oldNode.el);
    mount(ele, newNode);
  } else {
    patchData(oldNode, newNode);
    patchChildren(oldNode, newNode);
  }
}

// patch vnode data
export function patchData(oldNode: TNodeType, newNode: TNodeType) {
  mountData(oldNode.el as HTMLElement, newNode);

  // 移除老的属性
  if (oldNode.data) {
    const targetElement = oldNode.el as HTMLElement;

    // 解绑 style
    if (oldNode.data.style) {
      const styles = oldNode.data.style;
      const newStyles = isEmpty(newNode.data) ? newNode.data.style || {} : {};
      for (const s in styles) {
        if (!newStyles[ s ]) {
          targetElement.style[ s ] = '';
        }
      }
    }

    // 解绑attrs
    if (oldNode.data.attrs) {
      const attrs = oldNode.data.attrs;
      const newAttrs = isEmpty(newNode.data) ? newNode.data.attrs || {} : {};
      for (const attr in attrs) {
        if (!newAttrs[ attr ]) {
          targetElement.setAttribute(attr, '');
        }
      }
    }

    // 解绑 js property
    if (oldNode.data.nativeProps) {
      const nativeProps = oldNode.data.nativeProps;
      const newNativeProps = isEmpty(newNode.data)
        ? newNode.data.nativeProps || {}
        : {};
      for (const prop in nativeProps) {
        if (!newNativeProps[ prop ]) {
          targetElement[ prop ] = '';
        }
      }
    }

    // 解绑事件
    if (oldNode.data.on) {
      const events = oldNode.data.on;
      const newEvents = isEmpty(newNode.data) ? newNode.data.on || {} : {};
      for (const event in events) {
        if (!newEvents[ event ]) {
          targetElement.removeEventListener(event, events[ event ]);
        }
      }
    }
  }
}

// patch children
export function patchChildren(oldNode: TNodeType, newNode: TNodeType) {
  // 如果老节点不存在，则直接更新节点
  if (oldNode.cType & ECType.NO_CHILDREN) {
    mountChildren(oldNode.el as HTMLElement, newNode.children);
  } else if (oldNode.cType & ECType.SINGLE_CHILDREN) {
    // 如果老节点为一个节点，则删除老节点，插入新节点
    oldNode.el.removeChild(oldNode.children[ 0 ].el);
    mountChildren(oldNode.el as HTMLElement, newNode.children);
  } else {
    /* 最简单的diff，将老节点全部删除，插入新节点
    for (const c of oldNode.children) {
      oldNode.el.removeChild(c.el);
    }
    mountChildren(oldNode.el as HTMLElement, newNode.children);
    */
    diffLastIndex(oldNode.el as HTMLElement, oldNode.children, newNode.children);
  }
}

export function diffLastIndex(pEle: HTMLElement, oldChildren: TNodeType[], newChildren: TNodeType[]) {
  // 第一种diff，lastIndex算法
  let lastIndex: number = 0;
  const oldKeyMap: Map<string | number, number> = createChildrenKeyMap(oldChildren);
  const newKeyMap: Map<string | number, number> = createChildrenKeyMap(newChildren);

  for (let i = 0; i < newChildren.length; i++) {
    if (oldKeyMap.has(newChildren[ i ].key)) {
      // 节点可复用
      const ind = oldKeyMap.get(newChildren[ i ].key);

      // 更新节点
      patch(oldChildren[ ind ].el as HTMLElement, oldChildren[ ind ], newChildren[ i ]);
      newChildren[ i ].el = oldChildren[ ind ].el;

      if (ind < lastIndex) {
        // 复用节点之节点移动
        pEle.insertBefore(oldChildren[ ind ].el, newChildren[ i - 1 ].el.nextSibling);
      } else {
        // 取更大的值为lastIndex
        lastIndex = ind;
      }
    } else {
      // 在源节点没找到该节点勒，那就需要重新增加
      mount(pEle, newChildren[ i ], newChildren[ i - 1 ].el.nextSibling as HTMLElement);
    }
  }

  // 删除无用节点
  for (const o of oldChildren) {
    if (!newKeyMap.has(o.key)) {
      pEle.removeChild(o.el);
    }
  }
}

export function diffDoubleEnd(pEle: HTMLElement, oldChildren: TNodeType[], newChildren: TNodeType[]) {
  
}

export function createChildrenKeyMap(c: TNodeType[]): Map<string | number, number> {
  const map: Map<string | number, number> = new Map<string | number, number>();
  for (let i = 0; i < c.length; i++) {
    map.set(c[ i ].key, i);
  }
  return map;
}
