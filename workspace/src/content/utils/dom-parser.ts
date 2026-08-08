export function collectTextNodes(root: HTMLElement): Text[] {
    const nodes: Text[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let node;
    while (node = walker.nextNode()) {
        if (node.textContent && node.textContent.trim().length > 0) {
            // Пропускаем скрипты и стили
            if (node.parentElement?.tagName === 'SCRIPT' || node.parentElement?.tagName === 'STYLE') continue;
            nodes.push(node as Text);
        }
    }
    return nodes;
}

export function restoreOriginal(root: HTMLElement) {
    // Логика восстановления из data-атрибутов
}
