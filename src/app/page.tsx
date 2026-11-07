"use client";

import { roomPath } from "@/lib/client/roomRoutes";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import "@/styles/theme.css";
import GroupAddDialog from "@/components/layout/GroupAddDialog";
import type { GroupAddRequest } from "@/components/layout/GroupAddDialog";
import { createOrJoinRoom } from "@/lib/client/roomActions";
import { getSavedMemberships } from "@/lib/client/roomMembership";
import { supabase } from "@/lib/supabase/browser";

type JoinedRoom = {
  id: string;
  title: string;
};

const useCases = [
  {
    icon: "⚑",
    title: "友達同士で",
    description:
      "遊びの予定を立てたり、旅行の行き先を決めたり。「外食で何が食べたい？」なんて、小さな決め事にも。",
  },
  {
    icon: "🤝",
    title: "チーム制作で",
    description:
      "チームで何かを創り出したり、何かを解決しなければならないとき、異なる意見を見比べながら、新たな可能性を見つけ出しましょう。",
  },
  {
    icon: "💡",
    title: "時には、あなた自身と",
    description:
      "考えても考えてもまとまらない。その悩み、THYNCに頼ってみませんか？頭の中にある考えを言葉にして、自分自身の思考を見つめなおしましょう。",
  },
];

const threeSpaces = [
  {
    name: "Talk",
    body: "発見は、何気ない会話から。\nまずは、言葉にすることからはじめよう。",
  },
  {
    name: "THYNC",
    body: "言葉ではわかりにくい、考えの繋がり。\n言葉の奥にある思考の形を、目で見て確かめてみよう。",
  },
  {
    name: "Summary",
    body: "意見を要約するのも、大切なプロセス。\n一度落ち着いて、振り返ってみよう。",
  },
];

