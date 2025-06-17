document.addEventListener("DOMContentLoaded", function () {
  // --- DOM 요소 ---
  const form = document.querySelector(".filter-container form");
  const dateInput = document.getElementById("date");
  const dateDisplay = document.getElementById("date_display");
  const dateFormatted = document.getElementById("date_formatted");
  const locationSelect = document.getElementById("location_id");
  const searchBtn = document.getElementById("searchBtn");
  const toggleBtn = document.getElementById("filterToggleBtn");
  const checkboxContainer = document.querySelector(".checkbox-container");
  const lowestPriceToggleBtn = document.getElementById("lowestPriceToggleBtn");
  const resultsContainer = document.querySelector(".container");

  // --- 상세 필터 요소 ---
  const openFilterPanelBtn = document.getElementById("openFilterPanelBtn");
  const filterPanel = document.getElementById("filterPanel");
  const closePanelBtn = document.getElementById("closePanelBtn");
  const applyFiltersBtn = document.getElementById("applyFiltersBtn");
  const resetFiltersBtn = document.getElementById("resetFiltersBtn");

  // --- 상태 변수 ---
  let currentFilters = {
    hole: "all", // 'all', '18', 'other'
    time: "all", // 'all', '1', '2', '3'
    lowestPrice: false,
  };

  // 그룹화 상태 관리
  let expandedGroups = {}; // 확장된 그룹 상태 저장 (골프장명 -> boolean)

  // --- 함수 ---

  /**
   * 날짜 문자열을 'YY.MM.DD' 형식으로 변환
   * @param {string} dateString - 변환할 날짜 문자열
   * @returns {string} 포맷된 날짜
   */
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const year = date.getFullYear().toString().substr(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}.${month}.${day}`;
  };

  /**
   * 검색 결과로 렌더링된 개별 카드들을 골프장별로 그룹화합니다.
   * 이 함수는 페이지 로드 시 또는 검색 결과가 업데이트될 때 한 번만 호출되어야 합니다.
   */
  const groupAllCards = () => {
    if (!resultsContainer || !resultsContainer.querySelector(".card-link")) {
      // 그룹화할 카드가 없으면 아무것도 하지 않음
      return;
    }

    const allCards = Array.from(
      resultsContainer.querySelectorAll(".card-link")
    );
    const groupedCards = {};

    // 골프장 이름(h2)을 기준으로 카드들을 그룹화
    allCards.forEach((card) => {
      const venueName = card.querySelector("h2")?.textContent.trim();
      if (venueName) {
        if (!groupedCards[venueName]) {
          groupedCards[venueName] = [];
        }
        groupedCards[venueName].push(card);
      }
    });

    // 기존 카드 컨테이너 비우기
    resultsContainer.innerHTML = "";

    // 그룹화된 카드를 DOM에 추가
    Object.keys(groupedCards).forEach((venueName) => {
      const cardsInGroup = groupedCards[venueName];
      const groupContainer = document.createElement("div");
      groupContainer.className = "group-card-container";
      groupContainer.dataset.venueName = venueName;

      // 그룹 대표 카드 (부모)
      const groupCard = document.createElement("div");
      groupCard.className = "card group-card";
      groupCard.innerHTML = `
        <div class="group-card-header">
          <h2>${venueName}</h2>
          <span class="count-badge">${cardsInGroup.length}개</span>
          <button class="expand-toggle-btn"></button>
        </div>
      `;

      // 상세 카드 컨테이너 (자식)
      const detailCardsContainer = document.createElement("div");
      detailCardsContainer.className = "detail-cards-container";

      cardsInGroup.forEach((card) => {
        detailCardsContainer.appendChild(card);
      });

      // 그룹에 부모와 자식 카드 추가
      groupContainer.appendChild(groupCard);
      groupContainer.appendChild(detailCardsContainer);
      resultsContainer.appendChild(groupContainer);

      // 확장/축소 이벤트 리스너 추가
      groupCard.addEventListener("click", () => {
        expandedGroups[venueName] = !expandedGroups[venueName];
        groupContainer.classList.toggle("expanded", expandedGroups[venueName]);
      });
    });
  };

  /**
   * 클라이언트 사이드 필터(상세, 최저가)를 적용하여 카드 표시 여부를 결정.
   * 이 함수는 정렬 순서를 변경하지 않습니다.
   */
  const applyClientFilters = () => {
    if (!resultsContainer) {
      console.error("결과 컨테이너를 찾을 수 없습니다.");
      return;
    }

    const holeRegex = /\(P(?:9|6)\)|9H|6H|9\*2|6홀/i;
    let totalVisibleTeeTimes = 0;

    document.querySelectorAll(".group-card-container").forEach((group) => {
      const venueName = group.dataset.venueName;

      // 1. 홀 필터 (부모 그룹에 적용)
      const passesHoleFilter =
        currentFilters.hole === "all" ||
        (currentFilters.hole === "18"
          ? !holeRegex.test(venueName)
          : holeRegex.test(venueName));

      if (!passesHoleFilter) {
        group.style.display = "none";
        return;
      }

      // 2. 시간대 및 최저가 필터 (자식 카드에 적용)
      let visibleChildrenCount = 0;
      group.querySelectorAll(".card-link").forEach((card) => {
        const timeElement = card.querySelector(".date-info .info-value");
        const isLowest = card.querySelector(".lowest-price-badge") !== null;

        // 시간 필터링
        let timeMatch = true;
        if (currentFilters.time !== "all" && timeElement) {
          const timeMatchResult = timeElement.textContent.match(
            /\d{2}\/\d{2} (\d{2}:\d{2})/
          );
          if (timeMatchResult) {
            const hour = parseInt(timeMatchResult[1].split(":")[0], 10);
            const part = currentFilters.time;
            if (part === "1") timeMatch = hour >= 5 && hour < 11;
            else if (part === "2") timeMatch = hour >= 11 && hour < 17;
            else if (part === "3") timeMatch = hour >= 17;
          } else {
            timeMatch = false; // 시간 정보가 없으면 필터에 걸림
          }
        }

        // 최저가 필터링
        const lowestPriceMatch = !currentFilters.lowestPrice || isLowest;

        // 최종 표시 여부
        if (timeMatch && lowestPriceMatch) {
          card.style.display = "";
          visibleChildrenCount++;
        } else {
          card.style.display = "none";
        }
      });

      // 뱃지 카운트 업데이트 및 그룹 전체 표시 여부 결정
      group.querySelector(
        ".count-badge"
      ).textContent = `${visibleChildrenCount}개`;

      if (visibleChildrenCount > 0) {
        group.style.display = "";
        totalVisibleTeeTimes += visibleChildrenCount;
      } else {
        group.style.display = "none";
      }
    });

    const resultsCountElement = document.getElementById("results-count");
    if (resultsCountElement)
      resultsCountElement.textContent = totalVisibleTeeTimes;
  };

  /**
   * 페이지 로드 시 필터 상태 초기화
   */
  const initializeFilters = () => {
    // 최저가 필터
    const savedLowestPrice =
      localStorage.getItem("golfmon_lowest_price_filter") === "true";
    if (savedLowestPrice) {
      currentFilters.lowestPrice = true;
      if (lowestPriceToggleBtn) lowestPriceToggleBtn.classList.add("active");
    }
  };

  /**
   * 로딩 상태를 표시하며 폼을 제출
   * @param {string} source - 요청 출처 ('location', 'date', 'sort', 'search')
   */
  const submitWithLoading = (source) => {
    // 폼에 출처(source)를 알리는 히든 필드 추가
    let sourceInput = form.querySelector('input[name="source"]');
    if (!sourceInput) {
      sourceInput = document.createElement("input");
      sourceInput.type = "hidden";
      sourceInput.name = "source";
      form.appendChild(sourceInput);
    }
    sourceInput.value = source;

    // 검색 버튼 클릭 시에만 필터 상태를 저장
    if (source === "search") {
      // 필터를 접어야 한다고 로컬 스토리지에 기록
      if (toggleBtn && toggleBtn.getAttribute("aria-expanded") === "true") {
        localStorage.setItem("filterExpanded", "false");
      }
    } else {
      // 지역/날짜 변경 시에는 현재 필터 상태를 유지
      if (toggleBtn) {
        const isCurrentlyExpanded =
          toggleBtn.getAttribute("aria-expanded") === "true";
        localStorage.setItem("filterExpanded", String(isCurrentlyExpanded));
      }
    }

    // 로딩 UI 활성화
    const searchIcon = document.querySelector(".search-icon");
    const loadingIcon = document.querySelector(".loading-icon");
    if (searchBtn && searchIcon && loadingIcon) {
      searchBtn.disabled = true;
      searchIcon.style.display = "none";
      loadingIcon.style.display = "inline-block";
      searchBtn.classList.add("loading");
    }
    if (toggleBtn) {
      toggleBtn.classList.add("loading-state");
    }

    // 결과 목록 페이드 아웃
    if (resultsContainer) {
      resultsContainer.style.transition = "opacity 0.3s ease";
      resultsContainer.style.opacity = "0.6";
    }

    form.submit();
  };

  /**
   * '전체 선택' 체크박스의 상태를 업데이트
   */
  const updateSelectAllState = () => {
    if (!checkboxContainer) return;
    const selectAllCheckbox = document.getElementById("select-all-venues");
    const venueCheckboxes = document.querySelectorAll(
      '.venue-checkbox:not(.select-all) input[type="checkbox"]'
    );
    if (!selectAllCheckbox || venueCheckboxes.length === 0) return;

    const allChecked = Array.from(venueCheckboxes).every((cb) => cb.checked);
    const someChecked = Array.from(venueCheckboxes).some((cb) => cb.checked);

    selectAllCheckbox.checked = allChecked;
    selectAllCheckbox.indeterminate = someChecked && !allChecked;
  };

  /**
   * 필터 패널 UI를 현재 필터 상태에 맞게 업데이트
   */
  const updateFilterPanelUI = () => {
    document
      .querySelectorAll('.filter-btn[data-filter-group="hole"]')
      .forEach((btn) => {
        btn.classList.toggle(
          "active",
          btn.dataset.filterValue === currentFilters.hole
        );
      });
    document
      .querySelectorAll('.filter-btn[data-filter-group="time"]')
      .forEach((btn) => {
        btn.classList.toggle(
          "active",
          btn.dataset.filterValue === currentFilters.time
        );
      });
  };

  // --- 이벤트 리스너 설정 ---

  // 날짜 변경 시
  if (dateInput) {
    dateInput.addEventListener("change", function () {
      if (this.value) {
        const formatted = formatDate(this.value);
        if (dateDisplay) dateDisplay.value = formatted;
        if (dateFormatted) dateFormatted.value = formatted;
        console.log("날짜 변경:", this.value, "포맷된 값:", formatted);
      }
      submitWithLoading("date");
    });

    // iOS에서 더 나은 경험을 위해 포커스 이벤트 추가
    dateInput.addEventListener("focus", function () {
      if (dateDisplay) {
        dateDisplay.classList.add("focused");
      }
    });

    dateInput.addEventListener("blur", function () {
      if (dateDisplay) {
        dateDisplay.classList.remove("focused");
      }
    });
  }

  // 날짜 표시 필드는 이제 필요하지 않음 (네이티브 date input이 전체 영역을 덮음)
  // 하지만 일부 브라우저에서 호환성을 위해 유지
  if (dateDisplay) {
    dateDisplay.addEventListener("click", function () {
      // 클릭 시 시각적 피드백 제공
      this.classList.add("active");
      setTimeout(() => {
        this.classList.remove("active");
      }, 200);
    });
  }

  // 지역 변경 시
  if (locationSelect) {
    locationSelect.addEventListener("change", () =>
      submitWithLoading("location")
    );
  }

  // 검색 버튼 클릭 시
  if (searchBtn) {
    searchBtn.addEventListener("click", function (event) {
      event.preventDefault(); // 기본 폼 제출 방지

      // 골프장 선택 유효성 검사
      const checkedVenues = document.querySelectorAll(
        '.venue-checkbox:not(.select-all) input[type="checkbox"]:checked'
      );
      if (checkedVenues.length === 0) {
        alert("최소한 하나 이상의 골프장을 선택해주세요.");
        return;
      }

      // 바로 폼 제출 (필터 상태 저장은 submitWithLoading 함수 내에서 처리)
      submitWithLoading("search");
    });
  }

  // 필터 보이기/숨기기 토글
  if (toggleBtn) {
    toggleBtn.addEventListener("click", function () {
      const isExpanded = form.classList.toggle("collapsed");
      toggleBtn.setAttribute("aria-expanded", String(!isExpanded));
      localStorage.setItem("filterExpanded", String(!isExpanded));
    });
  }

  // 상세 필터 패널 열기
  if (openFilterPanelBtn) {
    openFilterPanelBtn.addEventListener("click", () => {
      filterPanel.style.display = "flex";
      updateFilterPanelUI();
    });
  }

  // 상세 필터 패널 닫기
  if (closePanelBtn) {
    closePanelBtn.addEventListener("click", () => {
      filterPanel.style.display = "none";
    });
  }

  // 상세 필터 선택
  if (filterPanel) {
    filterPanel.addEventListener("click", (event) => {
      if (event.target.classList.contains("filter-btn")) {
        const group = event.target.dataset.filterGroup;
        const value = event.target.dataset.filterValue;
        currentFilters[group] = value;
        updateFilterPanelUI();
      }
    });
  }

  // 상세 필터 적용: 클라이언트 필터만 적용
  if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener("click", () => {
      applyClientFilters();
      filterPanel.style.display = "none";
    });
  }

  // 상세 필터 초기화
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener("click", () => {
      currentFilters.hole = "all";
      currentFilters.time = "all";
      updateFilterPanelUI();
    });
  }

  // 최저가 토글 버튼: 클라이언트 필터만 적용
  if (lowestPriceToggleBtn) {
    lowestPriceToggleBtn.addEventListener("click", () => {
      const isActive = lowestPriceToggleBtn.classList.toggle("active");
      currentFilters.lowestPrice = isActive;
      localStorage.setItem("golfmon_lowest_price_filter", isActive);
      console.log("최저가 필터 상태:", currentFilters.lowestPrice);
      applyClientFilters();
    });
  }

  // 스크롤 시 필터 컨테이너에 그림자 효과
  const filterContainer = document.querySelector(".filter-container");
  if (filterContainer) {
    window.addEventListener("scroll", () => {
      filterContainer.classList.toggle("scrolled", window.scrollY > 10);
    });
  }

  // --- 페이지 초기화 ---

  // 초기 날짜 표시
  if (dateInput && dateInput.value) {
    const formatted = formatDate(dateInput.value);
    if (dateDisplay) dateDisplay.value = formatted;
    if (dateFormatted) dateFormatted.value = formatted;

    // iOS에서 날짜 입력 필드 초기화를 위한 추가 처리
    console.log("날짜 초기화:", dateInput.value, "포맷된 값:", formatted);
  } else {
    // 날짜가 설정되지 않은 경우 오늘 날짜로 기본값 설정
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const todayStr = `${yyyy}-${mm}-${dd}`;

    if (dateInput) dateInput.value = todayStr;
    const formatted = formatDate(todayStr);
    if (dateDisplay) dateDisplay.value = formatted;
    if (dateFormatted) dateFormatted.value = formatted;

    console.log("날짜 기본값 설정:", todayStr, "포맷된 값:", formatted);
  }

  // 필터 접힘 상태 복원
  const savedState = localStorage.getItem("filterExpanded");
  const urlParams = new URLSearchParams(window.location.search);
  const sourceParam = urlParams.get("source");

  if (
    form &&
    toggleBtn &&
    (savedState === "false" || sourceParam === "search") // source가 "search"일 때만 필터를 접음
  ) {
    form.classList.add("collapsed");
    toggleBtn.setAttribute("aria-expanded", "false");
  }

  // 골프장 전체 선택/해제 기능
  if (checkboxContainer) {
    const selectAllDiv = document.createElement("div");
    selectAllDiv.className = "venue-checkbox select-all";
    selectAllDiv.innerHTML = `
      <input type="checkbox" id="select-all-venues">
      <label for="select-all-venues"><strong>전체 선택/해제</strong></label>
    `;
    checkboxContainer.prepend(selectAllDiv);

    const selectAllCheckbox = document.getElementById("select-all-venues");
    const venueCheckboxes = document.querySelectorAll(
      '.venue-checkbox:not(.select-all) input[type="checkbox"]'
    );

    selectAllCheckbox.addEventListener("change", function () {
      venueCheckboxes.forEach((checkbox) => {
        checkbox.checked = this.checked;
      });
    });

    venueCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", updateSelectAllState);
    });

    // 초기 로드 시 '전체 선택' 상태 업데이트
    updateSelectAllState();
  }

  // 페이지 로드 시 필터 상태 설정 및 적용
  initializeFilters();

  if (document.querySelector(".card-link")) {
    console.log("페이지 로드 시 필터 적용");
    groupAllCards(); // 그룹화 실행
    applyClientFilters();
  }

  // --- 새로고침 버튼 ---
  const refreshBtn = document.getElementById("refreshBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      location.reload(true);
    });
  }
});
