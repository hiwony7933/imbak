// Golfmon API 분석을 위한 스크립트 파일
console.log("API Analyzer script loaded.");

// --- IndexedDB 설정 ---
const DB_NAME = "GolfmonDB";
const TEE_TIMES_STORE_NAME = "teeTimes";
const RAW_RESPONSES_STORE_NAME = "rawResponses";
let db;

/**
 * IndexedDB를 초기화하고, 필요 시 객체 저장소(테이블)를 생성합니다.
 * @returns {Promise<IDBDatabase>} 초기화된 DB 객체
 */
function initDB() {
  return new Promise((resolve, reject) => {
    // DB 버전을 2로 올려 스키마 변경(onupgradeneeded)을 트리거합니다.
    const request = indexedDB.open(DB_NAME, 2);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      // 가공된 데이터 저장소 (기존)
      if (!db.objectStoreNames.contains(TEE_TIMES_STORE_NAME)) {
        const store = db.createObjectStore(TEE_TIMES_STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("date", "date", { unique: false });
        store.createIndex("regionName", "regionName", { unique: false });
        store.createIndex("course_date_idx", ["name", "date"], {
          unique: false,
        });
      }
      // 원본 데이터 저장소 (신규)
      if (!db.objectStoreNames.contains(RAW_RESPONSES_STORE_NAME)) {
        // 키는 'date_locationId' 형식의 문자열로 직접 생성합니다.
        db.createObjectStore(RAW_RESPONSES_STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };

    request.onerror = (event) => {
      console.error("IndexedDB error:", event.target.error);
      reject(event.target.error);
    };
  });
}

/**
 * 모든 DB 저장소의 모든 데이터를 삭제합니다.
 * @returns {Promise<void>}
 */
function clearDBStores() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      [TEE_TIMES_STORE_NAME, RAW_RESPONSES_STORE_NAME],
      "readwrite"
    );
    const teeTimesStore = transaction.objectStore(TEE_TIMES_STORE_NAME);
    const rawResponsesStore = transaction.objectStore(RAW_RESPONSES_STORE_NAME);
    teeTimesStore.clear();
    rawResponsesStore.clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = (event) => reject(event.target.error);
  });
}

/**
 * 단일 원본 API 응답을 DB에 추가합니다.
 * @param {Object} item - DB에 추가할 원본 데이터
 * @returns {Promise<void>}
 */
function addRawResponseToDB(item) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([RAW_RESPONSES_STORE_NAME], "readwrite");
    const store = transaction.objectStore(RAW_RESPONSES_STORE_NAME);
    store.put(item);
    transaction.oncomplete = () => resolve();
    transaction.onerror = (event) => reject(event.target.error);
  });
}

/**
 * 여러 티타임 데이터를 DB에 추가합니다.
 * @param {Array<Object>} items - DB에 추가할 데이터 배열
 * @returns {Promise<void>}
 */
function addItemsToDB(items) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([TEE_TIMES_STORE_NAME], "readwrite");
    const store = transaction.objectStore(TEE_TIMES_STORE_NAME);
    items.forEach((item) => store.put(item));
    transaction.oncomplete = () => resolve();
    transaction.onerror = (event) => reject(event.target.error);
  });
}

/**
 * DB에서 모든 티타임 데이터를 가져옵니다.
 * @returns {Promise<Array<Object>>}
 */
function getAllItemsFromDB() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([TEE_TIMES_STORE_NAME], "readonly");
    const store = transaction.objectStore(TEE_TIMES_STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

// --- 기존 로직 (수정됨) ---

let allTeeTimes = []; // 메모리 캐시용

const buildDbBtn = document.getElementById("build-db-btn");
const showDataBtn = document.getElementById("show-data-btn");
const downloadBtn = document.getElementById("download-csv-btn");
const progressContainer = document.getElementById("progress-container");
const progressText = document.getElementById("progress-text");
const tableContainer = document.getElementById("table-container");

async function fetchGolfData(locationId, date) {
  try {
    const response = await fetch("/api/golfmon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location_id: locationId, dates: date }),
    });

    // 서버의 원본 응답을 텍스트로 먼저 확인합니다.
    const responseText = await response.text();
    console.log(`[Raw Response for ${date}/${locationId}]:`, responseText);

    if (!response.ok) {
      console.error(`HTTP 에러 발생! Status: ${response.status}`);
      return null;
    }

    // 텍스트를 JSON으로 파싱 시도
    try {
      return JSON.parse(responseText);
    } catch (e) {
      console.error("응답을 JSON으로 파싱하는데 실패했습니다:", e);
      return null;
    }
  } catch (error) {
    console.error(`Fetch error for ${locationId}/${date}:`, error);
    return null;
  }
}

