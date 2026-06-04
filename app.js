// --------------------------------------------------
// 1. 초기 더미 데이터 및 상태 관리
// --------------------------------------------------

const INITIAL_ITEMS = [
  { id: "item-1", name: "맥심 모카골드 (100T)", category: "식음료/탕비실", floor: "2F", quantity: 5, safetyStock: 10, notes: "2층 탕비실 싱크대 서랍" },
  { id: "item-2", name: "종이컵 (1000입)", category: "식음료/탕비실", floor: "2F", quantity: 2, safetyStock: 3, notes: "온수기 옆 박스보관" },
  { id: "item-3", name: "HP A4 용지 (75g)", category: "사무용품", floor: "4F", quantity: 15, safetyStock: 20, notes: "4층 프린터실 선반" },
  { id: "item-4", name: "3M 스카치 테이프", category: "사무용품", floor: "4F", quantity: 8, safetyStock: 5, notes: "비품 캐비닛" },
  { id: "item-5", name: "로지텍 무선 마우스 B170", category: "IT기기/장비", floor: "4F", quantity: 1, safetyStock: 4, notes: "IT 기자재 보관함" },
  { id: "item-6", name: "카누 아메리카노 (100T)", category: "식음료/탕비실", floor: "2F", quantity: 12, safetyStock: 8, notes: "2층 임원실 미니바" },
  { id: "item-7", name: "멀티탭 6구 (3m)", category: "IT기기/장비", floor: "4F", quantity: 6, safetyStock: 5, notes: "개발부 비품박스" },
  { id: "item-8", name: "크리넥스 미용티슈", category: "생활용품", floor: "2F", quantity: 4, safetyStock: 10, notes: "회의실 배치용" }
];

const INITIAL_ORDERS = [
  { id: "order-1", itemId: "item-1", itemName: "맥심 모카골드 (100T)", quantity: 15, applicant: "김철수", date: "2026-05-28", status: "입고완료", notes: "탕비실 재고 부족으로 긴급 신청" },
  { id: "order-2", itemId: "item-5", itemName: "로지텍 무선 마우스 B170", quantity: 10, applicant: "이영희", date: "2026-05-31", status: "발주중", notes: "신규 입사자용 비품 확보" },
  { id: "order-3", itemId: "item-3", itemName: "HP A4 용지 (75g)", quantity: 30, applicant: "박민수", date: "2026-06-01", status: "발주중", notes: "반기 보고서 인쇄용" }
];

// --------------------------------------------------
// 0. Supabase 설정 (여기에 본인의 Supabase 정보를 직접 입력하세요)
// --------------------------------------------------
const SUPABASE_URL = "https://zvkcgccxmjcmvufkinmd.supabase.co";       // 예: "https://your-project.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2a2NnY2N4bWpjbXZ1Zmtpbm1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzODc3NDksImV4cCI6MjA5NTk2Mzc0OX0.MvR8g6cAmQy7vI0IZ9IQkf2LE65AESWEPduWp5gQMEc";  // 예: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

let supabaseClient = null;

function initSupabase() {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      if (window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("Supabase 클라이언트가 초기화되었습니다.");
      } else {
        console.error("Supabase CDN이 로드되지 않았습니다.");
        supabaseClient = null;
      }
    } catch (e) {
      console.error("Supabase 초기화 실패:", e);
      supabaseClient = null;
    }
  } else {
    supabaseClient = null;
  }
}
initSupabase();

// 로컬 스토리지에서 상태 읽기 또는 초기화 (Supabase 로딩 전 임시 데이터)
let items = JSON.parse(localStorage.getItem("vibestock_items")) || INITIAL_ITEMS;
let orders = JSON.parse(localStorage.getItem("vibestock_orders")) || INITIAL_ORDERS;

// Supabase로부터 최신 데이터를 비동기로 동기화하는 함수
async function syncWithSupabase() {
  if (!supabaseClient) return false;
  try {
    const { data: dbItems, error: itemsError } = await supabaseClient.from("items").select("*");
    if (itemsError) throw itemsError;

    const { data: dbOrders, error: ordersError } = await supabaseClient.from("orders").select("*");
    if (ordersError) throw ordersError;

    items = dbItems || [];
    orders = dbOrders || [];
    saveData(); // 로컬 스토리지 백업 업데이트
    return true;
  } catch (e) {
    console.error("Supabase 데이터 동기화 실패:", e);
    return false;
  }
}

// 관리자 비밀번호
const ADMIN_PASSWORD = "5977";
let passwordCallback = null; // 인증 성공 시 호출할 함수 임시 저장

// 현재 활성화된 필터 조건 상태
let currentInventoryFloor = "all";
let currentInventoryCategory = "all";
let currentOrderFilter = "all";

// 현재 정렬 상태
let currentSortKey = "default"; // "category" | "name" | "default"
let currentSortDir = "asc";     // "asc" | "desc"

// --------------------------------------------------
// 2. LocalStorage 데이터 동기화 (로컬 백업용)
// --------------------------------------------------
function saveData() {
  localStorage.setItem("vibestock_items", JSON.stringify(items));
  localStorage.setItem("vibestock_orders", JSON.stringify(orders));
}

