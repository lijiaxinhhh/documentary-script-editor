import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";

const port = Number(process.env.TRANSCRIPTION_BRIDGE_PORT ?? 8787);
const maxUploadBytes = Number(process.env.TRANSCRIPTION_BRIDGE_MAX_BYTES ?? 3 * 1024 * 1024 * 1024);

const server = http.createServer(async (request, response) => {
  setCorsHeaders(request, response);

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);

    if (url.pathname === "/health" && request.method === "GET") {
      writeJson(response, 200, {
        ok: true,
        service: "documentary-transcription-bridge",
        runtimes: await detectRuntimes()
      });
      return;
    }

    if (url.pathname === "/transcribe" && request.method === "POST") {
      await handleTranscribe(request, response, url);
      return;
    }

    writeJson(response, 404, {
      ok: false,
      code: "NOT_FOUND"
    });
  } catch (error) {
    writeJson(response, 500, {
      ok: false,
      code: "BRIDGE_ERROR",
      message: error instanceof Error ? error.message : "Unknown bridge error"
    });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Transcription bridge listening on http://127.0.0.1:${port}`);
});

async function handleTranscribe(request, response, url) {
  const provider = url.searchParams.get("provider") ?? "";
  const language = url.searchParams.get("language") ?? "zh";
  const fileName = safeFileName(url.searchParams.get("fileName") ?? "media.mp4");
  const options = {
    speakerDiarization: url.searchParams.get("speakerDiarization") === "true",
    wordTimestamps: url.searchParams.get("wordTimestamps") === "true",
    fillerCleanup: url.searchParams.get("fillerCleanup") === "true",
    hotwords: url.searchParams.get("hotwords") ?? ""
  };
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "documentary-asr-"));
  const inputPath = path.join(tempDir, fileName);

  try {
    await writeRequestToFile(request, inputPath);

    if (provider === "local-whisper") {
      const whisperPath = await commandPath("whisper");
      const mlxWhisperPath = await commandPath("mlx_whisper");
      if (!whisperPath && !mlxWhisperPath && !process.env.TRANSCRIPTION_COMMAND) {
        writeRuntimeMissing(
          response,
          "本机没有找到 whisper 或 mlx_whisper CLI，也没有设置 TRANSCRIPTION_COMMAND。可安装 OpenAI Whisper / mlx-whisper，或用自定义命令接 FunASR。"
        );
        return;
      }

      const result = whisperPath
        ? await runWhisperCli(whisperPath, inputPath, tempDir, language)
        : mlxWhisperPath
          ? await runMlxWhisperCli(mlxWhisperPath, inputPath, tempDir, language)
          : await runCustomAsrCommand(inputPath, tempDir, language);
      writeJson(response, 200, {
        ok: true,
        runtime: whisperPath ? "whisper-cli" : mlxWhisperPath ? "mlx-whisper" : "custom-command",
        segments: result.segments
      });
      return;
    }

    if (provider === "local-funasr") {
      writeRuntimeMissing(response, "本机桥接服务已收到任务，但当前还没有配置 FunASR runner。");
      return;
    }

    if (provider === "qwen-aliyun") {
      const apiKey = request.headers["x-api-key"];
      if (!apiKey || Array.isArray(apiKey)) {
        writeJson(response, 400, {
          ok: false,
          code: "MISSING_API_KEY",
          message: "通义/阿里云百炼转写需要 API Key。"
        });
        return;
      }
      const result = await runQwenAliyunTranscription(apiKey, inputPath, fileName, language, options);
      writeJson(response, 200, {
        ok: true,
        runtime: "qwen-aliyun",
        segments: result.segments
      });
      return;
    }

    if (provider === "openai") {
      const apiKey = request.headers["x-api-key"];
      if (!apiKey || Array.isArray(apiKey)) {
        writeJson(response, 400, {
          ok: false,
          code: "MISSING_API_KEY",
          message: "OpenAI 转写需要 API Key。"
        });
        return;
      }
      const result = await runOpenAiTranscription(apiKey, inputPath, fileName, language, options);
      writeJson(response, 200, {
        ok: true,
        runtime: "openai",
        segments: result.segments
      });
      return;
    }

    if (provider === "deepgram") {
      const apiKey = request.headers["x-api-key"];
      if (!apiKey || Array.isArray(apiKey)) {
        writeJson(response, 400, {
          ok: false,
          code: "MISSING_API_KEY",
          message: "Deepgram 转写需要 API Key。"
        });
        return;
      }
      const result = await runDeepgramTranscription(apiKey, inputPath, fileName, language, options);
      writeJson(response, 200, {
        ok: true,
        runtime: "deepgram",
        segments: result.segments
      });
      return;
    }

    writeRuntimeMissing(response, "本机桥接服务已收到任务，但云模型 runner 尚未实现。");
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function runWhisperCli(whisperPath, inputPath, outputDir, language) {
  const args = [
    inputPath,
    "--output_format",
    "json",
    "--output_dir",
    outputDir,
    "--model",
    process.env.WHISPER_MODEL ?? "base"
  ];
  const whisperLanguage = whisperLanguageArg(language);
  if (whisperLanguage) args.push("--language", whisperLanguage);

  const completed = await runCommand(whisperPath, args, 2 * 60 * 60 * 1000);
  if (completed.code !== 0) {
    throw new Error(`Whisper failed: ${completed.stderr || completed.stdout || `exit ${completed.code}`}`);
  }

  const jsonFile = (await readdir(outputDir)).find((name) => name.endsWith(".json"));
  if (!jsonFile) throw new Error("Whisper finished but no JSON output was found.");
  const raw = JSON.parse(await readFile(path.join(outputDir, jsonFile), "utf8"));
  const segments = Array.isArray(raw.segments)
    ? raw.segments.map((segment, index) => ({
        id: `asr_${index + 1}`,
        start: Number(segment.start ?? 0),
        end: Number(segment.end ?? segment.start ?? 0),
        text: String(segment.text ?? "").trim()
      }))
    : [];
  return { segments };
}

async function runMlxWhisperCli(mlxWhisperPath, inputPath, outputDir, language) {
  const args = [
    inputPath,
    "--output-format",
    "json",
    "--output-dir",
    outputDir,
    "--model",
    process.env.MLX_WHISPER_MODEL ?? "mlx-community/whisper-tiny",
    "--verbose",
    "False"
  ];
  const mlxLanguage = mlxLanguageArg(language);
  if (mlxLanguage) args.push("--language", mlxLanguage);

  const completed = await runCommand(mlxWhisperPath, args, 2 * 60 * 60 * 1000);
  if (completed.code !== 0) {
    throw new Error(`mlx-whisper failed: ${completed.stderr || completed.stdout || `exit ${completed.code}`}`);
  }

  const jsonFile = (await readdir(outputDir)).find((name) => name.endsWith(".json"));
  if (!jsonFile) throw new Error("mlx-whisper finished but no JSON output was found.");
  return normalizeAsrJson(JSON.parse(await readFile(path.join(outputDir, jsonFile), "utf8")));
}

async function runCustomAsrCommand(inputPath, outputDir, language) {
  const command = buildCustomCommand(inputPath, outputDir, language);
  const completed = await runCommand("sh", ["-lc", command], 2 * 60 * 60 * 1000);
  if (completed.code !== 0) {
    throw new Error(`Custom ASR command failed: ${completed.stderr || completed.stdout || `exit ${completed.code}`}`);
  }

  const stdout = completed.stdout.trim();
  if (stdout.startsWith("{")) {
    return normalizeAsrJson(JSON.parse(stdout));
  }

  const jsonFile = (await readdir(outputDir)).find((name) => name.endsWith(".json"));
  if (!jsonFile) throw new Error("Custom ASR command finished but no JSON output was found.");
  return normalizeAsrJson(JSON.parse(await readFile(path.join(outputDir, jsonFile), "utf8")));
}

async function runOpenAiTranscription(apiKey, inputPath, fileName, language, options) {
  const audio = await readFile(inputPath);
  const form = new FormData();
  const model = process.env.OPENAI_TRANSCRIPTION_MODEL ?? "whisper-1";
  const wantsDiarizedJson = options.speakerDiarization && model.includes("diarize");

  form.append("file", new Blob([audio]), fileName);
  form.append("model", model);
  form.append("response_format", wantsDiarizedJson ? "diarized_json" : "verbose_json");
  if (!wantsDiarizedJson) {
    form.append("timestamp_granularities[]", "segment");
    if (options.wordTimestamps) form.append("timestamp_granularities[]", "word");
  }
  if (options.hotwords.trim()) {
    form.append("prompt", options.hotwords.trim());
  }
  const openAiLanguage = openAiLanguageArg(language);
  if (openAiLanguage) form.append("language", openAiLanguage);

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    body: form
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `OpenAI transcription failed with ${response.status}`);
  }

  return normalizeAsrJson(payload);
}

