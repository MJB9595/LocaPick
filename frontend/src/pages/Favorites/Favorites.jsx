import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyFavorites, toggleFavorite, updateFavoriteCategory } from '../../api/favorite.api'; // 🌟 추가
import './Favorites.scss';

const DEFAULT_CATEGORIES = [
  { id: 'all',          name: '전체',       icon: '📋', color: 'all' },
  { id: 'date',         name: '데이트할곳', icon: '💑', color: 'date' },
  { id: 'restaurant',   name: '나만의 맛집', icon: '🍽️', color: 'restaurant' },
  { id: 'cafe',         name: '느좋 카페',  icon: '☕', color: 'cafe' },
  { id: 'parking',      name: '주차장',     icon: '🅿️', color: 'parking' },
  { id: 'uncategorized', name: '미분류',    icon: '📁', color: 'uncategorized' },
];

const Favorites = () => {
  const navigate = useNavigate();

  const [favorites, setFavorites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showManageModal, setShowManageModal] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState(null);

  // 커스텀 카테고리 목록은 UI 정보이므로 로컬 스토리지 유지
  const [customCategories, setCustomCategories] = useState(() => {
    try {
      const saved = localStorage.getItem('locapick_custom_categories');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('📌');
  const dropdownRef = useRef(null);

  const allCategories = [
    ...DEFAULT_CATEGORIES.slice(0, -1),  
    ...customCategories,                   
    DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1], 
  ];

  const fetchFavorites = async () => {
    try {
      const data = await getMyFavorites();
      setFavorites(data);
    } catch (error) {
      console.error('즐겨찾기를 불러오는 중 오류 발생:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  useEffect(() => {
    localStorage.setItem('locapick_custom_categories', JSON.stringify(customCategories));
  }, [customCategories]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 🌟 핵심: 카테고리 변경 시 백엔드 DB 연동!
  const handleCategoryChange = async (favId, categoryId) => {
    try {
      await updateFavoriteCategory(favId, categoryId);
      // 성공하면 로컬 state도 업데이트하여 화면 즉시 반영
      setFavorites(prev => prev.map(fav => fav.id === favId ? { ...fav, category: categoryId } : fav));
    } catch (error) {
      alert("카테고리 변경에 실패했습니다.");
    } finally {
      setOpenDropdownId(null);
    }
  };

  const handleRemoveFavorite = async (fav) => {
    if (!window.confirm(`"${fav.placeName}" 즐겨찾기를 해제하시겠습니까?`)) return;
    try {
      await toggleFavorite({ name: fav.placeName, lat: fav.lat, lng: fav.lng, address: fav.address });
      setFavorites(prev => prev.filter(f => f.id !== fav.id));
    } catch (error) {
      alert('즐겨찾기 해제 중 오류가 발생했습니다.');
    }
  };

  const handleNavigateToMap = (fav) => {
    navigate('/app', { state: { destination: fav } });
  };

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (allCategories.some(c => c.name === trimmed)) return alert('이미 같은 이름의 카테고리가 있습니다.');

    setCustomCategories(prev => [...prev, { id: `custom_${Date.now()}`, name: trimmed, icon: newCategoryIcon || '📌', color: 'uncategorized' }]);
    setNewCategoryName(''); setNewCategoryIcon('📌');
  };

  const handleDeleteCategory = async (catId) => {
    if (!window.confirm('이 카테고리를 삭제하시겠습니까?\n해당 카테고리의 장소들은 미분류로 이동합니다.')) return;
    
    // DB에서 이 카테고리를 쓰던 애들을 모두 '미분류'로 업데이트
    const affectedFavs = favorites.filter(fav => fav.category === catId);
    for (const fav of affectedFavs) {
      await handleCategoryChange(fav.id, 'uncategorized');
    }
    setCustomCategories(prev => prev.filter(c => c.id !== catId));
  };

  const getCategoryCount = (catId) => {
    if (catId === 'all') return favorites.length;
    return favorites.filter(fav => (fav.category || 'uncategorized') === catId).length;
  };

  const filteredFavorites = favorites
    .filter(fav => {
      const favCat = fav.category || 'uncategorized';
      if (activeCategory !== 'all' && favCat !== activeCategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return fav.placeName?.toLowerCase().includes(q) || fav.address?.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      return (a.placeName || '').localeCompare(b.placeName || '');
    });

  const getCategoryInfo = (catId) => {
    return allCategories.find(c => c.id === catId) || { id: catId, name: '미분류', icon: '📁', color: 'uncategorized' };
  };

  // 주차 뱃지 렌더링 헬퍼 함수
  const renderParkingBadge = (status) => {
    if (status === 0) return <span className="parking-badge status-0">🟢 주차: 여유</span>;
    if (status === 1) return <span className="parking-badge status-1">🟡 주차: 보통</span>;
    if (status === 2) return <span className="parking-badge status-2">🔴 주차: 혼잡</span>;
    return null;
  };

  if (isLoading) return <main className="page app-bg"><div className="container favorites-page"><p style={{ paddingTop: '40px', color: '#999', textAlign: 'center' }}>즐겨찾기를 불러오는 중...</p></div></main>;

  return (
    <main className="page app-bg">
      <div className="container favorites-page">
        <div className="favorites-header">
          <h1 className="favorites-header__title"><span className="icon">⭐</span>내 즐겨찾기</h1>
          <p className="favorites-header__desc">자주 가는 장소를 카테고리별로 관리하세요</p>
        </div>

        <div className="category-tabs">
          {allCategories.map(cat => (
            <button key={cat.id} className={`category-tab ${activeCategory === cat.id ? 'category-tab--active' : ''}`} onClick={() => setActiveCategory(cat.id)}>
              <span className="tab-icon">{cat.icon}</span>{cat.name}<span className="tab-count">{getCategoryCount(cat.id)}</span>
            </button>
          ))}
          <button className="category-manage-btn" onClick={() => setShowManageModal(true)}>＋ 카테고리 관리</button>
        </div>

        <div className="favorites-toolbar">
          <div className="favorites-search">
            <span className="search-icon">🔍</span>
            <input type="text" className="input" placeholder="장소명 또는 주소로 검색..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div className="favorites-sort">
            <span className="sort-label">정렬:</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="newest">최신순</option><option value="oldest">오래된순</option><option value="name">이름순</option>
            </select>
          </div>
        </div>

        <div className="favorites-count">총 <strong>{filteredFavorites.length}</strong>개의 즐겨찾기</div>

        {favorites.length === 0 ? (
          <div className="favorites-empty">
            <div className="favorites-empty__icon">⭐</div><h2 className="favorites-empty__title">아직 즐겨찾기가 없어요</h2>
            <p className="favorites-empty__desc">홈 화면에서 장소를 검색하고 ☆ 버튼을 눌러 즐겨찾기에 추가해보세요!</p>
          </div>
        ) : filteredFavorites.length === 0 ? (
          <div className="favorites-empty">
            <div className="favorites-empty__icon">🔍</div><h2 className="favorites-empty__title">검색 결과가 없어요</h2>
            <p className="favorites-empty__desc">다른 카테고리를 선택하거나 검색어를 변경해보세요.</p>
          </div>
        ) : (
          <div className="favorites-grid">
            {filteredFavorites.map(fav => {
              const catId = fav.category || 'uncategorized';
              const catInfo = getCategoryInfo(catId);
              const isDropdownOpen = openDropdownId === fav.id;

              return (
                <div key={fav.id} className="fav-card" ref={isDropdownOpen ? dropdownRef : null}>
                  <div className="fav-card__header">
                    <div className="fav-card__name">
                      {fav.placeName}
                      {/* 🌟 주차 뱃지 추가! */}
                      {renderParkingBadge(fav.parkingStatus)}
                    </div>
                    <div className="fav-card__actions">
                      <button className="fav-card__action-btn" title="카테고리 변경" onClick={() => setOpenDropdownId(isDropdownOpen ? null : fav.id)}>📂</button>
                      <button className="fav-card__action-btn fav-card__action-btn--delete" title="즐겨찾기 해제" onClick={() => handleRemoveFavorite(fav)}>✕</button>
                    </div>
                  </div>

                  {isDropdownOpen && (
                    <div className="category-dropdown">
                      {allCategories.filter(c => c.id !== 'all').map(cat => (
                        <button key={cat.id} className={`category-dropdown__item ${catId === cat.id ? 'category-dropdown__item--active' : ''}`} onClick={() => handleCategoryChange(fav.id, cat.id)}>
                          <span className="item-icon">{cat.icon}</span>{cat.name}{catId === cat.id && ' ✓'}
                        </button>
                      ))}
                    </div>
                  )}

                  <p className="fav-card__address"><span className="pin-icon">📍</span>{fav.address || '주소 정보 없음'}</p>

                  <div className="fav-card__footer">
                    <button className={`category-badge category-badge--${catInfo.color}`} onClick={() => setOpenDropdownId(isDropdownOpen ? null : fav.id)}>
                      {catInfo.icon} {catInfo.name}
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="fav-card__date">{new Date(fav.createdAt).toLocaleDateString('ko-KR')}</span>
                      <button className="fav-card__nav-btn" onClick={() => handleNavigateToMap(fav)}>🗺️ 길찾기</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 모달 코드는 기존과 동일하게 유지 */}
        {showManageModal && (
          <div className="modal-overlay" onClick={() => setShowManageModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>📂 카테고리 관리</h3><button className="modal-close" onClick={() => setShowManageModal(false)}>✕</button>
              </div>
              <div className="modal-body">
                <div className="add-category-form">
                  <select value={newCategoryIcon} onChange={(e) => setNewCategoryIcon(e.target.value)} style={{ width: '60px', height: '40px', borderRadius: '12px', border: '1.5px solid #e5e5e5', textAlign: 'center', fontSize: '18px', cursor: 'pointer' }}>
                    <option value="📌">📌</option><option value="🏠">🏠</option><option value="🎵">🎵</option><option value="🛍️">🛍️</option><option value="🏃">🏃</option><option value="📚">📚</option><option value="🎮">🎮</option><option value="🌳">🌳</option><option value="🍰">🍰</option><option value="🐶">🐶</option>
                  </select>
                  <input type="text" className="input" placeholder="새 카테고리 이름" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()} maxLength={10} />
                  <button className="add-btn" onClick={handleAddCategory} disabled={!newCategoryName.trim()}>추가</button>
                </div>
                <div className="category-list">
                  {allCategories.filter(c => c.id !== 'all').map(cat => {
                    const isDefault = DEFAULT_CATEGORIES.some(d => d.id === cat.id);
                    return (
                      <div key={cat.id} className={`category-list-item ${isDefault ? 'category-list-item--default' : ''}`}>
                        <span className="item-icon">{cat.icon}</span><span className="item-name">{cat.name}</span><span className="item-count">{getCategoryCount(cat.id)}개</span>
                        {!isDefault && <button className="item-delete" onClick={() => handleDeleteCategory(cat.id)}>✕</button>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default Favorites;