// --------------------------------------------------
// 3. UI DOM 요소 참조
// --------------------------------------------------
const elements = {
  // 네비게이션 및 타이틀
  navItems: document.querySelectorAll(".nav-item"),
  sections: document.querySelectorAll(".content-section"),
  pageTitle: document.getElementById("page-title"),
  pageSubtitle: document.getElementById("page-subtitle"),
  themeToggleBtn: document.getElementById("theme-toggle-btn"),
  
  // 대시보드 지표
  statTotalItems: document.getElementById("stat-total-items"),
  statFloor2Items: document.getElementById("stat-floor2-items"),
  statFloor4Items: document.getElementById("stat-floor4-items"),
  statAlertItems: document.getElementById("stat-alert-items"),
  
  // 대시보드 경고 리스트 및 이력
  alertCountBadge: document.getElementById("alert-count-badge"),
  alertEmptyState: document.getElementById("alert-empty-state"),
  alertListItems: document.getElementById("alert-list-items"),
  orderEmptyState: document.getElementById("order-empty-state"),
  recentOrderTable: document.getElementById("recent-order-table"),
  recentOrderTbody: document.getElementById("recent-order-tbody"),
  viewAllOrdersBtn: document.getElementById("view-all-orders-btn"),
  
  // 재고 관리 필터 및 테이블
  tabBtns: document.querySelectorAll(".tab-btn"),
  inventorySearch: document.getElementById("inventory-search"),
  categoryFilter: document.getElementById("category-filter"),
  inventoryTable: document.getElementById("inventory-table"),
  inventoryTbody: document.getElementById("inventory-tbody"),
  tableEmptyState: document.getElementById("table-empty-state"),
  quickAddBtn: document.getElementById("quick-add-btn"),
  thCategory: document.getElementById("th-category"),
  thName: document.getElementById("th-name"),
  
  // 발주 폼 및 내역
  orderForm: document.getElementById("order-form"),
  orderItemSelect: document.getElementById("order-item-select"),
  orderQuantity: document.getElementById("order-quantity"),
  orderApplicant: document.getElementById("order-applicant"),
  orderNotes: document.getElementById("order-notes"),
  orderHistoryTbody: document.getElementById("order-history-tbody"),
  orderHistoryEmptyState: document.getElementById("order-history-empty-state"),
  orderHistoryTable: document.getElementById("order-history-table"),
  orderTabBtns: document.querySelectorAll(".tab-btn-sm"),
  
  // 물품 등록/수정 모달
  itemModal: document.getElementById("item-modal"),
  itemForm: document.getElementById("item-form"),
  editItemId: document.getElementById("edit-item-id"),
  modalTitle: document.getElementById("modal-title"),
  itemName: document.getElementById("item-name"),
  itemCategory: document.getElementById("item-category"),
  itemFloor: document.getElementById("item-floor"),
  itemQuantity: document.getElementById("item-quantity"),
  itemSafetyStock: document.getElementById("item-safety-stock"),
  itemNotes: document.getElementById("item-notes"),
  modalCloseBtn: document.getElementById("modal-close-btn"),
  modalCancelBtn: document.getElementById("modal-cancel-btn"),
  modalSubmitBtn: document.getElementById("modal-submit-btn"),
  
  // 퀵 입고 모달
  restockModal: document.getElementById("restock-modal"),
  restockForm: document.getElementById("restock-form"),
  restockItemId: document.getElementById("restock-item-id"),
  restockItemName: document.getElementById("restock-item-name"),
  restockItemCurrent: document.getElementById("restock-item-current"),
  restockQtyInput: document.getElementById("restock-qty-input"),
  restockCloseBtn: document.getElementById("restock-close-btn"),
  restockCancelBtn: document.getElementById("restock-cancel-btn"),

  // 비밀번호 모달
  passwordModal: document.getElementById("password-modal"),
  passwordForm: document.getElementById("password-form"),
  passwordInput: document.getElementById("password-input"),
  passwordError: document.getElementById("password-error"),
  passwordCloseBtn: document.getElementById("password-close-btn"),
  passwordCancelBtn: document.getElementById("password-cancel-btn")
};

// --------------------------------------------------
// 4. 화면 전환 및 테마 설정
// --------------------------------------------------

