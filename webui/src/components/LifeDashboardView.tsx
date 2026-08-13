import { useState, useMemo, useEffect, useRef } from "react";
import * as LucideIcons from "lucide-react";
import {
  Flame,
  TrendingUp,
  Zap,
  CheckCircle2,
  Clock,
  Sparkles,
  Calendar,
  X,
  Smartphone,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClient } from "@/providers/ClientProvider";
import { fetchFilePreview } from "@/lib/api";

export interface DayRecord {
  date: string; // YYYY-MM-DD
  score: number; // 0-10
  isRed: boolean; // True if unproductive / regression
  untracked: boolean; // True if unlogged day
  isFuture?: boolean; // True if future day of current week
  screentimeMins?: number;
  reelsCount?: number;
  highlights?: string[];
  reflection?: string;
  sleepHours?: number;
}

export interface LifeAreaScore {
  name: string;
  key: string;
  score: number;
  icon: string;
  change: number; // +1, -1, 0
  notes: string;
}

export interface LifeDashboardViewProps {
  activeKey?: string | null;
}

export function LifeDashboardView({ activeKey }: LifeDashboardViewProps) {
  const clientContext = useClient();
  const token = clientContext?.token || "";
  const [selectedDay, setSelectedDay] = useState<DayRecord | null>(null);
  const [dashboardJson, setDashboardJson] = useState<{
    scores?: LifeAreaScore[];
    ledger?: Record<string, Partial<DayRecord>>;
  } | null>(null);
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Load lifeos/dashboard.json dynamically
  const loadDashboard = async () => {
    if (!token) return;
    setLoadingData(true);
    try {
      const keyToUse = activeKey && activeKey.startsWith("websocket:")
        ? activeKey
        : "websocket:default";

      const payload = await fetchFilePreview(token, keyToUse, "lifeos/dashboard.json");
      if (payload && payload.content) {
        const parsed = JSON.parse(payload.content);
        if (parsed) {
          setDashboardJson(parsed);
        }
      } else {
        setDashboardJson(null);
      }
    } catch {
      setDashboardJson(null);
    } finally {
      setLoadingData(false);
    }
  };

  // Auto-fetch & live push sync via WebSocket events (session_updated / file_saved / file_edit)
  useEffect(() => {
    void loadDashboard();

    const client = clientContext?.client;
    let unsubSession: (() => void) | undefined;
    let unsubFileSaved: (() => void) | undefined;
    let unsubChat: (() => void) | undefined;

    if (client) {
      // 1. Listen for session updates
      unsubSession = client.onSessionUpdate(() => {
        void loadDashboard();
      });

      // 2. Listen for file_saved events
      unsubFileSaved = client.onFileSaved(() => {
        void loadDashboard();
      });

      // 3. Listen for chat stream events (file_edit / turn_end / etc.)
      const keyToUse = activeKey && activeKey.startsWith("websocket:")
        ? activeKey
        : "websocket:default";
      const chatId = keyToUse.replace("websocket:", "");

      unsubChat = client.onChat(chatId, (ev) => {
        if (
          ev.event === "file_saved" ||
          ev.event === "file_edit" ||
          ev.event === "turn_end" ||
          ev.event === "session_updated"
        ) {
          void loadDashboard();
        }
      });
    }

    // Lightweight background safety check (every 30 seconds)
    const interval = setInterval(() => {
      void loadDashboard();
    }, 30000);

    const onFocus = () => void loadDashboard();
    window.addEventListener("focus", onFocus);

    return () => {
      if (unsubSession) unsubSession();
      if (unsubFileSaved) unsubFileSaved();
      if (unsubChat) unsubChat();
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [token, activeKey, clientContext?.client]);

  const currentAreas = useMemo(() => {
    return normalizeScores(dashboardJson?.scores);
  }, [dashboardJson]);

  const activeLedgerMap = useMemo(() => {
    if (dashboardJson?.ledger && typeof dashboardJson.ledger === "object" && !Array.isArray(dashboardJson.ledger)) {
      return dashboardJson.ledger;
    }
    return {};
  }, [dashboardJson]);

  // Generate 52-week calendar grid aligned Sunday-Saturday
  const { weeks, monthHeaders, streak, totalActiveDays, avgScore } = useMemo(() => {
    const today = new Date();

    // Find Sunday of 52 weeks ago (approx 364 days ago)
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364);
    startDate.setDate(startDate.getDate() - startDate.getDay()); // Align to Sunday

    const weekGrid: DayRecord[][] = [];
    const months: { label: string; weekIndex: number }[] = [];

    let currentWeek: DayRecord[] = [];
    let currentMonthStr = "";

    let currentStreak = 0;
    let activeDaysCount = 0;
    let totalScoreSum = 0;

    const curr = new Date(startDate);

    // Loop day-by-day until curr passes today AND finishes the current week
    while (curr <= today || curr.getDay() !== 0) {
      const dateStr = curr.toISOString().split("T")[0];
      const isFuture = curr > today;
      const monthName = curr.toLocaleString("en-US", { month: "short" });

      // Track month labels at the Sunday start of each new month
      if (curr.getDay() === 0) {
        if (monthName !== currentMonthStr) {
          months.push({ label: monthName, weekIndex: weekGrid.length });
          currentMonthStr = monthName;
        }
      }

      if (isFuture) {
        currentWeek.push({
          date: dateStr,
          score: 0,
          isRed: false,
          untracked: true,
          isFuture: true,
        });
      } else {
        const customEntry = activeLedgerMap[dateStr];
        if (customEntry) {
          activeDaysCount++;
          const score = customEntry.score ?? 7.0;
          const isRed = customEntry.isRed ?? score < 5.5;

          totalScoreSum += score;
          if (!isRed && score >= 6) {
            currentStreak++;
          } else {
            currentStreak = 0;
          }

          currentWeek.push({
            date: dateStr,
            score,
            isRed,
            untracked: false,
            screentimeMins: customEntry.screentimeMins ?? 0,
            reelsCount: customEntry.reelsCount ?? 0,
            highlights: customEntry.highlights ?? [],
            reflection: customEntry.reflection ?? "",
            sleepHours: customEntry.sleepHours ?? 7,
          });
        } else {
          currentWeek.push({
            date: dateStr,
            score: 0,
            isRed: false,
            untracked: true,
            screentimeMins: 0,
            reelsCount: 0,
            highlights: [],
            reflection: "",
            sleepHours: 0,
          });
        }
      }

      if (currentWeek.length === 7) {
        weekGrid.push(currentWeek);
        currentWeek = [];
      }

      curr.setDate(curr.getDate() + 1);
    }

    if (currentWeek.length > 0) {
      weekGrid.push(currentWeek);
    }

    return {
      weeks: weekGrid,
      monthHeaders: months,
      streak: currentStreak,
      totalActiveDays: activeDaysCount,
      avgScore: activeDaysCount > 0 ? (totalScoreSum / activeDaysCount).toFixed(1) : "N/A",
    };
  }, [activeLedgerMap]);

  // Auto-scroll heatmap container to far right (current month & day)
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, [weeks]);

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-background p-4 sm:p-6 lg:p-8">
      {/* Top Banner Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Life OS Operating Dashboard
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                365-Day Life Consistency Heatmap & Area Metrics (Synced with lifeos/dashboard.json)
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats & Sync Button */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadDashboard()}
            disabled={loadingData}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingData ? "animate-spin" : ""}`} />
            <span>Sync Dashboard</span>
          </Button>

          <div className="flex items-center gap-2 rounded-xl border bg-card px-3 py-1.5 shadow-sm">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="text-xs font-semibold text-foreground">
              {streak} Days Streak
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border bg-card px-3 py-1.5 shadow-sm">
            <Zap className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-semibold text-foreground">
              {totalActiveDays} Days Active
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border bg-card px-3 py-1.5 shadow-sm">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-semibold text-foreground">
              Avg Score: {avgScore}{avgScore !== "N/A" ? "/10" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* 1. GitHub-Style 365-Day Heatmap Section */}
      <div className="mb-8 rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              365-Day Consistency Heatmap
            </h2>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm bg-neutral-800 border border-neutral-700/80" />
              <span>Untracked</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm bg-rose-600 border border-rose-500" />
              <span>Unproductive</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm bg-emerald-950 border border-emerald-800" />
              <span>Moderate</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm bg-emerald-500 border border-emerald-400" />
              <span>High Focus</span>
            </div>
          </div>
        </div>

        {/* Heatmap Grid Container with Auto-Scroll */}
        <div ref={scrollContainerRef} className="overflow-x-auto pb-2">
          <div className="inline-flex min-w-[760px] flex-col gap-1.5 pl-7">
            {/* Month Headers */}
            <div className="relative flex h-4 text-[10px] font-semibold text-muted-foreground">
              {monthHeaders.map((m, idx) => (
                <span
                  key={idx}
                  className="absolute"
                  style={{ left: `${m.weekIndex * 18}px` }}
                >
                  {m.label}
                </span>
              ))}
            </div>

            {/* Heatmap Body with Day-of-Week Labels */}
            <div className="relative flex gap-1">
              {/* Day Labels Axis */}
              <div className="absolute -left-7 flex flex-col justify-between h-[118px] text-[9px] font-medium text-muted-foreground select-none">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              {/* 52-Week Grid Columns */}
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-1">
                  {week.map((day) => {
                    const style = getSquareStyle(day);
                    if (day.isFuture) {
                      return (
                        <div
                          key={day.date}
                          className="h-3.5 w-3.5 rounded-sm opacity-0 pointer-events-none"
                        />
                      );
                    }
                    return (
                      <button
                        key={day.date}
                        type="button"
                        onClick={() => setSelectedDay(day)}
                        title={`${day.date} - ${
                          day.untracked
                            ? "Untracked Day"
                            : day.isRed
                            ? "Unproductive Day (Score: " + day.score + ")"
                            : "Productive Focus Day (Score: " + day.score + ")"
                        }`}
                        className={`h-3.5 w-3.5 rounded-sm border transition-all duration-150 hover:scale-125 hover:z-10 focus:outline-none focus:ring-1 focus:ring-emerald-400 ${style}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Life Area Scores Grid or Welcome Onboarding Banner */}
      {currentAreas.length === 0 ? (
        <div className="mb-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 sm:p-8 text-center shadow-sm">
          <div className="mx-auto mb-3.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20">
            <Sparkles className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-foreground sm:text-lg">
            Welcome to Life OS!
          </h3>
          <p className="mx-auto mt-1 max-w-lg text-xs text-muted-foreground sm:text-sm">
            Your dashboard is currently uninitialized. Start a conversation with <strong>LifeOS</strong> in chat to set up your personal focus areas and log your first daily check-in.
          </p>
        </div>
      ) : (
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Life Area Radar & Targets
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {currentAreas.map((area) => (
              <div
                key={area.key}
                className="flex flex-col justify-between rounded-xl border bg-card p-4 shadow-sm transition hover:border-emerald-500/30"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    {getAreaIcon(area.icon)}
                    <span className="text-sm font-semibold text-foreground">
                      {area.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold text-foreground">
                      {area.score}/10
                    </span>
                    {area.change > 0 ? (
                      <span className="text-xs font-semibold text-emerald-500">
                        +1
                      </span>
                    ) : area.change < 0 ? (
                      <span className="text-xs font-semibold text-rose-500">
                        -1
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      area.score >= 7
                        ? "bg-emerald-500"
                        : area.score >= 5
                        ? "bg-blue-500"
                        : "bg-rose-500"
                    }`}
                    style={{ width: `${Math.min(100, area.score * 10)}%` }}
                  />
                </div>
                {area.notes && (
                  <p className="mt-2.5 text-xs text-muted-foreground truncate">
                    {area.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Day Detail Modal */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  {selectedDay.date}
                </h3>
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold mt-1 ${
                    selectedDay.untracked
                      ? "bg-muted text-muted-foreground border border-muted-foreground/20"
                      : selectedDay.isRed
                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  }`}
                >
                  {selectedDay.untracked
                    ? "Untracked Day"
                    : selectedDay.isRed
                    ? "Unproductive Day"
                    : "Productive Focus Day"}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedDay(null)}
                className="h-8 w-8 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              {!selectedDay.untracked && (
                <>
                  <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
                    <span className="text-muted-foreground">Day Score</span>
                    <span className={`text-base font-bold ${selectedDay.isRed ? "text-rose-400" : "text-emerald-400"}`}>
                      {selectedDay.score} / 10
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 rounded-xl bg-muted/30 p-2.5">
                      <Smartphone className="h-4 w-4 text-blue-400" />
                      <div>
                        <div className="text-muted-foreground text-[11px]">
                          Screentime
                        </div>
                        <div className="font-semibold text-foreground">
                          {selectedDay.screentimeMins} mins
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl bg-muted/30 p-2.5">
                      <Clock className="h-4 w-4 text-purple-400" />
                      <div>
                        <div className="text-muted-foreground text-[11px]">
                          Reels Watched
                        </div>
                        <div className="font-semibold text-foreground">
                          {selectedDay.reelsCount} reels
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedDay.highlights && selectedDay.highlights.length > 0 && (
                    <div>
                      <div className="font-semibold text-foreground mb-1.5">
                        Highlights & Achievements
                      </div>
                      <ul className="space-y-1 text-muted-foreground">
                        {selectedDay.highlights.map((h, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedDay.reflection && (
                    <div className="rounded-xl border bg-muted/20 p-3 border-emerald-500/20">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-1">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Life OS Note</span>
                      </div>
                      <p className="text-muted-foreground italic">
                        "{selectedDay.reflection}"
                      </p>
                    </div>
                  )}
                </>
              )}

              {selectedDay.untracked && (
                <div className="rounded-xl border border-muted/60 bg-muted/20 p-4 text-center text-muted-foreground">
                  <Clock className="h-6 w-6 mx-auto mb-2 text-muted-foreground/80" />
                  <p className="font-semibold text-foreground">Untracked Day</p>
                  <p className="text-xs mt-1">
                    No check-in recorded for this day yet. Chat with LifeOS to complete a daily review!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const ICON_ALIAS_MAP: Record<string, string> = {
  briefcase: "Briefcase",
  career: "Briefcase",
  dollar: "DollarSign",
  income: "DollarSign",
  money: "DollarSign",
  finance: "DollarSign",
  book: "BookOpen",
  learn: "BookOpen",
  learning: "BookOpen",
  heart: "HeartPulse",
  health: "HeartPulse",
  moon: "Moon",
  sleep: "Moon",
  dumbbell: "Dumbbell",
  fitness: "Dumbbell",
  gym: "Dumbbell",
  globe: "Globe",
  english: "Globe",
  language: "Globe",
  folder: "FolderGit2",
  project: "FolderGit2",
  projects: "FolderGit2",
  code: "Code2",
  oss: "Code2",
  opensource: "Code2",
  music: "Music",
  users: "Users",
  family: "Users",
  social: "Users",
  friends: "Users",
  camera: "Camera",
  content: "Camera",
  brain: "Brain",
  mindfulness: "Brain",
  meditation: "Sparkles",
  target: "Target",
  goal: "Target",
  goals: "Target",
  coffee: "Coffee",
  routine: "Coffee",
  shield: "Shield",
  security: "Shield",
  zap: "Zap",
  energy: "Zap",
};

function getIconColorClass(keyOrName: string): string {
  const k = (keyOrName || "").toLowerCase();
  if (k.includes("briefcase") || k.includes("career") || k.includes("work")) return "text-blue-400";
  if (k.includes("dollar") || k.includes("income") || k.includes("finance") || k.includes("money")) return "text-emerald-400";
  if (k.includes("book") || k.includes("learn") || k.includes("study") || k.includes("read")) return "text-purple-400";
  if (k.includes("heart") || k.includes("health") || k.includes("love")) return "text-rose-400";
  if (k.includes("moon") || k.includes("sleep") || k.includes("night")) return "text-indigo-400";
  if (k.includes("dumbbell") || k.includes("fit") || k.includes("gym") || k.includes("workout")) return "text-orange-400";
  if (k.includes("globe") || k.includes("english") || k.includes("language") || k.includes("travel")) return "text-cyan-400";
  if (k.includes("folder") || k.includes("project")) return "text-yellow-400";
  if (k.includes("code") || k.includes("oss") || k.includes("dev")) return "text-teal-400";
  if (k.includes("music") || k.includes("song") || k.includes("art")) return "text-pink-400";
  if (k.includes("user") || k.includes("family") || k.includes("social") || k.includes("friend")) return "text-amber-400";
  if (k.includes("brain") || k.includes("mind") || k.includes("focus")) return "text-violet-400";
  if (k.includes("target") || k.includes("goal")) return "text-red-400";
  return "text-emerald-400";
}

function getSquareStyle(day: DayRecord): string {
  if (day.isFuture) {
    return "opacity-0 pointer-events-none";
  }
  if (day.untracked) {
    return "bg-neutral-800/90 border-neutral-700/80 hover:border-emerald-400";
  }
  if (day.isRed) {
    return "bg-rose-600 border-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]";
  }
  if (day.score >= 8.5) {
    return "bg-emerald-400 border-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.5)]";
  }
  if (day.score >= 7) {
    return "bg-emerald-600 border-emerald-500";
  }
  return "bg-emerald-950 border-emerald-800";
}

function getAreaIcon(iconName: string) {
  const normalized = (iconName || "").trim();
  const lower = normalized.toLowerCase();

  // 1. Check direct alias
  const aliasMatch = ICON_ALIAS_MAP[lower];

  // 2. Try PascalCase name (e.g. "music" -> "Music", "user-check" -> "UserCheck")
  const pascalName = normalized
    .replace(/(?:^|[-_])(\w)/g, (_, c) => c.toUpperCase());

  const iconMap = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;

  const TargetIcon =
    (aliasMatch && iconMap[aliasMatch]) ||
    iconMap[pascalName] ||
    iconMap[normalized] ||
    LucideIcons.Award;

  const colorClass = getIconColorClass(aliasMatch || pascalName || lower);

  return <TargetIcon className={`h-4 w-4 ${colorClass}`} />;
}

function normalizeScores(rawScores: unknown): LifeAreaScore[] {
  if (!rawScores) return [];

  // Array format: [ { name: "Career", key: "career", score: 6, ... } ]
  if (Array.isArray(rawScores)) {
    return rawScores
      .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
      .map((item) => {
        const name = String(item.name || item.key || "Area");
        const key = String(item.key || name.toLowerCase().replace(/[^a-z0-9]/g, ""));
        const score = typeof item.score === "number" ? item.score : parseFloat(String(item.score || "0")) || 0;
        const icon = String(item.icon || key);
        const change = typeof item.change === "number" ? item.change : 0;
        const notes = String(item.notes || "");
        return { name, key, score, icon, change, notes };
      });
  }

  // Key-value object format: { "discipline": 2, "career": { "score": 6, "notes": "..." } }
  if (typeof rawScores === "object" && rawScores !== null) {
    const list: LifeAreaScore[] = [];
    for (const [rawKey, val] of Object.entries(rawScores)) {
      const key = rawKey.toLowerCase().replace(/[^a-z0-9]/g, "");
      const name = rawKey.charAt(0).toUpperCase() + rawKey.slice(1);
      let score = 0;
      let notes = "";
      let icon = key;
      let change = 0;

      if (typeof val === "number") {
        score = val;
      } else if (typeof val === "string") {
        score = parseFloat(val) || 0;
      } else if (typeof val === "object" && val !== null) {
        const vObj = val as Record<string, unknown>;
        score = typeof vObj.score === "number" ? vObj.score : parseFloat(String(vObj.score || "0")) || 0;
        notes = String(vObj.notes || "");
        icon = String(vObj.icon || key);
        change = typeof vObj.change === "number" ? vObj.change : 0;
      }
      list.push({ name, key, score, icon, change, notes });
    }
    return list;
  }

  return [];
}
