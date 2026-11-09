export const matchesId = (entity, value) => !!entity && (String(entity.id) === String(value) || (entity.legacyIds || []).some(old => String(old) === String(value)))
