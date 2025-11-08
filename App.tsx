import { useState, useEffect, useRef } from "react";
import { Bot, Glasses, HelpCircle } from "lucide-react";

const MANUAL_FADE_MS = 3000; // 칩/바 컨텐츠 페이드인 시간(ms)
const REVEAL_INTERVAL_MS = 500; // RankingReveal 간격(기존 컴포넌트 500ms)
const REASONS_DELAY_MS = 300;   // 1,2,3 모두 뜬 다음 추가 지연
// === Help texts ===
const HELP_FIELD_TEXT = `사용하려는 주된 목적을 간단하게.\n\n<예시>\n"학교 과제"\n"심리 상담"\n"이미지 인식"\n"음악 제작"\n"게임 제작"\n등. `;
const HELP_TASK_TEXT = `작업에 필요한 요소를 입력. 자유롭게 하시면 됩니다.\n\n\n<예시>\n\n"pdf 형식의 학교 과제를 풀게 하려고. 과제가 매일매일 나오는데 오늘 과제가 몇 주 전 과제의 내용과 연관될 수도 있으니까, 이전 내용을 잘 까먹지 말아야돼. 문제 풀이 형식도 딱 내가 지정한대로 계속 기억해야됨."\n\n"우울증 관련 심리 상담을 받아야 하니, 공감을 잘 해주는 상담사 AI가 필요합니다..."\n\n"이미지 인식을 제일 잘해야 돼요. 그냥 이거 하나면 됩니다."\n\n"베이스가 맛있고 화음 잘 짜주는 ai요"\n\n"유니티에서 그래픽 쪽으로 스샷 찍어가면서 물어볼거임."\n\n등. `;
// Tooltip glow (sky-400 tone)
const TOOLTIP_GLOW_CLS = "ring-1 ring-sky-400/70 shadow-[0_0_18px_rgba(56,189,248,0.38)]";

type Phase = "landing" | "manual" | "running" | "results";

const LANGUAGE_OPTIONS = [
  "english",
  "한국어",
  "japanese",
  "Chinese",
  "Spanish",
  "I'm muuuultilingual"
] as const;

type LanguageOption = (typeof LANGUAGE_OPTIONS)[number];

const CATALOG = [
  "가격/1k tokens",
  "응답지연(latency)",
  "멀티모달(이미지/오디오)",
  "컨텍스트 길이",
  "정확도(코딩/수학)",
  "RAG 친화도",
  "NSFW 정책 유연성",
  "데이터 보존/학습옵트아웃",
  "업타임/안정성",
  "툴체인 호환성"
];

