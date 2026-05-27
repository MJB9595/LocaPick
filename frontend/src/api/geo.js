// 현재 위치 가져오기 — Capacitor(네이티브) 우선, 웹 fallback.

import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'

export async function getCurrentPosition({ timeout = 10000 } = {}) {
  if (Capacitor.isNativePlatform()) {
    try {
      const check = await Geolocation.checkPermissions()
      if (check.location !== 'granted') {
        await Geolocation.requestPermissions()
      }
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout,
      })
      return {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy ?? null,
        source: 'native',
      }
    } catch (e) {
      console.warn('[geo] native 실패, web fallback', e)
    }
  }
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
          source: 'web',
        }),
        (err) => reject(err),
        { enableHighAccuracy: true, maximumAge: 0, timeout }
      )
    })
  }
  throw new Error('이 환경에서는 위치를 가져올 수 없습니다.')
}
