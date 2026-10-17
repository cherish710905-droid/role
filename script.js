/**
 * 우리 반 1인 1역할 배정 도우미 - script.js
 * 역할 랜덤 매칭, 모달 상호작용, A4 인쇄 서식, 구글 스프레드시트 연동 준비 로직
 */

// ========================================================
// 1. 기본 초기 데이터 (12명 학생 및 12개 학급 역할)
// ========================================================

const DEFAULT_STUDENTS = [
  "김하늘", "이도윤", "박서아", "최시우", "정지유", "강민준",
  "조은우", "윤서연", "장하준", "임지아", "한도현", "오수아"
];

const DEFAULT_ROLES = [
  { id: 1, emoji: "🧼", title: "칠판 지우개 요정", duty: "수업 끝난 후와 방과 후에 칠판을 깨끗하게 닦아요" },
  { id: 2, emoji: "🥛", title: "우유 도우미", duty: "아침 우유 상자를 챙겨오고 친구들에게 알맞게 나눠줘요" },
  { id: 3, emoji: "💡", title: "에너지 지킴이", duty: "이동 수업이나 하교 때 교실 전등과 냉난방기를 꺼요" },
  { id: 4, emoji: "📚", title: "학급 문고 박사", duty: "학급 문고 책꽂이의 책을 번호와 크기대로 가지런히 정리해요" },
  { id: 5, emoji: "🚶‍♂️", title: "바른 줄 반장", duty: "급식실 및 특별실 이동 시 친구들이 바르게 줄서도록 도와요" },
  { id: 6, emoji: "🌱", title: "초록 식물 집사", duty: "교실 화분의 식물들에게 정성껏 물을 주고 사랑을 전해요" },
  { id: 7, emoji: "🧹", title: "청소 도구함 관리사", duty: "빗자루, 쓰레받기, 걸레를 제자리에 단정하게 정돈해요" },
  { id: 8, emoji: "🪟", title: "맑은 공기 환기 대장", duty: "쉬는 시간마다 창문을 열어 교실 공기를 상쾌하게 환기해요" },
  { id: 9, emoji: "📄", title: "안내장 우체부", duty: "가정통신문과 수업 학습지를 모둠별로 빠짐없이 나눠줘요" },
  { id: 10, emoji: "💻", title: "멀티미디어 보조", duty: "수업용 TV 전원 켜기와 교탁 주변 선 정리를 도와요" },
  { id: 11, emoji: "⚽", title: "체육 활동 부장", duty: "체육 시간 전후로 공과 줄넘기 등 체육 용품을 챙겨요" },
  { id: 12, emoji: "⏰", title: "종소리 시간 알리미", duty: "수업 시작 1분 전에 책상 정리와 착석을 친구들에게 알려요" }
];

// ========================================================
// 2. 애플리케이션 상태 (State)
// ========================================================

const STORAGE_KEY = "school_role_assigner_data_v1";

let appState = {
  className: "🌱 햇살초등학교 3학년 2반",
  periodName: "2026학년도 1학기 (4월)",
  students: [...DEFAULT_STUDENTS],
  roles: JSON.parse(JSON.stringify(DEFAULT_ROLES)),
  // assignments: [{ roleId: 1, student: "김하늘" }, ...]
  assignments: [],
  appsScriptUrl: "",
  activeView: "grid", // 'grid' | 'table'
  searchQuery: ""
};

// ========================================================
// 3. 로컬 스토리지 저장 및 복원
// ========================================================

function loadStateFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.students && parsed.students.length > 0) appState.students = parsed.students;
      if (parsed.roles && parsed.roles.length > 0) appState.roles = parsed.roles;
      if (parsed.assignments) appState.assignments = parsed.assignments;
      if (parsed.className) appState.className = parsed.className;
      if (parsed.periodName) appState.periodName = parsed.periodName;
      if (parsed.appsScriptUrl) appState.appsScriptUrl = parsed.appsScriptUrl;
    } else {
      // 초기 기본 배정 1회 실행
      autoAssignInitial();
    }
  } catch (e) {
    console.error("Storage load error:", e);
    autoAssignInitial();
  }
}

function saveStateToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      className: appState.className,
      periodName: appState.periodName,
      students: appState.students,
      roles: appState.roles,
      assignments: appState.assignments,
      appsScriptUrl: appState.appsScriptUrl
    }));
  } catch (e) {
    console.warn("Storage save error:", e);
  }
}

// 초기 로딩 시 1:1 매칭 기본 생성
function autoAssignInitial() {
  const shuffled = [...appState.students];
  appState.assignments = appState.roles.map((role, idx) => ({
    roleId: role.id,
    student: shuffled[idx] || "미배정"
  }));
}

// ========================================================
// 4. 역할 무작위 배정 알고리즘 (Fisher-Yates Shuffle)
// ========================================================

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function assignRolesRandomly() {
  if (appState.students.length === 0) {
    showToast("학생 명단이 비어 있습니다. [명단·역할 관리]에서 학생을 추가해 주세요.", "warning");
    return;
  }
  if (appState.roles.length === 0) {
    showToast("등록된 역할이 없습니다. [명단·역할 관리]에서 역할을 추가해 주세요.", "warning");
    return;
  }

  // 셔플된 학생 목록
  const shuffledStudents = shuffleArray(appState.students);

  // 역할에 1:1 매칭
  appState.assignments = appState.roles.map((role, index) => {
    return {
      roleId: role.id,
      student: shuffledStudents[index % shuffledStudents.length] || "미배정"
    };
  });

  saveStateToStorage();
  renderApp();

  // 축하 폭죽 효과 (Canvas Confetti)
  triggerConfetti();
  showToast("🎉 1인 1역할 무작위 배정이 완료되었습니다!", "success");
}

function triggerConfetti() {
  if (typeof window.confetti === 'function') {
    try {
      window.confetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#FF7043', '#42A5F5', '#66BB6A', '#FFA726', '#AB47BC', '#EC407A']
      });
    } catch (e) {
      // safe fallback
    }
  }
}

// ========================================================
// 5. 렌더링 함수들 (UI Rendering)
// ========================================================

function renderApp() {
  renderStatsAndHeaders();
  renderCardsGrid();
  renderTableView();
  renderPrintSheet();
}

function renderStatsAndHeaders() {
  const studentCountEl = document.getElementById("stat-student-count");
  const roleCountEl = document.getElementById("stat-role-count");
  const statusTextEl = document.getElementById("stat-status-text");
  const classNameInput = document.getElementById("input-class-name");
  const periodNameInput = document.getElementById("input-period-name");

  if (studentCountEl) studentCountEl.textContent = appState.students.length;
  if (roleCountEl) roleCountEl.textContent = appState.roles.length;
  
  const assignedCount = appState.assignments.filter(a => a.student && a.student !== "미배정").length;
  if (statusTextEl) {
    if (assignedCount === 0) {
      statusTextEl.textContent = "미배정";
      statusTextEl.style.color = "#718096";
    } else if (assignedCount === appState.roles.length) {
      statusTextEl.textContent = `전원 배정 완료 (${assignedCount}명)`;
      statusTextEl.style.color = "#2E7D32";
    } else {
      statusTextEl.textContent = `부분 배정 (${assignedCount}/${appState.roles.length})`;
      statusTextEl.style.color = "#E65100";
    }
  }

  if (classNameInput && classNameInput.value !== appState.className) {
    classNameInput.value = appState.className;
  }
  if (periodNameInput && periodNameInput.value !== appState.periodName) {
    periodNameInput.value = appState.periodName;
  }
}