function renderTable(data) {
  if (!data || data.length === 0) {
    tableContainer.innerHTML =
      "<p>표시할 데이터가 없습니다. DB 구축을 먼저 실행해주세요.</p>";
    return;
  }
  const headers = ["날짜", "지역", "골프장명", "시간", "그린피", "인원"];
  const table = document.createElement("table");
  const thead = table.createTHead();
  const headerRow = thead.insertRow();
  headers.forEach((text) => {
    const th = document.createElement("th");
    th.textContent = text;
    headerRow.appendChild(th);
  });
  const tbody = table.createTBody();
  data.forEach((item) => {
    const row = tbody.insertRow();
    row.insertCell().textContent = item.date;
    row.insertCell().textContent = item.regionName;
    row.insertCell().textContent = item.name;
    row.insertCell().textContent = new Date(item.dates).toLocaleTimeString(
      "ko-KR",
      { hour: "2-digit", minute: "2-digit" }
    );
    row.insertCell().textContent =
      Number(item.greenFee).toLocaleString() + "원";
    row.insertCell().textContent = `${item.counts}명 / ${item.join_type_text}`;
  });
  tableContainer.innerHTML = "";
  tableContainer.appendChild(table);
}

function convertToCSV(data) {
  const headers = [
    "Date",
    "Region",
    "CourseName",
    "Time",
    "GreenFee",
    "JoinType",
  ];
  const rows = data.map((item) =>
    [
      item.date,
      item.regionName,
      `"${item.name}"`,
      new Date(item.dates).toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      item.greenFee,
      `${item.counts}명 / ${item.join_type_text}`,
    ].join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

function downloadCSV() {
  if (allTeeTimes.length === 0) {
    alert(
      '조회된 데이터가 없습니다. 먼저 "저장된 데이터 조회" 버튼을 눌러주세요.'
    );
    return;
  }
  const csvString = convertToCSV(allTeeTimes);
  const blob = new Blob([`\uFEFF${csvString}`], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", "golfmon_analysis.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * DB 구축 시작 함수
 */
async function buildDatabase() {
  buildDbBtn.disabled = true;
  showDataBtn.disabled = true;
  downloadBtn.disabled = true;
  progressContainer.style.display = "block";
  progressText.textContent = "기존 데이터를 삭제하는 중...";

  await clearDBStores();

  const tasks = [];
  const currentYear = new Date().getFullYear(); // 현재 연도를 동적으로 가져옴
  const startDate = new Date(`${currentYear}-06-15`);
  const endDate = new Date(`${currentYear}-06-22`);

  for (
    let d = new Date(startDate.getTime());
    d <= endDate;
    d.setDate(d.getDate() + 1)
  ) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const dateString = `${year}-${month}-${day}`;
    for (const course of GOLF_COURSES) {
      tasks.push({
        date: dateString,
        locationId: course.id,
        locationName: course.name,
      });
    }
  }

  const totalTasks = tasks.length;
  let collectedCount = 0;

  for (let i = 0; i < totalTasks; i++) {
    const task = tasks[i];
    progressText.textContent = `[${i + 1}/${totalTasks}] '${
      task.locationName
    }' (${task.date}) 데이터 수집 중...`;

    const result = await fetchGolfData(task.locationId, task.date);

    if (result) {
      const rawDataToStore = {
        id: `${task.date}_${task.locationId}`,
        ...result,
      };
      await addRawResponseToDB(rawDataToStore);
    }

    if (
      result &&
      result.entity &&
      Array.isArray(result.entity) &&
      result.entity.length > 0
    ) {
      const processedItems = result.entity.map((item) => ({
        ...item,
        regionName: task.locationName,
        date: task.date,
        join_type_text:
          { 1: "무관", 2: "커플", 3: "남성", 4: "여성" }[item.joinTypeStr] ||
          "무관",
      }));
      await addItemsToDB(processedItems);
      collectedCount += processedItems.length;
    }
    await sleep(500);
  }

  progressText.textContent = `DB 구축 완료! 총 ${collectedCount}개의 티타임을 저장했습니다. (API 원본 응답 ${totalTasks}개 포함)`;
  buildDbBtn.disabled = false;
  showDataBtn.disabled = false;
}

/**
 * DB에서 데이터 조회 후 테이블 렌더링
 */
async function showData() {
  showDataBtn.disabled = true;
  progressContainer.style.display = "block";
  progressText.textContent = "DB에서 가공된 티타임 데이터를 조회하는 중...";

  allTeeTimes = await getAllItemsFromDB();
  allTeeTimes.sort((a, b) => new Date(a.dates) - new Date(b.dates));

  progressText.textContent = `총 ${allTeeTimes.length}개의 가공된 데이터를 조회했습니다.`;
  renderTable(allTeeTimes);

  showDataBtn.disabled = false;
  if (allTeeTimes.length > 0) {
    downloadBtn.disabled = false;
  }
}

// --- 이벤트 리스너 ---
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await initDB();
    buildDbBtn.addEventListener("click", buildDatabase);
    showDataBtn.addEventListener("click", showData);
    downloadBtn.addEventListener("click", downloadCSV);
    // DB가 존재하면 조회/다운로드 버튼 활성화
    const items = await getAllItemsFromDB();
    if (items.length > 0) {
      showDataBtn.disabled = false;
    }
  } catch (error) {
    progressText.textContent =
      "DB를 초기화하는 데 실패했습니다. 브라우저가 IndexedDB를 지원하는지 확인해주세요.";
    progressContainer.style.display = "block";
  }
});
