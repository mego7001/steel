import React, { useState, useEffect, useRef } from 'react';
import { ProjectData } from '../types/engineering';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  HardHat,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';

interface AssemblySequenceViewerProps {
  project: ProjectData;
}

interface SequenceStep {
  stepNumber: number;
  titleAr: string;
  titleEn: string;
  category: 'Foundation' | 'Columns' | 'RingBeams' | 'Eaves' | 'Rafters' | 'Purlins' | 'Bracing' | 'Grouting';
  descriptionAr: string;
  partsAndAssemblies: string[];
  toolsRequired: string[];
  safetyAndQA: string;
  torqueSpec?: string;
}

const SEQUENCE_STEPS: SequenceStep[] = [
  {
    stepNumber: 1,
    titleAr: 'تخطيط المحاور وتثبيت مسامير الأساسات',
    titleEn: 'Grid Layout & Anchor Bolts Setting',
    category: 'Foundation',
    descriptionAr: 'مراجعة مناسيب القواعد الخرسانية ومحاور الأعمدة، زرع وربط 4 مسامير أنكور M24 Grade 8.8 لكل قاعدة مع صواميل تسوية سفلية.',
    partsAndAssemblies: ['16× مسامير أنكور M24 Gr 8.8 بطول 450 مم', '4× قوالب ضبط المسافات (Templates)'],
    toolsRequired: ['ميزان ليزر بصري', 'شريط قياس ليزري', 'مفتاح ربط يدوي 36 مم'],
    safetyAndQA: 'نقطة توقف Hold Point: تفاوت مراكز المسامير لا يتجاوز ±2 مم قبل إجازة رفع الأعمدة.',
  },
  {
    stepNumber: 2,
    titleAr: 'نصب ووزن أعمدة الهيكل الرئيسية',
    titleEn: 'Main Columns Erection & Plumbness',
    category: 'Columns',
    descriptionAr: 'رفع أعمدة الزوايا والإطارات بواسطة الونش، إنزال ألواح القواعد Base Plates فوق صواميل التسوية وضبط الشاقولية وتثبيت الصواميل العلوية مؤقتًا.',
    partsAndAssemblies: ['AS-COL-A1', 'AS-COL-B1', 'AS-COL-A2', 'AS-COL-B2', 'AS-COL-A3', 'AS-COL-B3'],
    toolsRequired: ['كرين / ونش بوم 5 طن', 'وايرات نيلون معتمدة', 'ميزان شاقول مغناطيسي'],
    safetyAndQA: 'تأمين العمود بأحزمة تثبيت مؤقتة (Guys) حتى استكمال كمرات الربط الأفقية لمنع السقوط.',
    torqueSpec: 'شد أولي Snug-Tight لصواميل M24 (حوالي 150 N·m).',
  },
  {
    stepNumber: 3,
    titleAr: 'تثبيت كمرات الربط السفلية للأرضية',
    titleEn: 'Base Ring Beams & Floor Runners Fit-up',
    category: 'RingBeams',
    descriptionAr: 'تركيب كمرات UPN 120 السفلية للربط بين قواعد الأعمدة، وضبط زوايا تعامد الهيكل الإنشائي المستطيل والتأكد من أبعاد الأوتار (Diagonals).',
    partsAndAssemblies: ['AS-BASE-L1', 'AS-BASE-L2', 'AS-BASE-R1', 'AS-BASE-R2', 'AS-BASE-TR'],
    toolsRequired: ['مفتاح صدمي Impact Wrench', 'مسامير ضبط Fit-up Drift Pins'],
    safetyAndQA: 'فحص استواء شاسيه الأرضية مع التفاوت المسموح ±3 مم على كامل الطول.',
    torqueSpec: 'مسامير M16 Grade 8.8 مشدودة لعزم 170 N·m.',
  },
  {
    stepNumber: 4,
    titleAr: 'تركيب كمرات الإفريز الطولية العلوية',
    titleEn: 'Eaves Struts & Top Longitudinal Runners',
    category: 'Eaves',
    descriptionAr: 'رفع وتركيب كمرات الإفريز RHS 100x50x4 في قمم الأعمدة على المنسوب العلوي لتوفير الصلابة الطولية وتجهيز الهيكل لاستقبال روافتر السقف.',
    partsAndAssemblies: ['AS-PUR-EAVE-L1', 'AS-PUR-EAVE-L2', 'AS-PUR-EAVE-R1', 'AS-PUR-EAVE-R2'],
    toolsRequired: ['سقالة متنقلة أو برج ألومنيوم', 'حزام أمان ثنائي الخطاف لعمال التركيب'],
    safetyAndQA: 'ربط خط حياة سلكي علوي (Life-Line) لجميع الأعمال على ارتفاعات فوق 2 متر.',
  },
  {
    stepNumber: 5,
    titleAr: 'رفع روافتر السقف وربط وصلات العزم',
    titleEn: 'Roof Rafters & Moment End-Plates Bolting',
    category: 'Rafters',
    descriptionAr: 'رفع كمرات السقف IPE 160 وتثبيت الألواح الطرفية Extended End Plates بقمم الأعمدة بواسطة 8 مسامير M20 Grade 8.8 مشدودة مسبقًا.',
    partsAndAssemblies: ['AS-RAF-01', 'AS-RAF-02', 'AS-RAF-03', 'AS-RAF-04'],
    toolsRequired: ['ونش رفع مزود بـ Spreader Beam', 'مفتاح عزم معاير (Calibrated Torque Wrench)'],
    safetyAndQA: 'فحص عدم وجود فراغ بين الألواح المتصلة (Fit-up Gap <= 0.5mm) قبل الربط النهائي.',
    torqueSpec: 'عزم شد مسامير M20 Gr 8.8 = 380 N·m وفق كود EN 1090-2.',
  },
  {
    stepNumber: 6,
    titleAr: 'توزيع وتثبيت مدادات السقف والجدران',
    titleEn: 'Roof Purlins & Girts Assembly',
    category: 'Purlins',
    descriptionAr: 'تثبيت مدادات السقف UPN 120 والمدادات الجانبية بفواصل 1.2 متر فوق روافتر السقف لاستقبال ألواح الساندوتش بانل والكسوات.',
    partsAndAssemblies: ['AS-PUR-01 إلى AS-PUR-08', 'أطقم كليتات التثبيت Purlin Cleats'],
    toolsRequired: ['دريل شحن لاسلكي', 'مسامير ربط M12 مجلفنة'],
    safetyAndQA: 'حظر السير المباشر فوق المدادات دون ألواح خشبية لتوزيع أوزان العمال.',
  },
  {
    stepNumber: 7,
    titleAr: 'شد أقطار التربيط للرياح (Cross Bracing)',
    titleEn: 'Wall & Roof X-Bracing Installation',
    category: 'Bracing',
    descriptionAr: 'تركيب أقطار الزوايا L 50x5 في الحوائط الجانبية والسقف، وشدها بمقدار متوازن لتحقيق الصلابة الجانبية الكاملة لمقاومة الرياح.',
    partsAndAssemblies: ['AS-BRC-L1', 'AS-BRC-L2', 'AS-RF-BRC-01', 'AS-RF-BRC-02'],
    toolsRequired: ['مفتاح شد زوايا', 'وصلات Turnbuckle لضبط الشد'],
    safetyAndQA: 'التأكد من خلو أعضاء التربيط من الانحناء الموضعي أو الارتخاء المفرط.',
  },
  {
    stepNumber: 8,
    titleAr: 'حقن المونة غير الانكماشية والتشطيب النهائي',
    titleEn: 'Non-Shrink Grouting & Final Handover',
    category: 'Grouting',
    descriptionAr: 'حقن مادة الجراوت الإسمنتي غير القابل للانكماش بسماكة 30 مم تحت ألواح القواعد، والدهان الترميمي للمسامير وتسليم الهيكل للاستشاري.',
    partsAndAssemblies: ['مخاليط جراوت SikaGrout 214 أو ما يماثله', 'دهان حماية غني بالزنك للمسامير'],
    toolsRequired: ['قوالب خشبية محكمة لحقن الجراوت', 'قمع صب / مضخة يدوية'],
    safetyAndQA: 'اعتماد محضر التسليم الهندسي النهائي وختم تقرير الفحص ITP قبل البدء بالكسوات.',
  },
];

