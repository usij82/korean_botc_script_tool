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

  const [characters, setCharacters] = useState([]);
  const [teams, setTeams] = useState({});
  const [jinxes, setJinxes] = useState({});
  const [nightOrder, setNightOrder] = useState({ firstNight: [], otherNight: [] });

  // 🔧 반응형 전역 CSS (우선순위 강화)
  const responsiveCSS = `
    /* 기본 표시 상태 */
    .desktop-only { display: block !important; }
    .mobile-only { display: none !important; }

    /* 컨테이너 레이아웃 */
    @media (max-width: 1024px) {
      #script-area {
        flex-direction: column !important;
        gap: 16px !important;
      }
    }

    /* 모바일 전용 규칙 (우선순위 ↑) */
    @media screen and (max-width: 768px) {
      body .desktop-only { display: none !important; visibility: hidden !important; height: 0 !important; overflow: hidden !important; }
      body .mobile-only { display: block !important; visibility: visible !important; }
    }

    /* 능력 텍스트 줄수 제한(선택) */
    .ability {
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `;

  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = responsiveCSS;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // ✅ 데이터 로드
  useEffect(() => {
    async function loadData() {
      const [charsRes, teamsRes, jinxRes, orderRes] = await Promise.all([
        fetch("characters_ko.json"),
        fetch("teams.json"),
        fetch("jinx_ko.json"),
        fetch("night_order.json"),
      ]);

      const chars = await charsRes.json();
      const teamsArr = await teamsRes.json();
      const jinxArr = await jinxRes.json();
      const order = await orderRes.json();

      setCharacters(chars);
      setTeams(Object.fromEntries(teamsArr.map((t) => [t.id, t.name])));

      const jinxMap = {};
      for (const j of jinxArr) jinxMap[j.id] = j.jinx;
      setJinxes(jinxMap);
      setNightOrder(order);
    }
    loadData();
  }, []);

  // ✅ PDF 저장
  const exportPDF = async () => {
    const input = document.getElementById("script-area");
    if (!input) return alert("PDF로 내보낼 영역을 찾을 수 없습니다.");
    window.scrollTo(0, 0);
    const canvas = await html2canvas(input, { scale: 1.5, useCORS: true });
    const imgData = canvas.toDataURL("image/jpeg", 0.95);

    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    pdf.save(meta?.name ? `${meta.name}.pdf` : "script.pdf");
  };

  // ✅ PNG 저장
  const exportImage = async () => {
    const input = document.getElementById("script-area");
    if (!input) return alert("이미지로 내보낼 영역을 찾을 수 없습니다.");

    window.scrollTo(0, 0);
    const canvas = await html2canvas(input, { scale: 1.5, useCORS: true });
    canvas.toBlob(
      (blob) => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = meta?.name ? `${meta.name}.png` : "script.png";
        link.click();
        URL.revokeObjectURL(link.href);
      },
      "image/png"
    );
  };

  // ✅ 선택 초기화
  const resetSelection = () => {
    if (window.confirm("선택을 모두 해제하시겠습니까?")) {
      setSelectedIds([]);
      setMeta({ name: "", author: "" });
      setQuickJson("");
    }
  };

  // ✅ 기본 스크립트 이름 매핑
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

  // ✅ 기본 스크립트 적용
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

  // ✅ JSON 빠른 구성 + 일반 선택 통합
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

  // ✅ 필터링 (에디션 필터 포함)
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

  // ✅ 유틸
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
  const charById = (id) => characters.find((c) => c.id === id);

  const grouped = useMemo(() => {
    const groups = {};
    for (const c of characters.filter((x) => selectedIds.includes(x.id))) {
      const k = c.team || "misc";
      if (!groups[k]) groups[k] = [];
      groups[k].push(c);
    }
    return groups;
  }, [characters, selectedIds]);

  const teamCounts = useMemo(() => {
    const counts = { townsfolk: 0, outsider: 0, minion: 0, demon: 0, traveller: 0, fabled: 0 };
    for (const id of selectedIds) {
      const c = charById(id);
      if (c && counts.hasOwnProperty(c.team)) counts[c.team]++;
    }
    return counts;
  }, [selectedIds, characters]);

  // ✅ Jinx
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
                {jc?.image && <img src={jc.image} alt={jc.name} width="20" height="20" />}
                <span>{jc?.name || j.id} — {j.reason}</span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  // ✅ Night order row
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

  // ✅ 선택 단계
  if (mode === "select") {
    return (
      <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
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
          style={{ width: "100%", padding: 8, fontFamily: "monospace", marginBottom: "10px" }}
        />

        {/* 캐릭터 분류 + 기본 스크립트 선택 (같은 줄) */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
          <select
            value={filterTeam}
            onChange={(e) => setFilterTeam(e.target.value)}
            style={{ flex: "1 1 180px", padding: "8px" }}
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
            style={{ flex: "1 1 220px", padding: "8px" }}
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
            style={{ flex: "1 1 240px", padding: "8px" }}
            placeholder="스크립트 제목"
            value={meta.name}
            onChange={(e) => setMeta({ ...meta, name: e.target.value })}
          />
          <input
            style={{ flex: "1 1 240px", padding: "8px" }}
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

        {/* 캐릭터 목록 */}
        {teamOrder.map(
          (team) =>
            visibleChars.filter((c) => c.team === team).length > 0 && (
              <div key={team} style={{ marginTop: "24px" }}>
                <h2>{teamName(team)}</h2>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
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
                            prev.includes(c.id)
                              ? prev.filter((x) => x !== c.id)
                              : [...prev, c.id]
                          )
                        }
                        style={{
                          display: "flex",
                          border: selectedIds.includes(c.id)
                            ? "2px solid #4caf50"
                            : "1px solid #ccc",
                          borderRadius: "8px",
                          padding: "10px",
                          background: selectedIds.includes(c.id)
                            ? "#e8f5e9"
                            : "#fff",
                          cursor: "pointer",
                          gap: "10px",
                        }}
                      >
                        <img
                          src={c.image}
                          alt={c.name}
                          width="60"
                          height="60"
                          style={{ borderRadius: "6px", objectFit: "cover" }}
                        />
                        <div>
                          <b>{c.name}</b>
                          <div style={{ fontSize: "13px", color: "#555" }}>
                            {teamName(c.team)}
                          </div>
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

  // ✅ 스크립트 뷰어
  return (
    <div
      id="script-area"
      style={{
        display: "flex",
        flexDirection: "row",
        padding: "20px",
        fontFamily: "sans-serif",
        gap: "30px",
      }}
    >
      {/* 왼쪽 */}
      <div style={{ flex: 2 }}>
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
          <button onClick={() => setMode("select")}>🔙 선택으로</button>
          <button onClick={exportPDF}>📄 PDF</button>
          <button onClick={exportImage}>🖼 PNG</button>
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
                    gridTemplateColumns: "1fr 1fr",
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
                        <p style={{ fontSize: "17px" }}>{c.ability}</p>
                        <JinxBlock baseId={c.id} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
        )}
      </div>

      {/* 오른쪽: Night Order (데스크탑 전용) */}
      <div className="desktop-only" style={{ flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>
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

      {/* 모바일 전용 Night Order (아코디언 등으로 표시) */}
      <div className="mobile-only" style={{ width: "100%" }}>
        <div style={{ border: "1px solid #ddd", borderRadius: "12px", padding: "16px", background: "#fff", marginTop: "8px" }}>
          <details>
            <summary style={{ fontSize: "18px", cursor: "pointer" }}>🌙 첫째 밤</summary>
            <ol style={{ paddingLeft: "24px", marginTop: "10px" }}>
              {nightOrder.firstNight
                .filter((id) => ["DUSK", "DAWN", "MINION", "DEMON"].includes(id) || selectedIds.includes(id))
                .map((id) => (
                  <li key={id} style={{ marginBottom: "8px" }}>
                    <NightRow id={id} />
                  </li>
                ))}
            </ol>
          </details>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: "12px", padding: "16px", background: "#fff", marginTop: "8px" }}>
          <details>
            <summary style={{ fontSize: "18px", cursor: "pointer" }}>🌃 나머지 밤</summary>
            <ol style={{ paddingLeft: "24px", marginTop: "10px" }}>
              {nightOrder.otherNight
                .filter((id) => ["DUSK", "DAWN", "MINION", "DEMON"].includes(id) || selectedIds.includes(id))
                .map((id) => (
                  <li key={id} style={{ marginBottom: "8px" }}>
                    <NightRow id={id} />
                  </li>
                ))}
            </ol>
          </details>
        </div>
      </div>
    </div>
  );
}

export default App;
