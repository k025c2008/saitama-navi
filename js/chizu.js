// --- ルート案内を外部Google Mapアプリで開く ---
function openRoute(location) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location)}`;
  window.open(url, '_blank');
}

// --- SNS・リンクシェア機能 ---
function shareEvent(eventName) {
  if (navigator.share) {
    navigator.share({
      title: `${eventName} | 埼玉ナビ`,
      text: `埼玉のスポット「${eventName}」の情報をチェック！`,
      url: window.location.href,
    });
  } else {
    navigator.clipboard.writeText(window.location.href);
    alert(`「${eventName}」のページURLをクリップボードにコピーしました！`);
  }
}

// --- カウントダウンタイマー処理 (次回川越まつり向け) ---
function initCountdown() {
  const targetDate = new Date("2026-10-17T10:00:00").getTime();
  const timerElem = document.getElementById("countdownTimer");

  if (!timerElem) return;

  setInterval(() => {
    const now = new Date().getTime();
    const diff = targetDate - now;

    if (diff < 0) {
      timerElem.textContent = "本日開催中！";
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    timerElem.textContent = `あと ${days}日 ${hours}時間 ${mins}分`;
  }, 1000);
}

// --- メイン処理 ---
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("mapSearchForm");
  const input = document.getElementById("searchInput");
  const gmap = document.getElementById("gmap");
  const resetBtn = document.getElementById("resetBtn");
  const btnGPS = document.getElementById("btnGPS");
  const spotBtns = document.querySelectorAll(".spot-btn");
  const infoCards = document.querySelectorAll(".info-card");
  const filterBtns = document.querySelectorAll(".filter-btn");

  const defaultUrl = "https://maps.google.com/maps?q=埼玉県&t=&z=10&ie=UTF8&iwloc=&output=embed";

  // カウントダウンスタート
  initCountdown();

  // マップURL更新処理
  function updateMap(keyword) {
    const query = encodeURIComponent(keyword);
    const timestamp = new Date().getTime();
    gmap.src = `https://maps.google.com/maps?q=${query}&t=&z=14&ie=UTF8&iwloc=&output=embed&t_id=${timestamp}`;
  }

  // 1. 自由キーワード検索
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const keyword = input.value.trim();
      if (!keyword) return;

      spotBtns.forEach(btn => btn.classList.remove("active"));
      const searchTarget = keyword.includes("埼玉") ? keyword : `埼玉県 ${keyword}`;
      updateMap(searchTarget);
    });
  }

  // 2. GPS現在地検索
  if (btnGPS) {
    btnGPS.addEventListener("click", () => {
      if (!navigator.geolocation) {
        alert("お使いのブラウザは位置情報機能に対応していません。");
        return;
      }

      btnGPS.textContent = "📍 取得中...";
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          updateMap(`${lat},${lng}`);
          btnGPS.textContent = "📍 現在地";
        },
        () => {
          alert("位置情報の取得に失敗しました。位置情報の利用を許可してください。");
          btnGPS.textContent = "📍 現在地";
        }
      );
    });
  }

  // 3. 季節絞り込みタブ機能
  filterBtns.forEach(fBtn => {
    fBtn.addEventListener("click", () => {
      filterBtns.forEach(b => b.classList.remove("active"));
      fBtn.classList.add("active");
      const season = fBtn.dataset.season;

      infoCards.forEach(card => {
        const badge = card.querySelector(".season-badge");
        if (season === "all" || (badge && badge.classList.contains(season))) {
          card.style.display = "block";
        } else {
          card.style.display = "none";
        }
      });
    });
  });

  // 4. サイドバースポット選択
  spotBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      spotBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      updateMap(btn.dataset.location);
    });
  });

  // 5. 下部カード選択（アクションボタン以外をクリックした際に地図へスクロール）
  infoCards.forEach(card => {
    card.addEventListener("click", (e) => {
      if (e.target.closest(".card-actions")) return;
      const location = card.dataset.location;
      updateMap(location);
      gmap.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });

  // 6. リセットボタン
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (input) input.value = "";
      spotBtns.forEach(btn => btn.classList.remove("active"));
      filterBtns.forEach(b => b.classList.remove("active"));
      if (filterBtns[0]) filterBtns[0].classList.add("active");
      infoCards.forEach(card => card.style.display = "block");
      gmap.src = defaultUrl;
    });
  }
});