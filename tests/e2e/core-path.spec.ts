import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

test("first screen is a local-first paper edit workbench", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("本地纪录片工作台")).toBeVisible();
  await expect(page.getByText("导入本地视频，生成可剪的逐字稿。")).toBeVisible();
  await expect(page.getByRole("button", { name: "导入本地视频" })).toBeVisible();
  await expect(page.getByText("也可以导入已有逐字稿")).toBeVisible();
  await expect(page.locator(".command-actions").getByRole("button", { name: "Export", exact: true })).toBeDisabled();
  await expect(page.getByRole("region", { name: "Paper Edit Spine" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Paper Edit Spine" })).toContainText("Paper Edit Spine 为空");
  await expect(page.getByRole("region", { name: "Export Assistant" })).toContainText("等待 Paper Edit");
  await expect(page.getByText("保存 Key 到本机浏览器")).toHaveCount(0);

  await page.locator(".settings-menu summary").click();
  await expect(page.locator(".settings-popover").getByRole("button", { name: "导入 JSON" })).toBeVisible();
  await expect(page.locator(".settings-popover").getByRole("button", { name: "载入样例项目" })).toBeVisible();

  const accessibilityScanResults = await new AxeBuilder({ page }).include("main").analyze();
  expect(accessibilityScanResults.violations).toEqual([]);
});

test("sample path creates a select, reviews timing, adds it to Paper Edit, and exports", async ({ page }) => {
  await page.goto("/");
  await loadSample(page);

  await expect(page.getByRole("region", { name: "Selects Queue" })).toContainText("还没有 Select");
  await selectFirstTranscriptText(page);
  const toolbar = page.getByRole("toolbar", { name: "选中文字工具栏" });
  await expect(toolbar).toBeVisible();
  await toolbar.getByRole("button", { name: "加入 Selects" }).click();

  await expect(page.getByRole("region", { name: "Select Inspector" })).toContainText("manual timing");
  await expect(page.getByRole("region", { name: "Select Inspector" })).toContainText("0:01");
  await page.getByRole("button", { name: "start +0.1s" }).click();
  await expect(page.getByRole("region", { name: "Select Inspector" })).toContainText("manual timing");
  await page.getByRole("button", { name: "Mark reviewed" }).click();
  await page.getByRole("button", { name: "加入 Paper Edit" }).click();

  await expect(page.getByRole("region", { name: "Paper Edit Spine" })).toContainText("1 个 Select");
  await expect(page.getByRole("region", { name: "Export Assistant" })).toContainText("Paper Edit 可生成交换文件");
  await expect(page.locator(".command-actions").getByRole("button", { name: "Export", exact: true })).toBeEnabled();

  const expandPaperEdit = page.getByRole("button", { name: "展开 Paper Edit" });
  if ((await expandPaperEdit.count()) > 0) await expandPaperEdit.click();
  await expect(page.locator(".storyboard-panel")).toBeVisible();
  await expect(page.getByLabel("Paper Edit 模板")).toBeVisible();

  const fcpxmlDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: /Final Cut FCPXML Beta/ }).click();
  expect((await fcpxmlDownload).suggestedFilename()).toContain("_final_cut.fcpxml");

  const manifestDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: /Relink manifest CSV/ }).click();
  expect((await manifestDownload).suggestedFilename()).toContain("_relink_manifest.csv");
});

test("estimated text selections are marked needs review", async ({ page }) => {
  await page.goto("/");
  await loadSample(page);

  await selectTextInSegment(page, ".segment-text", "那一天开始");
  await page.getByRole("toolbar", { name: "选中文字工具栏" }).getByRole("button", { name: "加入 Selects" }).click();

  const inspector = page.getByRole("region", { name: "Select Inspector" });
  await expect(inspector).toContainText("estimated timing");
  await expect(inspector).toContainText("needs review");
  await expect(inspector.getByLabel("Select status")).toHaveValue("needs-review");
});

