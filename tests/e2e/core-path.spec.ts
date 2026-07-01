import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("core MVP path: sample, paper edit, storyboard and feedback", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("本地纪录片工作台")).toBeVisible();
  await expect(page.getByRole("button", { name: "导入视频" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "载入样例" })).toBeVisible();
  await expect(page.getByRole("button", { name: "提交需求" })).toBeVisible();

  await page.getByRole("button", { name: "载入样例" }).click();
  await expect(page.locator(".transcript-pane .pane-title", { hasText: "逐字稿" })).toBeVisible();
  await expect(page.getByText("受访者 A").first()).toBeVisible();

  await page.getByRole("button", { name: "入稿" }).first().click();
  await expect(page.locator(".story-video-card")).toHaveCount(1);
  await expect(page.getByText("1 个视频片段")).toBeVisible();

  const imageChooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "图片" }).first().click();
  await (await imageChooser).setFiles({
    name: "reference-board.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGOSHzRgAAAAABJRU5ErkJggg==",
      "base64"
    )
  });
  await expect(page.getByText("reference-board.png")).toBeVisible();

  await page.getByRole("button", { name: "提交需求" }).click();
  await expect(page.getByRole("complementary", { name: "提交需求和工作流建议" })).toBeVisible();
  await expect(page.getByRole("button", { name: "导出 JSON" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "导出 CSV" })).toBeDisabled();
  await page.getByRole("button", { name: "保存到本机" }).click();
  await expect(page.getByRole("alert")).toContainText("请至少填写真实工作流");

  await page.getByLabel("你现在怎么整理采访和素材").fill("先转写采访，再在文档里做纸剪辑，最后回剪辑软件找时间码。");
  await page.getByLabel("当前最痛的卡点").fill("选段和故事版无法直接变成可导入的粗剪工程。");
  await page.getByLabel("你最希望它导出什么").fill("Final Cut、Premiere、DaVinci、剪映都能识别的工程文件。");
  await page.getByRole("button", { name: "保存到本机" }).click();
  await expect(page.getByText("已保存到本机浏览器")).toBeVisible();
  await expect(page.getByText("已保存 1 条")).toBeVisible();
  await expect(page.getByRole("button", { name: "导出 JSON" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "导出 CSV" })).toBeEnabled();

  await page.locator(".feedback-footer").getByRole("button", { name: "关闭" }).click();
  const projectDownload = page.waitForEvent("download");
  await page.getByLabel("导出").selectOption("project");
  expect((await projectDownload).suggestedFilename()).toContain("_local_project.json");

  const guideDownload = page.waitForEvent("download");
  await page.getByLabel("导出").selectOption("nle-guide");
  expect((await guideDownload).suggestedFilename()).toContain("_nle_import_guide.md");

  const accessibilityScanResults = await new AxeBuilder({ page })
    .include("main")
    .disableRules(["color-contrast"])
    .analyze();
  expect(accessibilityScanResults.violations).toEqual([]);
});

test("mobile layout does not overflow horizontally", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.getByRole("button", { name: "导入视频" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "载入样例" })).toBeVisible();
});

test("workflow stepper opens and highlights matching work areas", async ({ page }) => {
  await page.goto("/");

  await page.locator(".workflow-chip").nth(1).click();
  await expect(page.getByRole("complementary", { name: "视频转文字与 Key 设置" })).toBeVisible();
  await expect(page.locator(".transcription-panel")).toHaveClass(/workflow-target-pulse/);
  await page.getByRole("button", { name: "关闭" }).click();

  await page.locator(".workflow-chip").nth(3).click();
  await expect(page.locator(".storyboard-panel")).toHaveClass(/workflow-target-pulse/);

  await page.locator(".workflow-chip").nth(4).click();
  await expect(page.getByLabel("导出")).toBeFocused();
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
  await expect(page.getByRole("button", { name: "关联视频" }).first()).toBeVisible();

  await page.locator(".workflow-callout input[type=file]").setInputFiles({
    name: "wrong-interview.mp4",
    mimeType: "video/mp4",
    buffer: Buffer.from("fake-video")
  });

  await expect(page.getByText("文字剪辑已就绪")).toBeVisible();
  await expect(page.getByText("文件名不一致").first()).toBeVisible();
  await expect(page.getByText("项目需要 restored-interview.mp4").first()).toBeVisible();
  await expect(page.getByText("需要关联视频")).toHaveCount(0);
});

