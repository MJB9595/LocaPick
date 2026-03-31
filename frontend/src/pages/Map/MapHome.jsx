import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Map, MapMarker, Polyline, CustomOverlayMap } from 'react-kakao-maps-sdk';
import { getLocapickResults } from '../../api/locapick.api';
import { getMyFavorites, toggleFavorite } from '../../api/favorite.api';
import './MapHome.scss';

const { kakao } = window;

// 🌟 대비가 확실하고 깔끔한 SVG 별 아이콘 컴포넌트
const StarIcon = ({ isFilled }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    width="22" height="22"
    fill={isFilled ? "#F59E0B" : "none"} 
    stroke={isFilled ? "#F59E0B" : "#94A3B8"} 
    strokeWidth="2" 
    strokeLinecap="round" strokeLinejoin="round"
    style={{ 
      transition: 'all 0.2s', 
      filter: isFilled ? 'drop-shadow(0 2px 4px rgba(245, 158, 11, 0.4))' : 'none',
      verticalAlign: 'middle',
      marginBottom: '2px'
    }}
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
  </svg>
);

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; 
  const p1 = lat1 * Math.PI/180;
  const p2 = lat2 * Math.PI/180;
  const dp = (lat2-lat1) * Math.PI/180;
  const dl = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c);
};

const getTmapWalkData = async (startPos, endPos, startName = "출발", endName = "도착") => {
  const TMAP_KEY = import.meta.env.VITE_TMAP_KEY;
  if (!TMAP_KEY) return { path: [startPos, endPos], distance: 0, time: 0 };

  const url = "https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1&format=json&callback=result";
  const payload = {
    startX: startPos.lng.toString(), startY: startPos.lat.toString(),
    endX: endPos.lng.toString(), endY: endPos.lat.toString(),
    reqCoordType: "WGS84GEO", resCoordType: "WGS84GEO",
    startName: encodeURIComponent(startName), endName: encodeURIComponent(endName)
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json", "appKey": TMAP_KEY },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.features) {
      const path = [];
      let distance = data.features[0].properties.totalDistance; 
      let time = data.features[0].properties.totalTime; 
      data.features.forEach(feature => {
        if (feature.geometry.type === "LineString") {
          feature.geometry.coordinates.forEach(coord => { path.push({ lat: coord[1], lng: coord[0] }); });
        }
      });
      return { path, distance, time };
    }
  } catch (err) { console.error("Tmap 도보 경로 에러:", err); }
  return { path: [startPos, endPos], distance: 0, time: 0 }; 
};