// 해시 라우트에 따른 화면 표시 적용 함수
function applyHashRoute() {
  const hash = location.hash.replace("#", "") || "dashboard";
  let targetSectionId = "dashboard-section";
  
  if (hash === "inventory") {
    targetSectionId = "inventory-section";
  } else if (hash === "order") {
    targetSectionId = "order-section";
  }
  
  // 1) 네비게이션 버튼 스타일 변경
  elements.navItems.forEach(btn => {
    if (btn.getAttribute("data-target") === targetSectionId) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
  
  // 2) 섹션 보기 전환
  elements.sections.forEach(section => {
    if (section.id === targetSectionId) {
      section.classList.add("active");
    } else {
      section.classList.remove("active");
    }
  });
  
  // 3) 헤더 타이틀 및 서브타이틀 매핑
  if (targetSectionId === "dashboard-section") {
    elements.pageTitle.textContent = "대시보드";
    elements.pageSubtitle.textContent = "실시간 사내 재고 현황을 한눈에 파악합니다.";
  } else if (targetSectionId === "inventory-section") {
    elements.pageTitle.textContent = "재고 목록";
    elements.pageSubtitle.textContent = "2층/4층의 물품 재고를 조회 및 편집합니다.";
  } else if (targetSectionId === "order-section") {
    elements.pageTitle.textContent = "발주 및 입고 이력";
    elements.pageSubtitle.textContent = "물품 발주 신청을 접수하고 입고 기록을 관리합니다.";
  }
}

// 사이드바 메뉴 전환 (새로고침 적용)
elements.navItems.forEach(navBtn => {
  navBtn.addEventListener("click", () => {
    const targetId = navBtn.getAttribute("data-target");
    let hash = "dashboard";
    
    if (targetId === "inventory-section") {
      hash = "inventory";
    } else if (targetId === "order-section") {
      hash = "order";
    }
    
    location.hash = hash;
    location.reload();
  });
});

// 테마 스위처 (다크 모드 <-> 라이트 모드)
elements.themeToggleBtn.addEventListener("click", () => {
  const isDark = document.body.classList.contains("dark-theme");
  if (isDark) {
    document.body.classList.remove("dark-theme");
    document.body.classList.add("light-theme");
    elements.themeToggleBtn.querySelector(".theme-text").textContent = "다크 모드";
  } else {
    document.body.classList.remove("light-theme");
    document.body.classList.add("dark-theme");
    elements.themeToggleBtn.querySelector(".theme-text").textContent = "라이트 모드";
  }
});

// 모바일 시뮬레이터 토글 및 종료 바인딩
const simulatorToggleBtn = document.getElementById("simulator-toggle-btn");
const exitSimulatorBtn = document.getElementById("exit-simulator-btn");

if (simulatorToggleBtn) {
  simulatorToggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("simulator-active");
    const isActive = document.body.classList.contains("simulator-active");
    const textSpan = simulatorToggleBtn.querySelector(".theme-text");
    if (isActive) {
      textSpan.textContent = "데스크탑 뷰로 복귀";
      simulatorToggleBtn.style.borderColor = "var(--primary)";
      simulatorToggleBtn.style.color = "var(--primary)";
    } else {
      textSpan.textContent = "스마트폰 뷰 (390px)";
      simulatorToggleBtn.style.borderColor = "";
      simulatorToggleBtn.style.color = "";
    }
    if (window.lucide) window.lucide.createIcons();
  });
}

if (exitSimulatorBtn) {
  exitSimulatorBtn.addEventListener("click", () => {
    document.body.classList.remove("simulator-active");
    if (simulatorToggleBtn) {
      const textSpan = simulatorToggleBtn.querySelector(".theme-text");
      textSpan.textContent = "스마트폰 뷰 (390px)";
      simulatorToggleBtn.style.borderColor = "";
      simulatorToggleBtn.style.color = "";
    }
  });
}

// --------------------------------------------------
// 5. 보안 비밀번호 인증 모달 제어
// --------------------------------------------------

function runWithPasswordProtection(callback) {
  passwordCallback = callback;
  elements.passwordInput.value = "";
  elements.passwordError.classList.add("d-none");
  elements.passwordModal.classList.add("active");
  setTimeout(() => elements.passwordInput.focus(), 150);
}

function closePasswordModal() {
  elements.passwordModal.classList.remove("active");
  passwordCallback = null;
}

elements.passwordCloseBtn.addEventListener("click", closePasswordModal);
elements.passwordCancelBtn.addEventListener("click", closePasswordModal);

elements.passwordForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const inputVal = elements.passwordInput.value;

  if (inputVal === ADMIN_PASSWORD) {
    const callback = passwordCallback; // 콜백 함수를 임시 변수에 백업
    closePasswordModal(); // 모달 닫기 및 passwordCallback = null 처리
    if (typeof callback === "function") {
      callback(); // 백업해 둔 콜백 실행
    }
  } else {
    // 비밀번호 불일치 시 흔들림 애니메이션 효과 및 메시지 노출
    elements.passwordError.classList.remove("d-none");
    const modalContent = elements.passwordModal.querySelector(".modal-card");
    modalContent.classList.add("shake");
    
    // 흔들림 완료 후 클래스 제거 (재실행 가능하게)
    setTimeout(() => {
      modalContent.classList.remove("shake");
    }, 400);

    elements.passwordInput.value = "";
    elements.passwordInput.focus();
  }
});