test("rejected selects stay out of Paper Edit and can be restored", async ({ page }) => {
  await page.goto("/");
  await loadSample(page);

  await selectTextInSegment(page, ".segment-text", "那一天开始");
  await page.getByRole("toolbar", { name: "选中文字工具栏" }).getByRole("button", { name: "Reject" }).click();

  await expect(page.getByRole("region", { name: "Select Inspector" }).getByLabel("Select status")).toHaveValue("rejected");
  await expect(page.getByRole("button", { name: "加入 Paper Edit" })).toBeDisabled();
  await expect(page.getByRole("region", { name: "Export Assistant" })).toContainText("等待 Paper Edit");

  await page.getByLabel("筛选 Selects").selectOption("rejected");
  await expect(page.getByRole("region", { name: "Selects Queue" })).toContainText("Rejected");
  await page.getByLabel("Select status").selectOption("selected");
  await page.getByRole("button", { name: "加入 Paper Edit" }).click();

  await expect(page.getByRole("region", { name: "Paper Edit Spine" })).toContainText("1 个 Select");
  await expect(page.getByRole("region", { name: "Export Assistant" })).toContainText("Rejected selects 未进入导出");
});

test("transcription privacy path does not require an API key by default", async ({ page }) => {
  await page.goto("/");
  await page.locator(".command-actions").getByRole("button", { name: "转写助手" }).click();

  await expect(page.getByRole("complementary", { name: "转写助手 / 隐私路径" })).toBeVisible();
  await expect(page.getByText("本机助手转写")).toBeVisible();
  await expect(page.getByText("API Key").first()).toBeVisible();
  await expect(page.getByText("未保存")).toBeVisible();
  await expect(page.getByLabel("API Key")).toBeDisabled();

  await page.getByLabel("云服务商").selectOption("openai");
  await expect(page.getByText("音频会从本机助手发送给 OpenAI")).toBeVisible();
  await page.getByLabel("API Key").fill("sk-test-local-only");
  await page.getByRole("button", { name: "保存 Key 到本机浏览器" }).click();
  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(window.localStorage.getItem("documentary-script-editor.transcription-settings") ?? "{}").apiKey)
    )
    .toBe("sk-test-local-only");

  await page.getByRole("button", { name: "清除已保存 Key 和设置" }).click();
  await expect
    .poll(() => page.evaluate(() => window.localStorage.getItem("documentary-script-editor.transcription-settings")))
    .toBeNull();
});

test("bridge missing path is explicit and does not pretend transcription finished", async ({ page }) => {
  await page.route("http://127.0.0.1:8787/**", (route) => route.abort());
  await page.goto("/");

  await importFakeVideo(page, "job-test.mp4");

  await expect(page.getByRole("complementary", { name: "转写助手 / 隐私路径" })).toBeVisible();
  await page.getByRole("button", { name: "创建转写任务" }).click();

  await expect(page.getByText("本机转写执行层未连接").first()).toBeVisible();
  await expect(page.getByText("本机助手未连接").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "重新检查" })).toBeVisible();
  await expect(page.getByText("转写完成")).toHaveCount(0);
});

test("transcription bridge result writes transcript and keeps key in session", async ({ page }) => {
  await page.route("http://127.0.0.1:8787/health", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ ok: true, service: "documentary-transcription-bridge", runtimes: { ffmpeg: true, mlxWhisper: true } })
    })
  );
  await page.route("http://127.0.0.1:8787/transcribe**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        runtime: "test-runtime",
        segments: [{ start: 0, end: 2.4, text: "桥接服务返回的真实逐字稿。" }]
      })
    })
  );

  await page.goto("/");
  await importFakeVideo(page, "bridge-success.mp4");
  await page.getByRole("button", { name: "创建转写任务" }).click();

  await expect(page.locator(".transcription-status")).toContainText("转写完成，生成 1 段逐字稿。");
  await expect(page.locator(".transcript-pane .segment-text", { hasText: "桥接服务返回的真实逐字稿。" })).toBeVisible();
  await expect(page.getByText("已完成").first()).toBeVisible();
});

