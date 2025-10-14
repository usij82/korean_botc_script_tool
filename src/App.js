import { useEffect, useMemo, useRef, useState } from "react";
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
  const [jinxes, setJinxes] = useState({});
  const [nightOrder, setNightOrder] = useState({ firstNight: [], otherNight: [] });
  const [editionCategory, setEditionCategory] = useState("");
  const [specialRules, setSpecialRules] = useState("");
  const [showThanks, setShowThanks] = useState(false);
  const today = new Date();
  const isAprilFools = today.getMonth() === 3 && today.getDate() === 1;
  const isWordUnlocked = search.trim().toLowerCase() === "이빨요정";
  const [isClicked, setIsClicked] = useState(false);
  const [, setClickCount] = useState(0);
  const [aprilAlerted, setAprilAlerted] = useState(false);
  const [wordAlerted, setWordAlerted] = useState(false);
  const [clickAlerted, setClickAlerted] = useState(false);
  const [showOrthodontist, setShowOrthodontist] = useState(false);
  const [jfaUnlocked, setjfaUnlocked] = useState(false);
  const [toothPromptVisible, setToothPromptVisible] = useState(false); // 모달 표시 여부
  const openTimerRef = useRef(null);   // 다음 “:41”에 여는 타이머
  const closeTimerRef = useRef(null);  // 1분 뒤 자동 닫힘 타이머
  const [timedAlerted, setTimedAlerted] = useState(false); // 해금 알림 중복 방지
  const A4 = { w: 794, h: 1123 };
  const SCALE = 2;
  const THANKS_TEXT = `
  혼자서 열심히 만들어 본 한국어 시계탑 스크립트 제작 툴입니다.
  기존에 알려진 모든 캐릭터(유출 캐릭터는 미포함)를 모두 넣기 위해 노력했습니다.
  캐릭터 및 징크스, 밤 순서의 데이터는 [포켓 그리모어](https://www.pocketgrimoire.co.uk/ko_KR/)의 [Git Hub](https://github.com/Skateside/pocket-grimoire)에서 참조 했습니다.
  아이콘은 [공식 위키 사이트](https://wiki.bloodontheclocktower.com/) 및 [온라인 시계탑](https://botc.app/)에서 가져왔습니다.
  [사용법](https://github.com/usij82/korean_botc_script_tool/blob/main/README.md)은 해당 링크를 참조하시면 됩니다!
  `;

  // URL 자동 링크 + [텍스트](URL) 지원 (이전 대화에서 설명한 간단 렌더러)
  function renderRichText(text) {
    const withAnchors = text
      // [text](url)
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      // 맨날 URL
      .replace(/(?<!\]|")\bhttps?:\/\/[^\s)]+/g,
        (m) => `<a href="${m}" target="_blank" rel="noopener noreferrer">${m}</a>`);
    // 줄바꿈 처리
    return withAnchors.replace(/\n/g, '<br/>');
  }


