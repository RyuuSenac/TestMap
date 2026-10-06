export function validPoint(point) {
  return Boolean(
    point &&
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    Math.abs(point.lat) <= 90 &&
    Math.abs(point.lng) <= 180
  );
}

export function cleanCep(value = '') {
  return String(value).replace(/\D/g, '').slice(0, 8);
}

export function validChild(child) {
  return Boolean(
    child &&
    typeof child.id === 'string' &&
    typeof child.name === 'string' &&
    child.name.trim().length > 0 &&
    child.name.length <= 80 &&
    ['Manhã', 'Tarde', 'Integral'].includes(child.shift) &&
    validPoint(child.home) &&
    validPoint(child.school)
  );
}
