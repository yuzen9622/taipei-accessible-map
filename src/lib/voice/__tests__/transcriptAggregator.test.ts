import { describe, expect, it } from "vitest";
import {
  appendFragment,
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
});
