import { TNodeType, ENType, VHtmlNode, VTextNode, VComponentNode, createElement } from './vnode';
import { VueComponent } from '@/main';

export function mount(ele: HTMLElement, vNode: TNodeType, isPre: boolean = false, refEle: HTMLElement = null) {
  if (vNode.nType & ENType.HTML_FLAG) {
    mountElement(ele, vNode as VHtmlNode, isPre, refEle);
  } else if (vNode.nType & ENType.TEXT_FLAG) {
    mountText(ele, vNode as VTextNode);
  } else if (vNode.nType & ENType.COMPONENT_FLAG) {
    mountComponent(ele, vNode as VComponentNode, isPre, refEle);
  }
  // 缺少svg 和 函数式组件
}

export function mountChildren(ele: HTMLElement, vNodes?: TNodeType[]) {
  if (vNodes) {
    for (let i = 0; i < vNodes.length; i++) {
      mount(ele, vNodes[ i ]);
    }
  }
}

// 挂载普通HTML标签
export function mountElement(ele: HTMLElement, vNode: VHtmlNode, isPre: boolean = false, refEle: HTMLElement = null) {
  const targetElement: HTMLElement = document.createElement(vNode.tag as string);
  vNode.el = targetElement;

  mountData(targetElement, vNode);
  mountChildren(targetElement, vNode.children);

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
export function mountText(ele: HTMLElement, vNode: VTextNode) {
  const targetElement: Text = document.createTextNode(vNode.text);
  vNode.el = targetElement;
  ele.appendChild(targetElement);
}

// 挂载有状态组件
export function mountComponent(ele: HTMLElement, vNode: VComponentNode, isPre: boolean = false, refEle: HTMLElement = null) {
  const instance: VueComponent = new vNode.tag();
  instance.$vnode = instance.render.call(
    instance,
    createElement,
  ) as VComponentNode;

  mount(ele, instance.$vnode, isPre, refEle);
  instance.$el = vNode.el = instance.$vnode.el as HTMLElement;
}

export function mountData(targetElement: HTMLElement, vNode: TNodeType) {
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


