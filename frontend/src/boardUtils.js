// Projekt-Karten und Tag-Tokens werden im UI als eine gemeinsame,
// nach Position sortierte Liste behandelt (einheitliches "item"-Format).
// So funktioniert Drag & Drop einheitlich, egal ob eine ganze Karte oder
// nur ein einzelner Tag verschoben wird.

export function cardToItem(card) {
  return { domId: `card-${card.id}`, type: "card", id: card.id, ...card };
}

export function tokenToItem(token) {
  return { domId: `token-${token.id}`, type: "token", id: token.id, ...token };
}

export function toListWithItems(list) {
  const items = [
    ...(list.cards || []).map(cardToItem),
    ...(list.tokens || []).map(tokenToItem),
  ].sort((a, b) => a.position - b.position);
  return {
    id: list.id,
    title: list.title,
    position: list.position,
    protected: list.protected,
    pinnedRight: list.pinnedRight,
    items,
  };
}