test("recent project can be restored from local browser storage", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "载入样例" }).click();

  await expect
    .poll(() => page.evaluate(() => Boolean(window.localStorage.getItem("documentary-script-editor.recent-project"))))
    .toBe(true);

  await page.reload();
  await expect(page.getByRole("button", { name: "最近项目" })).toBeVisible();
  await page.getByRole("button", { name: "最近项目" }).click();

  await expect(page.getByText("需要关联视频")).toBeVisible();
  await expect(page.getByText("逐字稿和故事版已恢复")).toBeVisible();
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

test("cloud transcription forwards the user API key to the local bridge", async ({ page }) => {
  let receivedApiKey = "";

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
    receivedApiKey = route.request().headers()["x-api-key"] ?? "";
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        runtime: "openai",
        segments: [
          {
            start: 0,
            end: 3.1,
            text: "OpenAI Key 路径返回的逐字稿。",
            speakerId: "A",
            words: [{ start: 0, end: 0.8, text: "OpenAI" }]
          }
        ]
      })
    });
  });

  await page.goto("/");
  await page.locator('input[type="file"][accept="video/mp4,video/quicktime,video/webm,.mov,.m4v"]').first().setInputFiles({
    name: "openai-key-test.mp4",
    mimeType: "video/mp4",
    buffer: Buffer.from("fake-video")
  });

  await page.getByLabel("转写模型").selectOption("openai");
  await page.getByLabel("API Key").fill("sk-test-local-only");
  await page.getByRole("button", { name: "创建转写任务" }).click();

  await expect.poll(() => receivedApiKey).toBe("sk-test-local-only");
  await expect(page.locator(".transcription-status")).toContainText("转写完成，生成 1 段逐字稿。");
  await expect(page.getByRole("button", { name: /自动转写 A/ })).toBeVisible();
  await expect(page.locator(".transcript-pane .segment-text", { hasText: "OpenAI Key 路径返回的逐字稿。" })).toBeVisible();
});

test("qwen transcription provider also forwards the user API key", async ({ page }) => {
  let receivedApiKey = "";
  let receivedProvider = "";

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
    receivedProvider = requestUrl.searchParams.get("provider") ?? "";
    receivedApiKey = route.request().headers()["x-api-key"] ?? "";
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        runtime: "qwen-aliyun",
        segments: [{ start: 0, end: 2.2, text: "通义 Key 路径返回的逐字稿。" }]
      })
    });
  });

  await page.goto("/");
  await page.locator('input[type="file"][accept="video/mp4,video/quicktime,video/webm,.mov,.m4v"]').first().setInputFiles({
    name: "qwen-key-test.mp4",
    mimeType: "video/mp4",
    buffer: Buffer.from("fake-video")
  });

  await page.getByLabel("转写模型").selectOption("qwen-aliyun");
  await page.getByLabel("API Key").fill("qwen-test-local-only");
  await page.getByRole("button", { name: "创建转写任务" }).click();

  await expect.poll(() => receivedProvider).toBe("qwen-aliyun");
  await expect.poll(() => receivedApiKey).toBe("qwen-test-local-only");
  await expect(page.locator(".transcription-status")).toContainText("转写完成，生成 1 段逐字稿。");
  await expect(page.locator(".transcript-pane .segment-text", { hasText: "通义 Key 路径返回的逐字稿。" })).toBeVisible();
});

test("deepgram transcription provider also forwards the user API key", async ({ page }) => {
  let receivedApiKey = "";
  let receivedProvider = "";

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
    receivedProvider = requestUrl.searchParams.get("provider") ?? "";
    receivedApiKey = route.request().headers()["x-api-key"] ?? "";
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        runtime: "deepgram",
        segments: [{ start: 0, end: 1.8, text: "Deepgram Key 路径返回的逐字稿。" }]
      })
    });
  });

  await page.goto("/");
  await page.locator('input[type="file"][accept="video/mp4,video/quicktime,video/webm,.mov,.m4v"]').first().setInputFiles({
    name: "deepgram-key-test.mp4",
    mimeType: "video/mp4",
    buffer: Buffer.from("fake-video")
  });

  await page.getByLabel("转写模型").selectOption("deepgram");
  await page.getByLabel("API Key").fill("dg-test-local-only");
  await page.getByRole("button", { name: "创建转写任务" }).click();

  await expect.poll(() => receivedProvider).toBe("deepgram");
  await expect.poll(() => receivedApiKey).toBe("dg-test-local-only");
  await expect(page.locator(".transcription-status")).toContainText("转写完成，生成 1 段逐字稿。");
  await expect(page.locator(".transcript-pane .segment-text", { hasText: "Deepgram Key 路径返回的逐字稿。" })).toBeVisible();
});
