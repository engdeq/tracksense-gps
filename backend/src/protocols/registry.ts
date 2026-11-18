/**
 * Protocols that have a real GPS decoder implementation in this backend.
 * Registering a protocol in the DB does NOT automatically decode device frames.
 */
export const IMPLEMENTED_PROTOCOL_DECODERS = new Set(['teltonika_codec8']);

export function isProtocolDecoderImplemented(decoderKey?: string | null, protocolKey?: string | null) {
  const key = (decoderKey || protocolKey || '').trim().toLowerCase();
  return key ? IMPLEMENTED_PROTOCOL_DECODERS.has(key) : false;
}