async function runQwenAliyunTranscription(apiKey, inputPath, fileName, language, options) {
  const audio = await readFile(inputPath);
  const maxBytes = Number(process.env.QWEN_ASR_MAX_BASE64_BYTES ?? 7 * 1024 * 1024);
  if (audio.byteLength > maxBytes) {
    throw new Error(
      `通义 Qwen3-ASR-Flash 小文件直传限制为 ${Math.round(maxBytes / 1024 / 1024)}MB。大素材请先用本地 Whisper，或下一轮接 DashScope Filetrans/OSS 异步任务。`
    );
  }

  const body = {
    model: process.env.QWEN_ASR_MODEL ?? "qwen3-asr-flash",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "input_audio",
            input_audio: {
              data: `data:${mimeTypeFromFileName(fileName)};base64,${audio.toString("base64")}`
            }
          }
        ]
      }
    ],
    stream: false,
    asr_options: {
      ...(qwenLanguageArg(language) ? { language: qwenLanguageArg(language) } : {}),
      enable_itn: true
    }
  };

  const response = await fetch(
    process.env.QWEN_ASR_BASE_URL ?? "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.message ?? payload?.error?.message ?? `Qwen transcription failed with ${response.status}`);
  }

  const text = extractQwenText(payload);
  if (!text) throw new Error("通义返回中没有可用转写文本。");

  return {
    segments: [
      {
        id: "asr_1",
        start: 0,
        end: Number(payload?.usage?.seconds ?? 0) || 0.1,
        text
      }
    ]
  };
}