// --------------------------------------------------
// 6. 대시보드 렌더링 로직
// --------------------------------------------------
function renderDashboard() {
  // 1) 요약 통계 계산
  const totalItemsCount = items.length;
  const floor2ItemsCount = items.filter(item => item.floor === "2F").length;
  const floor4ItemsCount = items.filter(item => item.floor === "4F").length;
  const dangerItems = items.filter(item => item.quantity < item.safetyStock);
  const dangerItemsCount = dangerItems.length;

  elements.statTotalItems.textContent = totalItemsCount;
  elements.statFloor2Items.textContent = floor2ItemsCount;
  elements.statFloor4Items.textContent = floor4ItemsCount;
  elements.statAlertItems.textContent = dangerItemsCount;
  elements.alertCountBadge.textContent = `${dangerItemsCount}건`;

  // 2) 부족 재고 리스트 표시
  elements.alertListItems.innerHTML = "";
  if (dangerItemsCount === 0) {
    elements.alertEmptyState.classList.remove("d-none");
    elements.alertListItems.classList.add("d-none");
  } else {
    elements.alertEmptyState.classList.add("d-none");
    elements.alertListItems.classList.remove("d-none");
    
    dangerItems.forEach(item => {
      const li = document.createElement("li");
      li.className = "alert-item";
      li.innerHTML = `
        <div class="alert-item-info">
          <span class="alert-item-title">${item.name} (${item.floor})</span>
          <span class="alert-item-detail">현재 ${item.quantity}개 / 안전 재고 기준 ${item.safetyStock}개</span>
        </div>
        <button class="alert-action-btn" onclick="openRestockModal('${item.id}')">
          <i data-lucide="plus-circle" style="width: 14px; height: 14px; display: inline; vertical-align: middle; margin-right: 4px;"></i>입고
        </button>
      `;
      elements.alertListItems.appendChild(li);
    });
  }

  // 3) 최근 발주 요약 렌더링 (최근 5건)
  elements.recentOrderTbody.innerHTML = "";
  if (orders.length === 0) {
    elements.orderEmptyState.classList.remove("d-none");
    elements.recentOrderTable.classList.add("d-none");
  } else {
    elements.orderEmptyState.classList.add("d-none");
    elements.recentOrderTable.classList.remove("d-none");

    const recentOrders = [...orders]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 15);

    recentOrders.forEach(order => {
      const statusBadge = order.status === "입고완료" 
        ? `<span class="badge bg-success-soft"><i data-lucide="check-circle-2" style="width:11px;height:11px;"></i>입고완료</span>`
        : `<span class="badge bg-warning-soft"><i data-lucide="clock" style="width:11px;height:11px;"></i>발주중</span>`;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${order.date}</td>
        <td class="font-semibold">${order.itemName}</td>
        <td>${order.quantity}개</td>
        <td>${statusBadge}</td>
      `;
      elements.recentOrderTbody.appendChild(tr);
    });
  }

  // 대시보드 최근 발주에서 전체보기 클릭 시 발주 탭으로 바로가기
  elements.viewAllOrdersBtn.onclick = () => {
    document.querySelector('.nav-item[data-target="order-section"]').click();
  };

  lucide.createIcons();
}

// --------------------------------------------------
// 7. 재고 목록 렌더링 및 CRUD 로직
// --------------------------------------------------

// 정렬 상태에 따른 테이블 헤더 아이콘 및 스타일 업데이트 함수
function updateSortHeadersUI() {
  if (!elements.thCategory || !elements.thName) return;

  // 기존 정렬 활성화 클래스 제거
  elements.thCategory.classList.remove("active-sort");
  elements.thName.classList.remove("active-sort");

  const catContainer = elements.thCategory.querySelector(".sort-icon-container");
  const nameContainer = elements.thName.querySelector(".sort-icon-container");

  if (currentSortKey === "category") {
    elements.thCategory.classList.add("active-sort");
    if (catContainer) {
      catContainer.innerHTML = `<i data-lucide="${currentSortDir === "asc" ? "arrow-up" : "arrow-down"}" class="sort-icon"></i>`;
    }
    if (nameContainer) {
      nameContainer.innerHTML = `<i data-lucide="arrow-up-down" class="sort-icon"></i>`;
    }
  } else if (currentSortKey === "name") {
    elements.thName.classList.add("active-sort");
    if (nameContainer) {
      nameContainer.innerHTML = `<i data-lucide="${currentSortDir === "asc" ? "arrow-up" : "arrow-down"}" class="sort-icon"></i>`;
    }
    if (catContainer) {
      catContainer.innerHTML = `<i data-lucide="arrow-up-down" class="sort-icon"></i>`;
    }
  } else {
    // 기본 정렬 상태
    if (catContainer) {
      catContainer.innerHTML = `<i data-lucide="arrow-up-down" class="sort-icon"></i>`;
    }
    if (nameContainer) {
      nameContainer.innerHTML = `<i data-lucide="arrow-up-down" class="sort-icon"></i>`;
    }
  }
}

function renderInventoryTable() {
  elements.inventoryTbody.innerHTML = "";

  // 검색어 및 필터 가공
  const query = elements.inventorySearch.value.toLowerCase().trim();
  
  const filteredItems = items.filter(item => {
    // 1) 위치(층) 필터링
    const matchFloor = (currentInventoryFloor === "all" || item.floor === currentInventoryFloor);
    // 2) 카테고리 필터링
    const matchCategory = (currentInventoryCategory === "all" || item.category === currentInventoryCategory);
    // 3) 검색어 매칭
    const matchQuery = !query || item.name.toLowerCase().includes(query) || (item.notes && item.notes.toLowerCase().includes(query));

    return matchFloor && matchCategory && matchQuery;
  });

  // 정렬 적용
  filteredItems.sort((a, b) => {
    if (currentSortKey === "category") {
      const comp = a.category.localeCompare(b.category, "ko");
      if (comp !== 0) {
        return currentSortDir === "asc" ? comp : -comp;
      }
      return a.name.localeCompare(b.name, "ko");
    } else if (currentSortKey === "name") {
      const comp = a.name.localeCompare(b.name, "ko");
      return currentSortDir === "asc" ? comp : -comp;
    } else {
      // 기본 정렬: 카테고리 오름차순 -> 품목명 오름차순
      const catComp = a.category.localeCompare(b.category, "ko");
      if (catComp !== 0) {
        return catComp;
      }
      return a.name.localeCompare(b.name, "ko");
    }
  });

  // 정렬 헤더 UI 업데이트
  updateSortHeadersUI();

  if (filteredItems.length === 0) {
    elements.tableEmptyState.classList.remove("d-none");
    elements.inventoryTable.classList.add("d-none");
  } else {
    elements.tableEmptyState.classList.add("d-none");
    elements.inventoryTable.classList.remove("d-none");

    filteredItems.forEach(item => {
      const isDanger = item.quantity < item.safetyStock;
      
      const statusBadge = isDanger 
        ? `<span class="badge bg-danger-soft text-danger"><i data-lucide="alert-triangle" style="width:12px;height:12px"></i>재고 부족</span>`
        : `<span class="badge bg-success-soft text-success"><i data-lucide="check" style="width:12px;height:12px"></i>충분</span>`;

      const floorBadge = item.floor === "2F"
        ? `<span class="badge bg-info-soft text-info">2층</span>`
        : `<span class="badge bg-purple-soft text-purple">4층</span>`;

      const tr = document.createElement("tr");
      if (isDanger) {
        tr.className = "row-warning";
      }

      tr.innerHTML = `
        <td class="text-muted" style="font-weight: 500">${item.category}</td>
        <td style="font-weight: 600; font-size: 15px">${item.name}</td>
        <td>${floorBadge}</td>
        <td class="text-right font-semibold" style="font-size: 15px">${item.quantity} 개</td>
        <td class="text-right text-muted">${item.safetyStock} 개</td>
        <td>${statusBadge}</td>
        <td class="notes-cell text-muted" data-id="${item.id}" style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer;" title="클릭하여 비고 전체 보기">
          ${item.notes || "-"}
        </td>
        <td>
          <div class="text-center" style="display: flex; gap: 8px; justify-content: center;">
            <button class="btn btn-secondary btn-sm" onclick="openRestockModal('${item.id}')" title="빠른 입고">
              <i data-lucide="plus-circle" style="color: var(--success);"></i> 입고
            </button>
            <button class="btn btn-secondary btn-sm" onclick="openEditItemModal('${item.id}')" title="수정">
              <i data-lucide="edit-3"></i> 수정
            </button>
            <button class="btn btn-danger btn-sm" onclick="deleteItem('${item.id}')" title="삭제">
              <i data-lucide="trash-2"></i> 삭제
            </button>
          </div>
        </td>
      `;
      elements.inventoryTbody.appendChild(tr);
    });
  }
  lucide.createIcons();
}

// 재고 층별 필터 탭 클릭 이벤트 바인딩
elements.tabBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    elements.tabBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentInventoryFloor = btn.getAttribute("data-floor");
    renderInventoryTable();
  });
});

// 카테고리 필터 변경 및 실시간 검색 입력
elements.categoryFilter.addEventListener("change", () => {
  currentInventoryCategory = elements.categoryFilter.value;
  renderInventoryTable();
});
elements.inventorySearch.addEventListener("input", renderInventoryTable);

// 테이블 헤더 정렬 클릭 이벤트 바인딩
if (elements.thCategory) {
  elements.thCategory.addEventListener("click", () => {
    if (currentSortKey === "category") {
      currentSortDir = currentSortDir === "asc" ? "desc" : "asc";
    } else {
      currentSortKey = "category";
      currentSortDir = "asc";
    }
    renderInventoryTable();
  });
}

if (elements.thName) {
  elements.thName.addEventListener("click", () => {
    if (currentSortKey === "name") {
      currentSortDir = currentSortDir === "asc" ? "desc" : "asc";
    } else {
      currentSortKey = "name";
      currentSortDir = "asc";
    }
    renderInventoryTable();
  });
}

// 물품 삭제 함수 (비밀번호 인증 필요)
window.deleteItem = function(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;

  runWithPasswordProtection(async () => {
    if (confirm(`[${item.name}] 물품을 정말로 삭제하시겠습니까?`)) {
      if (supabaseClient) {
        const { error } = await supabaseClient.from("items").delete().eq("id", id);
        if (error) {
          alert(`Supabase 삭제 실패: ${error.message}`);
          return;
        }
      }
      items = items.filter(i => i.id !== id);
      saveData();
      updateOrderSelect(); // 발주 셀렉트박스 목록도 함께 업데이트
      renderInventoryTable();
      renderDashboard();
    }
  });
};

// --------------------------------------------------
// 8. 발주 기록 및 입고 신청 관리 로직
// --------------------------------------------------

// 발주 신청 셀렉트박스 옵션 목록 갱신
function updateOrderSelect() {
  elements.orderItemSelect.innerHTML = `<option value="" disabled selected>발주할 품목을 선택하세요</option>`;
  // 물품명 가나다 순 정렬하여 옵션에 렌더링
  const sortedItems = [...items].sort((a, b) => a.name.localeCompare(b.name, "ko"));
  sortedItems.forEach(item => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = `[${item.floor}] ${item.name} (현재: ${item.quantity}개)`;
    elements.orderItemSelect.appendChild(option);
  });
}

// 발주 이력 렌더링 (삭제 버튼 추가)
function renderOrderHistory() {
  elements.orderHistoryTbody.innerHTML = "";

  const filteredOrders = orders.filter(order => {
    if (currentOrderFilter === "all") return true;
    if (currentOrderFilter === "pending") return order.status === "발주중";
    if (currentOrderFilter === "completed") return order.status === "입고완료";
    return true;
  });

  // 최근 신청한 순서가 위로 올라오도록 역순 정렬
  const displayOrders = [...filteredOrders].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (displayOrders.length === 0) {
    elements.orderHistoryEmptyState.classList.remove("d-none");
    elements.orderHistoryTable.classList.add("d-none");
  } else {
    elements.orderHistoryEmptyState.classList.add("d-none");
    elements.orderHistoryTable.classList.remove("d-none");

    displayOrders.forEach(order => {
      const isCompleted = order.status === "입고완료";
      const statusBadge = isCompleted
        ? `<span class="badge bg-success-soft"><i data-lucide="check-circle-2" style="width:12px;height:12px"></i>입고완료</span>`
        : `<span class="badge bg-warning-soft"><i data-lucide="clock" style="width:12px;height:12px"></i>발주중</span>`;

      // 발주 상태가 '발주중'인 경우 입고 완료 버튼 제공, 입고완료인 경우 '완료' 표시
      const actionContent = isCompleted
        ? `<span class="text-success font-semibold mr-2" style="font-size: 13px;">입고 완료</span>`
        : `<button class="btn btn-success btn-sm mr-2" onclick="completeOrder('${order.id}')">
            <i data-lucide="download"></i> 입고완료
           </button>`;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="text-muted">${order.date}</td>
        <td class="font-semibold" style="font-size: 15px">${order.itemName}</td>
        <td class="text-right font-semibold">${order.quantity} 개</td>
        <td>${order.applicant}</td>
        <td>${statusBadge}</td>
        <td class="text-muted">${order.notes || "-"}</td>
        <td>
          <div class="text-center" style="display: flex; gap: 6px; justify-content: center; align-items: center;">
            ${actionContent}
            <button class="btn btn-danger btn-sm btn-icon" onclick="deleteOrder('${order.id}')" title="발주 기록 삭제">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </td>
      `;
      elements.orderHistoryTbody.appendChild(tr);
    });
  }
  lucide.createIcons();
}

