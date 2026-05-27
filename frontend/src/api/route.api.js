// 외부 길찾기 API 호출 헬퍼.
// 브라우저에서 직접 호출 (MapHome 과 동일 컨벤션).

const TMAP_KEY = import.meta.env.VITE_TMAP_KEY
const KAKAO_REST_KEY = import.meta.env.VITE_KAKAO_REST_KEY
const ODSAY_KEY = import.meta.env.VITE_ODSAY_KEY

/**
 * mode: 'WALK' | 'CAR' | 'TRANSIT'
 * 반환: { distance(m), time(초), source } 또는 null
 */
export const getRouteByMode = async (start, end, mode = 'WALK') => {
  if (!start || !end) return null
  if (mode === 'CAR') {
    const r = await getCarDuration(start, end)
    if (r) return r
    return getWalkRoute(start, end) // fallback
  }
  if (mode === 'TRANSIT') {
    const r = await getTransitDuration(start, end)
    if (r) return r
    return getWalkRoute(start, end) // fallback
  }
  return getWalkRoute(start, end)
}

/**
 * TMAP 도보 경로 — 약속 장소까지의 도보 거리/시간(초) 추정.
 * 실패하면 직선거리 기반 fallback 추정 시간 반환.
 */
export const getWalkRoute = async (start, end) => {
  if (!start || !end) return null

  if (TMAP_KEY) {
    try {
      const res = await fetch(
        'https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1&format=json&callback=result',
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            appKey: TMAP_KEY,
          },
          body: JSON.stringify({
            startX: String(start.lng),
            startY: String(start.lat),
            endX: String(end.lng),
            endY: String(end.lat),
            reqCoordType: 'WGS84GEO',
            resCoordType: 'WGS84GEO',
            startName: encodeURIComponent('출발'),
            endName: encodeURIComponent('도착'),
          }),
        }
      )
      const data = await res.json()
      if (data?.features?.length > 0) {
        const props = data.features[0].properties
        return {
          distance: props.totalDistance,
          time: props.totalTime,
          source: 'tmap',
        }
      }
    } catch (e) {
      console.warn('[route.api] TMAP 도보 실패, fallback', e)
    }
  }

  // Fallback — 직선거리 기준 도보 약 4.5km/h 가정
  const meters = haversine(start, end)
  const seconds = Math.round((meters / 1000) * 13.3 * 60) // 4.5km/h ~ 13.3분/km
  return { distance: meters, time: seconds, source: 'fallback' }
}

/** 카카오모빌리티 자동차 경로 — 시간(초) */
export const getCarDuration = async (start, end) => {
  if (!start || !end || !KAKAO_REST_KEY) return null
  try {
    const url = `https://apis-navi.kakaomobility.com/v1/directions?origin=${start.lng},${start.lat}&destination=${end.lng},${end.lat}&priority=RECOMMEND`
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}`, 'Content-Type': 'application/json' },
    })
    if (!res.ok) return null
    const data = await res.json()
    const route = data?.routes?.[0]
    if (!route) return null
    return { distance: route.summary.distance, time: route.summary.duration, source: 'kakao' }
  } catch (e) {
    console.warn('[route.api] kakao 자동차 실패', e)
    return null
  }
}

/** ODSAY 대중교통 경로 — 시간(초). 분 단위로 응답되므로 *60. */
export const getTransitDuration = async (start, end) => {
  if (!start || !end || !ODSAY_KEY) return null
  try {
    const url = `https://api.odsay.com/v1/api/searchPubTransPathT?SX=${start.lng}&SY=${start.lat}&EX=${end.lng}&EY=${end.lat}&apiKey=${encodeURIComponent(ODSAY_KEY)}`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    if (data.error) return null
    const path = data?.result?.path?.[0]
    if (!path) return null
    return {
      distance: path.info?.totalDistance ?? 0,
      time: (path.info?.totalTime ?? 0) * 60,
      source: 'odsay',
    }
  } catch (e) {
    console.warn('[route.api] odsay 실패', e)
    return null
  }
}

function haversine(a, b) {
  const R = 6371e3
  const p1 = (a.lat * Math.PI) / 180
  const p2 = (b.lat * Math.PI) / 180
  const dp = ((b.lat - a.lat) * Math.PI) / 180
  const dl = ((b.lng - a.lng) * Math.PI) / 180
  const x =
    Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2)
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
  return Math.round(R * c)
}
