document.addEventListener("DOMContentLoaded", function () {
  // --- DOM 요소 ---
  const form = document.querySelector(".filter-container form");
  const dateInput = document.getElementById("date");
  const dateDisplay = document.getElementById("date_display");
  const dateFormatted = document.getElementById("date_formatted");
  const locationSelect = document.getElementById("location_id");
  const sortBySelect = document.getElementById("sort_by");
  const sortOrderSelect = document.getElementById("sort_order");
  const searchBtn = document.getElementById("searchBtn");
  const toggleBtn = document.getElementById("filterToggleBtn");
  const checkboxContainer = document.querySelector(".checkbox-container");
  const lowestPriceToggle = document.getElementById("lowest-price-toggle");

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
    const resultsContainer = document.querySelector(".container");
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

  // --- 이벤트 리스너 설정 ---

  // 날짜 변경 시
  if (dateInput) {
    dateInput.addEventListener("change", function () {
      if (this.value) {
        const formatted = formatDate(this.value);
        if (dateDisplay) dateDisplay.value = formatted;
        if (dateFormatted) dateFormatted.value = formatted;
      }
      submitWithLoading("date");
    });
  }

  // 날짜 입력창 클릭 시 달력 표시
  if (dateDisplay) {
    dateDisplay.addEventListener(
      "click",
      () => dateInput && dateInput.showPicker()
    );
  }

  // 지역 변경 시
  if (locationSelect) {
    locationSelect.addEventListener("change", () =>
      submitWithLoading("location")
    );
  }

  // 정렬 옵션 변경 시
  if (sortBySelect) {
    sortBySelect.addEventListener("change", () => submitWithLoading("sort"));
  }
  if (sortOrderSelect) {
    sortOrderSelect.addEventListener("change", () => submitWithLoading("sort"));
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

      // 필터를 접어야 한다고 로컬 스토리지에 기록만 함
      if (toggleBtn && toggleBtn.getAttribute("aria-expanded") === "true") {
        localStorage.setItem("filterExpanded", "false");
      }

      // 바로 폼 제출
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

  // --- 페이지 초기화 ---

  // 초기 날짜 표시
  if (dateInput && dateInput.value) {
    const formatted = formatDate(dateInput.value);
    if (dateDisplay) dateDisplay.value = formatted;
    if (dateFormatted) dateFormatted.value = formatted;
  }

  // 필터 접힘 상태 복원
  const savedState = localStorage.getItem("filterExpanded");
  if (form && toggleBtn && savedState === "false") {
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

  // 최저가 필터 토글 기능
  const filterByLowestPrice = () => {
    const cards = document.querySelectorAll(".card-link");
    const resultsCountElement = document.getElementById("results-count");
    let visibleCount = 0;

    cards.forEach((card) => {
      const hasLowestPriceBadge = card.querySelector(".lowest-price-badge");
      const shouldShow = !lowestPriceToggle.checked || hasLowestPriceBadge;
      card.style.display = shouldShow ? "" : "none";
      if (shouldShow) visibleCount++;
    });

    if (resultsCountElement) {
      resultsCountElement.textContent = visibleCount;
    }
  };

  if (lowestPriceToggle) {
    const savedLowestPriceFilter = localStorage.getItem(
      "golfmon_lowest_price_filter"
    );
    if (savedLowestPriceFilter === "true") {
      lowestPriceToggle.checked = true;
    }

    lowestPriceToggle.addEventListener("change", () => {
      filterByLowestPrice();
      localStorage.setItem(
        "golfmon_lowest_price_filter",
        lowestPriceToggle.checked
      );
    });

    // 페이지 로드 시 필터 적용
    filterByLowestPrice();
  }

  // 스크롤 시 필터 컨테이너에 그림자 효과
  const filterContainer = document.querySelector(".filter-container");
  if (filterContainer) {
    window.addEventListener("scroll", () => {
      filterContainer.classList.toggle("scrolled", window.scrollY > 10);
    });
  }
});
