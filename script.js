const rawTranslations = [
    { keys: ["Chest"], value: "보물상자" },
    { keys: ["NPC"], value: "NPC" },
    { keys: ["Teleport"], value: "순간이동" },
    { keys: ["Shop"], value: "상점" },
    { keys: ["Bounty"], value: "현상금" },
    { keys: ["Quest"], value: "퀘스트" },
    { keys: ["World Boss"], value: "필드 보스" },
    { keys: ["Meditation", "Meditation Spot"], value: "명상" },
    { keys: ["Viewpoint", "View point"], value: "뷰포인트" },
    { keys: ["Archive"], value: "기록" },
    { keys: ["Cave"], value: "동굴" },
    { keys: ["Puzzle"], value: "퍼즐" },
    { keys: ["Gathering"], value: "채집" },
    { keys: ["Fishing"], value: "낚시" },
    { keys: ["Cooking"], value: "요리" },
    { keys: ["Crafting"], value: "제작" },
    { keys: ["Book"], value: "서적" },
    { keys: ["Song"], value: "노래" },
    { keys: ["Boundary Stones", "BoundaryStones"], value: "경계석" },
    { keys: ["Bathhouse"], value: "사우나" },
    { keys: ["CampaignQuest", "Campaign Quest"], value: "메인 퀘스트" },
    { keys: ["SideStory", "Side Story"], value: "서브 스토리" },
    { keys: ["OddityCollection", "Oddity Collection"], value: "기물 수집" },
    { keys: ["DivinecraftDungeon", "Divinecraft Dungeon"], value: "신기 던전" },
    { keys: ["RestrictedZones", "Restricted Zones"], value: "출입 금지 구역" },
    { keys: ["MarketOffice", "Market Office"], value: "관청" },
    { keys: ["ShadowPuppetStall", "Shadow Puppet Stall"], value: "그림자 인형극" },
    { keys: ["MusicalDance", "Musical Dance"], value: "가무" },
    { keys: ["Pitch Pot"], value: "투호" },
    { keys: ["Chess Match"], value: "상기" },
    { keys: ["Bell of Demoncalm"], value: "퇴마의 종" },
    { keys: ["Show All"], value: "모두 보기" },
    { keys: ["Show Completed"], value: "완료된 항목 보기" },
    { keys: ["Share"], value: "공유" },
    { keys: ["Favorite"], value: "즐겨찾기" },
    { keys: ["Wayfarer"], value: "여행자" },
    { keys: ["Horse Merchant"], value: "마구간지기" },
    { keys: ["Crafting Bench"], value: "제작대" },
    { keys: ["Fishing Contest"], value: "낚시 대회" },
    { keys: ["Archery Competition"], value: "궁술 대회" },
    { keys: ["Exploration Challenge"], value: "탐험 도전" },
    { keys: ["Meow Meow Temple"], value: "묘묘 사원" },
    { keys: ["Meow Meow's Treasure"], value: "묘묘의 보물" },
    { keys: ["Wrestling"], value: "씨름" }
];

const koDict = {};
rawTranslations.forEach(item => {
    item.keys.forEach(key => {
        koDict[key] = item.value;
        koDict[key.trim()] = item.value;
    });
});

