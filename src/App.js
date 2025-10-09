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

  // 🔧 반응형 전역 CSS
  const responsiveCSS = `
    .desktop-only { display: block !important; }
    .mobile-only { display: none !important; }

    @media (max-width: 1024px) {
      #script-area {
        flex-direction: column !important;
        gap: 16px !important;
      }
    }

    @media screen and (max-width: 768px) {
      body .desktop-only { display: block !important; }
      body .mobile-only { display: none !important; }
    }

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

  // ✅ PDF 저장 (모바일은 A4 고정, PC는 반응형)
  const exportPDF = async () => {
    const input = document.getElementById("script-area");
    if (!input) return alert("PDF로 내보낼 영역을 찾을 수 없습니다.");
    window.scrollTo(0, 0);

    const isMobile = window.innerWidth <= 768;
    const canvas = await html2canvas(input, {
      scale: isMobile ? 2 : 1.5,
      useCORS: true,
      width: isMobile ? 794 : undefined, // A4 width
      height: isMobile ? 1123 : undefined, // A4 height
    });
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

  // ✅ PNG 저장 (모바일은 A4 고정, PC는 반응형)
  const exportImage = async () => {
    const input = document.getElementById("script-area");
    if (!input) return alert("이미지로 내보낼 영역을 찾을 수 없습니다.");
    window.scrollTo(0, 0);

    const isMobile = window.innerWidth <= 768;
    const canvas = await html2canvas(input, {
      scale: isMobile ? 2 : 1.5,
      useCORS: true,
      width: isMobile ? 794 : undefined,
      height: isMobile ? 1123 : undefined,
    });

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
              <li key={j.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {jc?.image && <img src={jc.image} alt={jc.name} width="40" height="40" style={{ borderRadius: "6px" }} />}
                <span style={{ fontSize: "16px" }}>{jc?.name || j.id} — {j.reason}</span>
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
    // ... (기존 선택 화면 코드 그대로 유지)
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

      {/* 오른쪽: Night Order (데스크탑/모바일 공통) */}
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
    </div>
  );
}

export default App;