// 발주 신청 서브밋 핸들러
elements.orderForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const itemId = elements.orderItemSelect.value;
  const item = items.find(i => i.id === itemId);
  if (!item) return;

  const quantity = parseInt(elements.orderQuantity.value, 10);
  const applicant = elements.orderApplicant.value.trim();
  const notes = elements.orderNotes.value.trim();
  
  // 날짜 포맷 (YYYY-MM-DD)
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];

  const newOrder = {
    id: `order-${Date.now()}`,
    itemId: item.id,
    itemName: item.name,
    quantity: quantity,
    applicant: applicant,
    date: dateStr,
    status: "발주중",
    notes: notes
  };

  if (supabaseClient) {
    const { error } = await supabaseClient.from("orders").insert(newOrder);
    if (error) {
      alert(`Supabase 발주 신청 실패: ${error.message}`);
      return;
    }
  }

  orders.push(newOrder);
  saveData();

  // 폼 초기화
  elements.orderForm.reset();

  // 상태 갱신
  renderOrderHistory();
  renderDashboard();
  updateOrderSelect();

  alert(`[${item.name}] 발주 신청이 완료되었습니다.`);
});

// 발주 상태 '입고완료' 처리 및 연동 재고 증가 (비밀번호 인증 필요)
window.completeOrder = async function(orderId) {
  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  const targetItem = items.find(i => i.id === order.itemId);

  if (targetItem) {
    // runWithPasswordProtection(async () => {
      if (confirm(`발주 신청 수량(${order.quantity}개)을 [${targetItem.name}] 재고에 추가(입고) 처리하시겠습니까?`)) {
        const nextQty = targetItem.quantity + order.quantity;
        if (supabaseClient) {
          const { error: itemErr } = await supabaseClient.from("items").update({ quantity: nextQty }).eq("id", targetItem.id);
          const { error: orderErr } = await supabaseClient.from("orders").update({ status: "입고완료" }).eq("id", orderId);
          if (itemErr || orderErr) {
            alert(`Supabase 업데이트 실패: ${itemErr?.message || orderErr?.message}`);
            return;
          }
        }

        // 1) 재고 증가
        targetItem.quantity = nextQty;
        // 2) 발주 상태 변경
        order.status = "입고완료";
        
        saveData();
        
        // 3) 화면 갱신
        renderDashboard();
        renderInventoryTable();
        renderOrderHistory();
        updateOrderSelect();
        
        alert(`[${targetItem.name}] 물품이 ${order.quantity}개 정상 입고되어 재고가 업데이트되었습니다.`);
      }
    // });
  } else {
    // 원본 재고 물품이 삭제된 경우
    // runWithPasswordProtection(async () => {
      if (confirm("원본 재고 물품이 삭제되었습니다. 발주 이력 상태만 입고완료로 처리하겠습니까?")) {
        if (supabaseClient) {
          const { error } = await supabaseClient.from("orders").update({ status: "입고완료" }).eq("id", orderId);
          if (error) {
            alert(`Supabase 업데이트 실패: ${error.message}`);
            return;
          }
        }
        order.status = "입고완료";
        saveData();
        renderDashboard();
        renderOrderHistory();
      }
    // });
  }
};