// Pretty range (sky/cyan theme)
const PRETTY_RANGE_CSS = `
.pretty-range{
  --fill:50%;
  --track-h:12px;
  --thumb:24px;
  --thumb-shadow: 0 2px 8px rgba(56,189,248,.35);
  --track-bg: rgba(38,38,38,.6);
  --track-grad-from: rgba(56,189,248,.95);
  --track-grad-to: rgba(99,102,241,.95);
  background: transparent;
  appearance: none;
  -webkit-appearance: none;
}
.pretty-range:focus{ outline: none; }

/* WebKit */
.pretty-range::-webkit-slider-runnable-track{
  height: var(--track-h);
  border-radius: 9999px;
  background:
    linear-gradient(90deg, var(--track-grad-from), var(--track-grad-to)) 0 0/var(--fill) 100% no-repeat,
    var(--track-bg);
}
.pretty-range::-webkit-slider-thumb{
  -webkit-appearance: none;
  width: var(--thumb);
  height: var(--thumb);
  margin-top: calc((var(--track-h) - var(--thumb)) / 2);
  background: #0b1220;
  border: 3px solid rgb(56,189,248);
  border-radius: 9999px;
  box-shadow: var(--thumb-shadow);
  cursor: pointer;
}
.pretty-range:hover::-webkit-slider-thumb{
  box-shadow: 0 0 0 4px rgba(56,189,248,.15), var(--thumb-shadow);
}
.pretty-range:active::-webkit-slider-thumb{
  box-shadow: 0 0 0 6px rgba(56,189,248,.18), var(--thumb-shadow);
}

/* Firefox */
.pretty-range::-moz-range-track{
  height: var(--track-h);
  border-radius: 9999px;
  background:
    linear-gradient(90deg, var(--track-grad-from), var(--track-grad-to)) 0 0/var(--fill) 100% no-repeat,
    var(--track-bg);
}
.pretty-range::-moz-range-thumb{
  width: var(--thumb);
  height: var(--thumb);
  background: #0b1220;
  border: 3px solid rgb(56,189,248);
  border-radius: 9999px;
  box-shadow: var(--thumb-shadow);
  cursor: pointer;
}
.pretty-range::-moz-range-progress{
  height: var(--track-h);
  background: linear-gradient(90deg, var(--track-grad-from), var(--track-grad-to));
  border-radius: 9999px;
}

/* Old Edge/IE (optional fallback) */
.pretty-range::-ms-track{
  height: var(--track-h);
  border-color: transparent;
  color: transparent;
  background: transparent;
}
.pretty-range::-ms-fill-lower{
  background: linear-gradient(90deg, var(--track-grad-from), var(--track-grad-to));
  border-radius: 9999px;
}
.pretty-range::-ms-fill-upper{
  background: var(--track-bg);
  border-radius: 9999px;
}
.pretty-range::-ms-thumb{
  width: var(--thumb);
  height: var(--thumb);
  background: #0b1220;
  border: 3px solid rgb(56,189,248);
  border-radius: 9999px;
  box-shadow: var(--thumb-shadow);
  cursor: pointer;
}
`;
/*
트랙 두께: --track-h 값 변경(기본 6px)

손잡이 크기: --thumb 값 변경(기본 16px)

색상: --track-grad-from, --track-grad-to를 sky/cyan 계열로 교체

손잡이 테두리/글로우: border: 3px solid rgb(56,189,248)와 --thumb-shadow 조절
*/

type Weight = Record<string, number>; // 0~1

// Scrollbar styles (scoped to .nice-scroll)
const GLOBAL_SCROLL_CSS = `
/* Firefox */
.nice-scroll{ scrollbar-width:thin; scrollbar-color: rgba(99,102,241,.65) rgba(38,38,38,.55); }

/* WebKit (Chrome/Safari/Edge) */
.nice-scroll::-webkit-scrollbar{ width:10px; }
.nice-scroll::-webkit-scrollbar-track{
  background: rgba(38,38,38,.55);
  border-radius: 9999px;
}
.nice-scroll::-webkit-scrollbar-thumb{
  background: linear-gradient(180deg, rgba(99,102,241,.9), rgba(56,189,248,.9));
  border-radius: 9999px;
  border: 2px solid rgba(38,38,38,.55);
}
.nice-scroll::-webkit-scrollbar-thumb:hover{
  background: linear-gradient(180deg, rgba(129,140,248,.95), rgba(56,189,248,.95));
}
`;




