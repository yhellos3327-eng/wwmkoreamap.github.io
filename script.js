const koDict = {
    "Chest": "보물상자",
    "NPC": "NPC",
    "Teleport": "순간이동",
    "Shop": "상점",
    "Bounty": "현상금",
    "Quest": "퀘스트",
    "World Boss": "필드 보스",
    "Meditation": "명상",
    "Viewpoint": "뷰포인트",
    "Archive": "기록",
    "Cave": "동굴",
    "Puzzle": "퍼즐",
    "Gathering": "채집",
    "Fishing": "낚시",
    "Cooking": "요리",
    "Crafting": "제작",
    "Book": "서적",
    "Song": "노래",
    "Boundary Stones": "순간 이동",
    "Bathhouse": "사우나",
    "CampaignQuest": "메인 퀘스트",
    "SideStory": "서브 스토리",
    "OddityCollection": "기물 수집",
    "DivinecraftDungeon": "신기 던전",
    "RestrictedZones": "출입 금지 구역",
    "MarketOffice": "관청",
    "ShadowPuppetStall": "그림자 인형극",
    "MusicalDance": "가무",
    "Pitch Pot": "투호",
    "Chess Match": "상기",
    "Bell of Demoncalm": "퇴마의 종",
    "Show All": "모두 보기",
    "Show Completed": "완료된 항목 보기",
    "Share": "공유",
    "Favorite": "즐겨찾기",
    "Wayfarer": "여행자",
    "Horse Merchant": "마구간지기",
    "Crafting Bench": "제작대",
    "Fishing Contest": "낚시 대회",
    "Archery Competition": "궁술 대회",
    "Exploration Challenge": "탐험 도전",
    "Meow Meow Temple": "묘묘 사원",
    "Meow Meow's Treasure": "묘묘의 보물",
    "Wrestling": "씨름"
};

const usefulLinks = [
    { title: "공식 홈페이지", url: "https://www.wherewindsmeetgame.com/kr/index.html" },
    { title: "기반 위키 (Wiki)", url: "https://wherewindsmeet.wiki.fextralife.com/" },
    { title: "연운: 한국 위키", url: "https://wwm.tips/" },
    { title: "연운 공식 디스코드", url: "https://discord.gg/wherewindsmeet" },
    { title: "연운 한국 디스코드", url: "https://discord.gg/wherewindsmeetkr" },
    { title: "아카라이브 연운 채널", url: "https://arca.live/b/wherewindsmeet" },
    { title: "디씨 연운 갤러리", url: "https://gall.dcinside.com/mgallery/board/lists?id=dusdns" },
    { title: "디씨 개봉(연운) 갤러리", url: "https://arca.live/b/wherewindsmeet" },
];

const t = (key) => {
    if (!key) return "";
    const trimmedKey = key.trim();
    return koDict[trimmedKey] || key;
}

let targetArrowMarker = null;