// 발주 기록 삭제 함수 (비밀번호 인증 필요)
window.deleteOrder = function(orderId) {
  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  runWithPasswordProtection(async () => {
    if (confirm(`[${order.itemName}]의 발주 및 입고 기록을 삭제하시겠습니까? (이 작업은 되돌릴 수 없으며, 이미 반영된 재고 수량은 수동으로 조정해야 합니다.)`)) {
      if (supabaseClient) {
        const { error } = await supabaseClient.from("orders").delete().eq("id", orderId);
        if (error) {
          alert(`Supabase 삭제 실패: ${error.message}`);
          return;
        }
      }
      orders = orders.filter(o => o.id !== orderId);
      saveData();
      renderOrderHistory();
      renderDashboard();
    }
  });
};

// 발주 이력 필터링 탭 이벤트 바인딩
elements.orderTabBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    elements.orderTabBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentOrderFilter = btn.getAttribute("data-order-filter");
    renderOrderHistory();
  });
});

// --------------------------------------------------
// 9. 신규 등록 및 수정 모달 (Item Modal) 기능
// --------------------------------------------------

function openAddItemModal() {
  elements.itemForm.reset();
  elements.editItemId.value = "";
  elements.modalTitle.textContent = "물품 신규 등록";
  elements.modalSubmitBtn.textContent = "등록";
  
  elements.itemModal.classList.add("active");
}

