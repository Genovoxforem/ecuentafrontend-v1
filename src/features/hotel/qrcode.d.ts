// No @types/qrcode package exists for the "qrcode" npm module this app
// already depends on (see package.json) — only the minimal surface used by
// HotelRoomQR.tsx is declared here.
declare module 'qrcode' {
  interface QRCodeToDataURLOptions {
    width?: number
    margin?: number
  }
  function toDataURL(text: string, options?: QRCodeToDataURLOptions): Promise<string>
  const QRCode: { toDataURL: typeof toDataURL }
  export default QRCode
}
