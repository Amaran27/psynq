// Port tokens
export const TRANSCRIPTION_REPOSITORY_PORT = Symbol('TRANSCRIPTION_REPOSITORY_PORT');
export const TRANSCRIPTION_SEGMENT_REPOSITORY_PORT = Symbol('TRANSCRIPTION_SEGMENT_REPOSITORY_PORT');
export const SENTIMENT_REPOSITORY_PORT = Symbol('SENTIMENT_REPOSITORY_PORT');
export const STT_PROVIDER_PORT = Symbol('STT_PROVIDER_PORT');

// Port interfaces
export * from './transcription-repository.port';
export * from './transcription-segment-repository.port';
export * from './sentiment-repository.port';
export * from './stt-provider.port';