export default function App() {
  const [phase, setPhase] = useState<Phase>("landing");
  const [field, setField] = useState("");
  const [task, setTask] = useState("");
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [pricePref, setPricePref] = useState<"무료"|"효율"|"무관"|"">("");

  const [revealStep, setRevealStep] = useState<0|1|2|3>(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [bannerActive, setBannerActive] = useState(false);

  const ctaGridRef = useRef<HTMLDivElement|null>(null);
  const priceSectionRef = useRef<HTMLDivElement|null>(null);
  const bannerRef = useRef<HTMLDivElement|null>(null);
  const [bannerOpacity, setBannerOpacity] = useState(1);
  const [showResultsInline, setShowResultsInline] = useState(false);
  const [inlineRunning, setInlineRunning] = useState(false);

  const [ctaLandingOpacity, setCtaLandingOpacity] = useState(1);
  const [textFadeMs, setTextFadeMs] = useState(400);
  const [showLandingCTA, setShowLandingCTA] = useState(true);
  const weightsSectionRef = useRef<HTMLDivElement|null>(null);

  const [containerPadBottom, setContainerPadBottom] = useState(0);
  const [ctaTransform, setCtaTransform] = useState<string>("");
  const [manualOpacity, setManualOpacity] = useState(0);
  const [ctaFixed, setCtaFixed] = useState(false);
  const [ctaRect, setCtaRect] = useState<{top:number;left:number;width:number;height:number}>({top:0,left:0,width:0,height:0});

  const [textOpacity, setTextOpacity] = useState(1);
  const [showText, setShowText] = useState(true);

  const canEnter = field.trim().length>0 && task.trim().length>0 && pricePref !== "";

  const [selected, setSelected] = useState<string[]>([]);
  const [weights, setWeights] = useState<Weight>({});

  const [result, setResult] = useState<{top:{rank:1|2|3; name:string; why:string;}[], criteriaTop3:string[]} | null>(null);
  const [showReasons, setShowReasons] = useState(false);

  useEffect(()=>{
    if ((phase==="results" || showResultsInline) && result) {
      setShowReasons(false);
      const total = REVEAL_INTERVAL_MS * (result.top?.length ?? 0) + REASONS_DELAY_MS;
      const t = setTimeout(()=>setShowReasons(true), total);
      return ()=>clearTimeout(t);
    }
  }, [phase, result, showResultsInline]);


  function toggleLanguage(lang: LanguageOption){
    setLanguages(prev => {
      if (lang === "I'm muuuultilingual") {
        // 멀티링구얼 선택 시: 다른 언어 전부 날리고, 한 번 더 누르면 전체 해제
        if (prev.includes(lang)) {
          return [];
        }
        return [lang];
      }
      // 다른 언어 선택 시: "I'm muuuultilingual"은 자동 해제
      const withoutMulti = prev.filter(l => l !== "I'm muuuultilingual");
      if (withoutMulti.includes(lang)) {
        return withoutMulti.filter(l => l !== lang);
      }
      return [...withoutMulti, lang];
    });
  }

  function handlePriceSelect(p: "무료"|"효율"|"무관"){
    setPricePref(p);
    if (revealStep === 0) {
      setTimeout(()=>setRevealStep(1), 100);
      setTimeout(()=>setRevealStep(2), 200);
      setTimeout(()=>setRevealStep(3), 300);
    }
  }

  function addCriterion(c:string){
    if(!selected.includes(c)){
      setSelected(prev => [...prev, c]);
      setWeights(prev => ({...prev, [c]: 0.5}));
    }
  }
  function removeCriterion(c:string){
    setSelected(prev => prev.filter(x=>x!==c));
    setWeights(prev => {
      const n = {...prev};
      delete n[c];
      return n;
    });
  }

  async function handleManualClick(){
    if (isTransitioning) return;
    setIsTransitioning(true);

    const grid = ctaGridRef.current;
    if (grid) {
      const fr = grid.getBoundingClientRect();
      setCtaRect({ top: fr.top, left: fr.left, width: fr.width, height: fr.height });
      setCtaFixed(true);
      await nextFrame(); // fixed 반영 후 정확 좌표 재측정

      const cur = ctaGridRef.current!.getBoundingClientRect();
      const dy = (window.innerHeight - cur.height) - cur.top; // CTA 하단 = 화면 하단
      setCtaTransform(`translate(0px, ${dy}px)`);
    }

    // 스크롤 여유 확보 후, CTA 이동과 동일한 1s 동안 같은 ease로 스크롤
    setContainerPadBottom(prev => Math.max(prev, window.innerHeight));
    if (priceSectionRef.current) {
      const r = priceSectionRef.current.getBoundingClientRect();
      const target = window.scrollY + r.bottom;
      animateScrollTo(target, 1000); // ease-out
    }

    await delay(1000);
    setShowLandingCTA(false);
    setBannerActive(true);


    // CTA는 이동 중 항상 보임(불투명)
    setTextOpacity(0);
    await delay(400);       // 텍스트 페이드아웃 완료
    setShowText(false);     // 텍스트 언마운트

    await delay(100);       // 0.1s 휴지
    setManualOpacity(0);    // 초기값 명시(안전)
    setPhase("manual");

    // 마운트 완료 + 스타일 적용 확정까지 두 프레임 대기 → 트랜지션 확실히 발동
    await nextFrame();
    await nextFrame();

    setManualOpacity(1);    // 이제 페이드인 시작
    await delay(MANUAL_FADE_MS);
    
    setCtaTransform("");
    setCtaFixed(false);
    setIsTransitioning(false);

    if (bannerRef.current) {
      const h = bannerRef.current.getBoundingClientRect().height;
      setContainerPadBottom(prev => Math.max(prev, h, window.innerHeight));
    }
  }

  async function runAuto(){
    // 여백 넉넉히 확보 후, 가격선호 블록 하단 + 2em 지점으로 부드럽게 스크롤
    setContainerPadBottom(prev => Math.max(prev, window.innerHeight));
    await nextFrame();
    if (priceSectionRef.current) {
      const r = priceSectionRef.current.getBoundingClientRect();
      const basePx = parseFloat(getComputedStyle(document.body).fontSize || "16");
      const offset = 2 * basePx;
      const target = window.scrollY + r.bottom + offset;
      await animateScrollTo(target, 1000);
    }

    // 스크롤 직후 0.5s 페이드아웃(텍스트 + 두 버튼)
    setTextFadeMs(500);
    setTextOpacity(0);
    setCtaLandingOpacity(0);
    await delay(500);
    setShowText(false);
    setShowLandingCTA(false);

    setPhase("running");
    await delay(800);


    setPhase("results");
    setResult({
      top: [
        {rank:1, name:"Model A", why:"비용 대비 성능 우수"},
        {rank:2, name:"Model B", why:"긴 컨텍스트/안정성"},
        {rank:3, name:"Model C", why:"무료 티어 존재"}
      ],
      criteriaTop3: pickTop3Default(field, pricePref)
    });
  }


async function runManualOrPartial(){
  // 배너 0.5s 페이드아웃
  setBannerOpacity(0);

  // 여백 확보(페이지 하단 패딩) + '가중치 조정' 카드 하단 + 2em로 스크롤(이징)
  setContainerPadBottom(prev => Math.max(prev, window.innerHeight * 2));
  await nextFrame();
  if (weightsSectionRef.current) {
    const r = weightsSectionRef.current.getBoundingClientRect();
    const basePx = parseFloat(getComputedStyle(document.body).fontSize || "16");
    const offset = 2 * basePx;
    const target = window.scrollY + r.bottom + offset;
    await animateScrollTo(target, 1000);
  }

  // 페이드 종료 후 배너 제거 (칩/바 컨텐츠는 유지)
  await delay(500);
  setBannerActive(false);

  // 인라인 '분석 중…' 0.8s 표시(자동선택과 동일한 체감)
  setInlineRunning(true);
  await delay(800);
  setInlineRunning(false);

  // 결과 계산 후 manual 아래에 결과 인라인 표시
  const top3 = top3FromSelected(selected, weights);
  setResult({
    top: [
      {rank:1, name: top3[0] ?? "Model A", why:"선택 기준 가중치 최적"},
      {rank:2, name: top3[1] ?? "Model B", why:"균형형"},
      {rank:3, name: top3[2] ?? "Model C", why:"보완적"}
    ],
    criteriaTop3: (selected.slice(0,3).length?selected.slice(0,3):pickTop3Default(field, pricePref))
  });
  setShowResultsInline(true);
}



async function rerunCurrent(){
  if (showResultsInline) {
    setInlineRunning(true);
    await delay(800);
    setResult({
      top: [
        {rank:1, name:"Model A", why:"비용 대비 성능 우수"},
        {rank:2, name:"Model B", why:"긴 컨텍스트/안정성"},
        {rank:3, name:"Model C", why:"무료 티어 존재"}
      ],
      criteriaTop3: pickTop3Default(field, pricePref)
    });
    setShowResultsInline(true);
    setInlineRunning(false);
  } else {
    setPhase("running");
    await delay(800);
    setResult({
      top: [
        {rank:1, name:"Model A", why:"비용 대비 성능 우수"},
        {rank:2, name:"Model B", why:"긴 컨텍스트/안정성"},
        {rank:3, name:"Model C", why:"무료 티어 존재"}
      ],
      criteriaTop3: pickTop3Default(field, pricePref)
    });
    setPhase("results");
  }
}

function fullReset(){
  window.location.reload();
}



  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-3xl px-5 py-10" style={{ paddingBottom: containerPadBottom ? `${containerPadBottom}px` : undefined }}>
        <h1 className="text-2xl font-semibold mb-6 text-center">AI 추천 (캐주얼)</h1>

        <div className="space-y-4 mb-6">
          <LabeledInput label="분야" placeholder="예: 이미지 생성, 번역, 코딩 보조…" value={field} onChange={setField} info={HELP_FIELD_TEXT}/>
          {field && <LabeledInput label="작업의 성격" placeholder="예: 게임용 배경 20장 생성" value={task} onChange={setTask} info={HELP_TASK_TEXT}/>}
          {field && task && (
            <div className="mt-2">
              <p className="mb-2 text-sm text-neutral-300">필수 사용 언어(복수 선택 가능)</p>
              <div className="flex flex-wrap gap-2">
                {LANGUAGE_OPTIONS.map(lang => (
                  <button
                    key={lang}
                    type="button"
                    onClick={()=>toggleLanguage(lang)}
                    className={`px-3 py-1.5 rounded-md border text-sm ${
                      languages.includes(lang)
                        ? "border-indigo-500 bg-indigo-500/20 text-indigo-100"
                        : "border-neutral-700 hover:bg-neutral-800 text-neutral-200"
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {field && task &&
            <div ref={priceSectionRef}>
              <p className="mb-2 text-sm text-neutral-300">가격 선호(필수)</p>
              <div className="flex gap-2">
                {["무료","효율","저가","고가","무관"].map(p=>(
                  <button key={p}
                          onClick={()=>handlePriceSelect(p as any)}
                          className={`px-3 py-2 rounded-md border ${pricePref===p?"bg-indigo-600 border-indigo-500":"border-neutral-700 hover:bg-neutral-800"}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          }
        </div>

        {(phase==="landing" || isTransitioning) && canEnter && (
          <>
            {showText && (
              <div className="mt-[2em]" style={{ opacity: textOpacity, transition: `opacity ${textFadeMs}ms ease` }}>
                <FadeLines step={Math.min(revealStep,2)}/>
              </div>
            )}

            {revealStep>=3 && showLandingCTA && (
              <div
                ref={ctaGridRef}
                className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4"
                style={{
                  transform: ctaTransform,
                  opacity: ctaLandingOpacity,
                  transition: `${isTransitioning ? "transform 1s cubic-bezier(0.22,1,0.36,1)" : ""}${isTransitioning ? ", " : ""}opacity 500ms ease`,
                  position: ctaFixed ? "fixed" : undefined,
                  top: ctaFixed ? `${ctaRect.top}px` : undefined,
                  left: ctaFixed ? `${ctaRect.left}px` : undefined,
                  width: ctaFixed ? `${ctaRect.width}px` : undefined
                }}
              >

                <CTA
                  title="자동 추천"
                  subtitle="지금까지의 내용만으로 빠르게"
                  icon={<Bot className="w-6 h-6" />}
                  onClick={runAuto}
                />
                <CTA
                  title="직접 선택"
                  subtitle="1~2분 소요 (기준을 골라 가중치 조정)"
                  icon={<Glasses className="w-6 h-6" />}
                  onClick={handleManualClick}
                />
              </div>
            )}
          </>
        )}

        {phase==="manual" && (
          <div className="space-y-6" style={{ opacity: manualOpacity, transition: `opacity ${MANUAL_FADE_MS}ms ease` }}>
            <CriteriaChipsAll
              catalog={CATALOG}
              selected={new Set(selected)}
              onToggle={(c)=> (selected.includes(c) ? removeCriterion(c) : addCriterion(c))}
            />

            <div ref={weightsSectionRef} className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4">
              <p className="text-sm text-neutral-300 mb-3">당신에게 중요한 지표를 위에서 찾아, 중요도를 자유롭게 변경하세요.</p>
              <div className="space-y-3">
                {selected.map(key=>(
                  <div key={key} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={true}
                      onChange={()=>removeCriterion(key)}
                      className="h-4 w-4 accent-sky-500"
                    />
                    <div className="w-48 text-sm text-neutral-200">{key}</div>
                    <input
                      type="range" min={0} max={1} step={0.01}
                      value={weights[key] ?? 0.5}
                      onChange={e=>setWeights(s=>({...s,[key]: Number(e.target.value)}))}
                      className="w-full pretty-range"
                      style={{ ["--fill" as any]: `${(weights[key] ?? 0) * 100}%` }}
                    />
                    <div className="w-12 text-right text-xs">{Math.round((weights[key]??0)*100)}%</div>
                  </div>
                ))}

                {selected.length===0 && <p className="text-neutral-500 text-sm">기준을 선택하면 여기에 바가 생깁니다.</p>}
              </div>
            </div>
          </div>
        )}

        

        {inlineRunning && (
          <div className="py-20 text-center text-neutral-400">분석 중…</div>
        )}

        {showResultsInline && result && (
          <div className="space-y-6 mt-[3em]">
            <RankingReveal items={result.top}/>
            {showReasons && (
              <>
                <ReasonSummary
                  isAuto={false}
                  field={field}
                  task={task}
                  pricePref={pricePref}
                  languages={languages}
                  selected={selected}
                  weights={weights}
                />
                <div className="py-2 text-center">
                  <p className="text-sm text-neutral-300">위에서 언제든지 내용을 변경해서 다시 결과를 받을 수 있습니다.</p>
                </div>
                <ResultActions onRerunCurrent={rerunCurrent} onResetAll={fullReset}/>
              </>
            )}
          </div>
        )}

        {phase==="running" && (
          <div className="py-20 text-center text-neutral-400">분석 중…</div>
        )}

        {phase==="results" && result && (
          <div className="space-y-6 mt-[3em]">
            <RankingReveal items={result.top}/>
            {showReasons && (
              <>
                <ReasonSummary
                  isAuto={true}
                  field={field}
                  task={task}
                  pricePref={pricePref}
                  languages={languages}
                  selected={selected}
                  weights={weights}
                />
                <div className="py-2 text-center">
                  <p className="text-sm text-neutral-300">위에서 언제든지 내용을 변경해서 다시 결과를 받을 수 있습니다.</p>
                </div>
                <ResultActions onRerunCurrent={rerunCurrent} onResetAll={fullReset}/>
              </>
            )}
          </div>
        )}
      </div>

      {bannerActive && (
        <div ref={bannerRef} className="fixed inset-x-0 bottom-0 border-t border-neutral-800 bg-neutral-900/80 backdrop-blur supports-[backdrop-filter]:bg-neutral-900/60" style={{opacity: bannerOpacity, transition: "opacity 500ms ease"}}>
          <div className="mx-auto max-w-3xl px-5 py-4">
            <div className="text-sm text-neutral-400 mb-2">귀찮아지면 언제든지 누르세요 ⤵</div>
            <div id="banner-cta-grid" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CTA
                title="자동 추천"
                subtitle="지금까지의 내용만으로 빠르게"
                icon={<Bot className="w-6 h-6" />}
                onClick={runManualOrPartial}
              />
              <CTA
                title="선택 완료!"
                subtitle="지금 선택한 기준으로 진행"
                icon={<Glasses className="w-6 h-6" />}
                onClick={runManualOrPartial}
              />
            </div>
          </div>
        </div>
      )}
      <style>{GLOBAL_SCROLL_CSS}</style>
      <style>{GLOBAL_SCROLL_CSS + PRETTY_RANGE_CSS}</style>
    </div>
  );
}

function LabeledInput(props:{
  label:string;
  value:string;
  onChange:(v:string)=>void;
  placeholder?:string;
  info?: string; // 도움말(옵션)
}){
  return (
    <div>
      <label className="mb-2 text-sm text-neutral-300 flex items-center gap-2">
        <span>{props.label}</span>
        {props.info && <InfoHover text={props.info} gapX={8} gapY={8} overlapX={25} overlapY={25} />}
      </label>
      <input
        value={props.value}
        onChange={e=>props.onChange(e.target.value)}
        placeholder={props.placeholder}
        className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-600"
      />
    </div>
  );
}

function CTA(props:{title:string; subtitle:string; icon:React.ReactNode; onClick:()=>void;}){
  return (
    <button onClick={props.onClick}
      className="group flex flex-col items-start gap-2 rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 hover:border-neutral-700 hover:bg-neutral-900 transition-all">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-md bg-neutral-800">{props.icon}</div>
        <div className="text-lg">{props.title}</div>
      </div>
      <div className="text-sm text-neutral-400">{props.subtitle}</div>
    </button>
  );
}

function FadeLines(props:{step:number}){
  const s = props.step ?? 0;
  return (
    <div className="text-sm text-neutral-300 space-y-1 mb-4">
      <p className={s>=1?"opacity-100":"opacity-0"}>당신이 적은 것들을 바탕으로, 제가 적절하게 추천을 해드릴 수 있습니다.</p>
      <p className={s>=2?"opacity-100":"opacity-0"}>또는, 당신이 직접 당신의 입맛에 맞게 고를 수도 있죠. 편한 쪽을 고르세요.</p>
    </div>
  );
}



function CriteriaChipsAll(
  {catalog, selected, onToggle}:{catalog:string[]; selected:Set<string>; onToggle:(c:string)=>void;}
){
  return (
    <div className="flex flex-wrap gap-2">
      {catalog.map(c=>{
        const isOn = selected.has(c);
        return (
          <button
            key={c}
            onClick={()=>onToggle(c)}
            className={`inline-flex items-center gap-2 text-xs px-2 py-1 rounded-full border
              ${isOn
                ? "bg-sky-700/40 border-sky-400 text-sky-100 hover:bg-sky-700/50"
                : "bg-neutral-800 border-neutral-700 text-neutral-200 hover:bg-neutral-700"}`}
          >
            {c}
            {isOn && <span className="text-neutral-200">✕</span>}
          </button>
        );
      })}
    </div>
  );
}


function ReasonSummary({
  isAuto,
  field,
  task,
  pricePref,
  languages,
  selected,
  weights
}:{
  isAuto:boolean;
  field:string;
  task:string;
  pricePref:"무료"|"효율"|"무관"|"";
  languages: LanguageOption[];
  selected:string[];
  weights: Record<string, number>;
}){
  const lines:string[] = [];
  lines.push(`분야: ${field}`);
  lines.push(`작업의 성격: ${task}`);
  lines.push(`가격 선호: ${pricePref}`);
  if (!languages || languages.length === 0 || languages.includes("I'm muuuultilingual")) {
    lines.push(`필수 언어: None`);
  } else {
    lines.push(`필수 언어: ${languages.join(", ")}`);
  }
  if (isAuto) {
    lines.push(`지표: (자동추천)`);
  } else {
    if (!selected || selected.length===0) {
      lines.push(`지표: (직접 선택), NONE`);
    } else {
      lines.push(`지표: (직접 선택)`);
      for (const name of selected) {
        const w = Math.round((weights[name] ?? 0) * 100);
        lines.push(`지표 명: ${name} ${w}%`);
      }
    }
  }
  const summary = lines.join("\n");
  return (
    <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4">
      <p className="mb-2 text-sm text-neutral-400">당신은 다음을 중시합니다</p>
      <pre className="text-sm whitespace-pre-wrap">{summary}</pre>
    </div>
  );
}

function InfoHover({
  text,
  gapX = 8,         // 아이콘에서 가로 간격(px)
  gapY = 8,         // 아이콘에서 세로 간격(px)
  overlapX = 6,     // 아이콘을 가로로 얼마나 겹칠지(+면 더 왼쪽으로)
  overlapY = 4,     // 아이콘을 세로로 얼마나 겹칠지(+면 더 위로)
  widthClass = "w-64",     // 패널 가로폭(Tailwind)
  maxHClass = "max-h-60"   // 패널 최대 높이(Tailwind)
}:{ 
  text: string;
  gapX?: number;
  gapY?: number;
  overlapX?: number;
  overlapY?: number;
  widthClass?: string;
  maxHClass?: string;
}){
  const [open, setOpen] = useState(false);
  // 우측 하단(anchor: 아이콘의 오른쪽/아래 모서리)
  // 패널의 좌측-상단(Top-Left)이 이 anchor에서 시작하도록 배치
  const style: React.CSSProperties = {
    marginLeft: `${gapX - overlapX}px`,
    marginTop: `${gapY - overlapY}px`
  };
  return (
    <span
      className="relative inline-block align-middle"
      onMouseEnter={()=>setOpen(true)}
      onMouseLeave={()=>setOpen(false)}
    >
      <HelpCircle className="h-4 w-4 text-indigo-400/80 hover:text-indigo-300 cursor-help" aria-label="도움말" />
      {open && (
        <div
          className={`absolute left-full top-full z-50 ${widthClass} ${maxHClass} overflow-y-auto nice-scroll rounded-md border border-neutral-700 bg-neutral-900/95 p-3 shadow-xl ${TOOLTIP_GLOW_CLS}`}
          style={style}
          role="tooltip"
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
        </div>
      )}
    </span>
  );
}



function RankingReveal({items}:{items:{rank:1|2|3; name:string; why:string;}[]}){
  const [show, setShow] = useState(0);
  useEffect(()=>{
    setShow(0);
    let i = 0;
    const t = setInterval(()=>{
      i++; setShow(i);
      if(i>=items.length) clearInterval(t);
    }, 500);
    return ()=>clearInterval(t);
  },[items]);
  return (
    <div className="space-y-3">
      {items.map((it, idx)=>(
        <div key={it.rank}
             className={`transition-all duration-300 ${show>idx ? "opacity-100 translate-y-0":"opacity-0 translate-y-2"} bg-neutral-900/60 border border-neutral-800 rounded-xl p-4`}>
          <div className="text-sm text-neutral-400">{it.rank}위</div>
          <div className="text-lg">{it.name}</div>
          <div className="text-sm text-neutral-300">{it.why}</div>
        </div>
      ))}
    </div>
  );
}

function ResultActions({
  onRerunCurrent,
  onResetAll,
  onShare,
  children
}:{ 
  onRerunCurrent: ()=>void;
  onResetAll: ()=>void;
  onShare?: ()=>void;
  children?: any;
}){
  return (
    <div className="flex gap-2 justify-center">
      <button onClick={onShare} className="px-4 py-2 rounded-md bg-neutral-800 border border-neutral-700 hover:bg-neutral-700">공유</button>
      <button onClick={onRerunCurrent} className="px-4 py-2 rounded-md bg-neutral-800 border border-neutral-700 hover:bg-neutral-700">현재의 입력으로 다시!</button>
      <button onClick={onResetAll} className="px-4 py-2 rounded-md bg-neutral-800 border border-neutral-700 hover:bg-neutral-700">완전히 다시!</button>
      {children}
    </div>
  );
}
function delay(ms:number){ return new Promise(res=>setTimeout(res, ms)); }
function nextFrame(){ return new Promise<void>(res => requestAnimationFrame(() => res())); }
function easeOutCubic(t:number){ return 1 - Math.pow(1 - t, 3); }
function animateScrollTo(targetY:number, durationMs:number){
  const startY = window.scrollY;
  const delta = targetY - startY;
  const start = performance.now();
  return new Promise<void>(resolve=>{
    function step(now:number){
      const t = Math.min(1, (now - start)/durationMs);
      const eased = easeOutCubic(t);
      window.scrollTo(0, startY + delta * eased);
      if (t < 1) requestAnimationFrame(step); else resolve();
    }
    requestAnimationFrame(step);
  });
}

function pickTop3Default(field:string, pricePref:string){
  if(pricePref==="무료") return ["무료 플랜", "업타임/안정성", "컨텍스트 길이"];
  if(field.includes("이미지")) return ["텍스트→이미지 품질","가격/1k tokens","NSFW 정책 유연성"];
  if(field.includes("코딩")) return ["정확도(코딩/수학)","컨텍스트 길이","가격/1k tokens"];
  return ["가격/1k tokens","응답지연(latency)","업타임/안정성"];
}

function top3FromSelected(sel:string[], w:Record<string,number>){
  return [...sel].sort((a,b)=>(w[b]??0)-(w[a]??0)).slice(0,3);
}
