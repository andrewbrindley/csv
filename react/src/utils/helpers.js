export function getTagKind(cell) {
    if (!cell) return null;
    if (cell.source !== "ai" && cell.source !== "user") return null;

    const prev = cell.prev;
    const curr = cell.value;

    if (prev === undefined || prev === null) {
        return curr ? cell.source : null;
    }
    if (String(prev) === String(curr)) return null;
    return cell.source;
}

export function emptyAiSummary() {
    return { totalPromptTokens: 0, totalCompletionTokens: 0, totalEstimatedCost: 0 };
}
