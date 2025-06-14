document.addEventListener("DOMContentLoaded", function () {
  // --- DOM 요소 ---
  const form = document.querySelector(".filter-container form");
  const dateInput = document.getElementById("date");
  const dateDisplay = document.getElementById("date_display");
  const dateFormatted = document.getElementById("date_formatted");
  const locationSelect = document.getElementById("location_id");
  const sortBySelect = document.getElementById("sort_by"); // 폼 내부 요소 (숨김)
  const sortOrderSelect = document.getElementById("sort_order"); // 폼 내부 요소 (숨김)
  const clientSortBySelect = document.getElementById("client_sort_by"); // 폼 외부 요소 (표시)
  const clientSortOrderSelect = document.getElementById("client_sort_order"); // 폼 외부 요소 (표시)
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

  // 정렬 상태 변수 추가
  let currentSort = {
    by: clientSortBySelect ? clientSortBySelect.value : "courseTime",
    order: clientSortOrderSelect ? clientSortOrderSelect.value : "asc",
  };

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
   * 클라이언트 사이드 필터(상세, 최저가)를 적용하여 카드 표시 여부를 결정.
   * 이 함수는 정렬 순서를 변경하지 않습니다.
   */
  const applyClientFilters = () => {
    if (!resultsContainer) {
      console.error("결과 컨테이너를 찾을 수 없습니다.");
      return;
    }

    const allCards = Array.from(
      resultsContainer.querySelectorAll(".card-link")
    );

    if (allCards.length === 0) {
      console.log("표시할 카드가 없습니다.");
      return;
    }

    const holeRegex = /\(P(?:9|6)\)|9H|6H|9\*2|6홀/i;
    let visibleCount = 0;

    allCards.forEach((card) => {
      // 카드 내부 요소들 찾기
      const name = card.querySelector("h2")?.textContent || "";
      const timeElement = card.querySelector(".date-info .info-value");

      // 최저가 배지 찾기 - user-info 안에 있는 구조에 맞게 수정
      const isLowest =
        card.querySelector(".user-info .lowest-price-badge") !== null;

      if (!timeElement) {
        card.style.display = "none";
        return;
      }

      // 새로운 형식 "MM/DD HH:MM"에서 시간 추출
      const timeMatchResult = timeElement.textContent.match(
        /\d{2}\/\d{2} (\d{2}:\d{2})/
      );
      if (!timeMatchResult) {
        card.style.display = "none";
        return;
      }

      const timeString = timeMatchResult[1]; // HH:MM 형식
      const hour = parseInt(timeString.split(":")[0], 10);

      // 홀 구분 필터
      const holeMatch =
        currentFilters.hole === "all" ||
        (currentFilters.hole === "18"
          ? !holeRegex.test(name)
          : holeRegex.test(name));

      // 시간대 필터
      let timeMatch = true;
      if (currentFilters.time !== "all") {
        const part = currentFilters.time;
        if (part === "1") timeMatch = hour >= 5 && hour < 11;
        else if (part === "2") timeMatch = hour >= 11 && hour < 17;
        else if (part === "3") timeMatch = hour >= 17;
      }

      // 최저가 필터
      const lowestPriceMatch = !currentFilters.lowestPrice || isLowest;

      const isVisible = holeMatch && timeMatch && lowestPriceMatch;

      card.style.display = isVisible ? "" : "none";
      if (isVisible) {
        visibleCount++;
      }
    });

    const resultsCountElement = document.getElementById("results-count");
    if (resultsCountElement) resultsCountElement.textContent = visibleCount;

    // 필터 적용 후 정렬도 적용
    sortCards();
  };

  /**
   * 카드를 현재 정렬 설정에 따라 정렬합니다.
   */
  const sortCards = () => {
    if (!resultsContainer) return;

    const allCards = Array.from(
      resultsContainer.querySelectorAll(".card-link")
    ).filter((card) => card.style.display !== "none");

    if (allCards.length <= 1) return; // 정렬할 필요가 없음

    // 정렬 기준에 따라 비교 함수 생성
    const compareFunction = (a, b) => {
      let valueA, valueB;

      switch (currentSort.by) {
        case "registDT": // 최신 등록순
          // 여기서는 DOM 순서를 기준으로 정렬 (서버에서 이미 정렬된 상태로 왔다고 가정)
          return 0;

        case "courseTime": // 시간순
          const timeA =
            a.querySelector(".date-info .info-value")?.textContent || "";
          const timeB =
            b.querySelector(".date-info .info-value")?.textContent || "";

          // 새로운 형식 "MM/DD HH:MM"에서 시간 추출
          const timeMatchA = timeA.match(/\d{2}\/\d{2} (\d{2}:\d{2})/);
          const timeMatchB = timeB.match(/\d{2}\/\d{2} (\d{2}:\d{2})/);

          valueA = timeMatchA ? timeMatchA[1] : "00:00";
          valueB = timeMatchB ? timeMatchB[1] : "00:00";
          break;

        case "greenFee": // 가격순
          const priceA =
            a.querySelector(".user-info .info-value")?.textContent || "";
          const priceB =
            b.querySelector(".user-info .info-value")?.textContent || "";

          // 가격에서 숫자만 추출
          const priceNumA = parseInt(priceA.replace(/[^\d]/g, "")) || 0;
          const priceNumB = parseInt(priceB.replace(/[^\d]/g, "")) || 0;

          valueA = priceNumA;
          valueB = priceNumB;
          break;

        default:
          return 0;
      }

      // 정렬 방향에 따라 비교 결과 반환
      const compareResult = valueA.toString().localeCompare(valueB.toString());
      return currentSort.order === "asc" ? compareResult : -compareResult;
    };

    // 카드 정렬
    allCards.sort(compareFunction);

    // 정렬된 카드를 DOM에 다시 추가
    allCards.forEach((card) => {
      resultsContainer.appendChild(card);
    });
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

    // 클라이언트 정렬 옵션 값을 폼 내부 정렬 옵션에 동기화
    if (clientSortBySelect && sortBySelect) {
      sortBySelect.value = clientSortBySelect.value;
    }
    if (clientSortOrderSelect && sortOrderSelect) {
      sortOrderSelect.value = clientSortOrderSelect.value;
    }

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

  // 정렬 옵션 변경 시: 클라이언트 사이드에서 처리
  if (clientSortBySelect) {
    clientSortBySelect.addEventListener("change", () => {
      currentSort.by = clientSortBySelect.value;
      sortCards();
    });
  }

  if (clientSortOrderSelect) {
    clientSortOrderSelect.addEventListener("change", () => {
      currentSort.order = clientSortOrderSelect.value;
      sortCards();
    });
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

  // 폼 내부 정렬 옵션과 폼 외부 정렬 옵션 동기화
  if (sortBySelect && clientSortBySelect) {
    clientSortBySelect.value = sortBySelect.value;
    currentSort.by = clientSortBySelect.value;
  }
  if (sortOrderSelect && clientSortOrderSelect) {
    clientSortOrderSelect.value = sortOrderSelect.value;
    currentSort.order = clientSortOrderSelect.value;
  }

  if (document.querySelector(".card-link")) {
    console.log("페이지 로드 시 필터 적용");
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