export default function HomePage() {
  const router = useRouter();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [joinedRooms, setJoinedRooms] = useState<JoinedRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadJoinedRooms() {
      try {
        const roomIds = [
          ...new Set(
            getSavedMemberships().map((item) => item.roomId)
          ),
        ];

        if (roomIds.length === 0) {
          if (!cancelled) {
            setJoinedRooms([]);
            setLoading(false);
          }
          return;
        }

        const { data, error } = await supabase
          .from("rooms")
          .select("id, topic")
          .in("id", roomIds);

        if (cancelled) return;

        if (error) {
          console.error("参加済みグループ取得失敗:", error);
          setLoadError("参加済みグループを読み込めませんでした。");
          setLoading(false);
          return;
        }

        const nextRooms: JoinedRoom[] = (data ?? []).map((room) => ({
          id: room.id,
          title: room.topic,
        }));

        setJoinedRooms(nextRooms);
        setLoading(false);
      } catch (error) {
        console.error("参加済みグループ取得失敗:", error);
        if (!cancelled) {
          setLoadError("参加済みグループを読み込めませんでした。");
          setLoading(false);
        }
      }
    }

    void loadJoinedRooms();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const elements = document.querySelectorAll<HTMLElement>("[data-reveal]");

    if (reduceMotion || !("IntersectionObserver" in window)) {
      elements.forEach((element) => {
        element.classList.add("revealed");
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("revealed");
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.08,
        rootMargin: "0px 0px -60px 0px",
      }
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  async function handleGroupSubmit(request: GroupAddRequest) {
    const roomId = await createOrJoinRoom(request);
    router.push(roomPath(roomId));
  }

  return (
    <main className="thync-page">
      <style>{`
                .thync-page {
                    --bg: #f8fcfd;
                    --surface: #ffffff;
                    --surface-soft: #f2f8f9;
                    --line: #dbe9ec;
                    --line-strong: #c8dbe0;
                    --text: #1f3742;
                    --text-soft: #5c7680;
                    --text-faint: #8aa0a8;
                    --accent: #abeef2;
                    --accent-strong: #7ecfdf;
                    --accent-deep: #5b95a7;
                    --accent-bold: #3e7698;
                    --accent-dark: #28536b;
                    --shadow: 0 20px 60px rgba(40, 83, 95, 0.08);

                    min-height: 100dvh;
                    background: linear-gradient(180deg, #fcfeff 0%, #f7fbfc 100%);
                    color: var(--text);
                    overflow-x: hidden;
                }

                .thync-page *,
                .thync-page *::before,
                .thync-page *::after {
                    box-sizing: border-box;
                }

                .page-shell {
                    width: min(100% - 148px, 920px);
                    margin: 0 auto;
                }

                .topbar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 24px;
                    padding: 28px 0 24px;
                }

                .brand {
                    display: inline-flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .brand-logo {
                    margin: 0;
                    font-size: 23px;
                    font-weight: 800;
                    letter-spacing: -0.06em;
                    line-height: 1;
                    color: var(--accent-dark);
                }

                .brand-sub {
                    font-size: 9px;
                    letter-spacing: 0.18em;
                    color: var(--text-faint);
                }

                .top-button {
                    appearance: none;
                    border: 1px solid var(--line-strong);
                    background: rgba(255,255,255,0.9);
                    color: var(--accent-dark);
                    border-radius: 14px;
                    padding: 12px 18px;
                    font-size: 13px;
                    font-weight: 700;
                    cursor: pointer;
                    box-shadow: 0 8px 24px rgba(65, 102, 114, 0.05);
                    transition:
                        transform 0.2s ease,
                        border-color 0.2s ease,
                        background 0.2s ease;
                }

                .top-button:hover {
                    transform: translateY(-1px);
                    border-color: #b9d9de;
                    background: #ffffff;
                }

.hero {
    padding: 42px 0 100px;
}
                .hero-kicker {
                    display: inline-block;
                    padding: 9px 14px;
                    border-radius: 999px;
                    background: #eef9fa;
                    color: var(--accent-bold);
                    font-size: 10px;
                    letter-spacing: 0.14em;
                    font-weight: 700;
                }

                .hero-title {
                    margin: 18px 0 14px;
                    font-size: clamp(30px, 5vw, 48px);
                    line-height: 1.3;
                    letter-spacing: -0.06em;
                    font-weight: 780;
                    color: var(--accent-dark);
                }

                .hero-title .accent {
                    color: var(--accent-bold);
                }

                .hero-body {
                    margin: 0;
                    color: var(--text-soft);
                    font-size: 13px;
                    line-height: 2;
                }

                .joined-block {
    margin-top: 0;
}

                .joined-head {
                    display: flex;
                    justify-content: space-between;
                    align-items: end;
                    gap: 18px;
                    margin-bottom: 14px;
                }

                .joined-title {
                    margin: 0;
                    font-size: 15px;
                    font-weight: 750;
                    letter-spacing: -0.03em;
                }

                .joined-note {
                    font-size: 11px;
                    color: var(--text-faint);
                }

                .joined-list {
                    display: grid;
                    gap: 10px;
                    padding: 14px;
                    border-radius: 20px;
                    background: rgba(255,255,255,0.7);
                    border: 1px solid var(--line);
                    box-shadow: 0 12px 40px rgba(55, 89, 100, 0.05);
                    backdrop-filter: blur(6px);
                }

                .joined-card {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 16px;
                    padding: 17px 18px;
                    border-radius: 16px;
                    border: 1px solid var(--line);
                    background: #fbfdfd;
                    color: var(--text);
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 650;
                    transition:
                        transform 0.2s ease,
                        border-color 0.2s ease,
                        background 0.2s ease;
                }

                .joined-card:hover {
                    transform: translateX(2px);
                    border-color: #bddde3;
                    background: #ffffff;
                }

                .joined-arrow {
                    color: var(--accent-bold);
                    font-size: 18px;
                    line-height: 1;
                }

                .joined-empty {
                    padding: 30px 18px;
                    text-align: center;
                    color: var(--text-soft);
                    font-size: 13px;
                    line-height: 1.9;
                }

                .section {
                    padding: 116px 0;
                }

                .section.alt {
                    background: rgba(171, 238, 242, 0.08);
                    border-top: 1px solid rgba(223, 234, 236, 0.8);
                    border-bottom: 1px solid rgba(223, 234, 236, 0.8);
                }

                .section-grid {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) minmax(330px, 400px);
                    gap: 60px;
                    align-items: center;
                }

                .section-grid.reverse {
                    grid-template-columns: minmax(330px, 400px) minmax(0, 1fr);
                }

                .section-grid.reverse .section-copy {
                    order: 2;
                }

                .section-grid.reverse .section-visual {
                    order: 1;
                }

                .kicker {
                    display: inline-block;
                    font-size: 14px;
                    font-weight: 760;
                    letter-spacing: 0.12em;
                    color: var(--accent-bold);
                    margin-bottom: 20px;
                }

                .section-heading {
                    margin: 0 0 22px;
                    font-size: clamp(26px, 4vw, 40px);
                    line-height: 1.45;
                    letter-spacing: -0.06em;
                    font-weight: 770;
                    white-space: pre-line;
                    color: var(--accent-dark);
                }

                .section-copy p {
                    margin: 0;
                    font-size: 14px;
                    line-height: 2.05;
                    color: var(--text-soft);
                    white-space: pre-line;
                }

                .visual-frame {
                    width: 100%;
                    min-height: 340px;
                    border-radius: 34px;
                    background:
                        linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(245,250,251,0.92) 100%);
                    border: 1px solid rgba(214, 229, 232, 0.9);
                    box-shadow: var(--shadow);
                    position: relative;
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                /* PROBLEM */
                .problem-stage {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    min-height: 340px;
                }

                .problem-paper {
                    position: absolute;
                    background: #ffffff;
                    border: 1px solid #d8e7ea;
                    box-shadow: 0 18px 36px rgba(52, 87, 98, 0.10);
                    border-radius: 16px;
                }

                .problem-paper::before {
                    content: "";
                    position: absolute;
                    left: 18px;
                    right: 18px;
                    top: 20px;
                    height: 5px;
                    border-radius: 999px;
                    background: rgba(96, 140, 155, 0.18);
                    box-shadow:
                        0 18px 0 rgba(96, 140, 155, 0.14),
                        0 36px 0 rgba(96, 140, 155, 0.14),
                        0 54px 0 rgba(96, 140, 155, 0.14);
                }

.problem-paper.one {
    width: 138px;
    height: 182px;
    top: 50%;
    left: 50%;
    transform: translate(-105%, -44%) rotate(-15deg);
}

.problem-paper.two {
    width: 146px;
    height: 188px;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -52%) rotate(-2deg);
}

.problem-paper.three {
    width: 144px;
    height: 186px;
    top: 50%;
    left: 50%;
    transform: translate(6%, -45%) rotate(14deg);
}


/* IDEA：情報が整理される様子を静止画で表現 */
.idea-stage {
    position: relative;
    width: 100%;
    min-height: 340px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.idea-diagram {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 18px;
    width: 100%;
    padding: 25px 16px;
}

/* 整理前の書類 */
.idea-source {
    position: relative;
    flex: 0 0 112px;
    height: 148px;
    background: #ffffff;
    border: 1px solid #d7e6eb;
    border-radius: 10px;
    box-shadow: 0 10px 24px rgba(50, 85, 99, 0.09);
    transform: rotate(-5deg);
}

.idea-source::before {
    content: "";
    position: absolute;
    left: 18px;
    right: 18px;
    top: 27px;
    height: 5px;
    border-radius: 10px;
    background: #bbd3dd;
    box-shadow:
        0 20px 0 #deeaee,
        0 40px 0 #deeaee,
        0 60px 0 #deeaee;
}

/* 整理を表す矢印 */
.idea-arrow {
    flex: 0 0 auto;
    font-size: 29px;
    font-weight: 300;
    color: #609db7;
}

/* 整理後のカード */
.idea-results {
    flex: 0 0 126px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.idea-result {
    height: 44px;
    display: flex;
    align-items: center;
    padding: 0 13px;
    gap: 10px;
    background: #ffffff;
    border: 1px solid #dbe8ec;
    border-radius: 11px;
    box-shadow: 0 5px 14px rgba(53, 91, 105, 0.04);
}

.idea-result:nth-child(1) {
    background: #e5f8fa;
    border-color: #c9e8ed;
}

.idea-result:nth-child(2) {
    background: #f1f7fa;
}

.idea-result:nth-child(3) {
    background: #f8fafb;
}

.idea-result::before {
    content: "";
    flex: 0 0 9px;
    height: 9px;
    border-radius: 3px;
    background: #84c5d7;
}

.idea-result::after {
    content: "";
    flex: 1;
    height: 4px;
    border-radius: 10px;
    background: #d0e2e8;
}


                /* USE CASES */
                .center-head {
                    text-align: center;
                    margin-bottom: 56px;
                }

                .center-head .section-heading {
                    margin-bottom: 16px;
                }

                .use-grid {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 20px;
                }

                .use-card {
                    background: rgba(255,255,255,0.92);
                    border: 1px solid var(--line);
                    border-radius: 22px;
                    padding: 28px 24px;
                    box-shadow: 0 12px 30px rgba(45, 78, 88, 0.05);
                }

                .use-icon {
                    width: 46px;
                    height: 46px;
                    display: grid;
                    place-items: center;
                    border-radius: 15px;
                    background: linear-gradient(
                        180deg,
                        rgba(171, 238, 242, 0.36) 0%,
                        rgba(126, 207, 223, 0.18) 100%
                    );
                    color: var(--accent-bold);
                    font-size: 22px;
                    margin-bottom: 20px;
                    box-shadow: inset 0 0 0 1px rgba(126, 207, 223, 0.16);
                }

                .use-card h3 {
                    margin: 0 0 14px;
                    font-size: 17px;
                    letter-spacing: -0.04em;
                    color: var(--accent-dark);
                }

                .use-card p {
                    margin: 0;
                    font-size: 13px;
                    line-height: 2;
                    color: var(--text-soft);
                }

                /* THREE SPACES */
                .three-grid {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 22px;
                    margin-top: 42px;
                }

                .three-card {
                    padding-top: 18px;
                    border-top: 2px solid var(--accent-dark);
                }

                .three-card h3 {
                    margin: 0 0 14px;
                    font-size: 27px;
                    letter-spacing: -0.06em;
                    color: var(--accent-dark);
                }

                .three-card p {
                    margin: 0;
                    font-size: 13px;
                    line-height: 2;
                    color: var(--text-soft);
                    white-space: pre-line;
                }

                /* Talk visual */
                .ui-window {
                    width: 100%;
                    max-width: 360px;
                    margin: 0 auto;
                    border-radius: 24px;
                    background: #ffffff;
                    border: 1px solid #dce9ec;
                    box-shadow: 0 18px 44px rgba(46, 79, 89, 0.08);
                    overflow: hidden;
                }

                .ui-top {
                    display: flex;
                    gap: 6px;
                    align-items: center;
                    padding: 14px 16px;
                    border-bottom: 1px solid #ebf1f3;
                }

                .ui-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: #d8e7ea;
                }

                .ui-body {
                    padding: 20px 18px 18px;
                }

                .chat-bubble {
                    max-width: 82%;
                    padding: 12px 14px;
                    border-radius: 14px;
                    background: #f2f7f8;
                    color: #47616b;
                    font-size: 12px;
                    line-height: 1.75;
                    margin-bottom: 12px;
                }

                .chat-bubble.right {
                    margin-left: auto;
                    background: #ddf5f9;
                }

                /* THYNC visual */
                .thync-visual {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    min-height: 340px;
                }

                .sticky-board {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 0;
}

                .sticky-wrap {
                    position: relative;
                    width: 320px;
                    height: 240px;
                }

                .sticky-note {
                    position: absolute;
                    width: 82px;
                    height: 82px;
                    border-radius: 14px;
                    box-shadow: 0 12px 24px rgba(58, 86, 96, 0.08);
                    border: 1px solid #dbe7ea;
                    overflow: hidden;
                }

                .sticky-note::before {
                    content: "";
                    position: absolute;
                    left: 18px;
                    right: 18px;
                    top: 20px;
                    height: 5px;
                    border-radius: 999px;
                    background: rgba(84, 121, 132, 0.25);
                    box-shadow: 0 14px 0 rgba(84, 121, 132, 0.18);
                }

                .sticky-note::after {
                    content: "";
                    position: absolute;
                    right: 0;
                    top: 0;
                    width: 20px;
                    height: 20px;
                    background: rgba(255, 255, 255, 0.82);
                    clip-path: polygon(0 0, 100% 0, 100% 100%);
                    border-left: 1px solid rgba(216, 231, 234, 0.9);
                    border-bottom: 1px solid rgba(216, 231, 234, 0.9);
                }

                .sticky-note.a {
                    left: 20px;
                    top: 92px;
                    background: #eef9fa;
                }

                .sticky-note.b {
                    left: 120px;
                    top: 42px;
                    background: #ffffff;
                }

                .sticky-note.c {
                    left: 222px;
                    top: 120px;
                    background: #f6fbfc;
                }

                .sticky-svg {
                    position: absolute;
                    inset: 0;
                    overflow: visible;
                }

                .path-base {
                    fill: none;
                    stroke: #d1e2e7;
                    stroke-width: 4.5;
                    stroke-linecap: round;
                }

.path-draw {
    fill: none;
    stroke: var(--accent-strong);
    stroke-width: 5.5;
    stroke-linecap: round;
    stroke-dasharray: none;
}

                @keyframes drawLink {
                    0%, 8% {
                        stroke-dashoffset: 220;
                        opacity: 0;
                    }
                    20%, 68% {
                        stroke-dashoffset: 0;
                        opacity: 1;
                    }
                    100% {
                        stroke-dashoffset: 0;
                        opacity: 1;
                    }
                }

                /* Summary visual */
                .summary-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    padding: 14px 0;
                    border-bottom: 1px solid #e8eff1;
                }

                .summary-row strong {
                    font-size: 12px;
                    color: #3d5862;
                }

                .summary-pill {
                    padding: 6px 10px;
                    border-radius: 999px;
                    background: #e6f8fa;
                    color: var(--accent-bold);
                    font-size: 11px;
                    font-weight: 700;
                    white-space: nowrap;
                }

                /* Ending */
                .ending {
                    padding: 120px 0 110px;
                    text-align: center;
                }

                .ending-title {
    margin: 0 0 34px;
    font-size: clamp(32px, 4.85vw, 40px);
    line-height: 1.35;
    letter-spacing: -0.06em;
    font-weight: 780;
    color: var(--accent-dark);
    text-align: center;
}

.ending-title-core {
    display: inline-block;
    position: relative;
}

.ending-title-period {
    position: absolute;
    left: 100%;
    top: 0;
    white-space: nowrap;
}

                .ending-logo {
                    margin: 0;
                    font-size: clamp(50px, 7.6vw, 82px);
                    font-weight: 820;
                    letter-spacing: -0.08em;
                    line-height: 1;
                    color: var(--accent-bold);
                }

                .ending-sub {
                    margin-top: 12px;
                    font-size: 10px;
                    letter-spacing: 0.18em;
                    color: var(--text-faint);
                }

                .ending-date {
                    margin-top: 28px;
                    font-size: 11px;
                    color: var(--text-faint);
                    letter-spacing: 0.12em;
                }

                [data-reveal] {
                    opacity: 0;
                    transform: translateY(26px);
                    transition:
                        opacity 0.8s ease,
                        transform 0.8s cubic-bezier(.2,.7,.2,1);
                }

                [data-reveal].revealed {
                    opacity: 1;
                    transform: translateY(0);
                }

                @media (max-width: 960px) {
                    .page-shell {
                        width: min(100% - 72px, 920px);
                    }

                    .section-grid,
                    .section-grid.reverse {
                        grid-template-columns: 1fr;
                        gap: 36px;
                    }

                    .section-grid.reverse .section-copy,
                    .section-grid.reverse .section-visual {
                        order: initial;
                    }

                    .use-grid,
                    .three-grid {
                        grid-template-columns: 1fr;
                    }

                    .visual-frame {
                        min-height: 320px;
                    }

                    .topbar {
                        padding-top: 24px;
                    }

                    .ending {
                        padding: 96px 0 88px;
                    }
                }

                @media (max-width: 640px) {
                    .page-shell {
                        width: min(100% - 40px, 920px);
                    }

                    .topbar {
                        flex-direction: column;
                        align-items: flex-start;
                    }

                    .top-button {
                        width: 100%;
                    }

                    .hero {
                        padding-top: 20px;
                    }

                    .section {
                        padding: 88px 0;
                    }

                    .joined-head {
                        flex-direction: column;
                        align-items: flex-start;
                    }

                    .hero-title {
                        font-size: 32px;
                    }

                    .section-heading {
                        font-size: 28px;
                    }

                    .sticky-wrap {
                        width: 280px;
                        height: 230px;
                    }

                    .sticky-note.a {
                        left: 8px;
                    }

                    .sticky-note.b {
                        left: 102px;
                    }

                    .sticky-note.c {
                        left: 196px;
                    }

                    .problem-paper.one {
                        left: 10px;
                    }

                    .problem-paper.two {
                        left: 96px;
                    }

                    .problem-paper.four {
                        left: 86px;
                    }
                }

                @media (prefers-reduced-motion: reduce) {
    [data-reveal] {
        opacity: 1 !important;
        transform: none !important;
    }
}
            `}</style>

      <div className="page-shell">
        <header className="topbar">
          <div className="brand">
            <h1 className="brand-logo">THYNC</h1>
            <span className="brand-sub">THINK × SYNC</span>
          </div>

          <button
            type="button"
            className="top-button"
            onClick={() => setDialogOpen(true)}
          >
            ＋ グループを追加
          </button>
        </header>

        <section className="hero">
          <div className="joined-block" data-reveal>
            <div className="joined-head">
              <h3 className="joined-title">参加済みグループ</h3>
              <span className="joined-note">
                このブラウザの参加履歴
              </span>
            </div>

            <div className="joined-list">
              {loading ? (
                <div className="joined-empty">
                  読み込み中...
                </div>
              ) : loadError ? (
                <div className="joined-empty">{loadError}</div>
              ) : joinedRooms.length === 0 ? (
                <div className="joined-empty">
                  まだ参加済みグループはありません。
                  <br />
                  右上のボタンから作成・参加できます。
                </div>
              ) : (
                joinedRooms.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    className="joined-card"
                    onClick={() => router.push(roomPath(room.id))}
                  >
                    <span>{room.title}</span>
                    <span className="joined-arrow">›</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </section>
      </div>

      {/* アプリの操作領域と紹介領域の区切り */}
      <div
        style={{
          width: "100%",
          height: 1,
          background: "var(--line)",
        }}
        aria-hidden="true"
      />

      <section className="section">
        <div className="page-shell section-grid">
          <div className="section-copy" data-reveal>
            <div className="kicker">PROBLEM</div>
            <h2 className="section-heading">
              {"意見があっても、\n上手にまとまらない。"}
            </h2>
            <p>
              {
                "様々なアイデアが飛び交う話し合い。\n気づけば、何を話していたのかすら\nわからなくなることも。\nたくさん考えれば考えるほど、\n大切なあのアイデアを見逃してしまうかも…"
              }
            </p>
          </div>

          <div className="section-visual" data-reveal>
            <div className="visual-frame">
              <div className="problem-stage">
                <div className="problem-paper one" />
                <div className="problem-paper two" />
                <div className="problem-paper three" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="page-shell section-grid reverse">
          <div className="section-copy" data-reveal>
            <div className="kicker">IDEA</div>
            <h2 className="section-heading">
              {"思考の整理は\nTHYNCにおまかせ。"}
            </h2>
            <p>
              {
                "THYNCは、話し合いから生まれる\n素敵なアイデアや意見を整理し、\nみんなの考えを見える形にすることを\n目指しています。\nより話し合いに集中できるように、\nそして、より良い創作活動の支援のために。"
              }
            </p>
          </div>

          <div className="section-visual" data-reveal>
            <div className="visual-frame">

              <div className="idea-stage">
                <div className="idea-diagram" aria-hidden="true">
                  <div className="idea-source" />

                  <span className="idea-arrow">→</span>

                  <div className="idea-results">
                    <div className="idea-result" />
                    <div className="idea-result" />
                    <div className="idea-result" />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="page-shell">
          <div className="center-head" data-reveal>
            <div className="kicker">USE CASES</div>
            <h2 className="section-heading">
              {"使い方は ひとつじゃない"}
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: "14px",
                lineHeight: 2,
                color: "var(--text-soft)",
              }}
            >
              みんなで考えるときも、一人でアイデアを深めたいときも。
            </p>
          </div>

          <div className="use-grid">
            {useCases.map((item) => (
              <article
                key={item.title}
                className="use-card"
                data-reveal
              >
                <div className="use-icon">{item.icon}</div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="page-shell">
          <div className="center-head" data-reveal>
            <div className="kicker">THREE SPACES</div>
            <h2 className="section-heading">
              {"３つのスペースで、\n思考をつなぐ。"}
            </h2>
          </div>

          <div className="three-grid">
            {threeSpaces.map((item) => (
              <div
                key={item.name}
                className="three-card"
                data-reveal
              >
                <h3>{item.name}</h3>
                <p>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="page-shell section-grid">
          <div className="section-copy" data-reveal>
            <div className="kicker">01 / Talk</div>
            <h2 className="section-heading">
              {"まずは、\nいつも通り話そう。"}
            </h2>
            <p>
              {
                "チャット形式で、自由に会話。\n返信やリアクションで、\nより直感的な意見交換を。"
              }
            </p>
          </div>

          <div className="section-visual" data-reveal>
            <div className="visual-frame">
              <div className="ui-window">
                <div className="ui-top">
                  <span className="ui-dot" />
                  <span className="ui-dot" />
                  <span className="ui-dot" />
                </div>
                <div className="ui-body">
                  <div className="chat-bubble">
                    今度の企画、どう進める？
                  </div>
                  <div className="chat-bubble right">
                    体験型にしたら面白そう。
                  </div>
                  <div className="chat-bubble">
                    それいいね、役割分担もしやすそう。
                  </div>
                  <div className="chat-bubble right">
                    じゃあ、その方向で広げてみよう。
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="page-shell section-grid reverse">
          <div className="section-copy" data-reveal>
            <div className="kicker">02 / THYNC</div>
            <h2 className="section-heading">
              {"ばらばらの意見に、\nつながりを。"}
            </h2>
            <p>
              {
                "アイデア、問題点、解決策、類似案。\nひとつのボードに考えをまとめ、\n視覚的な発見をサポート。"
              }
            </p>
          </div>

          <div className="section-visual" data-reveal>
            <div className="visual-frame">
              <div className="thync-visual">
                <div className="sticky-board">
                  <div className="sticky-wrap">
                    <svg
                      className="sticky-svg"
                      viewBox="0 0 320 240"
                      aria-hidden="true"
                    >
                      <path
                        className="path-base"
                        d="M 62 132 C 92 104, 118 90, 160 82"
                      />
                      <path
                        className="path-base"
                        d="M 162 82 C 198 92, 222 116, 262 154"
                      />
                      <path
                        className="path-draw"
                        d="M 62 132 C 92 104, 118 90, 160 82"
                      />
                      <path
                        className="path-draw delay"
                        d="M 162 82 C 198 92, 222 116, 262 154"
                      />
                    </svg>

                    <div className="sticky-note a" />
                    <div className="sticky-note b" />
                    <div className="sticky-note c" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="page-shell section-grid">
          <div className="section-copy" data-reveal>
            <div className="kicker">03 / Summary</div>
            <h2 className="section-heading">
              {"全体像を\nひと目で、わかりやすく。"}
            </h2>
            <p>
              {
                "出てきたアイデアや賛否、\n問題点を整理して振り返る。\n振り返る手間をなくして、\n次の思考を、見つけやすく。"
              }
            </p>
          </div>

          <div className="section-visual" data-reveal>
            <div className="visual-frame">
              <div className="ui-window">
                <div className="ui-top">
                  <span className="ui-dot" />
                  <span className="ui-dot" />
                  <span className="ui-dot" />
                </div>
                <div className="ui-body">
                  <div className="summary-row">
                    <strong>案A</strong>
                    <span className="summary-pill">賛成 4</span>
                  </div>
                  <div className="summary-row">
                    <strong>案B</strong>
                    <span className="summary-pill">賛成 3</span>
                  </div>
                  <div className="summary-row">
                    <strong>案C</strong>
                    <span className="summary-pill">賛成 2</span>
                  </div>
                  <div
                    className="summary-row"
                    style={{ borderBottom: "none" }}
                  >
                    <strong>問題点</strong>
                    <span className="summary-pill">2件</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="page-shell">
        <section className="ending" data-reveal>
          <h2 className="ending-title">
            <span className="ending-title-core">
              不揃いな思考を、ひとつに
              <span className="ending-title-period">。</span>
            </span>
          </h2>
          <p className="ending-logo">THYNC</p>
          <div className="ending-sub">THINK × SYNC</div>
          <div className="ending-date">2026 / 11</div>
        </section>
      </div>

      {dialogOpen && (
        <GroupAddDialog
          onClose={() => setDialogOpen(false)}
          onSubmit={handleGroupSubmit}
        />
      )}
    </main>
  );
}