window.openEditItemModal = function(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;

  elements.editItemId.value = item.id;
  elements.modalTitle.textContent = "물품 정보 수정";
  elements.itemName.value = item.name;
  elements.itemCategory.value = item.category;
  elements.itemFloor.value = item.floor;
  elements.itemQuantity.value = item.quantity;
  elements.itemSafetyStock.value = item.safetyStock;
  elements.itemNotes.value = item.notes || "";
  elements.modalSubmitBtn.textContent = "수정 완료";

  elements.itemModal.classList.add("active");
};

function closeItemModal() {
  elements.itemModal.classList.remove("active");
}

elements.quickAddBtn.addEventListener("click", openAddItemModal);
elements.modalCloseBtn.addEventListener("click", closeItemModal);
elements.modalCancelBtn.addEventListener("click", closeItemModal);

// 물품 등록/수정 전송 핸들러
elements.itemForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const editId = elements.editItemId.value;
  const name = elements.itemName.value.trim();
  const category = elements.itemCategory.value;
  const floor = elements.itemFloor.value;
  const quantity = parseInt(elements.itemQuantity.value, 10);
  const safetyStock = parseInt(elements.itemSafetyStock.value, 10);
  const notes = elements.itemNotes.value.trim();

  // 중복 검사: 대소문자 및 모든 공백을 무시하고 동일한 이름이 이미 있는지 확인
  const cleanName = name.replace(/\s+/g, "").toLowerCase();
  const isDuplicate = items.some(item => {
    const existingCleanName = item.name.replace(/\s+/g, "").toLowerCase();
    return existingCleanName === cleanName && item.id !== editId;
  });

  if (isDuplicate) {
    alert("이미 등록된 물품입니다.");
    elements.itemName.focus();
    return;
  }

  const targetId = editId || `item-${Date.now()}`;
  const itemPayload = {
    id: targetId,
    name,
    category,
    floor,
    quantity,
    safetyStock,
    notes
  };

  if (supabaseClient) {
    const { error: itemErr } = await supabaseClient.from("items").upsert(itemPayload);
    if (itemErr) {
      alert(`Supabase 저장 실패: ${itemErr.message}`);
      return;
    }

    if (editId) {
      const { error: orderErr } = await supabaseClient
        .from("orders")
        .update({ itemName: name })
        .eq("itemId", editId)
        .eq("status", "발주중");
      if (orderErr) {
        console.warn("발주 내역 품목명 업데이트 실패:", orderErr.message);
      }
    }
  }

  if (editId) {
    // 1) 기존 품목 수정
    const itemIndex = items.findIndex(i => i.id === editId);
    if (itemIndex > -1) {
      items[itemIndex] = itemPayload;
      
      // 관련된 발주 기록 중 아직 완료되지 않은 발주의 품목명도 일치시켜주어 혼동 예방
      orders.forEach(order => {
        if (order.itemId === editId && order.status === "발주중") {
          order.itemName = name;
        }
      });
    }
  } else {
    // 2) 신규 품목 등록
    items.push(itemPayload);
  }

  saveData();
  closeItemModal();
  
  // 전체 뷰 업데이트
  renderDashboard();
  renderInventoryTable();
  renderOrderHistory();
  updateOrderSelect();
});


