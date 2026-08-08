/**
 * Собирает текстовые узлы из DOM, игнорируя скрипты, стили и уже переведенные блоки.
 */
export interface TextNodeInfo {
  node: Text;
  originalText: string;
  id: string;
}

export function collectTextNodes(root: Node): TextNodeInfo[] {
  const nodes: TextNodeInfo[] = [];
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        
        const tag = parent.tagName.toLowerCase();
        if (['script', 'style', 'noscript', 'meta', 'link'].includes(tag)) {
          return NodeFilter.FILTER_REJECT;
        }
        
        if (!node.textContent || !node.textContent.trim()) {
          return NodeFilter.FILTER_SKIP;
        }

        if (parent.id === 'deepl-translator-root') {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  let curr = walker.nextNode() as Text;
  let index = 0;
  while (curr) {
    nodes.push({
      node: curr,
      originalText: curr.textContent || '',
      id: `node-${index++}`
    });
    curr = walker.nextNode() as Text;
  }

  return nodes;
}

export function restoreTextNodes(nodes: TextNodeInfo[], translations: string[]) {
  nodes.forEach((info, index) => {
    if (translations[index]) {
      info.node.textContent = translations[index];
      info.node.parentElement?.setAttribute('data-deepl-translated', 'true');
    }
  });
}
