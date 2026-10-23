/**
 * Phone and web builds call the Render service. Set EXPO_PUBLIC_API_URL
 * to reach a machine on your desk instead (Android emulator: http://10.0.2.2:4000).
 */
const RENDER_URL = 'https://petworld-rqyo.onrender.com';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? RENDER_URL;
export const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL ?? API_URL;