// 5-1. 카드 그리드 렌더링
function renderCardsGrid() {
  const container = document.getElementById("cards-grid");
  if (!container) return;

  const query = (appState.searchQuery || "").trim().toLowerCase();

  const filteredRoles = appState.roles.filter(role => {
    if (!query) return true;
    const assignment = appState.assignments.find(a => a.roleId === role.id);
    const studentName = assignment ? assignment.student.toLowerCase() : "";
    return role.title.toLowerCase().includes(query) ||
           role.duty.toLowerCase().includes(query) ||
           studentName.includes(query);
  });

  if (filteredRoles.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 48px 16px; background: #fff; border-radius: 16px; border: 2px dashed #CBD5E1;">
        <span style="font-size: 2.5rem;">🔍</span>
        <h4 style="margin: 12px 0 6px 0; font-family: var(--font-heading); font-size: 1.2rem; color: #475569;">일치하는 검색 결과가 없습니다.</h4>
        <p style="color: #94A3B8; font-size: 0.9rem;">학생 이름이나 역할 이름 검색어를 확인해 주세요.</p>
      </div>
    `;
    return;
  }

  let html = "";
  filteredRoles.forEach((role, idx) => {
    const assignment = appState.assignments.find(a => a.roleId === role.id);
    const studentName = assignment && assignment.student ? assignment.student : "미배정";
    const themeIndex = idx % 8;
    const initialChar = studentName !== "미배정" ? studentName.charAt(0) : "👤";

    html += `
      <article class="role-card theme-${themeIndex} card-revealed" data-role-id="${role.id}">
        <div class="card-top">
          <div class="card-emoji-box" aria-hidden="true">${role.emoji || "🌟"}</div>
          <div class="card-header-info">
            <span class="card-no-badge">역할 #${idx + 1}</span>
            <h3 class="card-role-title">${escapeHtml(role.title)}</h3>
          </div>
        </div>

        <p class="card-duty-text">${escapeHtml(role.duty)}</p>

        <div class="card-student-box">
          <div class="student-identity">
            <div class="student-avatar">${escapeHtml(initialChar)}</div>
            <div>
              <span style="font-size: 0.72rem; color: #718096; display: block;">담당 학생</span>
              <strong class="student-name ${studentName === '미배정' ? 'student-empty' : ''}">${escapeHtml(studentName)}</strong>
            </div>
          </div>
          <button class="btn-card-swap" data-action="swap" data-role-id="${role.id}" title="담당 학생을 변경하거나 다른 친구와 교환합니다">
            조정 ⇄
          </button>
        </div>
      </article>
    `;
  });

  container.innerHTML = html;
}

// 5-2. 명렬표 테이블 렌더링
function renderTableView() {
  const tbody = document.getElementById("table-body");
  if (!tbody) return;

  const query = (appState.searchQuery || "").trim().toLowerCase();

  const filteredRoles = appState.roles.filter(role => {
    if (!query) return true;
    const assignment = appState.assignments.find(a => a.roleId === role.id);
    const studentName = assignment ? assignment.student.toLowerCase() : "";
    return role.title.toLowerCase().includes(query) ||
           role.duty.toLowerCase().includes(query) ||
           studentName.includes(query);
  });

  let html = "";
  filteredRoles.forEach((role, idx) => {
    const assignment = appState.assignments.find(a => a.roleId === role.id);
    const studentName = assignment && assignment.student ? assignment.student : "미배정";

    html += `
      <tr>
        <td style="text-align: center; font-weight: 600; color: #64748B;">${idx + 1}</td>
        <td>
          <span style="font-size: 1.2rem; margin-right: 6px;">${role.emoji || "🌟"}</span>
          <strong>${escapeHtml(role.title)}</strong>
        </td>
        <td style="color: #475569;">${escapeHtml(role.duty)}</td>
        <td>
          <span class="table-student-name">${escapeHtml(studentName)}</span>
        </td>
        <td>
          <button class="btn-mini" data-action="swap" data-role-id="${role.id}">
            변경 ⇄
          </button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

// 5-3. 교실 게시판 부착용 A4 인쇄 서식 렌더링
function renderPrintSheet() {
  const schoolEl = document.getElementById("print-school-name");
  const periodEl = document.getElementById("print-period-display");
  const totalCountEl = document.getElementById("print-total-count");
  const dateEl = document.getElementById("print-today-date");
  const tbody = document.getElementById("print-table-body");

  if (schoolEl) schoolEl.textContent = appState.className;
  if (periodEl) periodEl.textContent = appState.periodName;
  if (totalCountEl) totalCountEl.textContent = appState.roles.length;

  // 오늘 날짜 포맷 (예: 2026. 10. 17.)
  const now = new Date();
  const dateStr = `${now.getFullYear()}. ${String(now.getMonth() + 1).padStart(2, '0')}. ${String(now.getDate()).padStart(2, '0')}.`;
  if (dateEl) dateEl.textContent = dateStr;

  if (!tbody) return;

  let html = "";
  appState.roles.forEach((role, idx) => {
    const assignment = appState.assignments.find(a => a.roleId === role.id);
    const studentName = assignment && assignment.student ? assignment.student : "미배정";

    html += `
      <tr>
        <td class="p-col-no">${idx + 1}</td>
        <td class="p-col-role">
          <span style="margin-right: 4px;">${role.emoji || "🌟"}</span>
          ${escapeHtml(role.title)}
        </td>
        <td class="p-col-duty">${escapeHtml(role.duty)}</td>
        <td class="p-col-student">${escapeHtml(studentName)}</td>
        <td class="p-col-check">□ □ □ □ □</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

// ========================================================
// 6. 모달 제어 (Sheets Modal, Manage Modal, Swap Modal)
// ========================================================

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("hidden");
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("hidden");
  }
}

// 6-1. 구글 스프레드시트 모달
function initSheetsModal() {
  const btnLoad = document.getElementById("btn-sheet-load");
  const btnSave = document.getElementById("btn-sheet-save");
  const modal = document.getElementById("modal-sheets");
  const btnClose = document.getElementById("btn-close-sheets-modal");
  const inputUrl = document.getElementById("input-apps-script-url");
  const btnSaveConfig = document.getElementById("btn-save-sheets-config");
  const btnTestFetch = document.getElementById("btn-test-sheets-fetch");
  const btnTestSave = document.getElementById("btn-test-sheets-save");
  const btnCopyGasCode = document.getElementById("btn-copy-gas-code");

  function openSheetsModalWithSync() {
    if (inputUrl) inputUrl.value = appState.appsScriptUrl || "";
    openModal("modal-sheets");
  }

  btnLoad?.addEventListener("click", () => {
    if (!appState.appsScriptUrl) {
      openSheetsModalWithSync();
      showToast("먼저 구글 Apps Script Web App URL을 설정해 주세요.", "info");
    } else {
      executeSheetsFetch();
    }
  });

  btnSave?.addEventListener("click", () => {
    if (!appState.appsScriptUrl) {
      openSheetsModalWithSync();
      showToast("먼저 구글 Apps Script Web App URL을 설정해 주세요.", "info");
    } else {
      executeSheetsSave();
    }
  });

  btnClose?.addEventListener("click", () => closeModal("modal-sheets"));

  modal?.addEventListener("click", (e) => {
    if (e.target === modal) closeModal("modal-sheets");
  });

  btnSaveConfig?.addEventListener("click", () => {
    const url = inputUrl?.value.trim() || "";
    appState.appsScriptUrl = url;
    saveStateToStorage();
    closeModal("modal-sheets");
    showToast("구글 스프레드시트 연동 URL이 저장되었습니다.", "success");
  });

  btnTestFetch?.addEventListener("click", () => {
    const url = inputUrl?.value.trim() || "";
    if (!url) {
      showToast("구글 Apps Script Web App URL을 입력하세요.", "warning");
      return;
    }
    appState.appsScriptUrl = url;
    saveStateToStorage();
    executeSheetsFetch();
  });

  btnTestSave?.addEventListener("click", () => {
    const url = inputUrl?.value.trim() || "";
    if (!url) {
      showToast("구글 Apps Script Web App URL을 입력하세요.", "warning");
      return;
    }
    appState.appsScriptUrl = url;
    saveStateToStorage();
    executeSheetsSave();
  });

  btnCopyGasCode?.addEventListener("click", () => {
    const codeEl = document.getElementById("gas-code-sample");
    if (codeEl) {
      navigator.clipboard.writeText(codeEl.textContent.trim()).then(() => {
        showToast("Apps Script 소스 코드가 클립보드에 복사되었습니다!", "success");
      }).catch(() => {
        showToast("복사 권한이 거부되었습니다.", "warning");
      });
    }
  });
}

// 구글 스프레드시트 실제 Fetch 동작
async function executeSheetsFetch() {
  if (!appState.appsScriptUrl) return;

  showToast("구글 스프레드시트에서 데이터를 불러오는 중...", "info");
  try {
    const response = await fetch(appState.appsScriptUrl, {
      method: "GET",
      headers: { "Accept": "application/json" }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }

    const data = await response.json();
    if (data.students && Array.isArray(data.students) && data.students.length > 0) {
      appState.students = data.students;
    }
    if (data.roles && Array.isArray(data.roles) && data.roles.length > 0) {
      appState.roles = data.roles.map((r, i) => ({
        id: i + 1,
        emoji: r.emoji || "🌟",
        title: r.name || r.title || `역할 ${i + 1}`,
        duty: r.duty || ""
      }));
    }

    saveStateToStorage();
    renderApp();
    showToast(`시트에서 학생 ${appState.students.length}명, 역할 ${appState.roles.length}개를 성공적으로 불러왔습니다!`, "success");
    closeModal("modal-sheets");
  } catch (err) {
    console.error("Sheets fetch error:", err);
    showToast(`시트 불러오기 오류: URL 권한 및 배포 상태(Anyone)를 확인하세요.`, "warning");
  }
}

// 구글 스프레드시트 결과 저장 동작
async function executeSheetsSave() {
  if (!appState.appsScriptUrl) return;

  showToast("현재 배정 결과를 구글 스프레드시트에 전송하는 중...", "info");
  try {
    const payload = {
      className: appState.className,
      periodName: appState.periodName,
      timestamp: new Date().toISOString(),
      assignments: appState.roles.map(role => {
        const a = appState.assignments.find(x => x.roleId === role.id);
        return {
          roleId: role.id,
          roleTitle: role.title,
          student: a ? a.student : "미배정",
          duty: role.duty
        };
      })
    };

    // Google Apps Script endpoint requires no-cors or redirect handling
    await fetch(appState.appsScriptUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    showToast("구글 스프레드시트에 배정 결과가 성공적으로 전송되었습니다!", "success");
    closeModal("modal-sheets");
  } catch (err) {
    console.error("Sheets save error:", err);
    showToast("시트 저장 중 오류가 발생했습니다. URL을 확인해 주세요.", "warning");
  }
}

// 6-2. 명단 및 역할 관리 모달
function initManageModal() {
  const btnOpen = document.getElementById("btn-open-manage");
  const modal = document.getElementById("modal-manage");
  const btnClose = document.getElementById("btn-close-manage-modal");
  const btnSave = document.getElementById("btn-save-manage");
  const textareaStudents = document.getElementById("textarea-students");
  const inputNewStudent = document.getElementById("input-new-student");
  const btnAddStudent = document.getElementById("btn-add-student");
  const btnClearStudents = document.getElementById("btn-clear-students");
  const btnResetRoles = document.getElementById("btn-reset-default-roles");
  const btnAddRole = document.getElementById("btn-add-role");

  function refreshManageModal() {
    if (textareaStudents) {
      textareaStudents.value = appState.students.join("\n");
    }
    const studentCountEl = document.getElementById("manage-student-count");
    if (studentCountEl) studentCountEl.textContent = appState.students.length;
    renderRolesEditor();
  }

  btnOpen?.addEventListener("click", () => {
    refreshManageModal();
    openModal("modal-manage");
  });

  btnClose?.addEventListener("click", () => closeModal("modal-manage"));
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) closeModal("modal-manage");
  });

  // 개별 학생 즉시 추가
  btnAddStudent?.addEventListener("click", () => {
    const name = inputNewStudent?.value.trim();
    if (name) {
      if (!appState.students.includes(name)) {
        appState.students.push(name);
        inputNewStudent.value = "";
        refreshManageModal();
      } else {
        showToast("이미 명단에 존재하는 학생입니다.", "info");
      }
    }
  });

  inputNewStudent?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      btnAddStudent?.click();
    }
  });

  btnClearStudents?.addEventListener("click", () => {
    if (confirm("정말로 학생 명단을 모두 비우시겠습니까?")) {
      appState.students = [];
      refreshManageModal();
    }
  });

  btnResetRoles?.addEventListener("click", () => {
    if (confirm("기본 12개 초등 학급 역할로 복원하시겠습니까?")) {
      appState.roles = JSON.parse(JSON.stringify(DEFAULT_ROLES));
      refreshManageModal();
      showToast("기본 12개 역할로 복원되었습니다.", "info");
    }
  });

  // 새 역할 등록
  btnAddRole?.addEventListener("click", () => {
    const emoji = document.getElementById("input-new-role-emoji")?.value.trim() || "🌟";
    const title = document.getElementById("input-new-role-title")?.value.trim();
    const duty = document.getElementById("input-new-role-duty")?.value.trim() || "";

    if (!title) {
      showToast("역할 이름을 입력해 주세요.", "warning");
      return;
    }

    const nextId = appState.roles.length > 0 ? Math.max(...appState.roles.map(r => r.id)) + 1 : 1;
    appState.roles.push({
      id: nextId,
      emoji: emoji,
      title: title,
      duty: duty
    });

    document.getElementById("input-new-role-title").value = "";
    document.getElementById("input-new-role-duty").value = "";
    refreshManageModal();
    showToast(`'${title}' 역할이 추가되었습니다.`, "success");
  });

  // 저장 버튼
  btnSave?.addEventListener("click", () => {
    if (textareaStudents) {
      const rawText = textareaStudents.value;
      const parsedStudents = rawText
        .split(/[\n,]/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      appState.students = parsedStudents;
    }

    saveStateToStorage();
    renderApp();
    closeModal("modal-manage");
    showToast("명단과 역할 변경 사항이 적용되었습니다.", "success");
  });
}

function renderRolesEditor() {
  const container = document.getElementById("roles-editor-list");
  const countEl = document.getElementById("manage-role-count");
  if (countEl) countEl.textContent = appState.roles.length;
  if (!container) return;

  let html = "";
  appState.roles.forEach((role, idx) => {
    html += `
      <div class="role-editor-item" data-id="${role.id}">
        <span style="font-size: 1.1rem; width: 28px; text-align: center;">${role.emoji || "🌟"}</span>
        <input type="text" value="${escapeHtml(role.title)}" class="role-edit-title" style="width: 140px;" placeholder="역할명" />
        <input type="text" value="${escapeHtml(role.duty)}" class="role-edit-duty" style="flex: 1;" placeholder="맡은 일 설명" />
        <button class="btn-mini btn-danger-text" data-action="delete-role" data-id="${role.id}" title="역할 삭제">삭제</button>
      </div>
    `;
  });

  container.innerHTML = html;

  // 인라인 수정 이벤트 리스너 바인딩
  container.querySelectorAll(".role-editor-item").forEach(item => {
    const id = parseInt(item.getAttribute("data-id"), 10);
    const titleInput = item.querySelector(".role-edit-title");
    const dutyInput = item.querySelector(".role-edit-duty");
    const deleteBtn = item.querySelector("[data-action='delete-role']");

    titleInput?.addEventListener("change", (e) => {
      const target = appState.roles.find(r => r.id === id);
      if (target) target.title = e.target.value.trim();
    });

    dutyInput?.addEventListener("change", (e) => {
      const target = appState.roles.find(r => r.id === id);
      if (target) target.duty = e.target.value.trim();
    });

    deleteBtn?.addEventListener("click", () => {
      appState.roles = appState.roles.filter(r => r.id !== id);
      appState.assignments = appState.assignments.filter(a => a.roleId !== id);
      renderRolesEditor();
    });
  });
}

// 6-3. 학생 수동 교환/재배정 모달
let currentSwappingRoleId = null;

function initSwapModal() {
  const modal = document.getElementById("modal-swap");
  const btnClose = document.getElementById("btn-close-swap-modal");
  const selectStudent = document.getElementById("select-student-target");
  const btnConfirm = document.getElementById("btn-confirm-swap");
  const roleInfoEl = document.getElementById("swap-role-info");

  btnClose?.addEventListener("click", () => closeModal("modal-swap"));
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) closeModal("modal-swap");
  });

  btnConfirm?.addEventListener("click", () => {
    if (!currentSwappingRoleId || !selectStudent) return;
    const targetStudent = selectStudent.value;

    const currentAssignment = appState.assignments.find(a => a.roleId === currentSwappingRoleId);
    const oldStudent = currentAssignment ? currentAssignment.student : "미배정";

    // 만약 이미 다른 역할을 맡고 있던 학생이라면 맞교환 (Swap)
    const existingOtherAssignment = appState.assignments.find(a => a.roleId !== currentSwappingRoleId && a.student === targetStudent);

    if (existingOtherAssignment) {
      existingOtherAssignment.student = oldStudent;
      currentAssignment.student = targetStudent;
      showToast(`'${targetStudent}' 학생과 '${oldStudent}' 학생의 역할이 맞교환되었습니다.`, "success");
    } else {
      if (currentAssignment) {
        currentAssignment.student = targetStudent;
      } else {
        appState.assignments.push({ roleId: currentSwappingRoleId, student: targetStudent });
      }
      showToast(`담당 학생이 '${targetStudent}'(으)로 변경되었습니다.`, "success");
    }

    saveStateToStorage();
    renderApp();
    closeModal("modal-swap");
  });
}

function openSwapModalForRole(roleId) {
  currentSwappingRoleId = roleId;
  const role = appState.roles.find(r => r.id === roleId);
  const assignment = appState.assignments.find(a => a.roleId === roleId);
  const currentStudent = assignment ? assignment.student : "미배정";

  const infoEl = document.getElementById("swap-role-info");
  if (infoEl && role) {
    infoEl.innerHTML = `
      <div style="background: #F8FAFC; padding: 12px; border-radius: 10px; margin-bottom: 12px; border: 1px solid #E2E8F0;">
        <span style="font-size: 1.5rem; margin-right: 6px;">${role.emoji}</span>
        <strong style="font-size: 1.1rem; color: #1E293B;">${escapeHtml(role.title)}</strong>
        <div style="margin-top: 6px; font-size: 0.88rem; color: #64748B;">
          현재 담당: <span style="font-weight: 700; color: #D84315;">${escapeHtml(currentStudent)}</span>
        </div>
      </div>
    `;
  }

  const select = document.getElementById("select-student-target");
  if (select) {
    let optionsHtml = `<option value="미배정">미배정 (비워두기)</option>`;
    appState.students.forEach(student => {
      const assignedRole = appState.assignments.find(a => a.student === student && a.roleId !== roleId);
      const suffix = assignedRole ? ` (현재: 역할 #${assignedRole.roleId})` : "";
      const isSelected = student === currentStudent ? "selected" : "";
      optionsHtml += `<option value="${escapeHtml(student)}" ${isSelected}>${escapeHtml(student)}${suffix}</option>`;
    });
    select.innerHTML = optionsHtml;
  }

  openModal("modal-swap");
}

// ========================================================
// 7. A4 인쇄 및 클립보드 텍스트 복사 기능
// ========================================================

function initActions() {
  const btnAssign = document.getElementById("btn-assign");
  const btnPrint = document.getElementById("btn-print");
  const btnCopy = document.getElementById("btn-copy-text");
  const btnReset = document.getElementById("btn-reset");
  const searchInput = document.getElementById("input-search");
  const btnGrid = document.getElementById("btn-view-grid");
  const btnTable = document.getElementById("btn-view-table");
  const cardsContainer = document.getElementById("role-cards-container");
  const tableContainer = document.getElementById("role-table-container");
  const inputClassName = document.getElementById("input-class-name");
  const inputPeriodName = document.getElementById("input-period-name");

  // 무작위 역할 배정 버튼
  btnAssign?.addEventListener("click", () => {
    assignRolesRandomly();
  });

  // A4 게시판 인쇄 버튼
  btnPrint?.addEventListener("click", () => {
    renderPrintSheet();
    window.print();
  });

  // 메신저 및 알림장용 텍스트 복사 버튼
  btnCopy?.addEventListener("click", () => {
    let text = `[${appState.className} 1인 1역할 배정표]\n`;
    text += `기간: ${appState.periodName}\n\n`;

    appState.roles.forEach((role, i) => {
      const a = appState.assignments.find(x => x.roleId === role.id);
      const studentName = a ? a.student : "미배정";
      text += `${i + 1}. ${role.emoji} ${role.title}: ${studentName} (${role.duty})\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      showToast("📋 전체 역할 배정 텍스트가 복사되었습니다! (알림장·메신저 붙여넣기)", "success");
    }).catch(() => {
      showToast("복사 실패: 권한을 허용해 주세요.", "warning");
    });
  });

  // 초기화 버튼
  btnReset?.addEventListener("click", () => {
    if (confirm("배정 상태를 초기화하시겠습니까?")) {
      appState.assignments = appState.roles.map(r => ({ roleId: r.id, student: "미배정" }));
      saveStateToStorage();
      renderApp();
      showToast("배정 상태가 초기화되었습니다.", "info");
    }
  });

  // 실시간 검색
  searchInput?.addEventListener("input", (e) => {
    appState.searchQuery = e.target.value;
    renderCardsGrid();
    renderTableView();
  });

  // 뷰 전환 (카드 vs 명렬표)
  btnGrid?.addEventListener("click", () => {
    btnGrid.classList.add("active");
    btnTable?.classList.remove("active");
    cardsContainer?.classList.remove("hidden");
    tableContainer?.classList.add("hidden");
    appState.activeView = "grid";
  });

  btnTable?.addEventListener("click", () => {
    btnTable.classList.add("active");
    btnGrid?.classList.remove("active");
    cardsContainer?.classList.add("hidden");
    tableContainer?.classList.remove("hidden");
    appState.activeView = "table";
  });

  // 학급명 및 기간 편집 반영
  inputClassName?.addEventListener("change", (e) => {
    appState.className = e.target.value.trim() || "우리 반";
    saveStateToStorage();
    renderPrintSheet();
  });

  inputPeriodName?.addEventListener("change", (e) => {
    appState.periodName = e.target.value.trim() || "";
    saveStateToStorage();
    renderPrintSheet();
  });

  // 카드 및 테이블 내의 "조정/변경" 버튼 위임 처리
  document.addEventListener("click", (e) => {
    const swapBtn = e.target.closest("[data-action='swap']");
    if (swapBtn) {
      const roleId = parseInt(swapBtn.getAttribute("data-role-id"), 10);
      if (roleId) {
        openSwapModalForRole(roleId);
      }
    }
  });
}

// ========================================================
// 8. 토스트 알림 (Toast UI)
// ========================================================

function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.setAttribute("role", "alert");
  toast.innerHTML = `<span>${escapeHtml(message)}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = "opacity 0.3s, transform 0.3s";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ========================================================
// 9. 초기화 실행 (App Bootstrap)
// ========================================================

document.addEventListener("DOMContentLoaded", () => {
  loadStateFromStorage();
  initSheetsModal();
  initManageModal();
  initSwapModal();
  initActions();
  renderApp();
});
