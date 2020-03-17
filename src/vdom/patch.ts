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
    diffOpt(oldNode.el as HTMLElement, oldNode.children, newNode.children);
  }
}

export function diffLastIndex(pEle: HTMLElement, oldChildren: TNodeType[], newChildren: TNodeType[]) {
  /*
  * 第一种diff，lastIndex算法
  * 以lastIndex 标记目前最大的老节点的索引，小于该索引的，则需要移动位置，大于该索引的则保持不动
  *  ABC => CAB，lastIndex = 2，则A,B都需要移动位置，且移动位置以 !!!新节点队列为准，即在谁后面，就移动到谁后面!!!
  * */
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
      // 在老节点没找到该新节点，那就需要重新增加
      mount(pEle, newChildren[ i ], false, newChildren[ i - 1 ].el.nextSibling as HTMLElement);
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
  /*
  * 第二种diff算法，双端比较 以 old_start old_end new_start new_end 比较
  * 1. 如果双端比较满足，则交换节点，更新节点，且排除该节点(start 索引递增，end索引递减)
  * 2. 如果不满足，
  *   1. 则直接取老队列寻找节点，移动该节点位置，构造出 old_start === new_start, 排除该节点(start 索引递增，end索引递减)
  *   2. 老队列未找到，则创建新节点，构造出 old_start === new_start,，并排除该节点
  * 3. 比较完成后，还需要考虑新增和删除节点
  *
  * ABC => CAB
  * */
  const oldKeyMap: Map<string | number, number> = createChildrenKeyMap(oldChildren);
  let old_start = 0, old_end = oldChildren.length - 1, new_start = 0, new_end = newChildren.length - 1;


  while (old_start <= old_end && new_start <= new_end) {
    if (oldChildren[ old_start ].key === newChildren[ new_start ].key) {
      // old_start === new_start
      newChildren[ new_start ].el = oldChildren[ old_start ].el;
      patch(pEle, oldChildren[ old_start ], newChildren[ new_start ]);
      // 无需交换节点
      old_start++;
      new_start++;

    } else if (oldChildren[ old_start ].key === newChildren[ new_end ].key) {
      // old_start === new_end
      newChildren[ new_end ].el = oldChildren[ old_start ].el;
      patch(pEle, oldChildren[ old_start ], newChildren[ new_end ]);

      if (new_end === newChildren.length - 1) {
        pEle.appendChild(newChildren[ new_end ].el);
      } else {
        pEle.insertBefore(
          newChildren[ new_end ].el,
          newChildren[ new_end + 1 ].el,
        );
      }

      old_start++;
      new_end--;
    } else if (oldChildren[ old_end ].key === newChildren[ new_start ].key) {
      // old_end === new_start
      newChildren[ new_start ].el = oldChildren[ old_end ].el;
      patch(pEle, oldChildren[ old_end ], newChildren[ new_start ]);


      if (new_start === 0) {
        pEle.prepend(newChildren[ new_start ].el);
      } else {
        pEle.insertBefore(
          newChildren[ new_start ].el,
          newChildren[ new_start - 1 ].el.nextSibling,
        );
      }

      old_end--;
      new_start++;
    } else if (oldChildren[ old_end ].key === newChildren[ new_end ].key) {
      // old_end === new_end
      newChildren[ new_end ].el = oldChildren[ old_end ].el;
      patch(pEle, oldChildren[ old_end ], newChildren[ new_end ]);
      old_end--;
      new_end--;
    } else {
      /*
      * 双端比较全都不等
      * 1. 如果可以去老节点寻找到 KEY
      * 2. 找不到即为新增节点
      * */
      if (oldKeyMap.has(newChildren[ new_start ].key)) {
        const oldIndex = oldKeyMap.get(newChildren[ new_start ].key);

        // 将该节点交换至首位，人工构造一个 old_start 和 new_start 成功的比较
        const s = oldChildren[ oldIndex ];
        oldChildren[ oldIndex ] = oldChildren[ old_start ];
        oldChildren[ old_start ] = s;

        newChildren[ new_start ].el = oldChildren[ old_start ].el;
        patch(pEle, oldChildren[ old_start ], newChildren[ new_start ]);

        old_start++;
        new_start++;
      } else {
        // 则该节点为新增节点
        if (new_start === 0) {
          mount(pEle, newChildren[ new_start ], true);
        } else {
          mount(pEle, newChildren[ new_start ], false, newChildren[ new_start - 1 ].el.nextSibling as HTMLElement);
        }
        new_start++;
      }
    }
  }


  // 可能存在新增节点
  for (let i = new_start; i <= new_end; i++) {
    // 可能会是最后一个节点
    if (i === newChildren.length - 1) {
      mount(pEle, newChildren[ i ]);
    } else {
      mount(pEle, newChildren[ i ], false, newChildren[ i + 1 ].el as HTMLElement);
    }
  }

  // 可能存在删除节点
  for (let j = old_start; j <= old_end; j++) {
    pEle.removeChild(oldChildren[ j ].el);
  }
}