export const AssemblySequenceViewer: React.FC<AssemblySequenceViewerProps> = ({ project }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(2500); // 2.5s per step
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const activeStep = SEQUENCE_STEPS[currentStepIndex];

  // Auto-play timer
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setTimeout(() => {
        setCurrentStepIndex((prev) => (prev < SEQUENCE_STEPS.length - 1 ? prev + 1 : 0));
      }, playbackSpeed);
    } else if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, currentStepIndex, playbackSpeed]);

  const handleNext = () => {
    setIsPlaying(false);
    setCurrentStepIndex((prev) => Math.min(SEQUENCE_STEPS.length - 1, prev + 1));
  };

  const handlePrev = () => {
    setIsPlaying(false);
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
  };

  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-6 shadow-2xl">
      {/* Header & Sequence Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <HardHat className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-100">
                تسلسل تركيب وتجميع أجزاء الهيكل المعدني (Assembly & Erection Sequence)
              </h3>
              <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/40">
                خطوة {activeStep.stepNumber} من {SEQUENCE_STEPS.length}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              محاكاة بصرية تفاعلية وإرشادات هندسية لعمال الورشة وفريق التركيب بالموقع وفق مواصفة السلامة والكود الإنشائي.
            </p>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2 bg-slate-950 border border-slate-700/80 rounded-lg p-1.5 shadow-md">
          <button
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-40 transition cursor-pointer"
            title="الخطوة السابقة"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-3 py-1.5 rounded font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
              isPlaying
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-100'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>إيقاف مؤقت</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>تشغيل التسلسل التلقائي</span>
              </>
            )}
          </button>

          <button
            onClick={handleNext}
            disabled={currentStepIndex === SEQUENCE_STEPS.length - 1}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-40 transition cursor-pointer"
            title="الخطوة التالية"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button
            onClick={handleReset}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
            title="إعادة البدء من الخطوة 1"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stepper Dots & Timeline Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs font-mono text-slate-400">
          <span>مراحل التركيب الميداني (Field Erection Milestones):</span>
          <span className="text-amber-400 font-bold">{Math.round(((currentStepIndex + 1) / SEQUENCE_STEPS.length) * 100)}% منجز</span>
        </div>

        <div className="grid grid-cols-8 gap-1.5">
          {SEQUENCE_STEPS.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <button
                key={step.stepNumber}
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentStepIndex(idx);
                }}
                className={`py-2 px-1 rounded-md text-center transition cursor-pointer border ${
                  isCurrent
                    ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md shadow-amber-500/20'
                    : isCompleted
                    ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60'
                    : 'bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span className="text-[10px] block font-mono">#{step.stepNumber}</span>
                <span className="text-[11px] truncate block font-sans">{step.category}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Left Animated Isometric CAD Preview & Right Workshop Instructions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Visual Step-by-Step Isometric Erection Canvas (7 cols) */}
        <div className="lg:col-span-7 rounded-xl bg-slate-950 border border-slate-800 p-4 flex flex-col justify-between cad-grid shadow-inner relative overflow-hidden">
          {/* Status Badge in canvas */}
          <div className="flex justify-between items-center z-10">
            <span className="text-xs px-2.5 py-1 rounded bg-slate-900/90 border border-slate-700 text-slate-200 font-mono">
              المشهد الإنشائي: مرحلة {activeStep.category}
            </span>
            <span className="text-[11px] text-amber-400 font-mono animate-pulse">
              ● جاري تركيب: {activeStep.titleAr}
            </span>
          </div>

          {/* Isometric SVG Visualization of Structure Layers based on currentStepIndex */}
          <div className="w-full h-[360px] flex items-center justify-center my-2">
            <svg viewBox="0 0 700 400" className="w-full h-full max-w-[620px]">
              {/* Ground & Concrete Pedestals (Always Visible) */}
              <g id="layer-foundations">
                <line x1="100" y1="330" x2="600" y2="330" stroke="#334155" strokeWidth="2" strokeDasharray="4,4" />
                {/* 4 Foundation Blocks */}
                {[140, 260, 420, 540].map((x, i) => (
                  <g key={i}>
                    <rect x={x - 22} y="325" width="44" height="15" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
                    {/* Anchor Bolts (Step 1+) */}
                    {currentStepIndex >= 0 && (
                      <g>
                        <line x1={x - 12} y1="315" x2={x - 12} y2="330" stroke={currentStepIndex === 0 ? '#f59e0b' : '#94a3b8'} strokeWidth="3" />
                        <line x1={x + 12} y1="315" x2={x + 12} y2="330" stroke={currentStepIndex === 0 ? '#f59e0b' : '#94a3b8'} strokeWidth="3" />
                        {currentStepIndex === 0 && (
                          <circle cx={x} cy="320" r="14" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3,3" />
                        )}
                      </g>
                    )}
                  </g>
                ))}
              </g>

              {/* Step 2+: Columns Erection */}
              {currentStepIndex >= 1 && (
                <g id="layer-columns">
                  {[140, 260, 420, 540].map((x, i) => {
                    const isNew = currentStepIndex === 1;
                    return (
                      <g key={i}>
                        {/* Base plate */}
                        <rect x={x - 25} y="320" width="50" height="7" fill={isNew ? '#f59e0b' : '#cbd5e1'} stroke="#0f172a" strokeWidth="1" />
                        {/* Column shaft */}
                        <rect
                          x={x - 10}
                          y="150"
                          width="20"
                          height="170"
                          fill={isNew ? 'rgba(245, 158, 11, 0.4)' : 'rgba(56, 189, 248, 0.25)'}
                          stroke={isNew ? '#f59e0b' : '#38bdf8'}
                          strokeWidth={isNew ? 2.5 : 2}
                        />
                        {isNew && (
                          <text x={x - 15} y="240" fill="#f59e0b" fontSize="10" fontFamily="monospace" fontWeight="bold">
                            COL-{i + 1}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>
              )}

              {/* Step 3+: Base Ring Beams */}
              {currentStepIndex >= 2 && (
                <g id="layer-base-beams">
                  <line
                    x1="140"
                    y1="320"
                    x2="540"
                    y2="320"
                    stroke={currentStepIndex === 2 ? '#f59e0b' : '#94a3b8'}
                    strokeWidth={currentStepIndex === 2 ? 4 : 3}
                  />
                  {currentStepIndex === 2 && (
                    <text x="310" y="340" fill="#f59e0b" fontSize="11" fontFamily="monospace" fontWeight="bold">
                      ▶ AS-BASE-RUNNERS
                    </text>
                  )}
                </g>
              )}

              {/* Step 4+: Eaves Struts */}
              {currentStepIndex >= 3 && (
                <g id="layer-eaves">
                  <line
                    x1="140"
                    y1="150"
                    x2="540"
                    y2="150"
                    stroke={currentStepIndex === 3 ? '#f59e0b' : '#cbd5e1'}
                    strokeWidth={currentStepIndex === 3 ? 4 : 2.5}
                  />
                  {currentStepIndex === 3 && (
                    <text x="310" y="140" fill="#f59e0b" fontSize="11" fontFamily="monospace" fontWeight="bold">
                      ▶ AS-EAVES-STRUTS
                    </text>
                  )}
                </g>
              )}

              {/* Step 5+: Roof Rafters & Moment Plates */}
              {currentStepIndex >= 4 && (
                <g id="layer-rafters">
                  {/* Left rafter slope */}
                  <line
                    x1="140"
                    y1="150"
                    x2="340"
                    y2="70"
                    stroke={currentStepIndex === 4 ? '#f59e0b' : '#38bdf8'}
                    strokeWidth={currentStepIndex === 4 ? 4 : 3}
                  />
                  {/* Right rafter slope */}
                  <line
                    x1="340"
                    y1="70"
                    x2="540"
                    y2="150"
                    stroke={currentStepIndex === 4 ? '#f59e0b' : '#38bdf8'}
                    strokeWidth={currentStepIndex === 4 ? 4 : 3}
                  />
                  {/* Moment End-Plate Junction Indicator */}
                  <circle cx="140" cy="150" r="7" fill={currentStepIndex === 4 ? '#ef4444' : '#10b981'} />
                  <circle cx="540" cy="150" r="7" fill={currentStepIndex === 4 ? '#ef4444' : '#10b981'} />
                  <circle cx="340" cy="70" r="7" fill={currentStepIndex === 4 ? '#ef4444' : '#10b981'} />
                  {currentStepIndex === 4 && (
                    <text x="280" y="60" fill="#f59e0b" fontSize="12" fontFamily="monospace" fontWeight="bold">
                      ▶ AS-RAFTERS (Mu Checked)
                    </text>
                  )}
                </g>
              )}

              {/* Step 6+: Purlins & Girts */}
              {currentStepIndex >= 5 && (
                <g id="layer-purlins">
                  {[100, 120, 140].map((y, idx) => (
                    <line
                      key={idx}
                      x1="190"
                      y1={y}
                      x2="490"
                      y2={y}
                      stroke={currentStepIndex === 5 ? '#f59e0b' : '#94a3b8'}
                      strokeWidth={1.5}
                      strokeDasharray="4,4"
                    />
                  ))}
                  {currentStepIndex === 5 && (
                    <text x="300" y="115" fill="#f59e0b" fontSize="11" fontFamily="monospace">
                      ▶ PURLINS @ 1.2m
                    </text>
                  )}
                </g>
              )}

              {/* Step 7+: Bracing Cross Diagonals */}
              {currentStepIndex >= 6 && (
                <g id="layer-bracing">
                  {/* Wall X-Bracing */}
                  <line
                    x1="140"
                    y1="320"
                    x2="260"
                    y2="150"
                    stroke={currentStepIndex === 6 ? '#f59e0b' : '#ef4444'}
                    strokeWidth={currentStepIndex === 6 ? 3 : 2}
                  />
                  <line
                    x1="140"
                    y1="150"
                    x2="260"
                    y2="320"
                    stroke={currentStepIndex === 6 ? '#f59e0b' : '#ef4444'}
                    strokeWidth={currentStepIndex === 6 ? 3 : 2}
                  />
                  {currentStepIndex === 6 && (
                    <text x="160" y="235" fill="#f59e0b" fontSize="11" fontFamily="monospace" fontWeight="bold">
                      X-BRACE
                    </text>
                  )}
                </g>
              )}

              {/* Step 8+: Final Grout Pad Indicator */}
              {currentStepIndex >= 7 && (
                <g id="layer-grout">
                  {[140, 260, 420, 540].map((x, i) => (
                    <rect key={i} x={x - 24} y="316" width="48" height="5" fill="#10b981" />
                  ))}
                  <text x="260" y="365" fill="#10b981" fontSize="11" fontFamily="monospace" fontWeight="bold">
                    ✓ GROUTING 30mm COMPLETE
                  </text>
                </g>
              )}
            </svg>
          </div>

          {/* Quick Callout Footer */}
          <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono border-t border-slate-800/80 pt-2 z-10">
            <span>المرجع: MWEC Erection Drawing EREC-01</span>
            <span className="text-emerald-400 font-sans">
              {currentStepIndex === SEQUENCE_STEPS.length - 1 ? 'اكتمل تسلسل تركيب الهيكل بالكامل ✓' : 'المرحلة قيد التنفيذ والمتابعة'}
            </span>
          </div>
        </div>

        {/* Right Column: Workshop Instructions, Fasteners, Tools, & ITP Checkpoints (5 cols) */}
        <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Step Card */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div>
                  <span className="text-[10px] text-amber-400 font-mono block">المرحلة {activeStep.stepNumber}</span>
                  <h4 className="text-base font-bold text-slate-100">{activeStep.titleAr}</h4>
                  <span className="text-xs text-slate-400 font-mono">{activeStep.titleEn}</span>
                </div>
                <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <Wrench className="w-5 h-5" />
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {activeStep.descriptionAr}
              </p>

              {/* Torque specification if available */}
              {activeStep.torqueSpec && (
                <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs font-mono flex items-center gap-2">
                  <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>معيار عزم الربط (Torque): {activeStep.torqueSpec}</span>
                </div>
              )}
            </div>

            {/* Required Assemblies & Parts */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-200 block flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>القطع والتجميعات المطلوبة لهذه الخطوة:</span>
              </span>
              <ul className="space-y-1 text-xs text-slate-300 font-mono">
                {activeStep.partsAndAssemblies.map((part, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span>{part}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tools & Lifting Gear */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-200 block flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-sky-400" />
                <span>المعدات وأدوات الرفع المطلوبة:</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {activeStep.toolsRequired.map((tool, i) => (
                  <span key={i} className="text-xs px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300">
                    {tool}
                  </span>
                ))}
              </div>
            </div>

            {/* Safety & QA Hold Point */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-900/40 space-y-1.5 text-xs text-emerald-300">
              <span className="font-bold flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>تعليمات السلامة ومعيار القبول والجودة (ITP):</span>
              </span>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {activeStep.safetyAndQA}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
