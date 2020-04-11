import { ECType, TNodeType } from './vnode';
import { Mount } from './mount';
import { isEmpty } from '@/helper';


function createChildrenKeyMap(c: TNodeType[]): Map<string | number, number> {
  const map: Map<string | number, number> = new Map<string | number, number>();
  for (let i = 0; i < c.length; i++) {
    map.set(c[ i ].key, i);
  }
  return map;
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


export class Patch {
  static main(ele: HTMLElement, oldNode: TNodeType, newNode: TNodeType): void {
    if (oldNode.nType !== newNode.nType || oldNode.tag !== newNode.tag) {
      // 节点类型或节点名称不一致，则直接替换
      ele.removeChild(oldNode.el);
      Mount.main(ele, newNode);
    } else {
      Patch.patchData(oldNode, newNode);
      Patch.patchChildren(oldNode, newNode);
    }
  }

  // patch vnode data
  static patchData(oldNode: TNodeType, newNode: TNodeType): void {
    Mount.mountData(oldNode.el as HTMLElement, newNode);

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
  static patchChildren(oldNode: TNodeType, newNode: TNodeType): void {
    // 如果老节点不存在，则直接更新节点
    if (oldNode.cType & ECType.NO_CHILDREN) {
      Mount.mountChildren(oldNode.el as HTMLElement, newNode.children);
    } else if (oldNode.cType & ECType.SINGLE_CHILDREN) {
      // 如果老节点为一个节点，则删除老节点，插入新节点
      oldNode.el.removeChild(oldNode.children[ 0 ].el);
      Mount.mountChildren(oldNode.el as HTMLElement, newNode.children);
    } else {
      /* 最简单的diff，将老节点全部删除，插入新节点
      for (const c of oldNode.children) {
        oldNode.el.removeChild(c.el);
      }
      mountChildren(oldNode.el as HTMLElement, newNode.children);
      */
      Patch.diffOpt(oldNode.el as HTMLElement, oldNode.children, newNode.children);
    }
  }

  // diff 算法 lastIndex
  static diffLastIndex(pEle: HTMLElement, oldChildren: TNodeType[], newChildren: TNodeType[]): void {
    /*
    * 第一种diff，lastIndex算法
    * 以lastIndex 标记目前最大的老节点的索引，小于该索引的，则需要移动位置，大于该索引的则保持不动
    *  ABC => CAB，lastIndex = 2，则A,B都需要移动位置，且移动位置以 !!!新节点队列为准，即在谁后面，就移动到谁后面!!!
    * */
    let lastIndex = 0;
    const oldKeyMap: Map<string | number, number> = createChildrenKeyMap(oldChildren);
    const newKeyMap: Map<string | number, number> = createChildrenKeyMap(newChildren);

    for (let i = 0; i < newChildren.length; i++) {
      if (oldKeyMap.has(newChildren[ i ].key)) {
        // 节点可复用
        const ind = oldKeyMap.get(newChildren[ i ].key);

        // 更新节点
        Patch.main(oldChildren[ ind ].el as HTMLElement, oldChildren[ ind ], newChildren[ i ]);
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
        Mount.main(pEle, newChildren[ i ], false, newChildren[ i - 1 ].el.nextSibling as HTMLElement);
      }
    }

    // 删除无用节点
    for (const o of oldChildren) {
      if (!newKeyMap.has(o.key)) {
        pEle.removeChild(o.el);
      }
    }
  }

  // diff 算法 双端比较
  static diffDoubleEnd(pEle: HTMLElement, oldChildren: TNodeType[], newChildren: TNodeType[]): void {
    /*
    * 第二种diff算法，双端比较 以 oldStart oldEnd newStart newEnd 比较
    * 1. 如果双端比较满足，则交换节点，更新节点，且排除该节点(start 索引递增，end索引递减)
    * 2. 如果不满足，
    *   1. 则直接取老队列寻找节点，移动该节点位置，构造出 oldStart === newStart, 排除该节点(start 索引递增，end索引递减)
    *   2. 老队列未找到，则创建新节点，构造出 oldStart === newStart,，并排除该节点
    * 3. 比较完成后，还需要考虑新增和删除节点
    *
    * ABC => CAB
    * */
    const oldKeyMap: Map<string | number, number> = createChildrenKeyMap(oldChildren);
    let oldStart = 0, oldEnd = oldChildren.length - 1, newStart = 0, newEnd = newChildren.length - 1;


    while (oldStart <= oldEnd && newStart <= newEnd) {
      if (oldChildren[ oldStart ].key === newChildren[ newStart ].key) {
        // oldStart === newStart
        newChildren[ newStart ].el = oldChildren[ oldStart ].el;
        Patch.main(pEle, oldChildren[ oldStart ], newChildren[ newStart ]);
        // 无需交换节点
        oldStart++;
        newStart++;

      } else if (oldChildren[ oldStart ].key === newChildren[ newEnd ].key) {
        // oldStart === newEnd
        newChildren[ newEnd ].el = oldChildren[ oldStart ].el;
        Patch.main(pEle, oldChildren[ oldStart ], newChildren[ newEnd ]);

        if (newEnd === newChildren.length - 1) {
          pEle.appendChild(newChildren[ newEnd ].el);
        } else {
          pEle.insertBefore(
            newChildren[ newEnd ].el,
            newChildren[ newEnd + 1 ].el,
          );
        }

        oldStart++;
        newEnd--;
      } else if (oldChildren[ oldEnd ].key === newChildren[ newStart ].key) {
        // oldEnd === newStart
        newChildren[ newStart ].el = oldChildren[ oldEnd ].el;
        Patch.main(pEle, oldChildren[ oldEnd ], newChildren[ newStart ]);


        if (newStart === 0) {
          pEle.prepend(newChildren[ newStart ].el);
        } else {
          pEle.insertBefore(
            newChildren[ newStart ].el,
            newChildren[ newStart - 1 ].el.nextSibling,
          );
        }

        oldEnd--;
        newStart++;
      } else if (oldChildren[ oldEnd ].key === newChildren[ newEnd ].key) {
        // oldEnd === newEnd
        newChildren[ newEnd ].el = oldChildren[ oldEnd ].el;
        Patch.main(pEle, oldChildren[ oldEnd ], newChildren[ newEnd ]);
        oldEnd--;
        newEnd--;
      } else {
        /*
        * 双端比较全都不等
        * 1. 如果可以去老节点寻找到 KEY
        * 2. 找不到即为新增节点
        * */
        if (oldKeyMap.has(newChildren[ newStart ].key)) {
          const oldIndex = oldKeyMap.get(newChildren[ newStart ].key);

          // 将该节点交换至首位，人工构造一个 oldStart 和 newStart 成功的比较
          const s = oldChildren[ oldIndex ];
          oldChildren[ oldIndex ] = oldChildren[ oldStart ];
          oldChildren[ oldStart ] = s;

          newChildren[ newStart ].el = oldChildren[ oldStart ].el;
          Patch.main(pEle, oldChildren[ oldStart ], newChildren[ newStart ]);

          oldStart++;
          newStart++;
        } else {
          // 则该节点为新增节点
          if (newStart === 0) {
            Mount.main(pEle, newChildren[ newStart ], true);
          } else {
            Mount.main(pEle, newChildren[ newStart ], false, newChildren[ newStart - 1 ].el.nextSibling as HTMLElement);
          }
          newStart++;
        }
      }
    }


    // 可能存在新增节点
    for (let i = newStart; i <= newEnd; i++) {
      // 可能会是最后一个节点
      if (i === newChildren.length - 1) {
        Mount.main(pEle, newChildren[ i ]);
      } else {
        Mount.main(pEle, newChildren[ i ], false, newChildren[ i + 1 ].el as HTMLElement);
      }
    }

    // 可能存在删除节点
    for (let j = oldStart; j <= oldEnd; j++) {
      pEle.removeChild(oldChildren[ j ].el);
    }
  }

  // diff 算法 取出前后缀 + 最大增子序列
  static diffOpt(pEle: HTMLElement, oldChildren: TNodeType[], newChildren: TNodeType[]): void {
    /**
     * 优化diff算法
     * 1. 取出相同前后缀
     * 2. 寻找最大增增子序列
     */

    let s = 0;
    let oldEnd = oldChildren.length - 1, newEnd = newChildren.length - 1;

    // 去除相同前缀
    while (oldChildren[ s ].key === newChildren[ s ].key && s < oldChildren.length && s < newChildren.length) {
      Patch.main(pEle, oldChildren[ s ], newChildren[ s ]);
      s++;
    }

    // 去除相同后缀
    while (oldChildren[ oldEnd ].key === newChildren[ newEnd ].key && oldEnd > s && newEnd > s) {
      Patch.main(pEle, oldChildren[ oldEnd ], newChildren[ newEnd ]);
      oldEnd--;
      newEnd--;
    }


    const oldKeyMap: Map<string | number, number> = createChildrenKeyMap(oldChildren);
    const newKeyMap: Map<string | number, number> = createChildrenKeyMap(newChildren);

    if (oldEnd >= s) {
      // 此时需要进行新节点存在判断
      for (let i = s; i <= oldEnd; i++) {
        if (!newKeyMap.has(oldChildren[ i ].key)) {
          // 删除新节点中不存在的节点
          pEle.removeChild(oldChildren[ i ].el);
        }
      }
    }

    if (newEnd >= s) {
      // 否则，寻找最大增资序列，进行DOM移动
      const keys: number[] = [];
      let leftMax = -1;
      let move = false;

      // 确定新节点，在老节点中的索引排序
      for (let i = s; i <= newEnd; i++) {
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
            Mount.main(pEle, newChildren[ i ], true);
          } else {
            Mount.main(pEle, newChildren[ i ], false, newChildren[ i - 1 ].el.nextSibling as HTMLElement);
          }
        }
      }

      if (move) {
        const resultKeysSet: Set<number> = new Set<number>(findMaxAddStepKeys(keys)); // 在此处出现的key值对应的DOM节点，无序移动

        // 开始移动DOM
        for (let i = s; i < newEnd; i++) {
          const oldIndex = keys[ i - s ];

          // 插入新节点
          if (oldIndex === -1) {
            continue;
          }

          // 属于增子序列，无序移动
          if (resultKeysSet.has(oldIndex)) {
            Patch.main(pEle, oldChildren[ oldIndex ], newChildren[ i ]);
            continue;
          }

          // 移动节点
          newChildren[ i ].el = oldChildren[ oldIndex ].el;
          pEle.insertBefore(newChildren[ i ].el, newChildren[ i - 1 ].el.nextSibling as HTMLElement);
        }
      }
    }
  }
}



