export const BANGLADESH_CENTER = Object.freeze({ lat: 23.685, lng: 90.3563 });

export const BANGLADESH_BOUNDS = Object.freeze({
  south: 20.670883,
  west: 88.084422,
  north: 26.638,
  east: 92.680115,
});

export const BANGLADESH_LEAFLET_BOUNDS = Object.freeze([
  [BANGLADESH_BOUNDS.south, BANGLADESH_BOUNDS.west],
  [BANGLADESH_BOUNDS.north, BANGLADESH_BOUNDS.east],
]);

export const isWithinBangladesh = (lat, lng) =>
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  lat >= BANGLADESH_BOUNDS.south &&
  lat <= BANGLADESH_BOUNDS.north &&
  lng >= BANGLADESH_BOUNDS.west &&
  lng <= BANGLADESH_BOUNDS.east;
