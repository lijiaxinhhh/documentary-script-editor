import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("first screen prioritizes local video import and paper-editing transcript", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("本地纪录片工作台")).toBeVisible();
  await expect(page.getByText("导入本地视频，生成可剪的逐字稿。")).toBeVisible();
  await expect(page.getByRole("button", { name: "导入本地视频" })).toBeVisible();
  await expect(page.getByRole("button", { name: "载入样例项目" })).toBeVisible();
  await expect(page.locator(".command-actions").getByRole("button", { name: "导出", exact: true })).toBeDisabled();
  await expect(page.getByRole("region", { name: "导出准备度" })).toContainText("导出不可用");
  await expect(page.getByText("API Key")).toHaveCount(0);
  await expect(page.locator(".storyboard-panel")).toHaveCount(0);

  const accessibilityScanResults = await new AxeBuilder({ page }).include("main").analyze();
  expect(accessibilityScanResults.violations).toEqual([]);
});

test("sample path turns selected transcript text into a rough cut and export-ready story drawer", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "载入样例项目" }).click();

  await expect(page.locator(".transcript-pane .pane-title", { hasText: "逐字稿" })).toBeVisible();
  await expect(page.getByText("受访者 A").first()).toBeVisible();
  await expect(page.getByRole("region", { name: "粗剪队列" })).toContainText("0 段");

  await selectFirstTranscriptText(page);
  await expect(page.getByRole("toolbar", { name: "选中文字工具栏" })).toBeVisible();
  await page.getByRole("button", { name: "设为片段" }).click();

  await expect(page.getByRole("region", { name: "粗剪队列" })).toContainText("1 段");
  await expect(page.getByRole("region", { name: "故事抽屉" })).toBeVisible();
  await expect(page.getByRole("region", { name: "导出准备度" })).toContainText("可生成粗剪工程");
  await expect(page.locator(".command-actions").getByRole("button", { name: "导出", exact: true })).toBeEnabled();

  await page.getByRole("button", { name: "展开故事版" }).click();
  await expect(page.locator(".storyboard-panel")).toBeVisible();
  await expect(page.getByLabel("故事版模板")).toBeVisible();

  const guideDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: /导出导入说明/ }).click();
  expect((await guideDownload).suggestedFilename()).toContain("_nle_import_guide.md");
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
  await expect(page.locator(".transcript-pane")).toHaveCount(1);

  await page.getByRole("button", { name: "Export" }).click();
  await expect(page.getByRole("region", { name: "导出准备度" })).toBeVisible();
});

test("desktop workbench panels can be resized like an editing suite", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const sidebarBefore = await boxWidth(page, ".sidebar");
  await dragBy(page, ".workspace-resizer.media-transcript", 80, 0);
  await expect.poll(() => boxWidth(page, ".sidebar")).toBeGreaterThan(sidebarBefore + 48);

  const inspectorBefore = await boxWidth(page, ".inspector-rail");
  await dragBy(page, ".workspace-resizer.transcript-inspector", -90, 0);
  await expect.poll(() => boxWidth(page, ".inspector-rail")).toBeGreaterThan(inspectorBefore + 54);

  const videoBefore = await boxHeight(page, ".video-pane");
  await dragBy(page, ".inspector-resizer.video-queue", 0, 80);
  await expect.poll(() => boxHeight(page, ".video-pane")).toBeGreaterThan(videoBefore + 48);

  await page.getByRole("button", { name: "载入样例项目" }).click();
  await selectFirstTranscriptText(page);
  await page.getByRole("button", { name: "设为片段" }).click();
  const drawerBefore = await boxHeight(page, ".story-drawer");
  await dragBy(page, ".story-drawer-resizer", 0, -130);
  await expect.poll(() => boxHeight(page, ".story-drawer")).toBeGreaterThan(drawerBefore + 70);
});

test("restored local project prompts for video relink", async ({ page }) => {
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
      highlights: [],
      paperEdit: [{ id: "inbox", title: "待归类", highlightIds: [] }]
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

  await page.locator(".asset-card input[type='file']").setInputFiles({
    name: "wrong-interview.mp4",
    mimeType: "video/mp4",
    buffer: Buffer.from("fake-video")
  });

  await expect(page.getByText("文件名不一致").first()).toBeVisible();
  await expect(page.getByText("项目需要 restored-interview.mp4").first()).toBeVisible();
  await expect(page.getByText("需要关联视频")).toHaveCount(0);
});

