import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Map, MapMarker } from 'react-kakao-maps-sdk'
import { getCurrentPosition } from '../../api/geo'
import './PlacePickerModal.scss'

/**
 * 채팅용 장소 선택 모달.
 *
 * Props
 * - mode: 'appointment' | 'place'  — 약속 잡기 vs 장소만 공유
 * - onClose()
 * - onSubmit({ placeName, placeAddress, lat, lng })
 *
 * UX
 * - 풀스크린 모달
 * - 상단: 검색창
 * - 좌(데스크탑) / 위(모바일): 검색 결과 리스트
 * - 우/아래: 카카오 지도 (현재 위치 기반, 클릭/검색결과 클릭으로 도착지 선택)
 * - 하단 액션: 출발지(내 위치 / 수동) + 확정 버튼
 */
const PlacePickerModal = ({ mode = 'appointment', onClose, onSubmit }) => {
  const [center, setCenter] = useState({ lat: 37.5665, lng: 126.9780 })
  const [start, setStart] = useState(null) // { name, lat, lng }
  const [end, setEnd] = useState(null)     // { placeName, placeAddress, lat, lng }
  const [keyword, setKeyword] = useState('')
  const [places, setPlaces] = useState([])
  const [searching, setSearching] = useState(false)
  const [loadingMyLoc, setLoadingMyLoc] = useState(false)
  const [startEditMode, setStartEditMode] = useState(false)
  const [startQuery, setStartQuery] = useState('')
  const [startResults, setStartResults] = useState([])

  const mapRef = useRef(null)

  // ── GPS로 시작점 자동 설정
  const fetchMyLocation = useCallback(async () => {
    try {
      setLoadingMyLoc(true)
      const p = await getCurrentPosition()
      const next = { name: '내 위치', lat: p.lat, lng: p.lng }
      setStart(next)
      setCenter({ lat: p.lat, lng: p.lng })
    } catch (e) {
      console.warn('[PlacePicker] GPS 실패', e)
      alert('현재 위치를 가져올 수 없어요. 시작 위치를 직접 선택해 주세요.')
      setStartEditMode(true)
    } finally {
      setLoadingMyLoc(false)
    }
  }, [])

  useEffect(() => {
    fetchMyLocation()
  }, [fetchMyLocation])

  // ── 도착지 검색
  const handleSearch = useCallback((e) => {
    e?.preventDefault?.()
    const q = keyword.trim()
    if (!q) return
    if (!window.kakao || !window.kakao.maps?.services) {
      alert('지도 서비스를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.')
      return
    }
    setSearching(true)
    const ps = new window.kakao.maps.services.Places()
    ps.keywordSearch(q, (data, status) => {
      setSearching(false)
      if (status === window.kakao.maps.services.Status.OK) {
        setPlaces(data)
        if (data.length > 0) {
          setCenter({ lat: parseFloat(data[0].y), lng: parseFloat(data[0].x) })
        }
      } else {
        setPlaces([])
      }
    }, { useMapBounds: false })
  }, [keyword])

  const selectFromList = (p) => {
    const next = {
      placeName: p.place_name,
      placeAddress: p.road_address_name || p.address_name || '',
      lat: parseFloat(p.y),
      lng: parseFloat(p.x),
    }
    setEnd(next)
    setCenter({ lat: next.lat, lng: next.lng })
  }

  const onMapClick = (_t, mouseEvent) => {
    const latlng = mouseEvent.latLng
    const lat = latlng.getLat()
    const lng = latlng.getLng()
    // 클릭한 좌표를 역지오코딩해서 주소를 시도
    if (window.kakao?.maps?.services) {
      const geocoder = new window.kakao.maps.services.Geocoder()
      geocoder.coord2Address(lng, lat, (result, status) => {
        let addr = ''
        let name = '선택한 위치'
        if (status === window.kakao.maps.services.Status.OK && result[0]) {
          addr = result[0].road_address?.address_name || result[0].address?.address_name || ''
          name = result[0].road_address?.building_name || addr || name
        }
        setEnd({ placeName: name, placeAddress: addr, lat, lng })
      })
    } else {
      setEnd({ placeName: '선택한 위치', placeAddress: '', lat, lng })
    }
  }

  // ── 출발지 수동 검색
  const handleStartSearch = useCallback((e) => {
    e?.preventDefault?.()
    const q = startQuery.trim()
    if (!q || !window.kakao?.maps?.services) return
    const ps = new window.kakao.maps.services.Places()
    ps.keywordSearch(q, (data, status) => {
      if (status === window.kakao.maps.services.Status.OK) {
        setStartResults(data.slice(0, 8))
      } else {
        setStartResults([])
      }
    })
  }, [startQuery])

  const pickStartFromResult = (p) => {
    setStart({ name: p.place_name, lat: parseFloat(p.y), lng: parseFloat(p.x) })
    setStartEditMode(false)
    setStartResults([])
    setStartQuery('')
  }

  const pickStartAsEnd = () => {
    if (!end) return
    setStart({ name: end.placeName || '도착지', lat: end.lat, lng: end.lng })
    setStartEditMode(false)
  }

  const handleConfirm = () => {
    if (!end) {
      alert('약속 장소를 먼저 선택해 주세요.')
      return
    }
    onSubmit({
      placeName: end.placeName,
      placeAddress: end.placeAddress,
      lat: end.lat,
      lng: end.lng,
      // 시작점은 ETA 계산을 위해 부모가 별도 활용 가능 (옵션)
      startLat: start?.lat,
      startLng: start?.lng,
    })
  }

  const title = mode === 'appointment' ? '약속 장소 잡기' : '장소 공유'
  const confirmLabel = mode === 'appointment' ? '약속 장소로 정하기' : '이 장소 공유하기'

  return (
    <div className="place-picker-backdrop" role="dialog" aria-modal="true">
      <div className="place-picker-modal">
        <header className="pp-header">
          <button className="pp-close" onClick={onClose} aria-label="닫기">✕</button>
          <h2>{title}</h2>
          <button
            className="pp-confirm"
            onClick={handleConfirm}
            disabled={!end}
          >
            {confirmLabel}
          </button>
        </header>

        {/* 출발지 바 */}
        <div className="pp-start-bar">
          <span className="pp-start-label">출발</span>
          {!startEditMode ? (
            <>
              <span className="pp-start-name">
                {loadingMyLoc ? '위치 확인 중...' : (start ? start.name : '미설정')}
                {start && (
                  <em className="pp-start-coord">
                    ({start.lat.toFixed(4)}, {start.lng.toFixed(4)})
                  </em>
                )}
              </span>
              <button className="pp-start-edit" type="button" onClick={() => setStartEditMode(true)}>
                수정
              </button>
              <button className="pp-start-mine" type="button" onClick={fetchMyLocation}>
                📍 내 위치
              </button>
            </>
          ) : (
            <form className="pp-start-edit-form" onSubmit={handleStartSearch}>
              <input
                value={startQuery}
                onChange={(e) => setStartQuery(e.target.value)}
                placeholder="출발지 검색 (예: 서울역)"
                autoFocus
              />
              <button type="submit">검색</button>
              <button type="button" onClick={() => { setStartEditMode(false); setStartResults([]) }}>
                취소
              </button>
              {end && (
                <button type="button" className="pp-start-as-end" onClick={pickStartAsEnd}>
                  도착지와 동일
                </button>
              )}
              {startResults.length > 0 && (
                <ul className="pp-start-results">
                  {startResults.map((p) => (
                    <li key={p.id} onClick={() => pickStartFromResult(p)}>
                      <strong>{p.place_name}</strong>
                      <span>{p.road_address_name || p.address_name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </form>
          )}
        </div>

        <div className="pp-body">
          {/* 검색 + 결과 리스트 */}
          <aside className="pp-side">
            <form className="pp-search" onSubmit={handleSearch}>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="장소 검색 (예: 강남역, 카페)"
              />
              <button type="submit" disabled={!keyword.trim() || searching}>
                {searching ? '...' : '검색'}
              </button>
            </form>
            <div className="pp-tip">
              지도를 클릭하거나 검색 결과를 선택하면 도착지가 정해져요.
            </div>
            <ul className="pp-results">
              {places.map((p) => (
                <li
                  key={p.id}
                  className={end && parseFloat(p.x) === end.lng && parseFloat(p.y) === end.lat ? 'on' : ''}
                  onClick={() => selectFromList(p)}
                >
                  <strong className="r-name">{p.place_name}</strong>
                  <span className="r-addr">{p.road_address_name || p.address_name}</span>
                  {p.phone && <span className="r-phone">{p.phone}</span>}
                </li>
              ))}
              {places.length === 0 && keyword && !searching && (
                <li className="r-empty">검색 결과가 없어요.</li>
              )}
            </ul>
          </aside>

          {/* 지도 */}
          <div className="pp-map-wrap">
            <Map
              center={center}
              level={4}
              style={{ width: '100%', height: '100%' }}
              onClick={onMapClick}
              ref={mapRef}
            >
              {start && (
                <MapMarker
                  position={{ lat: start.lat, lng: start.lng }}
                  image={{
                    src: 'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png',
                    size: { width: 24, height: 35 },
                  }}
                  title="출발"
                />
              )}
              {end && (
                <MapMarker
                  position={{ lat: end.lat, lng: end.lng }}
                  title={end.placeName}
                />
              )}
            </Map>
          </div>
        </div>

        {/* 하단 도착지 미리보기 */}
        <footer className="pp-footer">
          {end ? (
            <div className="pp-end-preview">
              <span className="pp-end-icon">📍</span>
              <div className="pp-end-text">
                <strong>{end.placeName}</strong>
                <span>{end.placeAddress || '주소 정보 없음'}</span>
              </div>
            </div>
          ) : (
            <div className="pp-end-empty">아직 도착지를 선택하지 않았어요.</div>
          )}
        </footer>
      </div>
    </div>
  )
}

export default PlacePickerModal