test("cloud transcription providers forward API key and optional bridge token to local assistant", async ({ page }) => {
  const received: Array<{ provider: string; apiKey: string; bridgeToken: string }> = [];

  await page.route("http://127.0.0.1:8787/health", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ ok: true, service: "documentary-transcription-bridge", runtimes: { ffmpeg: true } })
    })
  );
  await page.route("http://127.0.0.1:8787/transcribe**", (route) => {
    const requestUrl = new URL(route.request().url());
    const provider = requestUrl.searchParams.get("provider") ?? "";
    received.push({
      provider,
      apiKey: route.request().headers()["x-api-key"] ?? "",
      bridgeToken: route.request().headers()["x-bridge-token"] ?? ""
    });
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        runtime: provider,
        segments: [{ start: 0, end: 2.2, text: `${provider} Key 路径返回的逐字稿。`, speakerId: "A" }]
      })
    });
  });

  await page.goto("/");
  await importFakeVideo(page, "key-test.mp4");
  await page.getByLabel("云服务商").selectOption("openai");
  await page.getByLabel("API Key").fill("sk-test-local-only");
  await page.locator("summary", { hasText: "高级设置" }).click();
  await page.getByLabel("本机助手配对码").fill("pair-123");
  await page.getByRole("button", { name: "创建转写任务" }).click();

  await expect.poll(() => received.at(-1)?.provider).toBe("openai");
  await expect.poll(() => received.at(-1)?.apiKey).toBe("sk-test-local-only");
  await expect.poll(() => received.at(-1)?.bridgeToken).toBe("pair-123");
  await expect(page.getByRole("button", { name: /自动转写 A/ })).toBeVisible();
});

test("mobile uses task tabs instead of squeezing the desktop workbench", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.getByRole("navigation", { name: "移动端工作区" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Transcript" })).toHaveClass(/active/);

  await page.getByRole("button", { name: "Video" }).click();
  await expect(page.locator(".video-pane")).toBeVisible();

  await page.getByRole("navigation", { name: "移动端工作区" }).getByRole("button", { name: "Export" }).click();
  await expect(page.getByRole("region", { name: "Export Assistant" })).toBeVisible();
});

test("desktop workbench panels can be resized like an editing suite", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1300 });
  await page.goto("/");

  const sidebarBefore = await boxWidth(page, ".sidebar");
  await dragBy(page, ".workspace-resizer.media-transcript", 80, 0);
  await expect.poll(() => boxWidth(page, ".sidebar")).toBeGreaterThan(sidebarBefore + 48);

  const inspectorBefore = await boxWidth(page, ".inspector-rail");
  await dragBy(page, ".workspace-resizer.transcript-inspector", -90, 0);
  await expect.poll(() => boxWidth(page, ".inspector-rail")).toBeGreaterThan(inspectorBefore + 54);

  const videoBefore = await boxHeight(page, ".video-pane");
  await dragBy(page, ".inspector-resizer.video-queue", 0, 80);
  await expect.poll(() => boxHeight(page, ".video-pane")).toBeGreaterThan(videoBefore + 1);

  const drawerBefore = await boxHeight(page, ".story-drawer");
  await dragBy(page, ".story-drawer-resizer", 0, -130);
  await expect.poll(() => boxHeight(page, ".story-drawer")).toBeGreaterThan(drawerBefore + 70);
});