const MapHome = () => {
  const [center, setCenter] = useState({ lat: 37.5665, lng: 126.9780 });
  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);

  const [keyword, setKeyword] = useState('');
  const [places, setPlaces] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false); 

  const [activeTab, setActiveTab] = useState(null); 
  const [carRoute, setCarRoute] = useState(null); 
  const [walkRoute, setWalkRoute] = useState(null); 
  const [transitRoutes, setTransitRoutes] = useState([]); 
  const [selectedTransitIdx, setSelectedTransitIdx] = useState(0);
  const [transitLines, setTransitLines] = useState([]);
  const [transitDetails, setTransitDetails] = useState([]);
  const [transitInfo, setTransitInfo] = useState(null);
  const [myFavorites, setMyFavorites] = useState([]);

  const [isLocapickOpen, setIsLocapickOpen] = useState(false);
  const [locaTime, setLocaTime] = useState(15); 
  const [locaCount, setLocaCount] = useState(3); 
  const [locaCategory, setLocaCategory] = useState('restaurant'); 
  const [locaResults, setLocaResults] = useState([]);
  const [isLocaLoading, setIsLocaLoading] = useState(false);

  // 🌟 스크롤 및 포커싱을 위한 Ref와 State 추가
  const mapContainerRef = useRef(null);
  const locaResultsRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const currentPos = { lat: position.coords.latitude, lng: position.coords.longitude };
          setCenter(currentPos);
          setStartPoint({ name: '내 위치', lat: currentPos.lat, lng: currentPos.lng });
          setIsLoading(false);
        },
        () => setIsLoading(false)
      );
    } else { setIsLoading(false); }
  }, []);

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const data = await getMyFavorites();
        setMyFavorites(data);
      } catch (error) {
        console.error("즐겨찾기 목록을 불러오지 못했습니다.", error);
      }
    };
    fetchFavorites();
  }, []);

  // 🌟 현재 활성화된 경로 선들을 계산하여 저장 (포커싱에 사용)
  const activeLines = useMemo(() => {
    if (activeTab === 'CAR' && carRoute) return carRoute.lines;
    if (activeTab === 'TRANSIT') return transitLines;
    if (activeTab === 'WALK' && walkRoute) return walkRoute.lines;
    return [];
  }, [activeTab, carRoute, transitLines, walkRoute]);

  // 🌟 기능 1: 통합 길찾기 완료 시 지도 자동 줌(Bounds) 및 스크롤 이동
  useEffect(() => {
    if (mapInstance && activeLines && activeLines.length > 0) {
      const bounds = new kakao.maps.LatLngBounds();
      
      // 경로의 모든 좌표를 bounds에 추가
      activeLines.forEach(line => {
        line.path.forEach(p => bounds.extend(new kakao.maps.LatLng(p.lat, p.lng)));
      });

      // 출발지, 도착지도 확실하게 포함
      if (startPoint) bounds.extend(new kakao.maps.LatLng(startPoint.lat, startPoint.lng));
      if (endPoint) bounds.extend(new kakao.maps.LatLng(endPoint.lat, endPoint.lng));

      // 지도의 시야를 꽉 차게 변경
      mapInstance.setBounds(bounds);

      // 모바일 환경일 경우 지도 컨테이너로 스크롤 부드럽게 이동
      if (window.innerWidth <= 768 && mapContainerRef.current) {
        setTimeout(() => {
          mapContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    }
  }, [mapInstance, activeLines, startPoint, endPoint]);

  // 🌟 기능 2: LocaPick 결과 로딩 완료 시 결과 영역으로 스크롤 이동
  useEffect(() => {
    if (locaResults.length > 0 && locaResultsRef.current) {
      setTimeout(() => {
        locaResultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [locaResults]);


  const handleToggleStar = async (name, lat, lng, address, e) => {
    if (e) e.stopPropagation(); 
    try {
      const res = await toggleFavorite({ name, lat, lng, address });
      if (res.isFavorite) {
        setMyFavorites([{ placeName: name }, ...myFavorites]);
      } else {
        setMyFavorites(myFavorites.filter(fav => fav.placeName !== name));
      }
    } catch (error) {
      alert("즐겨찾기 처리 중 오류가 발생했습니다. 로그인이 되어있는지 확인해주세요.");
    }
  };

  const isFavoritePlace = (placeName) => {
    return myFavorites.some(fav => fav.placeName === placeName);
  };

  const runLocapickAlgorithm = async () => {
    if (!startPoint) {
      alert("출발지(내 위치 또는 검색한 장소)를 먼저 설정해주세요!");
      return;
    }
    
    setIsLocaLoading(true);
    setLocaResults([]);

    try {
      const data = await getLocapickResults({
        lat: startPoint.lat,
        lng: startPoint.lng,
        time: locaTime,
        count: locaCount,
        category: locaCategory
      });

      if (data.length === 0) {
        alert(`출발지 주변 도보 ${locaTime}분 이내에는 해당 장소가 없습니다.\n시간을 조금 더 늘려보세요!`);
      } else {
        setLocaResults(data);
      }
    } catch (error) {
      console.error(error);
      alert("서버에서 LocaPick 알고리즘을 실행하는 중 오류가 발생했습니다.");
    } finally {
      setIsLocaLoading(false);
    }
  };

  const handleSelectLocaPlace = (place) => {
    const pointData = { name: place.name, lat: place.lat, lng: place.lng };
    setEndPoint(pointData);
    setCenter(pointData);
    setIsLocapickOpen(false); 
    
    setActiveTab(null);
    setCarRoute(null); setWalkRoute(null); setTransitRoutes([]); setTransitLines([]);
  };

  const searchPlaces = (e) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    const ps = new kakao.maps.services.Places();
    ps.keywordSearch(keyword, (data, status) => {
      if (status === kakao.maps.services.Status.OK) {
        setPlaces(data); setCenter({ lat: parseFloat(data[0].y), lng: parseFloat(data[0].x) }); setSelectedPlace(null);
      } else { alert('검색 결과가 없거나 오류가 발생했습니다.'); setPlaces([]); }
    });
  };

  const handleSelectPlace = (place) => {
    const pointData = { name: place.place_name, lat: parseFloat(place.y), lng: parseFloat(place.x) };
    setSelectedPlace(pointData); setCenter(pointData);
  };

  const handleSetPoint = (place, type, e) => {
    e.stopPropagation();
    const pointData = { name: place.place_name, lat: parseFloat(place.y), lng: parseFloat(place.x) };
    if (type === 'START') setStartPoint(pointData); else setEndPoint(pointData);
    setPlaces([]); setKeyword(''); setSelectedPlace(null); setActiveTab(null); setCarRoute(null); setWalkRoute(null); setTransitRoutes([]); setTransitLines([]);
  };

  const handleSearchAllRoutes = async () => {
    if (!startPoint || !endPoint) return;
    setIsSearching(true);

    const straightDist = getDistance(startPoint.lat, startPoint.lng, endPoint.lat, endPoint.lng);
    const walkDist = Math.round(straightDist * 1.3); 
    const walkTime = Math.round(walkDist / 80) * 60; 
    
    const tmapWalk = await getTmapWalkData(startPoint, endPoint);
    if (tmapWalk.path.length > 2) {
      setWalkRoute({ lines: [{ type: 'WALK', path: tmapWalk.path }], info: { distance: tmapWalk.distance, duration: tmapWalk.time } });
    } else {
      setWalkRoute({ lines: [{ type: 'WALK', path: [startPoint, endPoint] }], info: { distance: walkDist, duration: walkTime } });
    }

    let fetchedCarRoute = null;
    try {
      const REST_API_KEY = import.meta.env.VITE_KAKAO_REST_KEY;
      const url = `https://apis-navi.kakaomobility.com/v1/directions?origin=${startPoint.lng},${startPoint.lat}&destination=${endPoint.lng},${endPoint.lat}&priority=RECOMMEND`;
      const res = await fetch(url, { headers: { Authorization: `KakaoAK ${REST_API_KEY}`, 'Content-Type': 'application/json' }});
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const linePath = [];
        route.sections[0].roads.forEach(road => { for (let i = 0; i < road.vertexes.length; i += 2) { linePath.push({ lng: road.vertexes[i], lat: road.vertexes[i + 1] }); } });
        fetchedCarRoute = { lines: [{ type: 'CAR', path: linePath }], info: { distance: route.summary.distance, duration: route.summary.duration } };
      }
    } catch (e) { console.error("자동차 경로 에러", e); }
    setCarRoute(fetchedCarRoute);

    let fetchedTransitPaths = [];
    try {
      const ODSAY_KEY = import.meta.env.VITE_ODSAY_KEY;
      const url = `https://api.odsay.com/v1/api/searchPubTransPathT?SX=${startPoint.lng}&SY=${startPoint.lat}&EX=${endPoint.lng}&EY=${endPoint.lat}&apiKey=${encodeURIComponent(ODSAY_KEY)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.error && data.result && data.result.path.length > 0) fetchedTransitPaths = data.result.path;
    } catch (e) { console.error("대중교통 경로 에러", e); }
    setTransitRoutes(fetchedTransitPaths);

    if (fetchedTransitPaths.length > 0) { setActiveTab('TRANSIT'); await handleSelectTransitRoute(fetchedTransitPaths[0], 0); } 
    else if (fetchedCarRoute) { setActiveTab('CAR'); } 
    else { setActiveTab('WALK'); }
    setIsSearching(false);
  };

  const handleSelectTransitRoute = async (route, idx) => {
    setSelectedTransitIdx(idx);
    const ODSAY_KEY = import.meta.env.VITE_ODSAY_KEY;
    const mapObj = route.info.mapObj; 

    const details = route.subPath.map((step) => {
      if (step.trafficType === 3) {
        if (step.sectionTime === 0) return null;
        return { type: 'WALK', distance: step.distance, time: step.sectionTime };
      } else {
        let modeType = 'BUS';
        if (step.trafficType === 1) modeType = 'SUBWAY'; else if (step.trafficType === 4) modeType = 'TRAIN'; else if (step.trafficType === 6) modeType = 'EXPRESS_BUS';
        let name = '이동';
        if (step.lane && step.lane.length > 0) { name = step.lane[0].name || step.lane[0].busNo || step.lane[0].busName || '교통수단'; } 
        else { name = step.trafficType === 4 ? '기차' : (step.trafficType === 6 ? '시외/고속버스' : '이동'); }
        return { type: modeType, name: name, start: step.startName || '출발역', end: step.endName || '도착역', time: step.sectionTime, count: step.stationCount || 0 };
      }
    }).filter(Boolean);
    setTransitDetails(details); 

    try {
      let lanes = [];
      if (mapObj) {
        const graphicUrl = `https://api.odsay.com/v1/api/loadLane?mapObject=0:0@${mapObj}&apiKey=${encodeURIComponent(ODSAY_KEY)}`;
        const graphicRes = await fetch(graphicUrl); const graphicData = await graphicRes.json();
        if (graphicData.result && graphicData.result.lane) lanes = graphicData.result.lane;
      }

      const newRouteLines = [];
      let laneIdx = 0; let currentPos = startPoint;

      for (let i = 0; i < route.subPath.length; i++) {
        const step = route.subPath[i];
        if (step.trafficType === 3) { 
          const nextStep = route.subPath[i + 1];
          const endPos = nextStep ? { lat: nextStep.startY, lng: nextStep.startX } : endPoint;
          const walkData = await getTmapWalkData(currentPos, endPos);
          newRouteLines.push({ type: 'WALK', path: walkData.path });
          currentPos = endPos;
        } else { 
          const startPos = { lat: step.startY, lng: step.startX }; const endPos = { lat: step.endY, lng: step.endX };
          let type = 'BUS';
          if (step.trafficType === 1) type = 'SUBWAY'; else if (step.trafficType === 4) type = 'TRAIN'; else if (step.trafficType === 6) type = 'EXPRESS_BUS';
          let path = [startPos, endPos]; 
          if ((step.trafficType === 1 || step.trafficType === 2) && lanes[laneIdx]) {
            path = lanes[laneIdx].section[0].graphPos.map(p => ({ lat: p.y, lng: p.x })); laneIdx++;
          }
          newRouteLines.push({ type: type, path: path }); currentPos = endPos;
        }
      }
      setTransitLines(newRouteLines); setTransitInfo({ distance: route.info.totalDistance, duration: route.info.totalTime * 60 });
    } catch (err) { console.error("폴리라인 로드 에러:", err); }
  };

  const renderRouteBadges = (route) => {
    const transitSteps = route.subPath.filter(step => step.trafficType !== 3);
    return (
      <div className="summary-badges">
        {transitSteps.map((step, idx) => {
          let badgeClass = 'bus'; if (step.trafficType === 1) badgeClass = 'subway'; if (step.trafficType === 4 || step.trafficType === 6) badgeClass = 'train'; 
          let name = '이동';
          if (step.lane && step.lane.length > 0) { name = step.lane[0].name || step.lane[0].busNo || '교통수단'; } else { name = step.trafficType === 4 ? '기차' : (step.trafficType === 6 ? '고속버스' : '이동'); }
          return (
            <React.Fragment key={idx}><span className={`transit-badge ${badgeClass}`}>{name}</span>{idx < transitSteps.length - 1 && <span className="badge-arrow">➔</span>}</React.Fragment>
          );
        })}
      </div>
    );
  };

  const formatDistance = (meters) => meters > 1000 ? `${(meters / 1000).toFixed(1)}km` : `${meters}m`;
  const formatTime = (seconds) => { const min = Math.ceil(seconds / 60); return min > 60 ? `${Math.floor(min / 60)}시간 ${min % 60}분` : `${min}분`; };

  return (
    <main className="map-page page app-bg">
      <div className="container map-layout">
        <div className="map-sidebar card">
          <h2 className="sidebar-title">장소 검색 & 길찾기</h2>
          <form className="search-form" onSubmit={searchPlaces}>
            <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="주소나 장소명을 입력하세요" className="input search-input" />
            <button type="submit" className="search-btn">검색</button>
          </form>

          {places.length > 0 && (
            <div className="search-results">
              {places.map((place, idx) => (
                <div key={idx} className={`place-item ${selectedPlace?.name === place.place_name ? 'selected' : ''}`} onClick={() => handleSelectPlace(place)}>
                  <div className="place-info">
                    <strong>{place.place_name}
                      <button 
                        onClick={(e) => handleToggleStar(place.place_name, parseFloat(place.y), parseFloat(place.x), place.road_address_name || place.address_name, e)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: '6px' }}
                      >
                        <StarIcon isFilled={isFavoritePlace(place.place_name)} />
                      </button>
                    </strong>
                    <span className="address">{place.road_address_name || place.address_name}</span>
                  </div>
                  
                  {selectedPlace?.name === place.place_name && (
                    <div className="place-actions">
                      <button onClick={(e) => handleSetPoint(place, 'START', e)} className="btn-set start">출발지</button>
                      <button onClick={(e) => handleSetPoint(place, 'END', e)} className="btn-set end">도착지</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="route-info">
            <div className="route-point">
              <span className="badge start-badge">출발</span>
              <span>{startPoint ? startPoint.name : '설정되지 않음'}</span>
            </div>
            <div className="route-point">
              <span className="badge end-badge">도착</span>
              <span>{endPoint ? endPoint.name : '설정되지 않음'}</span>
              {endPoint && (
                <button 
                  onClick={(e) => handleToggleStar(endPoint.name, endPoint.lat, endPoint.lng, endPoint.address, e)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: '8px' }}
                  title="즐겨찾기 추가/해제"
                >
                  <StarIcon isFilled={isFavoritePlace(endPoint.name)} />
                </button>
              )}
            </div>

            {!activeTab ? (
              <button className="main-search-btn" onClick={handleSearchAllRoutes} disabled={!startPoint || !endPoint || isSearching}>
                {isSearching ? '경로 탐색 중...' : '통합 길찾기'}
              </button>
            ) : (
              <div className="route-tabs-wrap">
                <div className="route-tabs">
                  <button className={`tab-btn ${activeTab === 'TRANSIT' ? 'active' : ''}`} onClick={() => setActiveTab('TRANSIT')}>🚌 대중교통</button>
                  <button className={`tab-btn ${activeTab === 'CAR' ? 'active' : ''}`} onClick={() => setActiveTab('CAR')}>🚗 자동차</button>
                  <button className={`tab-btn ${activeTab === 'WALK' ? 'active' : ''}`} onClick={() => setActiveTab('WALK')}>🚶 도보</button>
                </div>
                <div className="tab-content">
                  {activeTab === 'CAR' && (
                    carRoute ? (
                      <div className="route-summary"><div className="summary-item time">예상 {formatTime(carRoute.info.duration)}</div><div className="summary-item dist">총 거리 {formatDistance(carRoute.info.distance)}</div></div>
                    ) : <div className="no-route">자동차 경로가 없습니다.</div>
                  )}

                  {activeTab === 'WALK' && (
                    walkRoute ? (
                      <div className="route-summary walk">
                        <div className="summary-item time">예상 {formatTime(walkRoute.info.duration)}</div>
                        <div className="summary-item dist">실제 도보 거리 {formatDistance(walkRoute.info.distance)}</div>
                      </div>
                    ) : <div className="no-route">도보 경로를 계산할 수 없습니다.</div>
                  )}

                  {activeTab === 'TRANSIT' && (
                    transitRoutes.length > 0 ? (
                      <div className="transit-routes-container">
                        <div className="transit-list">
                          {transitRoutes.map((route, idx) => {
                            const isSelected = selectedTransitIdx === idx;
                            return (
                              <div key={idx} className={`transit-card ${isSelected ? 'active' : ''}`} onClick={() => handleSelectTransitRoute(route, idx)}>
                                <div className="transit-card-header">
                                  <div className="header-left">
                                    <span className="time">{route.info.totalTime}분</span>
                                    <span className="fare">{route.info.payment ? `${route.info.payment.toLocaleString()}원` : '요금 정보 없음'}</span>
                                  </div>
                                  <div className="header-right">{renderRouteBadges(route)}</div>
                                </div>
                                {isSelected && transitDetails.length > 0 && (
                                  <div className="route-details-wrap inline" onClick={(e) => e.stopPropagation()}>
                                    <ul className="details-list">
                                      {transitDetails.map((step, stepIdx) => (
                                        <li key={stepIdx} className={`detail-item ${step.type.toLowerCase()}`}>
                                          <div className="step-icon">
                                            {step.type === 'WALK' ? '🚶' : step.type === 'TRAIN' || step.type === 'EXPRESS_BUS' ? '🚆' : step.type === 'SUBWAY' ? '🚇' : '🚌'}
                                          </div>
                                          <div className="step-text">
                                            {step.type === 'WALK' ? (
                                              <span className="walk-text">도보 이동 {step.time}분 ({step.distance}m)</span>
                                            ) : (
                                              <>
                                                <strong className={step.type.toLowerCase()}>{step.name}</strong> 탑승
                                                <div className="step-stations">
                                                  {step.start} <span className="arrow">→</span> {step.end}
                                                  {step.count > 0 && <span className="step-meta">({step.count}개 역)</span>}
                                                </div>
                                              </>
                                            )}
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : <div className="no-route">대중교통 경로가 없습니다.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 🌟 지도 컨테이너 (ref 할당) */}
        <div className="map-container card" ref={mapContainerRef}>
          {isLoading ? (
            <div className="map-loading">지도를 불러오는 중입니다...</div>
          ) : (
            <Map 
              center={center} 
              style={{ width: "100%", height: "100%", display: "block", borderRadius: "20px" }} 
              level={5}
              onCreate={setMapInstance} // 🌟 지도 생성 시 인스턴스 캡처
            >
              {(() => {
                const isLocaDest = endPoint && locaResults.some(place => place.name === endPoint.name);

                return (
                  <React.Fragment>
                    {startPoint && (
                      <React.Fragment>
                        <MapMarker position={startPoint} image={{ src: 'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png', size: { width: 34, height: 39 }}} />
                        <CustomOverlayMap position={startPoint} xAnchor={0.5} yAnchor={2.2} zIndex={10}>
                          <div className="custom-marker-label start">
                            <span className="badge">출발</span>
                            <span className="name">{startPoint.name}</span>
                          </div>
                        </CustomOverlayMap>
                      </React.Fragment>
                    )}

                    {endPoint && !isLocaDest && (
                      <React.Fragment>
                        <MapMarker position={endPoint} />
                        <CustomOverlayMap position={endPoint} xAnchor={0.5} yAnchor={2.2} zIndex={10}>
                          <div className="custom-marker-label end">
                            <span className="badge">도착</span>
                            <span className="name">{endPoint.name}</span>
                          </div>
                        </CustomOverlayMap>
                      </React.Fragment>
                    )}

                    {selectedPlace && (
                      <React.Fragment>
                        <MapMarker position={selectedPlace} />
                        <CustomOverlayMap position={selectedPlace} xAnchor={0.5} yAnchor={2.2} zIndex={5}>
                          <div className="custom-marker-label selected">
                            <span className="badge">✅</span>
                            <span className="name">{selectedPlace.name}</span>
                          </div>
                        </CustomOverlayMap>
                      </React.Fragment>
                    )}

                    {activeLines.map((line, idx) => {
                      let color = '#8b5cf6'; let style = 'solid'; let weight = 6; let opacity = 0.8;
                      if (line.type === 'WALK') { color = '#64748b'; style = 'shortdash'; weight = 4; opacity = 0.9; } 
                      else if (line.type === 'BUS') { color = '#3b82f6'; } else if (line.type === 'SUBWAY') { color = '#22c55e'; }
                      else if (line.type === 'TRAIN' || line.type === 'EXPRESS_BUS') { color = '#f97316'; opacity = 1; }
                      return (<Polyline key={idx} path={line.path} strokeWeight={weight} strokeColor={color} strokeOpacity={opacity} strokeStyle={style} />);
                    })}

                    {locaResults.map((place, idx) => {
                      const isSelectedDest = endPoint && endPoint.name === place.name;

                      return (
                        <React.Fragment key={`locapick-${idx}`}>
                          <MapMarker
                            position={{ lat: parseFloat(place.lat), lng: parseFloat(place.lng) }}
                            image={{ src: 'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png', size: { width: 24, height: 35 } }}
                            onClick={() => handleSelectLocaPlace(place)}
                          />
                          
                          <CustomOverlayMap
                            position={{ lat: parseFloat(place.lat), lng: parseFloat(place.lng) }}
                            xAnchor={0.5} yAnchor={2.2}
                            zIndex={isSelectedDest ? 15 : 10} 
                          >
                            <div 
                              className={`custom-marker-label loca ${isSelectedDest ? 'is-dest' : ''}`} 
                              onClick={() => handleSelectLocaPlace(place)}
                            >
                              <span className="rank">{idx + 1}위</span>
                              <span className="name">{place.name}</span>
                              {isSelectedDest && <span className="dest-badge">도착지</span>}
                            </div>
                          </CustomOverlayMap>
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                );
              })()}
           </Map>
          )}

          <button className="locapick-fab" onClick={() => setIsLocapickOpen(true)}>
            <span className="icon">✨</span> LOCAPICK
          </button>

          {isLocapickOpen && (
            <div className="locapick-modal-overlay" onClick={() => setIsLocapickOpen(false)}>
              <div className="locapick-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>✨ LocaPick 알고리즘</h3>
                  <button className="close-btn" onClick={() => setIsLocapickOpen(false)}>✕</button>
                </div>

                <div className="modal-body">
                  <div className="settings-group">
                    <label>탐색 카테고리</label>
                    <div className="radio-group">
                      <button className={`radio-btn ${locaCategory === 'restaurant' ? 'active' : ''}`} onClick={() => setLocaCategory('restaurant')}>🍔 음식점</button>
                      <button className={`radio-btn ${locaCategory === 'clothes' ? 'active' : ''}`} onClick={() => setLocaCategory('clothes')}>👕 옷가게</button>
                    </div>
                  </div>

                  <div className="settings-group">
                    <label>최대 소요 시간 (도보 기준)</label>
                    <div className="input-wrap">
                      <input type="number" min="1" max="120" value={locaTime} onChange={(e) => setLocaTime(Number(e.target.value))} />
                      <span className="unit">분 이내</span>
                    </div>
                  </div>

                  <div className="settings-group">
                    <label>원하는 가게 수 (최대 5개)</label>
                    <div className="input-wrap">
                      <input type="number" min="1" max="5" value={locaCount} onChange={(e) => setLocaCount(Math.min(5, Number(e.target.value)))} />
                      <span className="unit">개 추천</span>
                    </div>
                  </div>

                  <button className="run-algo-btn" onClick={runLocapickAlgorithm} disabled={isLocaLoading}>
                    {isLocaLoading ? '최적의 장소 찾는 중...' : '알고리즘 실행'}
                  </button>

                  {/* 🌟 LocaPick 결과 리스트 영역 (ref 할당) */}
                  {locaResults.length > 0 && (
                    <div className="loca-results" ref={locaResultsRef}>
                      <h4>💡 추천 결과 ({locaResults.length}개)</h4>
                      <div className="loca-list">
                        {locaResults.map((place, idx) => (
                          <div key={idx} className="loca-card" onClick={() => handleSelectLocaPlace(place)}>
                            <div className="card-header">
                              <span className="rank">{idx + 1}위</span>
                              <strong>
                                {place.name}
                                <button 
                                  onClick={(e) => handleToggleStar(place.name, place.lat, place.lng, place.address, e)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: '6px' }}
                                >
                                  <StarIcon isFilled={isFavoritePlace(place.name)} />
                                </button>
                              </strong>
                            </div>
                            <div className="card-scores">
                              <span className="score review">⭐ {place.review}점</span>
                              <span className="score user">👥 {place.user_review !== null ? `${place.user_review}점` : '리뷰 없음'}</span>
                            </div>
                            <p className="card-address">{place.address}</p>
                            <button className="set-dest-btn">도착지로 설정</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default MapHome;