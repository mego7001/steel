import React, { useState } from 'react';
import {
  AiRecommendationCard,
  ProjectData,
} from '../types/engineering';
import {
  askEngineeringConsultant,
  ChatMessage,
} from '../services/geminiConsultant';
import {
  Sparkles,
  Send,
  HelpCircle,
  ShieldCheck,
  AlertCircle,
  FileCheck2,
  DollarSign,
  Maximize2,
} from 'lucide-react';

interface ConsultantChatViewProps {
  project: ProjectData;
  onApplyRecommendation?: (card: AiRecommendationCard) => void;
}

const QUICK_QUESTIONS = [
  'هل نغير القطاع لتوفير الوزن؟',
  'هل الأجزاء تدخل على ماكينة الليزر والمكبس؟',
  'إيه البديل الأقل تكلفة للهيكل؟',
  'إيه أثر تكبير البحر بنسبة 20%؟',
  'فحص معاملات أمان الوصلات الكودية',
];

export const ConsultantChatView: React.FC<ConsultantChatViewProps> = ({
  project,
  onApplyRecommendation,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-0',
      sender: 'assistant',
      timestamp: 'الآن',
      text: `مرحبًا بك! أنا مساعد استشاري الأعمال المعدنية MWEC. 
أنا مربوط مباشرة بنموذج مشروعك الحالي [${project.projectNumber}] وأفحص كود ${project.designCode} وقدرات ماكينات الورشة.
يمكنك سؤالي عن تعديل القطاعات، التكلفة، قابلية التصنيع، وسلوك الوصلات.`,
    },
  ]);

  const [inputQuery, setInputQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      timestamp: 'الآن',
      text: textToSend,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const result = await askEngineeringConsultant(project, textToSend, messages);
      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        timestamp: 'الآن',
        text: result.text,
        recommendationCard: result.card,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[620px] rounded-lg bg-slate-900 border border-slate-800 flex flex-col overflow-hidden shadow-xl">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>المساعد الاستشاري الذكي (MWEC Consultant)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono border border-emerald-800">
                Live Engineering Link
              </span>
            </h3>
            <span className="text-[11px] text-slate-400">
              مطابق لمتطلبات REQ-AI-01 إلى REQ-AI-07: كل توصية مستمدة من نتائج الحساب الحقيقية مع أدلة موثقة.
            </span>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-3 text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-amber-500 text-slate-950 font-medium'
                  : 'bg-slate-950 border border-slate-800 text-slate-200'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.text}</div>

              {/* Render Structured Engineering Recommendation Card if present */}
              {msg.recommendationCard && (
                <div className="mt-3 p-3 rounded bg-slate-900 border border-amber-500/40 text-[11px] space-y-2 text-slate-300 shadow-md">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <span className="font-bold text-amber-300 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>بطاقة توصية معتمدة ({msg.recommendationCard.recommendationType})</span>
                    </span>
                    <span className="font-mono text-slate-400">{msg.recommendationCard.projectRevisionId}</span>
                  </div>

                  <p className="font-medium text-slate-100">{msg.recommendationCard.summary}</p>

                  {/* Evidence Table */}
                  <div className="bg-slate-950 p-2 rounded border border-slate-800/80 space-y-1 font-mono text-[10px]">
                    <span className="text-slate-400 font-sans block">الأدلة الإنشائية (Evidence Runs):</span>
                    {msg.recommendationCard.evidence.map((ev, i) => (
                      <div key={i} className="text-emerald-400">
                        • [{ev.runId}] {ev.checkId}: {ev.valueReported}
                      </div>
                    ))}
                  </div>

                  {/* Assumptions & Standards */}
                  <div className="space-y-0.5 text-slate-400 text-[10px]">
                    <span className="font-semibold text-slate-300">الافتراضات والمراجع:</span>
                    {msg.recommendationCard.assumptions.map((as, i) => (
                      <p key={i}>- {as}</p>
                    ))}
                  </div>

                  {msg.recommendationCard.savingsEstimate && (
                    <div className="p-1.5 rounded bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 font-bold text-center">
                      وفر مالي متوقع: {msg.recommendationCard.savingsEstimate}
                    </div>
                  )}

                  <div className="pt-1 flex justify-end">
                    <button
                      onClick={() => onApplyRecommendation && onApplyRecommendation(msg.recommendationCard!)}
                      className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition cursor-pointer"
                    >
                      إنشاء مراجعة عمل وتطبيق التوصية
                    </button>
                  </div>
                </div>
              )}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 px-1">{msg.timestamp}</span>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-amber-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>الاستشاري يراجع معادلات التصميم والماكينات...</span>
          </div>
        )}
      </div>

      {/* Quick Suggested Questions Chips */}
      <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800/80 flex gap-2 overflow-x-auto text-[11px]">
        {QUICK_QUESTIONS.map((q, i) => (
          <button
            key={i}
            onClick={() => handleSend(q)}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 whitespace-nowrap transition cursor-pointer"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="اسأل الاستشاري (مثال: هل نغير القطاع؟، هل اللوح يدخل على المكبس؟)..."
          className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
        />
        <button
          onClick={() => handleSend()}
          disabled={isLoading || !inputQuery.trim()}
          className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded text-xs transition cursor-pointer flex items-center gap-1.5"
        >
          <Send className="w-3.5 h-3.5" />
          <span>إرسال</span>
        </button>
      </div>
    </div>
  );
};