// 추가: 스크립트 그룹 테이블
  const PACK_VALUES = new Set(["tnf", "car", "rzlmt", "homebrew"]);
  const SCRIPT_GROUPS = {
    april: {
      label: "만우절",
      visibleIf: (ctx) => ctx.jfaUnlocked,
      items: [
      { value: "jfa", label: "🤡 그냥 좀 장난친 거야 🦷" },
      ],
    },
    base: {
      label: "기본판",
      items: [
        { value: "tb", label: "점철되는 혼란" },
        { value: "bmr", label: "피로 물든 달" },
        { value: "snv", label: "화단에 꽃피운 이단" },
        { value: "tnf", label: "여행자와 전설" },
      ],
    },
    carousel: {
      label: "캐러셀 확장",
      items: [
        { value: "car", label: "실험적 캐릭터" },
        { value: "toyle", label: "가장 믿었던 사람들" },
        { value: "ctt", label: "경멸" },
        { value: "ini", label: "광기와 직관" },
        { value: "hhr", label: "깊은 바다 밑 실종자의 복수" },
        { value: "dvt", label: "독실한 신앙인들" },
        { value: "ibh", label: "비이성적인 행동" },
        { value: "qm", label: "빠른 계산" },
        { value: "mdm", label: "원숭이도 수학을 해요" },
        { value: "wciia", label: "이 종교는 도대체 누구거야?" },
        { value: "adh", label: "이름 없는 거짓말" },
        { value: "pcy", label: "한 방" },
        { value: "tmo", label: "한밤 중의 오아시스" },
        { value: "rotmv", label: "화성인 흡혈귀의 귀환" },
      ],
    },
    teensy: {
      label: "틴시빌 스크립트",
      items: [
        { value: "ngj", label: "가장 큰 기쁨" },
        { value: "otr", label: "강 너머에" },
        { value: "lndb", label: "늦은 밤의 드라이브" },
        { value: "lod", label: "불신의 거머리" },
        { value: "crd", label: "악마 동지여" },
        { value: "luf", label: "자유방임주의" },
        { value: "rttb", label: "하향 경쟁" },
      ],
    },
    extra: {
      label: "추가 스크립트",
      items: [
        { value: "agc", label: "그림 형제 합창단" },
        { value: "ucd", label: "돌연사" },
        { value: "cf", label: "메기 낚시" },
        { value: "cd4", label: "셰프 딜럭스 4" },
        { value: "bzl", label: "술주정" },
        { value: "hns", label: "숨바꼭질" },
        { value: "xc", label: "연장 코드" },
        { value: "le", label: "월식" },
        { value: "socas", label: "정교분리" },
        { value: "cos", label: "첩자들의 교회" },
        { value: "litc", label: "파충류 II: 도시의 도마뱀" },
        { value: "oioo", label: "한 놈 들어오고, 한 놈 나가고" },
      ],
    },
    china: {
      label: "중국판",
      items: [
        { value: "hdcs", label: "등불이 밝을 때(화등초상)" },
        { value: "syyl", label: "폭풍우의 조짐(산우욕래)" },
        { value: "mgcz", label: "저녁의 북과 새벽의 종(모고신종)" },
        { value: "rzlmt", label: "중국판 캐릭터 목록" },
      ],
    },
    homebrew: {
      label: "홈브류",
      items: [
        { value: "homebrew", label: "홈브류 캐릭터" },
      ],
    },
  };

  
  function handleTitleClick() {
    setClickCount((prev) => {
      const next = prev + 1;
      if (next >= 41) {
      setIsClicked(true);
      }
      return next;
    });
  }

  useEffect(() => {
    if (isClicked && !clickAlerted) {
      setClickAlerted(true);
      setShowOrthodontist(true);
      alert("🦷 숨겨진 캐릭터를 찾으셨습니다! 🦷\n지금부터 치과의사와 특별 스크립트를 선택할 수 있어요!");
    }
  }, [isClicked, clickAlerted]);
  
  useEffect(() => {
    if (isAprilFools && !aprilAlerted) {
      setShowOrthodontist(true);
      setAprilAlerted(true);
      alert("😇 모든 것이 뒤바뀐 광기의 만우절에 찾아오다니... 운이 좋네요! 😈");
    }
  }, [isAprilFools, aprilAlerted]);

