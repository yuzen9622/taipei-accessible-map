import { describe, expect, it } from "vitest";
import {
  appendFragment,
  applyCorrection,
  applyStatusTransition,
  emptyAggState,
  normalizeCjkSpacing,
  sealRole,
} from "../transcriptAggregator";

describe("transcriptAggregator", () => {
  it("case 1: consecutive same-role unsealed fragments merge into one entry", () => {
    let s = emptyAggState();
    s = appendFragment(s, { role: "user", text: "你" });
    s = appendFragment(s, { role: "user", text: "好" });
    s = appendFragment(s, { role: "user", text: "嗎" });

    expect(s.entries).toHaveLength(1);
    expect(s.entries[0].text).toBe("你好嗎");
    expect(s.entries[0].sealed).toBe(false);
  });

  it("case 2: alternating role starts a new entry", () => {
    let s = emptyAggState();
    s = appendFragment(s, { role: "user", text: "嗨" });
    s = appendFragment(s, { role: "model", text: "你好" });

    expect(s.entries).toHaveLength(2);
    expect(s.entries[0]).toMatchObject({ role: "user", text: "嗨" });
    expect(s.entries[1]).toMatchObject({ role: "model", text: "你好" });
  });

  it("case 3: entering model-speaking seals the trailing user entry; a later user fragment opens a new one", () => {
    let s = emptyAggState();
    s = appendFragment(s, { role: "user", text: "問題" });
    s = applyStatusTransition(s, "listening", "model-speaking");
    expect(s.entries[0].sealed).toBe(true);

    s = appendFragment(s, { role: "model", text: "答案" });
    s = applyStatusTransition(s, "model-speaking", "listening");
    s = appendFragment(s, { role: "user", text: "追問" });

    expect(s.entries).toHaveLength(3);
    expect(s.entries[2]).toMatchObject({
      role: "user",
      text: "追問",
      sealed: false,
    });
  });

  it("case 4: leaving model-speaking (turn.complete) seals the trailing model entry; next turn opens a new one", () => {
    let s = emptyAggState();
    s = appendFragment(s, { role: "model", text: "回覆" });
    s = applyStatusTransition(s, "model-speaking", "listening");
    expect(s.entries[0].sealed).toBe(true);

    s = appendFragment(s, { role: "model", text: "下一輪" });
    expect(s.entries).toHaveLength(2);
    expect(s.entries[1]).toMatchObject({ text: "下一輪", sealed: false });
  });

  it("case 5: interrupted/reconnect/terminal transitions out of model-speaking also seal the model entry", () => {
    for (const next of ["reconnecting", "ended", "error"] as const) {
      let s = emptyAggState();
      s = appendFragment(s, { role: "model", text: "說到一半" });
      s = applyStatusTransition(s, "model-speaking", next);
      expect(s.entries[0].sealed, `next=${next}`).toBe(true);
    }
  });

  it("case 6: sealRole is idempotent and non-boundary transitions leave state untouched", () => {
    let s = emptyAggState();
    s = appendFragment(s, { role: "user", text: "hi" });
    s = sealRole(s, "user");
    const sealedState = s;
    s = sealRole(s, "user");
    expect(s).toEqual(sealedState);

    const before = applyStatusTransition(sealedState, "connecting", "ready");
    expect(before).toBe(sealedState);
  });

  it("case 6b: sealRole is a no-op when there is no entry of that role", () => {
    const s = emptyAggState();
    expect(sealRole(s, "model")).toBe(s);

    let s2 = emptyAggState();
    s2 = appendFragment(s2, { role: "user", text: "hi" });
    expect(sealRole(s2, "model")).toBe(s2);
  });

  it("case 7: emptyAggState() starts with no entries and ids from zero", () => {
    const s = emptyAggState();
    expect(s.entries).toEqual([]);
    expect(s.nextId).toBe(0);

    const s2 = appendFragment(s, { role: "user", text: "a" });
    expect(s2.entries[0].id).toBe(0);
  });

  it("case 7a: normalizeCjkSpacing removes whitespace between CJK characters (incl. full-width punctuation), leaves Latin/CJK-Latin boundary whitespace alone", () => {
    expect(normalizeCjkSpacing("有什麼 我可以 幫您的嗎？")).toBe(
      "有什麼我可以幫您的嗎？",
    );
    expect(normalizeCjkSpacing("你 好 。")).toBe("你好。");
    expect(normalizeCjkSpacing("Hello world")).toBe("Hello world");
    expect(normalizeCjkSpacing("去 Taipei 101 吧")).toBe("去 Taipei 101 吧");
    expect(normalizeCjkSpacing("你   好")).toBe("你好");
    expect(normalizeCjkSpacing("您好！ 有什麼")).toBe("您好！有什麼");
  });

  it("case 7b: lossless aggregation — text updates immediately without CJK-internal spacing, raw preserves the fragment-boundary whitespace", () => {
    let s = emptyAggState();
    s = appendFragment(s, { role: "user", text: "無障" });
    s = appendFragment(s, { role: "user", text: " 礙交通 " });

    expect(s.entries).toHaveLength(1);
    expect(s.entries[0].text).toBe("無障礙交通");
    expect(s.entries[0].raw).toBe("無障 礙交通 ");

    let s2 = emptyAggState();
    s2 = appendFragment(s2, { role: "user", text: "交通 或路線" });
    expect(s2.entries[0].text).toBe("交通或路線");
  });

  it("case 7c: Latin word boundaries are never lost across a fragment split", () => {
    let s = emptyAggState();
    s = appendFragment(s, { role: "user", text: "Hello " });
    expect(s.entries[0].text).toBe("Hello");
    expect(s.entries[0].raw).toBe("Hello ");

    s = appendFragment(s, { role: "user", text: "world" });
    expect(s.entries[0].text).toBe("Hello world");

    let s2 = emptyAggState();
    s2 = appendFragment(s2, { role: "user", text: "去 Taipei" });
    s2 = appendFragment(s2, { role: "user", text: " 101 吧" });
    expect(s2.entries[0].text).toBe("去 Taipei 101 吧");
  });

  it("case 7d: empty/whitespace-only fragments never create an empty bubble; once an entry exists they still accumulate into raw without changing the displayed text", () => {
    let s = emptyAggState();
    s = appendFragment(s, { role: "user", text: "  " });
    expect(s.entries).toHaveLength(0);
    s = appendFragment(s, { role: "user", text: "" });
    expect(s.entries).toHaveLength(0);

    s = appendFragment(s, { role: "user", text: "你好" });
    expect(s.entries).toHaveLength(1);
    const before = s.entries[0];

    s = appendFragment(s, { role: "user", text: "  " });
    expect(s.entries).toHaveLength(1);
    expect(s.entries[0].text).toBe(before.text);
    expect(s.entries[0].raw).toBe(`${before.raw}  `);
  });

  it("case 8: user interim fragments accumulate by utteranceId, final=true replaces whole text and seals the entry", () => {
    let s = emptyAggState();
    // Interim fragments
    s = appendFragment(s, {
      role: "user",
      utteranceId: "u1",
      text: "我想",
      final: false,
    });
    s = appendFragment(s, {
      role: "user",
      utteranceId: "u1",
      text: "去",
      final: false,
    });

    expect(s.entries).toHaveLength(1);
    expect(s.entries[0].text).toBe("我想去");
    expect(s.entries[0].sealed).toBe(false);
    expect(s.entries[0].utteranceId).toBe("u1");

    // final: true arrives with full uncorrected sentence -> replaces interim in-place and seals
    s = appendFragment(s, {
      role: "user",
      utteranceId: "u1",
      text: "我想去珠北車站",
      final: true,
    });

    expect(s.entries).toHaveLength(1);
    expect(s.entries[0].text).toBe("我想去珠北車站");
    expect(s.entries[0].sealed).toBe(true);
    expect(s.entries[0].utteranceId).toBe("u1");

    // Next utterance has a new utteranceId -> starts a new bubble
    s = appendFragment(s, {
      role: "user",
      utteranceId: "u2",
      text: "請問",
      final: false,
    });

    expect(s.entries).toHaveLength(2);
    expect(s.entries[1].text).toBe("請問");
    expect(s.entries[1].sealed).toBe(false);
    expect(s.entries[1].utteranceId).toBe("u2");
  });

  it("case 9: applyCorrection replaces text in-place using utteranceId without creating new bubbles or changing order", () => {
    let s = emptyAggState();
    s = appendFragment(s, {
      role: "user",
      utteranceId: "u1",
      text: "我想去珠北車站",
      final: true,
    });
    s = appendFragment(s, {
      role: "model",
      text: "好的，為您查詢...",
    });

    expect(s.entries).toHaveLength(2);
    expect(s.entries[0].text).toBe("我想去珠北車站");

    // transcript.correction arrives 1s later for u1
    s = applyCorrection(s, {
      utteranceId: "u1",
      text: "我想去竹北車站",
    });

    expect(s.entries).toHaveLength(2);
    expect(s.entries[0].text).toBe("我想去竹北車站");
    expect(s.entries[0].id).toBe(0);
    expect(s.entries[1].text).toBe("好的，為您查詢...");
  });

  it("case 10: applyCorrection on unknown utteranceId or empty id is a no-op", () => {
    let s = emptyAggState();
    s = appendFragment(s, {
      role: "user",
      utteranceId: "u1",
      text: "台北",
      final: true,
    });

    const s2 = applyCorrection(s, {
      utteranceId: "non-existent",
      text: "新北",
    });
    expect(s2).toBe(s);

    const s3 = applyCorrection(s, {
      utteranceId: "",
      text: "新北",
    });
    expect(s3).toBe(s);
  });

  it("case 11: barge-in interleaving — user interim during model speech does not prematurely seal or corrupt model bubble, turn.complete/interrupted seals model", () => {
    let s = emptyAggState();
    // Model starts outputting
    s = appendFragment(s, { role: "model", text: "為您規劃" });
    s = appendFragment(s, { role: "model", text: "路線中" });
    expect(s.entries).toHaveLength(1);
    expect(s.entries[0].text).toBe("為您規劃路線中");
    expect(s.entries[0].sealed).toBe(false);

    // User interrupts with interim
    s = appendFragment(s, {
      role: "user",
      utteranceId: "u1",
      text: "等等",
      final: false,
    });
    expect(s.entries).toHaveLength(2);
    expect(s.entries[0].role).toBe("model");
    expect(s.entries[0].text).toBe("為您規劃路線中");
    expect(s.entries[1].role).toBe("user");
    expect(s.entries[1].text).toBe("等等");

    // Interrupted event seals model and user interim
    s = sealRole(s, "model");
    s = sealRole(s, "user");
    expect(s.entries[0].sealed).toBe(true);
    expect(s.entries[1].sealed).toBe(true);

    // User finishes sentence with final=true for u1
    s = appendFragment(s, {
      role: "user",
      utteranceId: "u1",
      text: "等等先不要",
      final: true,
    });
    expect(s.entries).toHaveLength(2);
    expect(s.entries[1].text).toBe("等等先不要");
    expect(s.entries[1].sealed).toBe(true);

    // Model responds in next turn
    s = appendFragment(s, { role: "model", text: "好的，已為您取消。" });
    expect(s.entries).toHaveLength(3);
    expect(s.entries[2].role).toBe("model");
    expect(s.entries[2].text).toBe("好的，已為您取消。");
    expect(s.entries[2].sealed).toBe(false);

    // turn.complete seals the active model entry
    s = sealRole(s, "model");
    expect(s.entries[2].sealed).toBe(true);
  });

  it("case 12: direct final=true without prior interim creates a sealed user entry", () => {
    let s = emptyAggState();
    s = appendFragment(s, {
      role: "user",
      utteranceId: "u1",
      text: "快速指令",
      final: true,
    });

    expect(s.entries).toHaveLength(1);
    expect(s.entries[0].text).toBe("快速指令");
    expect(s.entries[0].sealed).toBe(true);
    expect(s.entries[0].utteranceId).toBe("u1");
  });
});