export function diffOpt(pEle: HTMLElement, oldChildren: TNodeType[], newChildren: TNodeType[]) {
  /**
   * 优化diff算法
   * 1. 取出相同前后缀
   * 2. 寻找最大增增子序列
   */

  let s = 0;
  let old_end = oldChildren.length - 1, new_end = newChildren.length - 1;

  // 去除相同前缀
  while (oldChildren[ s ].key === newChildren[ s ].key && s < oldChildren.length && s < newChildren.length) {
    patch(pEle, oldChildren[ s ], newChildren[ s ]);
    s++;
  }

  // 去除相同后缀
  while (oldChildren[ old_end ].key === newChildren[ new_end ].key && old_end > s && new_end > s) {
    patch(pEle, oldChildren[ old_end ], newChildren[ new_end ]);
    old_end--;
    new_end--;
  }


  const oldKeyMap: Map<string | number, number> = createChildrenKeyMap(oldChildren);
  const newKeyMap: Map<string | number, number> = createChildrenKeyMap(newChildren);

  if (old_end >= s) {
    // 此时需要进行新节点存在判断
    for (let i = s; i <= old_end; i++) {
      if (!newKeyMap.has(oldChildren[ i ].key)) {
        // 删除新节点中不存在的节点
        pEle.removeChild(oldChildren[ i ].el);
      }
    }
  }

  if (new_end >= s) {
    // 否则，寻找最大增资序列，进行DOM移动
    const keys: number[] = [];
    let leftMax = -1;
    let move: boolean = false;

    // 确定新节点，在老节点中的索引排序
    for (let i = s; i <= new_end; i++) {
      if (oldKeyMap.has(newChildren[ i ].key)) {
        const oldIndex = oldKeyMap.get(newChildren[ i ].key);

        newChildren[ i ].el = oldChildren[ oldIndex ].el;

        keys.push(oldIndex);
        if (oldIndex < leftMax && !move) move = true; // 如果出现非升序，则需要移动节点
        leftMax = Math.max(oldIndex, leftMax);
      } else {
        keys.push(-1); // 插入-1仅是为了占位
        // 全新节点，直接挂载
        if (s === 0) {
          mount(pEle, newChildren[ i ], true);
        } else {
          mount(pEle, newChildren[ i ], false, newChildren[ i - 1 ].el.nextSibling as HTMLElement);
        }
      }
    }

    if (move) {
      const resultKeysSet: Set<number> = new Set<number>(findMaxAddStepKeys(keys)); // 在此处出现的key值对应的DOM节点，无序移动

      // 开始移动DOM
      for (let i = s; i < new_end; i++) {
        const oldIndex = keys[ i - s ];

        // 插入新节点
        if (oldIndex === -1) {
          continue;
        }

        // 属于增子序列，无序移动
        if (resultKeysSet.has(oldIndex)) {
          patch(pEle, oldChildren[ oldIndex ], newChildren[ i ]);
          continue;
        }

        // 移动节点
        newChildren[ i ].el = oldChildren[ oldIndex ].el;
        pEle.insertBefore(newChildren[ i ].el, newChildren[ i - 1 ].el.nextSibling as HTMLElement);
      }
    }
  }
}

export function createChildrenKeyMap(c: TNodeType[]): Map<string | number, number> {
  const map: Map<string | number, number> = new Map<string | number, number>();
  for (let i = 0; i < c.length; i++) {
    map.set(c[ i ].key, i);
  }
  return map;
}

export function findMaxAddStepKeys(keys: number[]): number[] {
  // 最大增子序列算法 DP+二分
  const resultKeys: number[] = [ keys[ 0 ] ];
  let last = 0;

  for (let i = 1; i < keys.length; i++) {
    if (keys[ i ] > resultKeys[ last ]) {
      resultKeys.push(keys[ i ]);
      last++;
    } else {
      replaceKey(0, last, keys[ i ], resultKeys);
    }
  }

  return resultKeys;
}


function replaceKey(start: number, end: number, v: number, res: number[]): void {
  while (start <= end) {
    const mid = (start + end) >> 1;

    if (res[ mid ] > v) {
      end = mid - 1;
    } else {
      start = mid + 1;
    }
  }
  res[ start ] = v;
}