test("recent project can be restored from the settings menu", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "载入样例项目" }).click();

  await expect
    .poll(() => page.evaluate(() => Boolean(window.localStorage.getItem("documentary-script-editor.recent-project"))))
    .toBe(true);

  await page.reload();
  await page.locator(".settings-menu summary").click();
  await expect(page.getByRole("button", { name: "最近项目" })).toBeVisible();
  await page.getByRole("button", { name: "最近项目" }).click();

  await expect(page.getByText("需要关联视频")).toBeVisible();
  await expect(page.getByText("逐字稿已恢复，等待重新关联本地视频")).toBeVisible();
  await expect(page.getByText("受访者 A").first()).toBeVisible();
});

test("transcription job records missing local execution layer", async ({ page }) => {
  await page.route("http://127.0.0.1:8787/**", (route) => route.abort());
  await page.goto("/");

  await page.locator('input[type="file"][accept="video/mp4,video/quicktime,video/webm,.mov,.m4v"]').first().setInputFiles({
    name: "job-test.mp4",
    mimeType: "video/mp4",
    buffer: Buffer.from("fake-video")
  });

  await expect(page.getByRole("complementary", { name: "视频转文字与 Key 设置" })).toBeVisible();
  await page.getByLabel("转写模型").selectOption("local-whisper");
  await page.getByRole("button", { name: "创建转写任务" }).click();

  await expect(page.getByText("本机转写执行层未连接").first()).toBeVisible();
  await expect(page.getByText("等待执行层").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "重新检查" })).toBeVisible();
});

test("transcription job writes bridge result into transcript", async ({ page }) => {
  await page.route("http://127.0.0.1:8787/health", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        service: "documentary-transcription-bridge",
        runtimes: { ffmpeg: true, mlxWhisper: true }
      })
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
  await page.locator('input[type="file"][accept="video/mp4,video/quicktime,video/webm,.mov,.m4v"]').first().setInputFiles({
    name: "bridge-success.mp4",
    mimeType: "video/mp4",
    buffer: Buffer.from("fake-video")
  });

  await page.getByLabel("转写模型").selectOption("local-whisper");
  await page.getByRole("button", { name: "创建转写任务" }).click();

  await expect(page.locator(".transcription-status")).toContainText("转写完成，生成 1 段逐字稿。");
  await expect(page.locator(".transcript-pane .segment-text", { hasText: "桥接服务返回的真实逐字稿。" })).toBeVisible();
  await expect(page.getByText("已完成").first()).toBeVisible();
});

test("cloud transcription providers forward the user API key to the local bridge", async ({ page }) => {
  const received: Array<{ provider: string; apiKey: string }> = [];

  await page.route("http://127.0.0.1:8787/health", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        service: "documentary-transcription-bridge",
        runtimes: { ffmpeg: true }
      })
    })
  );
  await page.route("http://127.0.0.1:8787/transcribe**", (route) => {
    const requestUrl = new URL(route.request().url());
    const provider = requestUrl.searchParams.get("provider") ?? "";
    const apiKey = route.request().headers()["x-api-key"] ?? "";
    received.push({ provider, apiKey });
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
  await page.locator('input[type="file"][accept="video/mp4,video/quicktime,video/webm,.mov,.m4v"]').first().setInputFiles({
    name: "key-test.mp4",
    mimeType: "video/mp4",
    buffer: Buffer.from("fake-video")
  });

  await page.getByLabel("转写模型").selectOption("openai");
  await page.getByLabel("API Key").fill("sk-test-local-only");
  await page.getByRole("button", { name: "创建转写任务" }).click();

  await expect.poll(() => received.at(-1)?.provider).toBe("openai");
  await expect.poll(() => received.at(-1)?.apiKey).toBe("sk-test-local-only");
  await expect(page.getByRole("button", { name: /自动转写 A/ })).toBeVisible();
});

async function selectFirstTranscriptText(page: import("@playwright/test").Page) {
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

async function dragBy(page: import("@playwright/test").Page, selector: string, deltaX: number, deltaY: number) {
  const handle = await page.locator(selector).boundingBox();
  if (!handle) throw new Error(`Missing resize handle ${selector}`);
  const startX = handle.x + handle.width / 2;
  const startY = handle.y + handle.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + deltaX, startY + deltaY, { steps: 8 });
  await page.mouse.up();
}

async function boxWidth(page: import("@playwright/test").Page, selector: string) {
  const box = await page.locator(selector).boundingBox();
  if (!box) throw new Error(`Missing box ${selector}`);
  return box.width;
}

async function boxHeight(page: import("@playwright/test").Page, selector: string) {
  const box = await page.locator(selector).boundingBox();
  if (!box) throw new Error(`Missing box ${selector}`);
  return box.height;
}