const usefulLinks = [
    { title: "공식 홈페이지", url: "https://www.wherewindsmeetgame.com/kr/index.html" },
    { title: "기반 위키 (Wiki)", url: "https://wherewindsmeet.wiki.fextralife.com/" },
    { title: "연운: 한국 위키", url: "https://wwm.tips/" },
    { title: "연운 공식 디스코드", url: "https://discord.gg/wherewindsmeet" },
    { title: "연운 한국 디스코드", url: "https://discord.gg/wherewindsmeetkr" },
    { title: "아카라이브 연운 채널", url: "https://arca.live/b/wherewindsmeet" },
    { title: "디씨 연운 갤러리", url: "https://gall.dcinside.com/mgallery/board/lists?id=dusdns" },
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

    const itemsByCategory = {};
    mapData.items.forEach(item => {
        if (!itemsByCategory[item.category]) {
            itemsByCategory[item.category] = [];
        }
        itemsByCategory[item.category].push(item);
    });

    for (const key in itemsByCategory) {
        itemsByCategory[key].sort((a, b) => t(a.name).localeCompare(t(b.name)));
    }

    const boundaryStones = mapData.items.filter(item =>
        item.category === "BoundaryStones" || item.category === "Boundary Stones"
    );

    function getNearestRegionName(targetX, targetY) {
        if (boundaryStones.length === 0) return "";

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
        return nearestName ? t(nearestName) : "";
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

    let favorites = JSON.parse(localStorage.getItem('wwm_favorites')) || [];
    let completedList = JSON.parse(localStorage.getItem('wwm_completed')) || [];

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

            const isCompleted = completedList.includes(item.id);
            const iconClass = isCompleted ? 'game-marker-icon completed-marker' : 'game-marker-icon';

            const customIcon = L.icon({
                iconUrl: iconUrl,
                iconSize: [w, h],
                iconAnchor: [w / 2, h / 2],
                popupAnchor: [0, -h / 2],
                className: iconClass
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
                ? itemsByCategory[catId].filter(i => i.id !== item.id)
                : [];

            if (relatedList.length > 0) {
                const limit = 5;
                let listItems = '';

                relatedList.forEach((r, index) => {
                    const hiddenClass = index >= limit ? 'hidden' : '';
                    const regionName = getNearestRegionName(r.x, r.y);
                    const regionHtml = regionName ? `<span class="related-region">(${regionName})</span>` : '';

                    listItems += `
                        <li class="related-item ${hiddenClass}" onclick="jumpToId(${r.id})">
                            ${t(r.name)} ${regionHtml}
                        </li>`;
                });

                let expandBtn = '';
                if (relatedList.length > limit) {
                    const remainCount = relatedList.length - limit;
                    expandBtn = `<button class="btn-expand" onclick="expandRelated(this)">▼ 더보기 (${remainCount}+)</button>`;
                }

                relatedHtml = `
                    <div class="popup-related">
                        <div class="popup-related-header">
                            <h5>
                                관련 ${t(catId)} (${relatedList.length})
                                <button class="btn-search-modal" onclick="openRelatedModal('${catId}')" title="전체 목록 검색">🔍</button>
                            </h5>
                        </div>
                        <ul class="related-list">
                            ${listItems}
                        </ul>
                        ${expandBtn}
                    </div>
                `;
            }

            const isFav = favorites.includes(item.id);
            const favClass = isFav ? 'active' : '';
            const favText = isFav ? '★' : '☆';

            const compClass = isCompleted ? 'active' : '';
            const compText = isCompleted ? '✔️ 완료됨' : '완료 체크';

            const popupContent = `
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
                        <button class="action-btn btn-share" onclick="shareLocation(${item.id}, ${lat}, ${lng})">📤</button>
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
                pageLink: item.pageLink
            });
        }
    });

    window.toggleCompleted = (id) => {
        const index = completedList.indexOf(id);
        const btn = document.querySelector(`.popup-container[data-id="${id}"] .btn-complete`);
        const targetItem = allMarkers.find(m => m.id === id);

        if (index === -1) {
            completedList.push(id);
            if (btn) {
                btn.classList.add('active');
                btn.innerText = '✔️ 완료됨';
            }
            if (targetItem) {
                targetItem.marker._icon.classList.add('completed-marker');
            }
        } else {
            completedList.splice(index, 1);
            if (btn) {
                btn.classList.remove('active');
                btn.innerText = '완료 체크';
            }
            if (targetItem) {
                targetItem.marker._icon.classList.remove('completed-marker');
            }
        }
        localStorage.setItem('wwm_completed', JSON.stringify(completedList));
    };

    window.toggleFavorite = (id) => {
        const index = favorites.indexOf(id);
        const btn = document.querySelector(`.popup-container[data-id="${id}"] .btn-fav`);

        if (index === -1) {
            favorites.push(id);
            if (btn) {
                btn.classList.add('active');
                btn.innerText = '★';
            }
        } else {
            favorites.splice(index, 1);
            if (btn) {
                btn.classList.remove('active');
                btn.innerText = '☆';
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

    window.jumpToId = (id) => {
        const target = allMarkers.find(m => m.id === id);
        if (target) {
            moveToLocation(target.marker.getLatLng(), target.marker);
        }
    };

    window.expandRelated = (btn) => {
        const list = btn.previousElementSibling;
        if (list) {
            const hiddenItems = list.querySelectorAll('.related-item.hidden');
            hiddenItems.forEach(item => item.classList.remove('hidden'));
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

            const lat = m.marker.getLatLng().lat;
            const lng = m.marker.getLatLng().lng;
            const regionName = getNearestRegionName(lat, lng);

            const li = document.createElement('li');
            li.className = 'modal-item';
            li.innerHTML = `
                <div style="display:flex; flex-direction:column;">
                    <span class="modal-item-name">${t(m.name)}</span>
                    <span style="font-size:0.8rem; color:#888;">${regionName}</span>
                </div>
                ${statusHtml}
            `;
            li.onclick = () => {
                moveToLocation(m.marker.getLatLng(), m.marker);
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
                const regionName = getNearestRegionName(item.x, item.y);
                const regionHtml = regionName ? `<span style="font-size:0.8rem; color:#aaa;">(${regionName})</span>` : '';

                div.innerHTML = `<b>${t(item.name)}</b> ${regionHtml}<br><small>${t(item.category)}</small>`;
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
            if (isMobile) {
                sidebar.classList.add('open');
            } else {
                sidebar.classList.remove('collapsed');
                setTimeout(() => { map.invalidateSize(); }, 300);
            }
        } else if (action === 'close') {
            if (isMobile) {
                sidebar.classList.remove('open');
            } else {
                sidebar.classList.add('collapsed');
                setTimeout(() => { map.invalidateSize(); }, 300);
            }
        }
    }

    if (openBtn) {
        openBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSidebar('open');
        });
    }

    // 닫기(X) 버튼 클릭
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            toggleSidebar('close');
        });
    }

    // 지도 클릭 시 (모바일에서만 사이드바 닫기)
    map.on('click', () => {
        if (window.innerWidth <= 768) {
            toggleSidebar('close');
        }
    });

    // 화면 크기 변경 시 레이아웃 초기화 (선택 사항)
    window.addEventListener('resize', () => {
        map.invalidateSize();
    });

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