import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Renderer } from "../Renderer";
import { ButtonLayer } from "../systems/Buttons";
import { LeaderboardScene } from "./LeaderboardScene";
import { MenuScene } from "./MenuScene";
import type { GameContext } from "./Scene";

type Listener = (e: Event) => void;

function makeFakeRenderer() {
  const listeners = new Map<string, Listener[]>();
  const canvas = {
    addEventListener: vi.fn((type: string, fn: Listener) => {
      const arr = listeners.get(type) ?? [];
      arr.push(fn);
      listeners.set(type, arr);
    }),
    removeEventListener: vi.fn((type: string, fn: Listener) => {
      const arr = listeners.get(type);
      if (!arr) return;
      const i = arr.indexOf(fn);
      if (i >= 0) arr.splice(i, 1);
    }),
    getBoundingClientRect: () => ({
      left: 0,
      top: 0,
      right: 360,
      bottom: 640,
      width: 360,
      height: 640,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
  };
  const renderer = {
    canvas,
    clientToCanvas: (clientX: number, clientY: number) => ({ x: clientX, y: clientY }),
  } as unknown as Renderer;
  return { renderer, canvas, listeners };
}

function makeCtx(entries: { name: string; score: number; flies: number; ts: number }[] = []) {
  const goTo = vi.fn();
  const buttons = new ButtonLayer();
  const ctxMgr = {
    goTo,
    buttons,
    leaderboard: {
      all: () => entries.slice(),
      refresh: vi.fn(() => Promise.resolve()),
    },
    settings: { playerName: "" },
  } as unknown as GameContext;
  return { ctxMgr, goTo, buttons };
}

let windowListeners: Map<string, Listener[]>;

beforeEach(() => {
  windowListeners = new Map();
  vi.stubGlobal("window", {
    addEventListener: (type: string, fn: Listener) => {
      const arr = windowListeners.get(type) ?? [];
      arr.push(fn);
      windowListeners.set(type, arr);
    },
    removeEventListener: (type: string, fn: Listener) => {
      const arr = windowListeners.get(type);
      if (!arr) return;
      const i = arr.indexOf(fn);
      if (i >= 0) arr.splice(i, 1);
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("LeaderboardScene", () => {
  it("onFlap is a no-op — tapping the list must not navigate to MenuScene (mobile scroll regression)", () => {
    const { ctxMgr, goTo } = makeCtx();
    const { renderer } = makeFakeRenderer();
    const scene = new LeaderboardScene(ctxMgr, renderer);

    scene.enter();
    scene.onFlap?.();
    scene.onFlap?.();
    scene.onFlap?.();

    expect(goTo).not.toHaveBeenCalled();
    scene.exit();
  });

  it("registers exactly one back button that navigates to MenuScene", () => {
    const { ctxMgr, goTo, buttons } = makeCtx();
    const { renderer } = makeFakeRenderer();
    const scene = new LeaderboardScene(ctxMgr, renderer);

    scene.enter();

    const consumed = buttons.press(20, 20);
    expect(consumed).toBe(true);
    expect(goTo).toHaveBeenCalledTimes(1);
    expect(goTo.mock.calls[0]![0]).toBeInstanceOf(MenuScene);

    scene.exit();
  });

  it("back button is a touch-friendly hit target (≥ 44x40 per Apple HIG)", () => {
    const { ctxMgr, buttons } = makeCtx();
    const { renderer } = makeFakeRenderer();
    const scene = new LeaderboardScene(ctxMgr, renderer);

    scene.enter();

    const pressedAt = (x: number, y: number) => buttons.press(x, y);
    expect(pressedAt(8, 8)).toBe(true);
    expect(pressedAt(8 + 44 - 1, 8 + 40 - 1)).toBe(true);
    expect(pressedAt(8 + 44 + 1, 8 + 40 + 1)).toBe(false);

    scene.exit();
  });

  it("registers passive:false wheel and pointer drag listeners on enter, removes them on exit", () => {
    const { ctxMgr } = makeCtx();
    const { renderer, canvas, listeners } = makeFakeRenderer();
    const scene = new LeaderboardScene(ctxMgr, renderer);

    scene.enter();

    expect(canvas.addEventListener).toHaveBeenCalledWith("wheel", expect.any(Function), {
      passive: false,
    });
    expect(canvas.addEventListener).toHaveBeenCalledWith("pointerdown", expect.any(Function));
    expect(windowListeners.get("pointermove")?.length ?? 0).toBe(1);
    expect(windowListeners.get("pointerup")?.length ?? 0).toBe(1);

    scene.exit();

    expect(listeners.get("wheel")?.length ?? 0).toBe(0);
    expect(listeners.get("pointerdown")?.length ?? 0).toBe(0);
    expect(windowListeners.get("pointermove")?.length ?? 0).toBe(0);
    expect(windowListeners.get("pointerup")?.length ?? 0).toBe(0);
  });

  it("wheel scrolls and clamps to [0, maxScroll]", () => {
    const entries = Array.from({ length: 100 }, (_, i) => ({
      name: `p${i}`,
      score: i,
      flies: 0,
      ts: 0,
    }));
    const { ctxMgr } = makeCtx(entries);
    const { renderer, listeners } = makeFakeRenderer();
    const scene = new LeaderboardScene(ctxMgr, renderer);

    scene.enter();

    const wheel = listeners.get("wheel")![0]!;
    const preventDefault = vi.fn();

    wheel({ deltaY: 50, preventDefault } as unknown as Event);
    expect(preventDefault).toHaveBeenCalled();
    expect(scene["scrollY"]).toBe(50);

    wheel({ deltaY: 999_999, preventDefault } as unknown as Event);
    expect(scene["scrollY"]).toBe(scene["maxScroll"]);
    expect(scene["maxScroll"]).toBeGreaterThan(0);

    wheel({ deltaY: -999_999, preventDefault } as unknown as Event);
    expect(scene["scrollY"]).toBe(0);

    scene.exit();
  });

  it("touch drag inside the list area scrolls the list (and clamps)", () => {
    const entries = Array.from({ length: 50 }, (_, i) => ({
      name: `p${i}`,
      score: i,
      flies: 0,
      ts: 0,
    }));
    const { ctxMgr } = makeCtx(entries);
    const { renderer, listeners } = makeFakeRenderer();
    const scene = new LeaderboardScene(ctxMgr, renderer);

    scene.enter();

    const onDown = listeners.get("pointerdown")![0]!;
    const onMove = windowListeners.get("pointermove")![0]!;
    const onUp = windowListeners.get("pointerup")![0]!;

    // Drag inside the list (cardX≈20, cardY=90, listTop=140) — start at (180, 300)
    onDown({ clientX: 180, clientY: 300 } as unknown as Event);
    onMove({ clientX: 180, clientY: 250 } as unknown as Event);
    expect(scene["scrollY"]).toBeGreaterThan(0);

    const afterFirstMove = scene["scrollY"];
    onMove({ clientX: 180, clientY: 200 } as unknown as Event);
    expect(scene["scrollY"]).toBeGreaterThan(afterFirstMove);

    onUp({} as unknown as Event);

    // After pointer up, further moves must be ignored
    const settled = scene["scrollY"];
    onMove({ clientX: 180, clientY: 0 } as unknown as Event);
    expect(scene["scrollY"]).toBe(settled);

    scene.exit();
  });

  it("touch drag that starts outside the list area does NOT scroll", () => {
    const entries = Array.from({ length: 50 }, (_, i) => ({
      name: `p${i}`,
      score: i,
      flies: 0,
      ts: 0,
    }));
    const { ctxMgr } = makeCtx(entries);
    const { renderer, listeners } = makeFakeRenderer();
    const scene = new LeaderboardScene(ctxMgr, renderer);

    scene.enter();
    const onDown = listeners.get("pointerdown")![0]!;
    const onMove = windowListeners.get("pointermove")![0]!;

    // Header / above the card — not inside list
    onDown({ clientX: 180, clientY: 60 } as unknown as Event);
    onMove({ clientX: 180, clientY: 0 } as unknown as Event);
    expect(scene["scrollY"]).toBe(0);
  });

  it("recomputes maxScroll after async leaderboard refresh resolves", async () => {
    const entries = Array.from({ length: 80 }, (_, i) => ({
      name: `p${i}`,
      score: i,
      flies: 0,
      ts: 0,
    }));
    let entriesNow: typeof entries = [];
    const { ctxMgr } = makeCtx();
    (ctxMgr.leaderboard.all as unknown as () => typeof entries) = () => entriesNow.slice();
    (ctxMgr.leaderboard.refresh as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      entriesNow = entries;
    });

    const { renderer } = makeFakeRenderer();
    const scene = new LeaderboardScene(ctxMgr, renderer);

    scene.enter();
    expect(scene["maxScroll"]).toBe(0);

    await Promise.resolve();
    await Promise.resolve();
    expect(scene["maxScroll"]).toBeGreaterThan(0);

    scene.exit();
  });
});
