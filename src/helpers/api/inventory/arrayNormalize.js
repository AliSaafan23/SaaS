/**
 * Normalize ID lists from JSON arrays or form-urlencoded (Postman).
 * Accepts: [1,2], "1", "1,2,3", single number.
 */
export const normalizeIdList = (value) => {
    if (value === undefined || value === null || value === '') return [];

    if (Array.isArray(value)) {
        return value
            .map((id) => Number(id))
            .filter((id) => Number.isFinite(id) && id >= 1);
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return [];
        if (trimmed.startsWith('[')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                    return parsed
                        .map((id) => Number(id))
                        .filter((id) => Number.isFinite(id) && id >= 1);
                }
            } catch {
                /* fall through */
            }
        }
        return trimmed
            .split(/[,|]/)
            .map((s) => Number(s.trim()))
            .filter((id) => Number.isFinite(id) && id >= 1);
    }

    const single = Number(value);
    return Number.isFinite(single) && single >= 1 ? [single] : [];
};

export default { normalizeIdList };
