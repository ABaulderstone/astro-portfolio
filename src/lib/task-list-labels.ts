// Markdown task lists (`- [ ] item`) render a disabled checkbox with no label, so a screen
// reader hears "checkbox, unchecked" with no name. This Sätteri hast plugin names each one after
// its list item's text, leaving out any nested list, which holds its own items.
import type { HastNode, HastPluginDefinition } from 'satteri';

const isList = (node: HastNode) => node.type === 'element' && (node.tagName === 'ul' || node.tagName === 'ol');

/** The text of `node`, skipping nested lists */
function textOf(node: HastNode): string {
  if (node.type === 'text') return node.value;
  if (!('children' in node)) return '';
  return node.children.map((child) => (isList(child as HastNode) ? '' : textOf(child as HastNode))).join('');
}

export const taskListLabels: HastPluginDefinition = {
  name: 'task-list-labels',
  element: {
    filter: ['input'],
    visit(node, ctx) {
      if (node.properties.type !== 'checkbox' || node.properties.ariaLabel) return;
      // The item is the checkbox's parent, or in a loose list its paragraph's parent
      let item = ctx.parent(node);
      if (item?.type === 'element' && item.tagName === 'p') item = ctx.parent(item);
      if (item?.type !== 'element' || item.tagName !== 'li') return;
      const label = textOf(item).replace(/\s+/g, ' ').trim();
      if (label) ctx.setProperty(node, 'ariaLabel', label);
    },
  },
};