async function runDeepgramTranscription(apiKey, inputPath, fileName, language, options) {
  const audio = await readFile(inputPath);
  const params = new URLSearchParams({
    model: process.env.DEEPGRAM_MODEL ?? "nova-3",
    smart_format: "true",
    punctuate: "true",
    utterances: "true"
  });
  const deepgramLanguage = deepgramLanguageArg(language);
  if (deepgramLanguage) params.set("language", deepgramLanguage);
  if (options.speakerDiarization) params.set("diarize", "true");
  options.hotwords
    .split(/\r?\n|,/)
    .map((word) => word.trim())
    .filter(Boolean)
    .slice(0, 50)
    .forEach((word) => params.append("keywords", word));

  const response = await fetch(`${process.env.DEEPGRAM_BASE_URL ?? "https://api.deepgram.com/v1/listen"}?${params}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": mimeTypeFromFileName(fileName)
    },
    body: audio
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.err_msg ?? payload?.message ?? `Deepgram transcription failed with ${response.status}`);
  }

  return normalizeDeepgramJson(payload);
}

function normalizeAsrJson(raw) {
  const rawSegments = Array.isArray(raw.segments) ? raw.segments : Array.isArray(raw) ? raw : [];
  const rawWords = Array.isArray(raw.words)
    ? raw.words
        .map((word) => normalizeAsrWord(word))
        .filter((word) => word.text)
    : [];
  const segments = rawSegments.map((segment, index) => ({
    id: `asr_${index + 1}`,
    start: Number(segment.start ?? 0),
    end: Number(segment.end ?? segment.start ?? 0),
    text: String(segment.text ?? "").trim(),
    speakerId: speakerIdFromSegment(segment),
    words: Array.isArray(segment.words)
      ? segment.words.map((word) => normalizeAsrWord(word)).filter((word) => word.text)
      : rawWords.filter((word) => word.start >= Number(segment.start ?? 0) && word.end <= Number(segment.end ?? segment.start ?? 0))
  }));
  return { segments };
}

function normalizeAsrWord(word) {
  return {
    start: Number(word.start ?? 0),
    end: Number(word.end ?? word.start ?? 0),
    text: String(word.text ?? word.word ?? "").trim()
  };
}

function speakerIdFromSegment(segment) {
  const value = segment.speakerId ?? segment.speaker_id ?? segment.speaker ?? segment.channel ?? "";
  return value === "" || value === undefined || value === null ? undefined : String(value);
}

function normalizeDeepgramJson(payload) {
  const utterances = Array.isArray(payload?.results?.utterances) ? payload.results.utterances : [];
  if (utterances.length > 0) {
    return {
      segments: utterances
        .map((utterance, index) => ({
          id: `asr_${index + 1}`,
          start: Number(utterance.start ?? 0),
          end: Number(utterance.end ?? utterance.start ?? 0),
          text: String(utterance.transcript ?? "").trim(),
          speakerId: utterance.speaker === undefined ? undefined : String(utterance.speaker),
          words: Array.isArray(utterance.words)
            ? utterance.words.map((word) => normalizeDeepgramWord(word)).filter((word) => word.text)
            : undefined
        }))
        .filter((segment) => segment.text)
    };
  }

  const alternative = payload?.results?.channels?.[0]?.alternatives?.[0];
  const words = Array.isArray(alternative?.words)
    ? alternative.words.map((word) => normalizeDeepgramWord(word)).filter((word) => word.text)
    : [];
  const paragraphs = Array.isArray(alternative?.paragraphs?.paragraphs) ? alternative.paragraphs.paragraphs : [];
  const sentences = paragraphs.flatMap((paragraph) => (Array.isArray(paragraph.sentences) ? paragraph.sentences : []));
  if (sentences.length > 0) {
    return {
      segments: sentences
        .map((sentence, index) => ({
          id: `asr_${index + 1}`,
          start: Number(sentence.start ?? 0),
          end: Number(sentence.end ?? sentence.start ?? 0),
          text: String(sentence.text ?? "").trim(),
          words: words.filter((word) => word.start >= Number(sentence.start ?? 0) && word.end <= Number(sentence.end ?? sentence.start ?? 0))
        }))
        .filter((segment) => segment.text)
    };
  }

  const transcript = String(alternative?.transcript ?? "").trim();
  return {
    segments: transcript
      ? [
          {
            id: "asr_1",
            start: 0,
            end: Number(payload?.metadata?.duration ?? words.at(-1)?.end ?? 0.1),
            text: transcript,
            words
          }
        ]
      : []
  };
}

function normalizeDeepgramWord(word) {
  return {
    start: Number(word.start ?? 0),
    end: Number(word.end ?? word.start ?? 0),
    text: String(word.punctuated_word ?? word.word ?? "").trim(),
    speakerId: word.speaker === undefined ? undefined : String(word.speaker)
  };
}

function buildCustomCommand(inputPath, outputDir, language) {
  return String(process.env.TRANSCRIPTION_COMMAND)
    .replaceAll("{input}", shellQuote(inputPath))
    .replaceAll("{outputDir}", shellQuote(outputDir))
    .replaceAll("{language}", shellQuote(language));
}

function whisperLanguageArg(language) {
  if (language === "zh" || language === "yue") return "Chinese";
  if (language === "en") return "English";
  return "";
}

function mlxLanguageArg(language) {
  if (language === "zh") return "zh";
  if (language === "yue") return "yue";
  if (language === "en") return "en";
  return "";
}

function openAiLanguageArg(language) {
  if (language === "zh") return "zh";
  if (language === "yue") return "yue";
  if (language === "en") return "en";
  return "";
}

function qwenLanguageArg(language) {
  if (language === "zh") return "zh";
  if (language === "yue") return "yue";
  if (language === "en") return "en";
  return "";
}

function deepgramLanguageArg(language) {
  if (language === "zh") return "zh";
  if (language === "en") return "en";
  if (language === "yue") return "zh";
  return "";
}

function extractQwenText(payload) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((item) => (typeof item === "string" ? item : item?.text ?? item?.content ?? ""))
      .join("")
      .trim();
  }
  return "";
}

function mimeTypeFromFileName(fileName) {
  const extension = path.extname(fileName).toLowerCase();
  if (extension === ".wav") return "audio/wav";
  if (extension === ".mp3") return "audio/mpeg";
  if (extension === ".m4a") return "audio/mp4";
  if (extension === ".aac") return "audio/aac";
  if (extension === ".webm") return "audio/webm";
  if (extension === ".mp4" || extension === ".m4v") return "video/mp4";
  if (extension === ".mov") return "video/quicktime";
  return "application/octet-stream";
}

async function detectRuntimes() {
  const [ffmpeg, whisper, mlxWhisper, funasr] = await Promise.all([
    commandPath("ffmpeg"),
    commandPath("whisper"),
    commandPath("mlx_whisper"),
    commandPath("funasr")
  ]);
  return {
    ffmpeg: Boolean(ffmpeg),
    whisperCli: Boolean(whisper),
    mlxWhisper: Boolean(mlxWhisper),
    funasr: Boolean(funasr),
    customCommand: Boolean(process.env.TRANSCRIPTION_COMMAND)
  };
}

async function commandPath(command) {
  const completed = await runCommand("sh", ["-lc", `command -v ${shellQuote(command)}`], 5000);
  return completed.code === 0 ? completed.stdout.trim() : "";
}

function runCommand(command, args, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
    }, timeoutMs);
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

function writeRequestToFile(request, filePath) {
  return new Promise((resolve, reject) => {
    let bytes = 0;
    const output = createWriteStream(filePath);
    request.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > maxUploadBytes) {
        request.destroy(new Error("Upload exceeds TRANSCRIPTION_BRIDGE_MAX_BYTES."));
        output.destroy();
        return;
      }
    });
    request.pipe(output);
    output.on("finish", resolve);
    output.on("error", reject);
    request.on("error", reject);
  });
}

function setCorsHeaders(request, response) {
  const origin = request.headers.origin;
  response.setHeader("Access-Control-Allow-Origin", typeof origin === "string" ? origin : "*");
  response.setHeader("Vary", "Origin");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type,X-API-Key");
  response.setHeader("Access-Control-Max-Age", "600");
}

function writeJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function writeRuntimeMissing(response, message) {
  writeJson(response, 501, {
    ok: false,
    code: "ASR_RUNTIME_NOT_CONFIGURED",
    message
  });
}

function safeFileName(value) {
  return value.replace(/[\\/:*?"<>|]/g, "_") || "media.mp4";
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}
