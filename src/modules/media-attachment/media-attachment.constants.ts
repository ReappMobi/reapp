export const MAX_DESCRIPTION_LENGTH = 1500;

export const MAX_THUMBNAIL_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_IMAGE_SIZE = 16 * 1024 * 1024; // 16 MB
export const MAX_VIDEO_SIZE = 99 * 1024 * 1024; // 99 MB

export const MAX_VIDEO_MATRIX_LIMIT = 3840 * 2160; // 8,294,400 pixels
export const MAX_VIDEO_FRAME_RATE = 120;
export const MAX_VIDEO_FRAMES = 36000; // Approx. 5 minutes at 120 fps

export const IMAGE_FILE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.heic',
  '.heif',
  '.avif',
];

export const VIDEO_FILE_EXTENSIONS = ['.webm', '.mp4', '.m4v', '.mov'];

export const AUDIO_FILE_EXTENSIONS = [
  '.ogg',
  '.oga',
  '.mp3',
  '.wav',
  '.flac',
  '.opus',
  '.aac',
  '.m4a',
  '.3gp',
  '.wma',
];

export const SUPPORTED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

export const VIDEO_MIME_TYPES = [
  'video/webm',
  'video/mp4',
  'video/quicktime',
  'video/ogg',
  'video/x-matroska',
];

export const AUDIO_MIME_TYPES = [
  'audio/wave',
  'audio/wav',
  'audio/x-wav',
  'audio/x-pn-wave',
  'audio/vnd.wave',
  'audio/ogg',
  'audio/vorbis',
  'audio/mpeg',
  'audio/mp3',
  'audio/webm',
  'audio/flac',
  'audio/aac',
  'audio/m4a',
  'audio/x-m4a',
  'audio/mp4',
  'audio/3gpp',
  'video/x-ms-asf',
];

export const SUPPORTED_MIME_TYPES = [
  ...SUPPORTED_IMAGE_MIME_TYPES,
  ...VIDEO_MIME_TYPES,
];
export const SUPPORTED_FILE_EXTENSIONS = [
  ...IMAGE_FILE_EXTENSIONS,
  ...VIDEO_FILE_EXTENSIONS,
  ...AUDIO_FILE_EXTENSIONS,
];
