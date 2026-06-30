import type { StoryNote } from "../types/transcript";

export type StoryboardTemplate = {
  id: string;
  name: string;
  groups: string[];
  notes: Array<{
    groupTitle: string;
    text: string;
    color: StoryNote["color"];
  }>;
};

export const storyboardTemplates: StoryboardTemplate[] = [
  {
    id: "promo",
    name: "宣传片",
    groups: ["开场钩子", "问题/场景", "核心卖点", "证明材料", "情绪高潮", "行动召唤"],
    notes: [
      { groupTitle: "开场钩子", text: "前 5 秒给出强画面或强问题。", color: "yellow" },
      { groupTitle: "核心卖点", text: "只保留一个最清晰的主张。", color: "white" },
      { groupTitle: "证明材料", text: "放入用户证言、数据、现场细节或前后对比。", color: "blue" },
      { groupTitle: "行动召唤", text: "结尾要落到明确动作：报名、关注、到店、预约或传播。", color: "green" }
    ]
  },
  {
    id: "character-doc",
    name: "人物纪录片",
    groups: ["开场画像", "人物现状", "欲望/伤口", "外部冲突", "关键转折", "余韵结尾"],
    notes: [
      { groupTitle: "开场画像", text: "先让观众看见这个人，而不是先解释他。", color: "yellow" },
      { groupTitle: "欲望/伤口", text: "人物真正想要什么？他害怕失去什么？", color: "white" },
      { groupTitle: "外部冲突", text: "把阻力具体化：家庭、职业、时代、身体、关系。", color: "blue" },
      { groupTitle: "余韵结尾", text: "结尾可以不总结，但要留下新的理解。", color: "green" }
    ]
  },
  {
    id: "doc-short",
    name: "纪录短片",
    groups: ["开场画面", "背景建立", "核心事件", "冲突推进", "主题显影", "收束"],
    notes: [
      { groupTitle: "开场画面", text: "用一个画面让观众知道这条片子的气质。", color: "yellow" },
      { groupTitle: "核心事件", text: "短片只抓一件事，避免横向展开太多。", color: "white" },
      { groupTitle: "主题显影", text: "主题最好从人物行动里显出来，不只靠旁白说。", color: "blue" },
      { groupTitle: "收束", text: "最后一场要和开头形成呼应或反差。", color: "green" }
    ]
  },
  {
    id: "doc-feature",
    name: "纪录长片",
    groups: ["序章", "第一幕 建立", "第二幕 展开", "中点反转", "第三幕 危机", "解决/代价", "尾声"],
    notes: [
      { groupTitle: "序章", text: "可以先给未来的结果、谜题或强场面。", color: "yellow" },
      { groupTitle: "第一幕 建立", text: "建立人物、世界和核心问题。", color: "white" },
      { groupTitle: "中点反转", text: "让观众对人物或议题的理解发生变化。", color: "blue" },
      { groupTitle: "解决/代价", text: "解决不是胜利本身，也包括人物付出的代价。", color: "green" }
    ]
  }
];
