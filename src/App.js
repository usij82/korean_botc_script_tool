import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

function App() {
  const [mode, setMode] = useState("select");
  const [meta, setMeta] = useState({ name: "", author: "" });
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState("");
  const [filterTeam, setFilterTeam] = useState("all");
  const [editionPick, setEditionPick] = useState("");
  const [quickJson, setQuickJson] = useState("");
  const isMobile = () => window.matchMedia("(max-width: 1024px)").matches;
  const [characters, setCharacters] = useState([]);
  const [jinxes, setJinxes] = useState({});
  const [nightOrder, setNightOrder] = useState({ firstNight: [], otherNight: [] });

  // 고정 A4 내보내기용 상수 (96dpi 기준)
  const A4 = { w: 794, h: 1123 };
  const SCALE = 2; // 선명도 향상

  // ===== 데이터 로드 =====
  useEffect(() => {
    async function loadData() {
      const [charsRes, jinxRes, orderRes] = await Promise.all([
        fetch("characters_ko.json"),
        fetch("jinx_ko.json"),
        fetch("night_order.json"),
      ]);

      const chars = await charsRes.json();
      const jinxArr = await jinxRes.json();
      const order = await orderRes.json();

      setCharacters(chars);

      const jinxMap = {};
      for (const j of jinxArr) jinxMap[j.id] = j.jinx;
      setJinxes(jinxMap);

      setNightOrder(order);
    }
    loadData();
  }, []);

  // ===== 유틸 =====
  const teamOrder = ["townsfolk", "outsider", "minion", "demon", "traveller", "fabled"];
  const teamName = (id) =>
    ({
      townsfolk: "주민",
      outsider: "외지인",
      minion: "하수인",
      demon: "악마",
      traveller: "여행자",
      fabled: "전설",
    }[id] || id);

  // id → character 맵 (성능 + 안전한 의존성)
  const charMap = useMemo(() => {
    const m = new Map();
    for (const c of characters) m.set(c.id, c);
    return m;
  }, [characters]);

  const charById = (id) => charMap.get(id);

  // ===== 고정 A4 캔버스 렌더 (오프스크린) =====
  async function renderToA4Canvas(node) {
    const wrapper = document.createElement("div");
    wrapper.style.position = "fixed";
    wrapper.style.left = "-99999px";
    wrapper.style.top = "0";
    wrapper.style.width = `${A4.w}px`;
    wrapper.style.background = "#fff";
    wrapper.style.boxSizing = "border-box";
    document.body.appendChild(wrapper);

    const clone = node.cloneNode(true);
    clone.style.width = `${A4.w}px`;
    clone.style.boxSizing = "border-box";
    wrapper.appendChild(clone);

    const canvas = await html2canvas(wrapper, {
      scale: SCALE,
      width: A4.w,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    document.body.removeChild(wrapper);
    return canvas;
  }

  // ===== PDF 저장(PC=가변, 모바일=A4) =====
  const exportPDF = async () => {
    const input = document.getElementById("script-area");
    if (!input) return alert("PDF로 내보낼 영역을 찾을 수 없습니다.");

  // 모바일은 A4 고정 사용
    if (isMobile()) return exportPDFA4();

  // PC는 예전처럼 화면 크기 그대로 캡처 & 페이지 분할
    window.scrollTo(0, 0);
    const canvas = await html2canvas(input, { scale: 1.5, useCORS: true, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
  
    const pdf = new jsPDF("p", "mm", "a4");
    const pageW = pdf.internal.pageSize.getWidth();   // 210mm
    const pageH = pdf.internal.pageSize.getHeight();  // 297mm
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;

    let heightLeft = imgH;
    let position = 0;

    pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
    heightLeft -= pageH;

    while (heightLeft > 0) {
      position = heightLeft - imgH;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
      heightLeft -= pageH;
    }
    pdf.save(meta?.name ? `${meta.name}.pdf` : "script.pdf");
  };

// ===== PNG 저장(PC=가변, 모바일=A4) =====
  const exportImage = async () => {
    const input = document.getElementById("script-area");
    if (!input) return alert("이미지로 내보낼 영역을 찾을 수 없습니다.");

    window.scrollTo(0, 0);

  // 모바일은 A4 고정 사용
    if (isMobile()) {
      const a4Canvas = await renderToA4Canvas(input);
      return a4Canvas.toBlob((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = meta?.name ? `${meta.name}.png` : "script.png";
        a.click();
        URL.revokeObjectURL(a.href);
      }, "image/png");
    }

  // PC는 화면 크기대로 캡처
    const canvas = await html2canvas(input, { scale: 1.5, useCORS: true, backgroundColor: "#ffffff" });
    canvas.toBlob((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = meta?.name ? `${meta.name}.png` : "script.png";
      a.click();
      URL.revokeObjectURL(a.href);
    }, "image/png");
  };

  
  // ===== PDF 저장(A4 고정, 자동 페이지 분할) =====
  const exportPDFA4 = async () => {
    const input = document.getElementById("script-area");
    if (!input) return alert("PDF로 내보낼 영역을 찾을 수 없습니다.");

    window.scrollTo(0, 0);
    const canvas = await renderToA4Canvas(input);

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new jsPDF("p", "mm", "a4");
    const pageW = pdf.internal.pageSize.getWidth(); // 210
    const pageH = pdf.internal.pageSize.getHeight(); // 297

    const pxPerMm = canvas.width / pageW; // 폭 기준 변환
    const pageHeightPx = pageH * pxPerMm;

    let remaining = canvas.height;
    let y = 0;

    // 첫 페이지
    pdf.addImage(imgData, "JPEG", 0, 0, pageW, canvas.height / pxPerMm);
    remaining -= pageHeightPx;
    y += pageHeightPx;

    // 추가 페이지
    while (remaining > 5) {
      pdf.addPage();
      pdf.addImage(
        imgData,
        "JPEG",
        0,
        -(y / pxPerMm),
        pageW,
        canvas.height / pxPerMm
      );
      remaining -= pageHeightPx;
      y += pageHeightPx;
    }

    pdf.save(meta?.name ? `${meta.name}.pdf` : "script.pdf");
  };

  // ===== PNG 저장(A4 고정) =====
  const exportImageA4 = async () => {
    const input = document.getElementById("script-area");
    if (!input) return alert("이미지로 내보낼 영역을 찾을 수 없습니다.");

    window.scrollTo(0, 0);
    const canvas = await renderToA4Canvas(input);
    canvas.toBlob(
      (blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = meta?.name ? `${meta.name}.png` : "script.png";
        a.click();
        URL.revokeObjectURL(a.href);
      },
      "image/png"
    );
  };

  // ===== 스크립트 JSON 클립보드 복사 =====
  const copyScriptJson = async () => {
    const arr = [
      { id: "_meta", author: meta.author?.trim() || "작가", name: meta.name?.trim() || "제목" },
      ...selectedIds,
    ];
    try {
      await navigator.clipboard.writeText(JSON.stringify(arr));
      alert("구성이 클립보드에 복사되었습니다!");
    } catch {
      alert("복사에 실패했습니다. 브라우저 권한을 확인하세요.");
    }
  };

  // ===== 선택 초기화 =====
  const resetSelection = () => {
    if (window.confirm("선택을 모두 해제하시겠습니까?")) {
      setSelectedIds([]);
      setMeta({ name: "", author: "" });
      setQuickJson("");
    }
  };

  // ===== 기본 스크립트 이름 매핑 & 적용 =====
  const editionName = (code) => {
    const m = {
      tb: "점철되는 혼란",
      bmr: "피로 물든 달",
      snv: "화단에 꽃피운 이단",
      car: "캐러셀",
      hdcs: "등불이 밝을 때(화등초상)",
      syyl: "폭풍우의 조짐(산우욕래)",
    };
    return m[code] || "";
  };

  const applyEdition = (mode) => {
    if (!editionPick) return alert("기본 스크립트를 선택하세요.");
    const ids = characters.filter((c) => c.edition === editionPick).map((c) => c.id);
    if (mode === "replace") setSelectedIds(ids);
    else setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));
    setMeta((prev) => ({
      name: prev.name || editionName(editionPick) || "제목",
      author: prev.author || "작가",
    }));
  };

  // ===== 생성(빠른 JSON/일반 선택 통합) =====
  const generateFromSelection = () => {
    if (quickJson.trim()) {
      try {
        const arr = JSON.parse(quickJson);
        if (!Array.isArray(arr)) return alert("최상위가 배열이어야 합니다.");

        let nextMeta = { name: "제목", author: "작가" };
        const ids = [];
        for (const item of arr) {
          if (item && typeof item === "object" && item.id === "_meta") {
            nextMeta = {
              name: (item.name || nextMeta.name).trim(),
              author: (item.author || nextMeta.author).trim(),
            };
          } else if (typeof item === "string") {
            ids.push(item);
          }
        }

        const allIds = new Set(characters.map((c) => c.id));
        const valid = ids.filter((id) => allIds.has(id));
        if (valid.length === 0) return alert("유효한 캐릭터 ID가 없습니다.");

        setSelectedIds(valid);
        setMeta(nextMeta);
        setMode("view");
        return;
      } catch {
        return alert("JSON 파싱 실패: 올바른 JSON 배열 형태인지 확인하세요.");
      }
    }

    if (selectedIds.length === 0) return alert("캐릭터를 선택하세요!");
    setMeta({
      name: meta.name.trim() || "제목",
      author: meta.author.trim() || "작가",
    });
    setMode("view");
  };

  // ===== 필터링(검색 + 분류 + 에디션 보이기 필터) =====
  const visibleChars = useMemo(() => {
    const q = search.trim().toLowerCase();
    return characters.filter((c) => {
      const matchQuery =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.ability.toLowerCase().includes(q);
      const matchTeam = filterTeam === "all" || c.team === filterTeam;
      const matchEdition = !editionPick || c.edition === editionPick;
      return matchQuery && matchTeam && matchEdition;
    });
  }, [characters, search, filterTeam, editionPick]);

  // ===== 선택된 캐릭터 그룹/카운트 =====
  const grouped = useMemo(() => {
    const groups = {};
    for (const id of selectedIds) {
      const c = charMap.get(id);
      if (!c) continue;
      const k = c.team || "misc";
      if (!groups[k]) groups[k] = [];
      groups[k].push(c);
    }
    return groups;
  }, [selectedIds, charMap]);

  const teamCounts = useMemo(() => {
    const counts = { townsfolk: 0, outsider: 0, minion: 0, demon: 0, traveller: 0, fabled: 0 };
    for (const id of selectedIds) {
      const c = charMap.get(id);
      if (c && counts.hasOwnProperty(c.team)) counts[c.team]++;
    }
    return counts;
  }, [selectedIds, charMap]);

  // ===== Jinx 표시 =====
  const JinxBlock = ({ baseId }) => {
    const entries = jinxes[baseId] || [];
    const applicable = entries.filter((j) => selectedIds.includes(j.id));
    if (!applicable.length) return null;
    return (
      <div style={{ marginTop: "8px", borderTop: "1px solid #ccc", paddingTop: "4px" }}>
        <b>Jinx:</b>
        <ul style={{ listStyleType: "none", paddingLeft: 0, marginTop: "4px" }}>
          {applicable.map((j) => {
            const jc = charById(j.id);
            return (
              <li key={j.id} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {jc?.image && <img src={jc.image} alt={jc.name} width="60" height="60" />}
                <span>{jc?.name || j.id} — {j.reason}</span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  // ===== Night order 행 =====
  const NightRow = ({ id }) => {
    if (id === "DUSK") return <div style={{ fontWeight: "bold" }}>🌙 Dusk</div>;
    if (id === "DAWN") return <div style={{ fontWeight: "bold" }}>🌅 Dawn</div>;
    if (id === "MINION") return <div style={{ fontStyle: "italic" }}>하수인 확인🩸</div>;
    if (id === "DEMON") return <div style={{ fontStyle: "italic" }}>악마 확인🧛</div>;
    const c = charById(id);
    if (!c) return null;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <img src={c.image} alt={c.name} width="26" height="26" />
        <span style={{ fontWeight: "500", fontSize: "17px" }}>{c.name}</span>
        <span style={{ color: "#666", fontSize: "14px" }}>({teamName(c.team)})</span>
      </div>
    );
  };

  // ===== 반응형 스타일 =====
  const ResponsiveStyle = () => (
    <style>{`
      /* 화면 폭이 줄면 좌/우 레이아웃 → 상/하 스택 */
      @media (max-width: 1024px) {
        #script-area {
          flex-direction: column !important;
          gap: 16px !important;
        }
      }
      /* 능력 텍스트 줄수 제한 (모바일 가독성) */
      .ability {
        display: block;
        overflow: visible;
        white-space: normal;
      }
    `}</style>
  );

  // ===== 선택 단계 =====
  if (mode === "select") {
    return (
      <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
        <ResponsiveStyle />
        <h1>🕰️ 시계탑에 흐른 피 한국어 스크립트 툴 by 미피미피</h1>
        <h2>⚙️ 캐릭터 선택 ⚙️</h2>

        {/* 검색 */}
        <input
          style={{ width: "100%", padding: "8px", marginBottom: "8px" }}
          placeholder="캐릭터 이름 또는 능력 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* 빠른 구성 입력 */}
        <textarea
          value={quickJson}
          onChange={(e) => setQuickJson(e.target.value)}
          placeholder='빠른 구성(JSON 배열을 입력하세요.) Ex) [{"id":"_meta","author":"작가","name":"제목"},"acrobat","barber","assassin"]'
          style={{
            width: "100%",
            padding: 8,
            fontFamily: "monospace",
            marginBottom: "10px",
            minHeight: 72,
          }}
        />

        {/* 캐릭터 분류 + 기본 스크립트 선택 + 적용/추가 (한 줄) */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
          <select
            value={filterTeam}
            onChange={(e) => setFilterTeam(e.target.value)}
            style={{ flex: "1 1 200px", padding: "8px", minWidth: 160 }}
          >
            <option value="all">캐릭터 분류</option>
            {teamOrder.map((t) => (
              <option key={t} value={t}>
                {teamName(t)}
              </option>
            ))}
          </select>

          <select
            value={editionPick}
            onChange={(e) => setEditionPick(e.target.value)}
            style={{ flex: "1 1 200px", padding: "8px", minWidth: 200 }}
          >
            <option value="">기본 스크립트 목록</option>
            <option value="tb">점철되는 혼란 (TB)</option>
            <option value="bmr">피로 물든 달 (BMR)</option>
            <option value="snv">화단에 꽃피운 이단 (SNV)</option>
            <option value="car">캐러셀 (CAR)</option>
            <option value="hdcs">등불이 밝을 때(화등초상) (HDCS)</option>
            <option value="syyl">폭풍우의 조짐(산우욕래) (SYYL)</option>
          </select>

          <button onClick={() => applyEdition("replace")}>해당 스크립트 덮어쓰기</button>
          <button onClick={() => applyEdition("add")}>해당 스크립트 캐릭터 모두 추가</button>
        </div>

        {/* 제목/작성자 */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
          <input
            style={{ flex: "1 1 200px", padding: "8px", minWidth: 160 }}
            placeholder="스크립트 제목"
            value={meta.name}
            onChange={(e) => setMeta({ ...meta, name: e.target.value })}
          />
          <input
            style={{ flex: "1 1 200px", padding: "8px", minWidth: 160 }}
            placeholder="작가"
            value={meta.author}
            onChange={(e) => setMeta({ ...meta, author: e.target.value })}
          />
        </div>

        {/* 버튼 + 카운터 */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            marginBottom: "16px",
            flexWrap: "wrap",
          }}
        >
          <button onClick={resetSelection}>초기화</button>
          <button onClick={generateFromSelection}>스크립트 생성</button>
          <span style={{ marginLeft: "auto", fontSize: "14px", color: "#444" }}>
            선택된 캐릭터: 주민 {teamCounts.townsfolk}개 / 외지인 {teamCounts.outsider}개 / 하수인 {teamCounts.minion}개 / 악마 {teamCounts.demon}개 / 여행자 {teamCounts.traveller}개 / 전설 {teamCounts.fabled}개
          </span>
        </div>

        {/* 캐릭터 목록 (반응형 그리드) */}
        {teamOrder.map(
          (team) =>
            visibleChars.filter((c) => c.team === team).length > 0 && (
              <div key={team} style={{ marginTop: "24px" }}>
                <h2>{teamName(team)}</h2>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: "12px",
                  }}
                >
                  {visibleChars
                    .filter((c) => c.team === team)
                    .map((c) => (
                      <div
                        key={c.id}
                        onClick={() =>
                          setSelectedIds((prev) =>
                            prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id]
                          )
                        }
                        style={{
                          display: "flex",
                          border: selectedIds.includes(c.id) ? "2px solid #4caf50" : "1px solid #ccc",
                          borderRadius: "8px",
                          padding: "10px",
                          background: selectedIds.includes(c.id) ? "#e8f5e9" : "#fff",
                          cursor: "pointer",
                          gap: "10px",
                          alignItems: "center",
                        }}
                      >
                        <img
                          src={c.image}
                          alt={c.name}
                          width="72"
                          height="72"
                          style={{ borderRadius: "10px", objectFit: "cover" }}
                        />
                        <div>
                          <b>{c.name}</b>
                          <div style={{ fontSize: "13px", color: "#555" }}>{teamName(c.team)}</div>
                          <div className="ability" style={{ fontSize: "12px", color: "#777" }}>
                            {c.ability}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )
        )}
      </div>
    );
  }

  // ===== 스크립트 뷰어 =====
  return (
    <div
      id="script-area"
      style={{
        display: "flex",
        flexDirection: "row",
        padding: "20px",
        fontFamily: "sans-serif",
        gap: "30px",
        background: "#fff",
      }}
    >
      <ResponsiveStyle />

      {/* 왼쪽 */}
      <div style={{ flex: 3 }}>
        {/* 상단 액션 바 */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
          <button onClick={() => setMode("select")}>🔙 선택으로</button>
          <button onClick={exportPDF}>📄 PDF로 저장</button>
          <button onClick={exportImage}>🖼 PNG로 저장</button>
          <button onClick={copyScriptJson}>📋 클립보드에 복사(JSON)</button>
        </div>

        <h2>{meta.name}</h2>
        <p style={{ color: "gray" }}>by {meta.author}</p>

        {teamOrder.map(
          (team) =>
            grouped[team] && (
              <div key={team} style={{ marginTop: "20px" }}>
                <h3>{teamName(team)}</h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                    gap: "12px",
                  }}
                >
                  {grouped[team].map((c) => (
                    <div
                      key={c.id}
                      style={{
                        display: "flex",
                        border: "1px solid #ccc",
                        borderRadius: "12px",
                        padding: "16px",
                        background: "#fdfdfd",
                        gap: "16px",
                        alignItems: "flex-start",
                      }}
                    >
                      <img
                        src={c.image}
                        alt={c.name}
                        width="90"
                        height="90"
                        style={{ borderRadius: "10px", objectFit: "cover" }}
                      />
                      <div style={{ flex: 1 }}>
                        <b style={{ fontSize: "20px" }}>{c.name}</b>
                        <div style={{ fontSize: "15px", color: "#555", marginBottom: "8px" }}>
                          {teamName(c.team)}
                        </div>
                        <p style={{ fontSize: "17px", marginTop: 0 }}>{c.ability}</p>
                        <JinxBlock baseId={c.id} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
        )}
      </div>

      {/* 오른쪽: Night Order (항상 표시, 작은 화면에서는 아래로 스택됨) */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ border: "1px solid #ddd", borderRadius: "12px", padding: "20px", background: "#fff", fontSize: "17px", lineHeight: "1.8" }}>
          <h2 style={{ marginTop: 0, fontSize: "22px" }}>🌙 첫째 밤</h2>
          <ol style={{ paddingLeft: "24px" }}>
            {nightOrder.firstNight
              .filter((id) => ["DUSK", "DAWN", "MINION", "DEMON"].includes(id) || selectedIds.includes(id))
              .map((id) => (
                <li key={id} style={{ marginBottom: "8px" }}>
                  <NightRow id={id} />
                </li>
              ))}
          </ol>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: "12px", padding: "20px", background: "#fff", fontSize: "17px", lineHeight: "1.8" }}>
          <h2 style={{ fontSize: "22px" }}>🌃 나머지 밤</h2>
          <ol style={{ paddingLeft: "24px" }}>
            {nightOrder.otherNight
              .filter((id) => ["DUSK", "DAWN", "MINION", "DEMON"].includes(id) || selectedIds.includes(id))
              .map((id) => (
                <li key={id} style={{ marginBottom: "8px" }}>
                  <NightRow id={id} />
                </li>
              ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

export default App;
