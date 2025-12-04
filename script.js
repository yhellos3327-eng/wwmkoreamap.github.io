const updateHistory = [
    {
        version: "v0.9.2",
        date: "2025-12-05",
        content: [
            "카테고리별 필터링 및 검색 기능 추가",
            "위치 공유 및 즐겨찾기, 완료 기능 구현",
        ]
    },
    {
        version: "v0.9.0",
        date: "2025-12-05",
        content: [
            "기본 맵 타일 및 마커 데이터 연동"
        ]
    }
];

const koDict = {};
if (typeof rawTranslations !== 'undefined') {
    rawTranslations.forEach(item => {
        item.keys.forEach(key => {
            koDict[key] = item.value;
            koDict[key.trim()] = item.value;
        });
    });
}

const usefulLinks = [
    { title: "공식 홈페이지", url: "https://www.wherewindsmeetgame.com/kr/index.html" },
    { title: "기반 위키 (Wiki)", url: "https://wherewindsmeet.wiki.fextralife.com/" },
    { title: "연운: 한국 위키", url: "https://wwm.tips/" },
    { title: "연운 공식 디스코드", url: "https://discord.gg/wherewindsmeet" },
    { title: "연운 한국 디스코드", url: "https://discord.gg/wherewindsmeetkr" },
    { title: "아카라이브 연운 채널", url: "https://arca.live/b/wherewindsmeet" },
    { title: "디씨 연운 갤러리", url: "https://gall.dcinside.com/wherewindsmeets" },
    { title: "디씨 개봉(연운) 갤러리", url: "https://gall.dcinside.com/dusdns" },
];

const t = (key) => {
    if (!key) return "";
    const trimmedKey = key.trim();
    return koDict[trimmedKey] || key;
}

let targetArrowMarker = null;
let currentModalList = [];

