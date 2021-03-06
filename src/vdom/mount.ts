import { TNodeType, ENType, VHtmlNode, VTextNode, VComponentNode, createElement } from './vnode';
import { VueComponent } from '@/main';


export class Mount {
  // main 主方法
  static main(ele: HTMLElement, vNode: TNodeType, isPre = false, refEle: HTMLElement = null): void {
    if (vNode.nType & ENType.HTML_FLAG) {
      Mount.mountElement(ele, vNode as VHtmlNode, isPre, refEle);
    } else if (vNode.nType & ENType.TEXT_FLAG) {
      Mount.mountText(ele, vNode as VTextNode);
    } else if (vNode.nType & ENType.COMPONENT_FLAG) {
      Mount.mountComponent(ele, vNode as VComponentNode, isPre, refEle);
    }
    // 缺少svg 和 函数式组件
  }

  // 挂载普通HTML标签
  static mountElement(ele: HTMLElement, vNode: VHtmlNode, isPre = false, refEle: HTMLElement = null): void {
    const targetElement: HTMLElement = document.createElement(vNode.tag as string);
    vNode.el = targetElement;

    Mount.mountData(targetElement, vNode);
    Mount.mountChildren(targetElement, vNode.children);

    if (isPre) {
      ele.prepend(targetElement);
    } else {
      if (refEle) {
        ele.insertBefore(targetElement, refEle);
      } else {
        ele.appendChild(targetElement);
      }
    }


  }

  // 挂载文本
  static mountText(ele: HTMLElement, vNode: VTextNode): void {
    const targetElement: Text = document.createTextNode(vNode.text);
    vNode.el = targetElement;
    ele.appendChild(targetElement);
  }

  // 挂载有状态组件
  static mountComponent(ele: HTMLElement, vNode: VComponentNode, isPre = false, refEle: HTMLElement = null): void {
    const instance: VueComponent = new vNode.tag();
    instance.$vnode = instance.render.call(
      instance,
      createElement,
    ) as VComponentNode;

    Mount.main(ele, instance.$vnode, isPre, refEle);
    instance.$el = vNode.el = instance.$vnode.el as HTMLElement;
  }

  // 挂载 vnode data
  static mountData(targetElement: HTMLElement, vNode: TNodeType): void {
    // 绑定属性
    if (vNode.data) {
      // 绑定class
      if (vNode.data.class) {
        targetElement.className = vNode.data.class.join(' ');
      }

      // 绑定style
      if (vNode.data.style) {
        const styles = vNode.data.style;
        for (const s in styles) {
          targetElement.style[ s ] = styles[ s ];
        }
      }

      // 绑定id
      if (vNode.data.id) {
        targetElement.id = vNode.data.id;
      }

      // 绑定attrs
      if (vNode.data.attrs) {
        const attrs = vNode.data.attrs;
        for (const attr in attrs) {
          targetElement.setAttribute(attr, attrs[ attr ]);
        }
      }

      // 绑定 js property
      if (vNode.data.nativeProps) {
        const nativeProps = vNode.data.nativeProps;
        for (const prop in nativeProps) {
          targetElement[ prop ] = nativeProps[ prop ];
        }
      }

      // 绑定事件
      if (vNode.data.on) {
        const events = vNode.data.on;
        for (const event in events) {
          targetElement.addEventListener(event, events[ event ]);
        }
      }
    }
  }

  // 挂载子集
  static mountChildren(ele: HTMLElement, vNodes?: TNodeType[]): void {
    if (vNodes) {
      for (let i = 0; i < vNodes.length; i++) {
        Mount.main(ele, vNodes[ i ]);
      }
    }
  }
}