// --------------------------------------------------
// 10. 빠른 입고 모달 (Restock Modal) 기능
// --------------------------------------------------

window.openRestockModal = function(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;

  elements.restockItemId.value = item.id;
  elements.restockItemName.textContent = item.name;
  elements.restockItemCurrent.textContent = `${item.quantity} 개`;
  elements.restockQtyInput.value = ""; // 입력필드 비우기

  elements.restockModal.classList.add("active");
  
  // 입력 필드 자동 포커스
  setTimeout(() => elements.restockQtyInput.focus(), 150);
};

function closeRestockModal() {
  elements.restockModal.classList.remove("active");
}

elements.restockCloseBtn.addEventListener("click", closeRestockModal);
elements.restockCancelBtn.addEventListener("click", closeRestockModal);

// 빠른 입고 폼 전송 핸들러
elements.restockForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = elements.restockItemId.value;
  const restockQty = parseInt(elements.restockQtyInput.value, 10);
  
  const item = items.find(i => i.id === id);
  if (item && restockQty > 0) {
    const nextQty = item.quantity + restockQty;
    if (supabaseClient) {
      const { error } = await supabaseClient.from("items").update({ quantity: nextQty }).eq("id", id);
      if (error) {
        alert(`Supabase 입고 업데이트 실패: ${error.message}`);
        return;
      }
    }

    item.quantity = nextQty;
    saveData();
    closeRestockModal();

    renderDashboard();
    renderInventoryTable();
    updateOrderSelect();
    
    // 알림창 노출
    alert(`[${item.name}] 물품이 ${restockQty}개 정상 입고되어 현재 수량이 ${item.quantity}개가 되었습니다.`);
  }
});


// --------------------------------------------------
// 11. 초기 앱 구동 시 초기화
// --------------------------------------------------
async function initApp() {
  // 현재 URL 해시에 해당하는 화면 표시 적용
  applyHashRoute();

  if (supabaseClient) {
    await syncWithSupabase();
  }
  renderDashboard();
  renderInventoryTable();
  renderOrderHistory();
  updateOrderSelect();
}

// 앱 실행
document.addEventListener("DOMContentLoaded", initApp);
// 만약 DOMContentLoaded가 이미 완료된 상황일 경우를 위해 바로도 실행
if (document.readyState === "interactive" || document.readyState === "complete") {
  initApp();
}

// --------------------------------------------------
// 12. 비고(Notes) 팝오버 표시 기능 (마우스 포인터 위치 기준)
// --------------------------------------------------
let notesPopover = null;

function showNotesPopover(e, notesText) {
  closeNotesPopover();

  notesPopover = document.createElement("div");
  notesPopover.className = "notes-popover";
  notesPopover.innerHTML = `
    <div class="popover-content">${notesText.replace(/\n/g, "<br>")}</div>
    <div class="popover-arrow"></div>
  `;
  document.body.appendChild(notesPopover);

  notesPopover.addEventListener("click", (evt) => {
    evt.stopPropagation();
  });

  const x = e.pageX;
  const y = e.pageY;
  
  const popoverWidth = notesPopover.offsetWidth;
  const popoverHeight = notesPopover.offsetHeight;

  // 마우스 클릭 위치 기준 중앙 정렬 및 화면 경계 보정
  let leftPosition = x - popoverWidth / 2;
  if (leftPosition < 10) {
    leftPosition = 10;
  } else if (leftPosition + popoverWidth > window.innerWidth - 10) {
    leftPosition = window.innerWidth - popoverWidth - 10;
  }
  notesPopover.style.left = `${leftPosition}px`;
  
  // 마우스 클릭 위치보다 위에 표시하되, 화면 위에 걸치면 밑에 표시
  let topPosition = y - popoverHeight - 12;
  if (topPosition < window.scrollY + 10) {
    topPosition = y + 16;
    notesPopover.classList.add("popover-bottom");
  } else {
    notesPopover.classList.add("popover-top");
  }
  notesPopover.style.top = `${topPosition}px`;

  requestAnimationFrame(() => {
    notesPopover.classList.add("active");
  });
}

function closeNotesPopover() {
  if (notesPopover) {
    notesPopover.remove();
    notesPopover = null;
  }
}

// 비고(notes-cell) 클릭 이벤트 리스너 (이벤트 위임)
document.addEventListener("click", (e) => {
  const notesCell = e.target.closest(".notes-cell");
  if (notesCell) {
    e.stopPropagation();
    const itemId = notesCell.getAttribute("data-id");
    const item = items.find(i => i.id === itemId);
    if (item) {
      const text = item.notes ? item.notes.trim() : "";
      showNotesPopover(e, text || "비고 내용이 없습니다.");
    }
  } else {
    closeNotesPopover();
  }
});