document.addEventListener('DOMContentLoaded', () => {
    if (typeof mapData === 'undefined' || !mapData.categories || !mapData.items) {
        console.error("data.js 파일 오류");
        alert("데이터 로드 실패. data.js를 확인하세요.");
        return;
    }

    const validCategories = mapData.categories.filter(cat => {
        return cat.image && cat.image.trim() !== "";
    });

    if (typeof itemOverrides !== 'undefined') {
        mapData.items.forEach(item => {
            if (itemOverrides[item.id]) {
                if (itemOverrides[item.id].name) item.name = itemOverrides[item.id].name;
                if (itemOverrides[item.id].description) item.description = itemOverrides[item.id].description;
            }
        });
    }

    if (typeof categoryItemTranslations !== 'undefined') {
        mapData.items.forEach(item => {
            if (categoryItemTranslations[item.category]) {
                const transData = categoryItemTranslations[item.category][item.id];
                if (transData) {
                    if (transData.name) item.name = transData.name;
                    if (transData.description) item.description = transData.description;
                }
            }
        });
    }

    const itemsByCategory = {};
    mapData.items.forEach(item => {
        if (!itemsByCategory[item.category]) {
            itemsByCategory[item.category] = [];
        }
        itemsByCategory[item.category].push(item);
    });
    for (const key in itemsByCategory) {
        itemsByCategory[key].sort((a, b) => a.name.localeCompare(b.name));
    }

    const boundaryStones = mapData.items.filter(item =>
        item.category === "BoundaryStones" || item.category === "Boundary Stones"
    );

    function getNearestRegionName(targetX, targetY) {
        if (boundaryStones.length === 0) return "알 수 없음";
        let minDist = Infinity;
        let nearestName = "";
        const tx = parseFloat(targetX);
        const ty = parseFloat(targetY);

        boundaryStones.forEach(bs => {
            const bx = parseFloat(bs.x);
            const by = parseFloat(bs.y);
            const dist = Math.sqrt(Math.pow(tx - bx, 2) + Math.pow(ty - by, 2));
            if (dist < minDist) {
                minDist = dist;
                nearestName = bs.name;
            }
        });
        return nearestName ? t(nearestName) : "알 수 없음";
    }

    const map = L.map('map', {
        crs: L.CRS.Simple,
        minZoom: 3,
        maxZoom: 7,
        zoomControl: false,
        attributionControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('./tiles/{z}/{x}/{y}.jpg', {
        minZoom: 3,
        maxZoom: 7,
        tileSize: 256,
        noWrap: true,
        tms: false,
        errorTileUrl: './tiles/empty.jpg',
    }).addTo(map);

    const mapBounds = [[30, 0], [-160, 140]];
    map.setMaxBounds(mapBounds);
    map.fitBounds(mapBounds);

    const layerGroups = {};
    const allMarkers = [];

    const activeCategoryIds = new Set();
    const activeRegionNames = new Set();
    const uniqueRegions = new Set();

    let favorites = JSON.parse(localStorage.getItem('wwm_favorites')) || [];
    let completedList = JSON.parse(localStorage.getItem('wwm_completed')) || [];

    validCategories.forEach(cat => {
        if (cat.loadDefault) activeCategoryIds.add(cat.id);
    });

    mapData.items.forEach(item => {
        const lat = parseFloat(item.x);
        const lng = parseFloat(item.y);
        const regionName = getNearestRegionName(lat, lng);

        if (regionName) uniqueRegions.add(regionName);

        const iconUrl = item.image ? item.image : './icons/marker.png';
        const w = item.imageSizeW || 30;
        const h = item.imageSizeH || 30;
        const isCompleted = completedList.includes(item.id);
        const iconClass = isCompleted ? 'game-marker-icon completed-marker' : 'game-marker-icon';

        const customIcon = L.icon({
            iconUrl: iconUrl,
            iconSize: [w, h],
            iconAnchor: [w / 2, h / 2],
            popupAnchor: [0, -h / 2],
            className: iconClass
        });

        const marker = L.marker([lat, lng], {
            icon: customIcon,
            title: item.name,
            alt: item.category,
            itemId: item.id
        });

        marker.bindPopup(() => createPopupHtml(item, lat, lng, regionName));

        allMarkers.push({
            id: item.id,
            marker: marker,
            name: item.name.toLowerCase(),
            desc: (item.description || '').toLowerCase(),
            category: item.category,
            region: regionName
        });
    });

    uniqueRegions.forEach(r => activeRegionNames.add(r));

    function setAllCategories(isActive) {
        const catBtns = document.querySelectorAll('#category-list .cat-btn');
        activeCategoryIds.clear();

        if (isActive) {
            validCategories.forEach(c => activeCategoryIds.add(c.id));
            catBtns.forEach(btn => btn.classList.add('active'));
        } else {
            catBtns.forEach(btn => btn.classList.remove('active'));
        }
        updateToggleButtonsState();
        updateMapVisibility();
    }

    function setAllRegions(isActive) {
        const regBtns = document.querySelectorAll('#region-list .cat-btn');
        activeRegionNames.clear();

        if (isActive) {
            uniqueRegions.forEach(r => activeRegionNames.add(r));
            regBtns.forEach(btn => btn.classList.add('active'));
        } else {
            regBtns.forEach(btn => btn.classList.remove('active'));
        }
        updateToggleButtonsState();
        updateMapVisibility();
    }

    const categoryListEl = document.getElementById('category-list');
    validCategories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = activeCategoryIds.has(cat.id) ? 'cat-btn active' : 'cat-btn';
        btn.dataset.id = cat.id;
        btn.innerHTML = `<img src="${cat.image}" alt=""> ${t(cat.name)}`;

        btn.addEventListener('click', () => {
            if (activeCategoryIds.has(cat.id)) {
                activeCategoryIds.delete(cat.id);
                btn.classList.remove('active');
            } else {
                activeCategoryIds.add(cat.id);
                btn.classList.add('active');
                if (activeRegionNames.size === 0) {
                    setAllRegions(true);
                }
            }
            updateMapVisibility();
            updateToggleButtonsState();
        });
        categoryListEl.appendChild(btn);
    });

    const regionListEl = document.getElementById('region-list');
    const sortedRegions = Array.from(uniqueRegions).sort();

    sortedRegions.forEach(region => {
        const btn = document.createElement('button');
        btn.className = 'cat-btn active';
        btn.dataset.region = region;
        btn.innerHTML = `📍 ${region}`;

        btn.addEventListener('click', () => {
            if (activeRegionNames.has(region)) {
                activeRegionNames.delete(region);
                btn.classList.remove('active');
            } else {
                activeRegionNames.add(region);
                btn.classList.add('active');

                if (activeCategoryIds.size === 0) {
                    setAllCategories(true);
                }
            }
            updateMapVisibility();
            updateToggleButtonsState();
        });
        regionListEl.appendChild(btn);
    });

    function updateMapVisibility() {
        allMarkers.forEach(m => {
            const isCatActive = activeCategoryIds.has(m.category);
            const isRegActive = activeRegionNames.has(m.region);

            if (isCatActive && isRegActive) {
                if (!map.hasLayer(m.marker)) {
                    map.addLayer(m.marker);
                }
            } else {
                if (map.hasLayer(m.marker)) {
                    map.removeLayer(m.marker);
                }
            }
        });
    }

    const createPopupHtml = (item, lat, lng, regionName) => {
        const isFav = favorites.includes(item.id);
        const isCompleted = completedList.includes(item.id);

        const favClass = isFav ? 'active' : '';
        const favText = isFav ? '★' : '☆';
        const compClass = isCompleted ? 'active' : '';
        const compText = isCompleted ? '✔️ 완료됨' : '완료 체크';

        let relatedHtml = '';
        const relatedList = itemsByCategory[item.category]
            ? itemsByCategory[item.category].filter(i => i.id !== item.id)
            : [];

        if (relatedList.length > 0) {
            const limit = 5;
            let listItems = '';
            relatedList.forEach((r, index) => {
                const hiddenClass = index >= limit ? 'hidden' : '';
                const rReg = getNearestRegionName(r.x, r.y);
                const rRegHtml = rReg ? `<span class="related-region">(${rReg})</span>` : '';
                listItems += `<li class="related-item ${hiddenClass}" onclick="jumpToId(${r.id})">${t(r.name)} ${rRegHtml}</li>`;
            });

            let expandBtn = '';
            if (relatedList.length > limit) {
                const count = relatedList.length - limit;
                expandBtn = `<button class="btn-expand" onclick="expandRelated(this)">▼ 더보기 (${count}+)</button>`;
            }

            relatedHtml = `
                <div class="popup-related">
                    <div class="popup-related-header">
                        <h5>관련 ${t(item.category)} (${relatedList.length})
                        <button class="btn-search-modal" onclick="openRelatedModal('${item.category}')" title="전체 목록 검색">🔍</button></h5>
                    </div>
                    <ul class="related-list">${listItems}</ul>
                    ${expandBtn}
                </div>
            `;
        }

        return `
            <div class="popup-container" data-id="${item.id}">
                <div class="popup-header">
                    ${item.image ? `<img src="${item.image}" class="popup-icon">` : ''}
                    <h4>${t(item.name)}</h4>
                </div>
                <div class="popup-body">
                    ${item.description ? `<p>${item.description}</p>` : '<p class="no-desc">설명 없음</p>'}
                </div>
                ${relatedHtml}
                <div class="popup-actions">
                    <button class="action-btn btn-fav ${favClass}" onclick="toggleFavorite(${item.id})" title="즐겨찾기">${favText}</button>
                    <button class="action-btn btn-complete ${compClass}" onclick="toggleCompleted(${item.id})" title="완료 상태로 표시">${compText}</button>
                    <button class="action-btn btn-share" onclick="shareLocation(${item.id}, ${lat}, ${lng})" title="위치 공유">📤</button>
                </div>
                <div class="popup-footer">
                    <span class="badge">${t(item.category)}</span>
                    <span class="badge" style="margin-left:5px;">${regionName}</span>
                </div>
            </div>
        `;
    };

    const btnToggleCat = document.getElementById('btn-toggle-cat');
    const btnToggleReg = document.getElementById('btn-toggle-reg');

    if (btnToggleCat) {
        btnToggleCat.addEventListener('click', () => {
            const allActive = activeCategoryIds.size === validCategories.length;
            setAllCategories(!allActive);
        });
    }

    if (btnToggleReg) {
        btnToggleReg.addEventListener('click', () => {
            const allActive = activeRegionNames.size === uniqueRegions.size;
            setAllRegions(!allActive);
        });
    }

    function updateToggleButtonsState() {
        if (btnToggleCat) {
            const allCatActive = activeCategoryIds.size === validCategories.length;
            btnToggleCat.innerHTML = allCatActive ? '👁️ 모두 끄기' : '👁️‍🗨️ 모두 켜기';
            btnToggleCat.classList.toggle('off', !allCatActive);
        }
        if (btnToggleReg) {
            const allRegActive = activeRegionNames.size === uniqueRegions.size;
            btnToggleReg.innerHTML = allRegActive ? '👁️ 모두 끄기' : '👁️‍🗨️ 모두 켜기';
            btnToggleReg.classList.toggle('off', !allRegActive);
        }
    }
    window.toggleCompleted = (id) => {
        const index = completedList.indexOf(id);
        const target = allMarkers.find(m => m.id === id);

        if (index === -1) {
            completedList.push(id);
            if (target) target.marker._icon.classList.add('completed-marker');
        } else {
            completedList.splice(index, 1);
            if (target) target.marker._icon.classList.remove('completed-marker');
        }
        localStorage.setItem('wwm_completed', JSON.stringify(completedList));

        if (target) {
            const item = mapData.items.find(i => i.id === id);
            const lat = target.marker.getLatLng().lat;
            const lng = target.marker.getLatLng().lng;
            target.marker.setPopupContent(createPopupHtml(item, lat, lng, target.region));
        }
    };

    window.toggleFavorite = (id) => {
        const index = favorites.indexOf(id);
        const target = allMarkers.find(m => m.id === id);

        if (index === -1) {
            favorites.push(id);
        } else {
            favorites.splice(index, 1);
        }
        localStorage.setItem('wwm_favorites', JSON.stringify(favorites));
        renderFavorites();

        if (target) {
            const item = mapData.items.find(i => i.id === id);
            const lat = target.marker.getLatLng().lat;
            const lng = target.marker.getLatLng().lng;
            target.marker.setPopupContent(createPopupHtml(item, lat, lng, target.region));
        }
    };

    window.shareLocation = (id, lat, lng) => {
        const baseUrl = window.location.href.split('?')[0];
        const shareUrl = `${baseUrl}?id=${id}&lat=${lat}&lng=${lng}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
            alert('링크가 복사되었습니다!\n' + shareUrl);
        }).catch(err => prompt("링크 복사:", shareUrl));
    };

    window.jumpToId = (id) => {
        const target = allMarkers.find(m => m.id === id);
        if (target) {
            if (!activeCategoryIds.has(target.category)) {
                activeCategoryIds.add(target.category);
                document.querySelector(`#category-list .cat-btn[data-id="${target.category}"]`)?.classList.add('active');
            }
            if (!activeRegionNames.has(target.region)) {
                activeRegionNames.add(target.region);

                const regBtns = document.querySelectorAll('#region-list .cat-btn');
                regBtns.forEach(btn => {
                    if (btn.dataset.region === target.region) btn.classList.add('active');
                });
            }
            updateMapVisibility();
            updateToggleButtonsState();

            moveToLocation(target.marker.getLatLng(), target.marker);
        }
    };

    window.expandRelated = (btn) => {
        const list = btn.previousElementSibling;
        if (list) {
            list.querySelectorAll('.related-item.hidden').forEach(item => item.classList.remove('hidden'));
        }
        btn.remove();
    };

    window.openRelatedModal = (catId) => {
        const modal = document.getElementById('related-modal');
        const title = document.getElementById('modal-title');
        const listEl = document.getElementById('modal-list');
        const input = document.getElementById('modal-search-input');

        title.innerText = `${t(catId)} 전체 목록`;
        input.value = '';
        listEl.innerHTML = '';

        currentModalList = allMarkers.filter(m => m.category === catId);
        renderModalList(currentModalList);
        modal.classList.remove('hidden');
        input.focus();
    };

    window.closeModal = () => {
        document.getElementById('related-modal').classList.add('hidden');
    };

    window.renderModalList = (items) => {
        const listEl = document.getElementById('modal-list');
        listEl.innerHTML = '';

        if (items.length === 0) {
            listEl.innerHTML = '<li style="padding:15px; text-align:center; color:#666;">결과가 없습니다.</li>';
            return;
        }
        const currentCompleted = JSON.parse(localStorage.getItem('wwm_completed')) || [];

        items.forEach(m => {
            const isDone = currentCompleted.includes(m.id);
            const statusHtml = isDone ? '<span class="modal-item-status">✔️ 완료</span>' : '';
            const li = document.createElement('li');
            li.className = 'modal-item';
            li.innerHTML = `
                <div style="display:flex; flex-direction:column;">
                    <span class="modal-item-name">${t(m.name)}</span>
                    <span style="font-size:0.8rem; color:#888;">${m.region}</span>
                </div>
                ${statusHtml}
            `;
            li.onclick = () => {
                jumpToId(m.id);
                closeModal();
            };
            listEl.appendChild(li);
        });
    }

    function renderFavorites() {
        const favListEl = document.getElementById('favorite-list');
        favListEl.innerHTML = '';
        if (favorites.length === 0) {
            favListEl.innerHTML = '<p class="empty-msg">즐겨찾기한 항목이 없습니다.</p>';
            return;
        }
        favorites.forEach(favId => {
            const item = mapData.items.find(i => i.id === favId);
            if (item) {
                const div = document.createElement('div');
                div.className = 'fav-item';
                const rReg = getNearestRegionName(item.x, item.y);
                div.innerHTML = `<b>${t(item.name)}</b> <span style="font-size:0.8rem; color:#aaa;">(${rReg})</span><br><small>${t(item.category)}</small>`;
                div.addEventListener('click', () => {
                    jumpToId(item.id);
                    if (window.innerWidth <= 768) toggleSidebar('close');
                });
                favListEl.appendChild(div);
            }
        });
    }

    function renderLinks() {
        const linkListEl = document.getElementById('link-list');
        linkListEl.innerHTML = '';
        usefulLinks.forEach(link => {
            const a = document.createElement('a');
            a.href = link.url;
            a.target = "_blank";
            a.className = "link-item";
            a.innerHTML = `🔗 ${link.title}`;
            linkListEl.appendChild(a);
        });
    }

    function renderUpdates() {
        const updateListEl = document.getElementById('update-list');
        if (!updateListEl) return;
        updateListEl.innerHTML = '';
        updateHistory.forEach((update, index) => {
            const isLatest = index === 0 ? 'latest' : '';
            const div = document.createElement('div');
            div.className = `update-item ${isLatest}`;
            const contentHtml = update.content.map(line => `<li>${line}</li>`).join('');
            div.innerHTML = `
                <div class="update-header">
                    <span class="update-version">${update.version}</span>
                    <span class="update-date">${update.date}</span>
                </div>
                <div class="update-content"><ul>${contentHtml}</ul></div>
            `;
            updateListEl.appendChild(div);
        });
    }

    function moveToLocation(latlng, marker = null) {
        map.setView(latlng, 6, { animate: true });
        if (marker) marker.openPopup();
    }

    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.trim().toLowerCase();
        if (term === '') {
            allMarkers.forEach(m => m.marker.setOpacity(1));
            return;
        }
        allMarkers.forEach(m => {
            const isMatch = m.name.includes(term) || m.desc.includes(term);
            m.marker.setOpacity(isMatch ? 1 : 0.1);
        });
    });

    document.getElementById('modal-search-input').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = currentModalList.filter(m => m.name.includes(term));
        renderModalList(filtered);
    });
    document.getElementById('related-modal').addEventListener('click', (e) => {
        if (e.target.id === 'related-modal') closeModal();
    });

    const tabs = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const targetId = tab.getAttribute('data-tab');
            tabContents.forEach(c => {
                c.classList.remove('active');
                if (c.id === targetId) c.classList.add('active');
            });
        });
    });

    const sidebar = document.getElementById('sidebar');
    const openBtn = document.getElementById('open-sidebar');
    const closeBtn = document.getElementById('toggle-sidebar');

    function toggleSidebar(action) {
        const isMobile = window.innerWidth <= 768;
        if (action === 'open') {
            if (isMobile) sidebar.classList.add('open');
            else {
                sidebar.classList.remove('collapsed');
                setTimeout(() => { map.invalidateSize(); }, 300);
            }
        } else {
            if (isMobile) sidebar.classList.remove('open');
            else {
                sidebar.classList.add('collapsed');
                setTimeout(() => { map.invalidateSize(); }, 300);
            }
        }
    }
    if (openBtn) openBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleSidebar('open'); });
    if (closeBtn) closeBtn.addEventListener('click', () => toggleSidebar('close'));
    map.on('click', () => { if (window.innerWidth <= 768) toggleSidebar('close'); });
    window.addEventListener('resize', () => { map.invalidateSize(); });

    updateMapVisibility();
    renderFavorites();
    renderLinks();
    renderUpdates();

    const urlParams = new URLSearchParams(window.location.search);
    const sharedId = parseInt(urlParams.get('id'));
    const sharedLat = parseFloat(urlParams.get('lat'));
    const sharedLng = parseFloat(urlParams.get('lng'));

    if (sharedId && !isNaN(sharedLat) && !isNaN(sharedLng)) {
        setTimeout(() => {
            jumpToId(sharedId);
        }, 500);
    }
});