document.addEventListener('DOMContentLoaded', () => {
    if (typeof mapData === 'undefined' || !mapData.categories || !mapData.items) {
        console.error("data.js 파일 오류");
        alert("데이터 로드 실패. data.js를 확인하세요.");
        return;
    }

    const validCategories = mapData.categories.filter(cat => {
        return cat.image && cat.image.trim() !== "";
    });

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

    console.log(`Loaded Categories: ${validCategories.length}`);

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
    let favorites = JSON.parse(localStorage.getItem('wwm_favorites')) || [];

    const categoryListEl = document.getElementById('category-list');

    validCategories.forEach(cat => {
        layerGroups[cat.id] = L.layerGroup();
        if (cat.loadDefault) {
            layerGroups[cat.id].addTo(map);
        }

        const btn = document.createElement('button');
        btn.className = cat.loadDefault ? 'cat-btn active' : 'cat-btn';
        btn.innerHTML = `<img src="${cat.image}" alt=""> ${t(cat.name)}`;

        btn.addEventListener('click', () => {
            const isActive = btn.classList.toggle('active');
            if (isActive) {
                map.addLayer(layerGroups[cat.id]);
            } else {
                map.removeLayer(layerGroups[cat.id]);
            }
        });

        categoryListEl.appendChild(btn);
    });

    mapData.items.forEach(item => {
        const catId = item.category;

        if (layerGroups[catId]) {
            const iconUrl = item.image ? item.image : './icons/marker.png';
            const w = item.imageSizeW || 30;
            const h = item.imageSizeH || 30;

            const customIcon = L.icon({
                iconUrl: iconUrl,
                iconSize: [w, h],
                iconAnchor: [w / 2, h / 2],
                popupAnchor: [0, -h / 2],
                className: 'game-marker-icon'
            });

            const lat = parseFloat(item.x);
            const lng = parseFloat(item.y);

            const marker = L.marker([lat, lng], {
                icon: customIcon,
                title: item.name,
                alt: item.category,
                itemId: item.id
            });

            let relatedHtml = '';
            const relatedList = itemsByCategory[catId]
                ? itemsByCategory[catId].filter(i => i.id !== item.id).slice(0, 3)
                : [];

            if (relatedList.length > 0) {
                relatedHtml = `
                    <div class="popup-related">
                        <h5>관련 ${t(catId)}</h5>
                        <ul class="related-list">
                            ${relatedList.map(r =>
                    `<li class="related-item" onclick="jumpToId(${r.id})">${t(r.name)}</li>`
                ).join('')}
                        </ul>
                    </div>
                `;
            }

            const isFav = favorites.includes(item.id);
            const favClass = isFav ? 'active' : '';
            const favText = isFav ? '★ 즐겨찾기 됨' : '☆ 즐겨찾기';

            const popupContent = `
                <div class="popup-container" data-id="${item.id}">
                    <div class="popup-header">
                        ${item.image ? `<img src="${item.image}" class="popup-icon">` : ''}
                        <h4>${t(item.name)}</h4>
                    </div>
                    <div class="popup-body">
                        ${item.description ? `<p>${item.description}</p>` : '<p class="no-desc">설명 없음</p>'}
                    </div>
                    ${relatedHtml} <div class="popup-actions">
                        <button class="action-btn btn-fav ${favClass}" onclick="toggleFavorite(${item.id})">${favText}</button>
                        <button class="action-btn btn-share" onclick="shareLocation(${item.id}, ${lat}, ${lng})">📤 ${t('Share')}</button>
                    </div>
                    <div class="popup-footer">
                        <span class="badge">${t(item.category)}</span>
                    </div>
                </div>
            `;
            marker.bindPopup(popupContent);
            layerGroups[catId].addLayer(marker);

            allMarkers.push({
                id: item.id,
                marker: marker,
                name: item.name.toLowerCase(),
                desc: (item.description || '').toLowerCase(),
                category: catId,
                pageLink: item.pageLink || item.hasPageLink ? (item.pageLink || '#') : null
            });
        }
    });

    window.jumpToId = (id) => {
        const target = allMarkers.find(m => m.id === id);
        if (target) {
            moveToLocation(target.marker.getLatLng(), target.marker);
        }
    };

    window.toggleFavorite = (id) => {
        const index = favorites.indexOf(id);
        const btn = document.querySelector(`.popup-container[data-id="${id}"] .btn-fav`);

        if (index === -1) {
            favorites.push(id);
            if (btn) {
                btn.classList.add('active');
                btn.innerText = '★ 즐겨찾기 됨';
            }
        } else {
            favorites.splice(index, 1);
            if (btn) {
                btn.classList.remove('active');
                btn.innerText = '☆ 즐겨찾기';
            }
        }
        localStorage.setItem('wwm_favorites', JSON.stringify(favorites));
        renderFavorites();
    };

    window.shareLocation = (id, lat, lng) => {
        const baseUrl = window.location.href.split('?')[0];
        const shareUrl = `${baseUrl}?id=${id}&lat=${lat}&lng=${lng}`;

        navigator.clipboard.writeText(shareUrl).then(() => {
            alert('링크가 복사되었습니다!\n' + shareUrl);
        }).catch(err => {
            prompt("링크 복사:", shareUrl);
        });
    };

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
                div.innerHTML = `<b>${t(item.name)}</b><br><small>${t(item.category)}</small>`;
                div.addEventListener('click', () => {
                    const target = allMarkers.find(m => m.id === item.id);
                    if (target) {
                        moveToLocation(target.marker.getLatLng(), target.marker);
                        if (window.innerWidth <= 768) sidebar.classList.remove('open');
                    }
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

    function moveToLocation(latlng, marker = null) {
        map.setView(latlng, 6, { animate: true });

        if (marker) {
            const catId = marker.options.alt;
            if (layerGroups[catId] && !map.hasLayer(layerGroups[catId])) {
                map.addLayer(layerGroups[catId]);
            }
            marker.openPopup();
        }
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

    if (openBtn) openBtn.addEventListener('click', (e) => { e.stopPropagation(); sidebar.classList.add('open'); });
    if (closeBtn) closeBtn.addEventListener('click', () => sidebar.classList.remove('open'));
    map.on('click', () => { if (window.innerWidth <= 768) sidebar.classList.remove('open'); });

    renderFavorites();
    renderLinks();

    const urlParams = new URLSearchParams(window.location.search);
    const sharedId = parseInt(urlParams.get('id'));
    const sharedLat = parseFloat(urlParams.get('lat'));
    const sharedLng = parseFloat(urlParams.get('lng'));

    if (sharedId && !isNaN(sharedLat) && !isNaN(sharedLng)) {
        setTimeout(() => {
            const targetItem = allMarkers.find(m => m.id === sharedId);
            if (targetItem) {
                moveToLocation([sharedLat, sharedLng], targetItem.marker);
            } else {
                moveToLocation([sharedLat, sharedLng], null);
            }
        }, 500);
    }
});