test("restored local project prompts for video relink and normalizes old selects", async ({ page }) => {
  await page.goto("/");

  const localProject = {
    schema: "documentary-script-editor.local-project",
    version: 1,
    savedAt: "2026-06-26T10:00:00.000Z",
    project: {
      id: "restored-project",
      name: "恢复测试项目",
      assets: [{ id: "asset-restored", fileName: "restored-interview.mp4", duration: 20 }],
      speakers: [{ id: "spk-1", name: "受访者" }],
      segments: [
        {
          id: "seg-1",
          assetId: "asset-restored",
          speakerId: "spk-1",
          start: 0,
          end: 3,
          text: "恢复项目后应该提醒用户重新关联视频。"
        }
      ],
      highlights: [
        {
          id: "hl-old",
          segmentId: "seg-1",
          assetId: "asset-restored",
          speakerId: "spk-1",
          start: 0,
          end: 3,
          text: "恢复项目后应该提醒用户重新关联视频。",
          tags: []
        }
      ],
      paperEdit: [{ id: "inbox", title: "Unsorted Selects", highlightIds: ["hl-old"] }]
    },
    storyNotes: []
  };

  await page.locator('input[type="file"][accept="application/json,.json"]').setInputFiles({
    name: "restored-project.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(localProject))
  });

  await expect(page.getByText("需要关联视频")).toBeVisible();
  await expect(page.getByText("逐字稿已恢复，等待重新关联本地视频")).toBeVisible();
  await expect(page.getByRole("region", { name: "Select Inspector" })).toContainText("estimated timing");

  await page.locator(".asset-card input[type='file']").setInputFiles({
    name: "wrong-interview.mp4",
    mimeType: "video/mp4",
    buffer: Buffer.from("fake-video")
  });

  await expect(page.getByText("文件名不一致").first()).toBeVisible();
  await expect(page.getByText("项目需要 restored-interview.mp4").first()).toBeVisible();
  await expect(page.getByText("需要关联视频")).toHaveCount(0);
});

async function loadSample(page: Page) {
  await page.locator(".settings-menu summary").click();
  await page.locator(".settings-popover").getByRole("button", { name: "载入样例项目" }).click();
}

async function importFakeVideo(page: Page, name: string) {
  await page.locator('input[type="file"][accept="video/mp4,video/quicktime,video/webm,.mov,.m4v"]').first().setInputFiles({
    name,
    mimeType: "video/mp4",
    buffer: Buffer.from("fake-video")
  });
}

async function selectFirstTranscriptText(page: Page) {
  await page.locator(".segment-text").first().evaluate((node) => {
    const range = document.createRange();
    range.selectNodeContents(node);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    const rect = node.getBoundingClientRect();
    node.dispatchEvent(
      new MouseEvent("mouseup", {
        bubbles: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + 8
      })
    );
  });
}

async function selectTextInSegment(page: Page, selector: string, text: string) {
  await page.locator(selector).first().evaluate((node, selectedText) => {
    const content = node.textContent ?? "";
    const start = content.indexOf(selectedText);
    if (start < 0) throw new Error(`Missing selection text: ${selectedText}`);
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    let current: Text | null = walker.nextNode() as Text | null;
    let offset = 0;
    const range = document.createRange();
    while (current) {
      const nextOffset = offset + current.data.length;
      if (start >= offset && start <= nextOffset) {
        range.setStart(current, start - offset);
      }
      if (start + selectedText.length >= offset && start + selectedText.length <= nextOffset) {
        range.setEnd(current, start + selectedText.length - offset);
        break;
      }
      offset = nextOffset;
      current = walker.nextNode() as Text | null;
    }
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    const rect = range.getBoundingClientRect();
    node.dispatchEvent(
      new MouseEvent("mouseup", {
        bubbles: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + 8
      })
    );
  }, text);
}

async function dragBy(page: Page, selector: string, deltaX: number, deltaY: number) {
  const handle = await page.locator(selector).boundingBox();
  if (!handle) throw new Error(`Missing resize handle ${selector}`);
  const startX = handle.x + handle.width / 2;
  const startY = handle.y + handle.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + deltaX, startY + deltaY, { steps: 8 });
  await page.mouse.up();
}

async function boxWidth(page: Page, selector: string) {
  const box = await page.locator(selector).boundingBox();
  if (!box) throw new Error(`Missing box ${selector}`);
  return box.width;
}

async function boxHeight(page: Page, selector: string) {
  const box = await page.locator(selector).boundingBox();
  if (!box) throw new Error(`Missing box ${selector}`);
  return box.height;
}
