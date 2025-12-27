const cloudinary = require('./cloudinary');

const extractCloudinaryPublicId = (assetUrl) => {
  if (!assetUrl || typeof assetUrl !== 'string') return null;
  try {
    const parsed = new URL(assetUrl);
    const uploadMarker = '/upload/';
    const markerIndex = parsed.pathname.indexOf(uploadMarker);
    if (markerIndex === -1) return null;
    const rawPath = parsed.pathname.slice(markerIndex + uploadMarker.length);
    if (!rawPath) return null;
    const segments = rawPath.split('/').filter(Boolean);
    if (!segments.length) return null;
    const versionIndex = segments.findIndex((segment) => /^v\d+$/.test(segment));
    const publicSegments = versionIndex >= 0 ? segments.slice(versionIndex + 1) : segments;
    if (!publicSegments.length) return null;
    const publicPath = publicSegments.join('/');
    return publicPath.replace(/\.[^/.]+$/, '');
  } catch (err) {
    return null;
  }
};

const destroyCloudinaryAssets = async (assetUrls = []) => {
  const publicIds = Array.from(new Set(assetUrls.map(extractCloudinaryPublicId).filter(Boolean)));
  if (!publicIds.length) return [];
  const results = await Promise.all(
    publicIds.map((publicId) =>
      cloudinary.uploader.destroy(publicId).catch((err) => ({
        error: err,
        result: 'error',
        publicId,
      }))
    )
  );
  const errors = results.filter((item) => item?.result === 'error');
  if (errors.length) {
    const err = new Error('Failed to delete one or more Cloudinary assets');
    err.details = errors;
    throw err;
  }
  return results;
};

module.exports = { extractCloudinaryPublicId, destroyCloudinaryAssets };
