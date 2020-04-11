import { ICreateComponent, VNode } from '@/vdom/vnode';
import { Vue } from '@/main';

describe('Test Vue', function() {
  document.body.innerHTML = '<div id="app"></div>';

  it('should ', function() {
    const vm = new Vue({
      data: {
        name: 'Keven',
        l: [ 'G', 'A', 'B', 'C' ],
      },

      render(h: ICreateComponent): VNode {
        const nodes = [];
        for (const i of this.l) {
          nodes.push(h('p', { key: i }, i.toString()));
        }
        return h('div', null, nodes);
      },
    });

    vm.$mount('#app');

    expect(document.querySelector('#app').textContent).toBe('GABC');

    setTimeout(() => {
      (vm as any).l = [ 'D', 'A', 'B', 'C' ];

      setTimeout(() => {
        expect(document.querySelector('#app').textContent).toBe('DABC');
      }, 500);
    }, 1000);
  });
});