// “이빨요정” 검색 이스터에그 해금 + 알림
  useEffect(() => {
    if (isWordUnlocked && !wordAlerted) {
      setShowOrthodontist(true);
      setWordAlerted(true);
      alert("🦷 숨겨진 캐릭터를 찾으셨습니다! 🦷\n지금부터 치과의사와 특별 스크립트를 선택할 수 있어요!");
    }
  }, [isWordUnlocked, wordAlerted]);

  useEffect(() => {
    if (showOrthodontist && !jfaUnlocked) {
      setjfaUnlocked (true);
    }
  }, [showOrthodontist, jfaUnlocked]);

  useEffect(() => {
    if (showOrthodontist) {
    // 이미 해금된 경우, 더 이상 알림을 띄우지 않음
      if (openTimerRef.current) clearTimeout(openTimerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      return;
    }

    function msUntilNext41() {
      const now = new Date();
      const next = new Date(now);
      next.setSeconds(0, 0);
      if (now.getMinutes() < 41) {
        next.setMinutes(41);
      } else {
        // 다음 시간의 41분
        next.setHours(now.getHours() + 1);
        next.setMinutes(41);
      }
      return next.getTime() - now.getTime();
    }

    function scheduleOpen() {
      // 안전 장치
      if (openTimerRef.current) clearTimeout(openTimerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);

      openTimerRef.current = setTimeout(() => {
        // 41분에 도달 → 모달 열기
        setToothPromptVisible(true);

        // 1분 뒤 자동 닫힘
        closeTimerRef.current = setTimeout(() => {
          setToothPromptVisible(false);
          // 닫으면서 곧바로 다음 :41 예약
          scheduleOpen();
        }, 60 * 1000);
      }, msUntilNext41());
    }

    scheduleOpen();

    return () => {
      if (openTimerRef.current) clearTimeout(openTimerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, [showOrthodontist]);

  
  // ===== 데이터 로드 =====
  useEffect(() => {
    async function loadData() {
      const charFile = isAprilFools ? "characters_ok.json" : "characters_ko.json" ;
      const [charsRes, jinxRes, orderRes] = await Promise.all([
        fetch(charFile),
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
  }, [isAprilFools]);

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

  // edition을 문자열/배열 모두 지원
  function getEditions(c) {
    if (!c || c.edition == null || c.edition === "") return [];
    return Array.isArray(c.edition) ? c.edition : [c.edition];
  }


  // 캐릭터 맵 캐싱
  const charMap = useMemo(() => {
    const m = new Map();
    for (const c of characters) m.set(c.id, c);
    return m;
  }, [characters]);

  const charById = (id) => charMap.get(id);

  // ===== 모바일 판별 =====
  const isMobile = () => window.matchMedia("(max-width: 1024px)").matches;

  // ===== 고정 A4 렌더 (모바일용) =====
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

  // ===== PDF 저장 (PC: 가변, 모바일: A4 고정) =====
  const exportPDF = async () => {
    const input = document.getElementById("script-area");
    if (!input) return alert("PDF로 내보낼 영역을 찾을 수 없습니다.");

    if (isMobile()) return exportPDFA4();

    window.scrollTo(0, 0);
    const canvas = await html2canvas(input, { scale: 1.5, useCORS: true, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/jpeg", 0.95);

    const pdf = new jsPDF("p", "mm", "a4");
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
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

  // ===== PNG 저장 (PC: 가변, 모바일: A4 고정) =====
  const exportImage = async () => {
    const input = document.getElementById("script-area");
    if (!input) return alert("이미지로 내보낼 영역을 찾을 수 없습니다.");
    window.scrollTo(0, 0);

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

    const canvas = await html2canvas(input, { scale: 1.5, useCORS: true, backgroundColor: "#ffffff" });
    canvas.toBlob((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = meta?.name ? `${meta.name}.png` : "script.png";
      a.click();
      URL.revokeObjectURL(a.href);
    }, "image/png");
  };

  // ===== PDF(A4) (모바일 전용 내부 호출) =====
  const exportPDFA4 = async () => {
    const input = document.getElementById("script-area");
    window.scrollTo(0, 0);
    const canvas = await renderToA4Canvas(input);
    const imgData = canvas.toDataURL("image/jpeg", 0.95);

    const pdf = new jsPDF("p", "mm", "a4");
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    const pxPerMm = canvas.width / pageW;
    const pageHeightPx = pageH * pxPerMm;

    let remaining = canvas.height;
    let y = 0;

    pdf.addImage(imgData, "JPEG", 0, 0, pageW, canvas.height / pxPerMm);
    remaining -= pageHeightPx;
    y += pageHeightPx;

    while (remaining > 5) {
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, -(y / pxPerMm), pageW, canvas.height / pxPerMm);
      remaining -= pageHeightPx;
      y += pageHeightPx;
    }

    pdf.save(meta?.name ? `${meta.name}.pdf` : "script.pdf");
  };

  // ===== JSON 복사 =====
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
      setSpecialRules("");
    }
  };
// == 모달 버튼 핸들러 ==
  const onToothYes = () => {
    setToothPromptVisible(false);
    if (!showOrthodontist) {
      setShowOrthodontist(true);
      if (!timedAlerted) {
        setTimedAlerted(true);
        alert("🦷 숨겨진 캐릭터를 찾으셨습니다! 🦷\n지금부터 치과의사와 특별 스크립트를 선택할 수 있어요!");
      }
    }
  };
 
  const onToothNo = () => {
    setToothPromptVisible(false);
  };


  // ===== 기본 스크립트 이름, 작가, 특수룰 매핑 & 적용 =====
  const editionName = (code) => {
    const m = {
      tb: "점철되는 혼란",
      bmr: "피로 물든 달",
      snv: "화단에 꽃피운 이단",
      hdcs: "등불이 밝을 때(화등초상)",
      jfa: "🤡 그냥 좀 장난친 거야 🦷",
      adh: "이름 없는 거짓말",
      ctt: "경멸",
      dvt: "독실한 신앙인들",
      hhr: "깊은 바다 밑 실종자의 복수",
      ini: "광기와 직관",
      ibh: "비이성적인 행동",
      tmo: "한밤 중의 오아시스",
      mdm: "원숭이도 수학을 해요",
      toyle: "가장 믿었던 사람들",
      pcy: "한 방",
      qm: "빠른 계산",
      rotmv: "화성인 흡혈귀의 귀환",
      wciia: "이 종교는 도대체 누구거야?",
      otr: "강 너머에",
      ngj: "가장 큰 기쁨",
      luf: "자유방임주의",
      rttb: "하향 경쟁",
      lndb: "늦은 밤의 드라이브",
      lod: "불신의 거머리",
      crd: "악마 동지여",
      le: "월식",
      xc: "연장 코드",
      bzl: "술주정",
      cf: "메기 낚시",
      oioo: "한 놈 들어오고, 한 놈 나가고",
      ucd: "돌연사",
      agc: "그림 형제 합창단",
      litc: "파충류 II: 도시의 도마뱀",
      cd4: "셰프 딜럭스 4",
      cos: "첩자들의 교회",
      socas: "정교분리",
      tnf: "여행자와 전설",
      car: "캐러셀",
      syyl: "폭풍우의 조짐(산우욕래)",
      mgcz: "저녁의 북과 새벽의 종(모고신종)"
    };
    return m[code] || "";
  };

  const editionAuthor = {
    tb: "기본 스크립트 1번",
    bmr: "기본 스크립트 2번",
    snv: "기본 스크립트 3번",
    hdcs: "중국판 추가 스크립트 1번",
    jfa: "만우절 기념 스크립트",
    adh: "Emerald, Fran, Kohav, & Theo",
    ctt: "Milk",
    dvt: "Emerald",
    hhr: "Theo",
    ini: "Sam",
    ibh: "Josh",
    tmo: "Lachlan",
    mdm: "Jams, Josh, Kerry, & Zak",
    toyle: "Taylor & Viva La Sam",
    pcy: "Lachlan",
    qm: "Fran",
    rotmv: "Rope",
    wciia: "Aero",
    otr: "Andrew Nathenson",
    ngj: "Steven Medway",
    luf: "Steven Medway",
    rttb: "Evin Donohoe",
    lndb: "Aero",
    lod: "OJ",
    crd: "Zets",
    le: "Ekin",
    xc: "Viva La Sam",
    bzl: "Lau",
    cf: "Emily",
    oioo: "Baron von Klutz",
    ucd: "Matt",
    agc: "Lachlan",
    litc: "Aero",
    cd4: "Harald",
    cos: "Andrew Nathenson",
    socas: "Aero",
    tnf: "기본판에 포함된 여행자와 전설 캐릭터 모음집",
    car: "실험적 캐릭터 모음집",
    syyl: "미발매(추후 능력이 수정될 수 있음)",
    mgcz: "미발매(추후 능력이 수정될 수 있음)"
  };

  //특수룰, 줄바꿈은 \n- 입력하면 됨.
  const editionSpecialRules = {
    jfa: "만우절 기념으로 공개된 스크립트 입니다. 현재는 공식 사이트에서 찾을 수 없습니다.",
    wciia: "폭풍 사냥꾼은 \"교주\" 캐릭터를 보호합니다.",
    litc: "폭풍 사냥꾼은 \"주정뱅이\" 캐릭터를 보호합니다.",
    socas: "폭풍 사냥꾼은 \"시장\" 캐릭터를 보호합니다."
  };

  const applyEdition = (mode) => {
    if (!editionPick) return alert("기본 스크립트를 선택하세요.");
    const ids = characters.filter((c) => getEditions(c).includes(editionPick)).map((c) => c.id);

    if (mode === "replace") {
    // ✅ 완전 덮어쓰기 (제목/작가도 새로 설정)
      setSelectedIds(ids);
      setMeta({
        name: editionName(editionPick) || "제목",
        author: editionAuthor[editionPick] || "작가",
      });
    } else {
    // ✅ 추가 모드 (기존 값 유지)
      setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));
      setMeta((prev) => ({
        name: prev.name || editionName(editionPick) || "제목",
        author: prev.author || editionAuthor[editionPick] || "작가",
      }));
    }

    setSpecialRules(editionSpecialRules[editionPick] || "");
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
      const isHomebrew = getEditions(c).includes("homebrew");
      if (!q && isHomebrew && editionCategory !== "homebrew") return false;
      if (c.id === "orthodontist" && !(isAprilFools || isWordUnlocked || showOrthodontist)) return false;
      const matchQuery = !q || c.name.toLowerCase().includes(q) || c.ability.toLowerCase().includes(q);
      const matchTeam = filterTeam === "all" || c.team === filterTeam;
      const matchEdition = !editionPick || getEditions(c).includes(editionPick);
      return matchQuery && matchTeam && matchEdition;
    });
  }, [characters, search, filterTeam, editionPick, editionCategory, showOrthodontist, isAprilFools, isWordUnlocked]);

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
// 선택 모드에서 특수 룰 노출 조건 계산
  const showSpecialRulesInput =
    selectedIds.includes("bootlegger") || selectedIds.includes("djinn") || selectedIds.includes("stormcatcher");

  // =================================== 선택 단계 =======================================
  if (mode === "select") {
    return (
      <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
        <ResponsiveStyle />
        <h1 onClick={handleTitleClick}>🕰️ 시계탑에 흐른 피 한국어 스크립트 툴 by 미피미피</h1>
        <h2>⚙️ 캐릭터 선택 ⚙️</h2>

        {/* 검색 */}
        <input
          style={{ width: "100%", padding: "8px", marginBottom: "8px", boxSizing: "border-box" }}
          placeholder="캐릭터 이름 또는 능력 검색 아니면..?"
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
            marginBottom: "8px",
            boxSizing: "border-box"
          }}
        />

        {/* 캐릭터 분류 + 기본 스크립트 선택 + 적용/추가 (한 줄) */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
          <select
            value={filterTeam}
            onChange={(e) => setFilterTeam(e.target.value)}
            style={{ flex: 1, padding: "8px", minWidth: 160 }}
          >
            <option value="all">캐릭터 유형</option>
            {teamOrder.map((t) => (
              <option key={t} value={t}>
                {teamName(t)}
              </option>
            ))}
          </select>

          <select
              value={editionCategory}
              onChange={(e) => {
                const v = e.target.value;
                setEditionCategory(v);
                // 분류를 바꾸면 현재 선택(editionPick)이 그 분류에 없는 값일 수 있으니 초기화(선택 해제)
                setEditionPick((prev) => {
                  if (!prev) return prev;
                  const groups = v ? [v] : Object.keys(SCRIPT_GROUPS);
                  const exists = groups.some((g) =>
                    SCRIPT_GROUPS[g].items.some((it) => it.value === prev && (!it.require || (it.require === "jfaUnlocked" && jfaUnlocked)))
                  );
                  return exists ? prev : "";
                });
              }}
              style={{ flex: 1, padding: "8px", minWidth: 180 }}
              aria-label="버전 선택"
              title="버전전 선택"
            >
              <option value="">버전 선택</option>
              {jfaUnlocked && <option value="april">만우절 스크립트</option>}
              <option value="base">기본판</option>
              <option value="carousel">캐러셀 확장</option>
              <option value="teensy">틴시빌</option>
              <option value="extra">추가 스크립트</option>
              <option value="china">중국판</option>
              <option value="homebrew">홈브류</option>
            </select>

            {/* 2-2) 스크립트 선택 셀렉트 */}
            <select
              value={editionPick}
              onChange={(e) => setEditionPick(e.target.value)}
              style={{ flex: 3, padding: "8px", minWidth: 240 }}
              aria-label="스크립트 선택"
              title="스크립트 선택"
            >
              <option value="">스크립트/캐릭터 모음 선택</option>

              {(() => {
                const ctx = { jfaUnlocked };
                const allKeys = Object.keys(SCRIPT_GROUPS);
                // 1) 분류 필터
                let keys = editionCategory ? [editionCategory] : allKeys;
                // 2) 그룹 가시성 필터(april 같은 visibleIf 처리)
                keys = keys.filter((k) => {
                  const g = SCRIPT_GROUPS[k];
                  return !g.visibleIf || g.visibleIf(ctx);
                });
                return keys.flatMap((k) => {
                  const g = SCRIPT_GROUPS[k];
                  // 항목 레벨 require 처리(필요 시)
                  const visibleItems = g.items.filter((it) => {
                    if (!it?.value) return false; // homebrew의 빈 항목 제거
                    if (!it.require) return true;
                    if (it.require === "jfaUnlocked") return !!jfaUnlocked;
                    return true;
                  });
                  // 스크립트 vs 캐릭터 모음집 분리 1
                  const scriptItems = visibleItems.filter((it) => !PACK_VALUES.has(it.value));
                  const packItems   = visibleItems.filter((it) =>  PACK_VALUES.has(it.value));
                  const groupsToRender = [];
                  if (scriptItems.length) {
                    groupsToRender.push(
                      <optgroup key={`${k}-scripts`} label={`${g.label} - 스크립트`}>
                        {scriptItems.map((it) => (
                          <option key={it.value} value={it.value}>{it.label}</option>
                        ))}
                      </optgroup>
                    );
                  }
                  // 스크립트 vs 캐릭터 모음집 분리 2
                  if (packItems.length) {
                    groupsToRender.push(
                      <optgroup key={`${k}-packs`} label={`${g.label} - 캐릭터 모음`}>
                        {packItems.map((it) => (
                          <option key={it.value} value={it.value}>{it.label}</option>
                        ))}
                      </optgroup>
                    );
                  }
                  return groupsToRender;
                });
              })()}
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

        {/* ✅ bootlegger / djinn / stormcatcher 선택 시에 나타나는 특수 규칙 입력창 */}
        {showSpecialRulesInput && (
          <textarea
            value={specialRules}
            onChange={(e) => setSpecialRules(e.target.value)}
            placeholder="이 스크립트의 추가/특수 규칙을 적어주세요. (예: 징크스, 홈브류 룰, 진행 유의사항 등)"
            style={{
              width: "100%",
              padding: 8,
              fontFamily: "monospace",
              marginBottom: "10px",
              minHeight: 72,           // 검색창(한 줄 input)보다 넉넉하게 읽기 편한 높이
              boxSizing: "border-box",
            }}
          />
        )}
         
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
        {/* --- 맨 아래: 감사의 말 (읽기 전용 토글) --- */}
        <div style={{ marginTop: 28 }}>
          <div
            onClick={() => setShowThanks((v) => !v)}
            style={{
              cursor: "pointer",
              userSelect: "none",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 24, fontWeight: 700, lineHeight: 1.2,
              padding: "6px 0",
              borderTop: "1px solid #eee",
              borderBottom: "1px solid #eee",
            }}
            aria-expanded={showThanks}
            role="button"
          >
            <span>전하는 말</span>
            <span style={{ marginLeft: "auto", fontSize: 18, color: "#666" }}>
              {showThanks ? "▲" : "▼"}
            </span>
          </div>

          {showThanks && (
            <div
              style={{
                padding: "12px 0",
                color: "#000",                 // 본문 색상은 검정
                fontSize: 14,                  // “선택된 캐릭터 카운트” 정도의 크기
                lineHeight: 1.7,
                whiteSpace: "normal",
                wordBreak: "break-word",
              }}
              // 안전한 범위에서 간단한 앵커만 허용 (위의 renderRichText 출력)
              dangerouslySetInnerHTML={{ __html: renderRichText(THANKS_TEXT.trim()) }}
            />
          )}
        </div>
        {/* 🦷 41분 팝업: 선택 모드에서만 렌더 */}
        {toothPromptVisible && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
            }}
          >
            <div
              style={{
                background: "#fff",
                borderRadius: 12,
                padding: "20px 16px",
                maxWidth: 360,
                width: "90%",
                boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 20, marginBottom: 10 }}>🦷 이빨을 바칠 준비가 되셨나요? 🦷</div>
              <div style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>
                (이 창은 1분 후 자동으로 닫힙니다)
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                <button onClick={onToothYes} style={{ padding: "8px 12px" }}>예</button>
                <button onClick={onToothNo} style={{ padding: "8px 12px" }}>아니오</button>
              </div>
            </div>
          </div>
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
      <div style={{ flex: 3 }}>
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
          <button onClick={() => setMode("select")}>🔙 선택으로</button>
          <button onClick={exportPDF}>📄 PDF로 저장</button>
          <button onClick={exportImage}>🖼 PNG로 저장</button>
          <button onClick={copyScriptJson}>📋 클립보드에 복사(JSON)</button>
        </div>

        <h2>{meta.name}</h2>
        <p style={{ color: "gray" }}>by {meta.author}</p>

        {/* ✅ 특수 규칙 표시: 입력이 있을 때만 */}
        {specialRules?.trim() && (() => {
          const base = process.env.PUBLIC_URL || "";
          const iconBootlegger = `${base}/icons/Icon_bootlegger.png`;
          const iconDjinn = `${base}/icons/Icon_djinn.png`;
          const iconStormcatcher = `${base}/icons/Icon_stormcatcher.png`;
            // 보여줄 아이콘 목록
          const icons = [];
            if (selectedIds.includes("bootlegger")) icons.push(iconBootlegger);
            if (selectedIds.includes("djinn")) icons.push(iconDjinn);
            if (selectedIds.includes("stormcatcher")) icons.push(iconStormcatcher);
        
            return (
              <div
                style={{
                  color: "#444",
                  fontSize: "15px",
                  background: "#fafafa",
                  border: "1px solid #eee",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  marginBottom: "12px",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.6,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                }}
              >
                {/* 왼쪽 아이콘 그룹 */}
                <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                  {icons.length > 0 && icons.map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        alt="rule icon"
                        width="25"
                        height="25"
                        style={{ objectFit: "contain", borderRadius: "4px" }}
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    ))}
                </div>
                {/* 오른쪽 텍스트 영역 */}
                <div style={{ flex: 1, whiteSpace: "pre-wrap" }}>
                  <b style={{ display: "block", marginBottom: "4px" }}>특수 규칙</b>
                  {specialRules}
                </div>
              </div>
            );
          })()}

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
          <h2 style={{ marginTop: 0, fontSize: "22px" }}>🌙 첫번째 밤</h2>
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
