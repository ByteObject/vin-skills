---
name: newapi-model-setup
description: Add a new LLM model to a self-hosted new-api gateway so StartClaw Managed-AI / Hermes bots can use it (channel model list + redirect, model ratios, admin default). Use when the user wants to "add a model to newapi", e.g. Kimi, Qwen, DeepSeek, via OpenRouter or a direct provider. Drives the new-api console + StartClaw admin via the chrome-devtools MCP.
---

# new-api Model Setup (for StartClaw Managed-AI / Hermes bots)

Add a model (e.g. `moonshotai/kimi-k2.6`, `qwen/qwen3-...`) to the user's
self-hosted **new-api** gateway and expose it to StartClaw Managed-AI bots.
The platform reference is `DEPLOYMENT.md` → "Adding a Model to the Managed-AI
Gateway".

## When to use
- "Add Kimi / Qwen / DeepSeek to newapi", "make model X available to my bots",
  "configure a new model on the gateway".

## The one fact that drives everything
StartClaw Hermes bots use the Hermes **`openai-api`** provider, so the gateway
receives the model name **prefixed**: `openai/<model>`. So:
- In **new-api** you configure `openai/<model>` (and map it to the real
  upstream slug).
- In **StartClaw admin / bot config** you use the **bare** `<model>` — the
  platform adds the `openai/` prefix automatically (`buildHermesInitScript`).
- OpenClaw (Node) bots have **no** prefix — use the id as-is.

new-api billing base: **ratio 1 = $2 / 1M tokens**.

## Inputs to collect first
1. **Upstream slug** the provider uses (e.g. OpenRouter `moonshotai/kimi-k2.6`).
2. **Bot-facing id** (usually the same trailing name, e.g. `kimi-k2.6`).
3. **Route**: which new-api channel carries the upstream key (often an existing
   `openrouter` channel) — or create one.
4. **Pricing** ($/1M input and output). Get it from the provider page; for
   OpenRouter, `WebFetch https://openrouter.ai/<slug>` and ask for input/output
   price per 1M tokens.
5. **Scope**: add alongside the current default, or make it the new default.

Compute:
- `model_ratio = input_$per_1M / 2`
- `completion_ratio = output_$per_1M / input_$per_1M`

## Procedure (chrome-devtools MCP)

Tabs are usually already open and authenticated. `list_pages` → `select_page`.
The new-api console is often Chinese; labels below give both.

### Step 0 — handle huge snapshots
`take_snapshot` on the channel page exceeds the token limit and is saved to a
file. **grep the saved file** for the controls you need instead of reading it
whole (e.g. `自定义模型|填入|模型重定向|键名|参数值|save 提交|保存`).

### Step 1 — Channel: model list + redirect
`navigate_page` → `https://<newapi-host>/console/channel`, snapshot, click the
channel's **编辑 / Edit**.
1. **Add to model list**: type `openai/<model>` in **自定义模型名称 / Custom
   model name**, click **填入 / Fill**. Repeat for the **upstream slug** too.
   Verify with grep (look for the new `... <model> close` buttons).
2. **Model redirect / 模型重定向**: switch to the **手动编辑 / Manual editing**
   tab and set the JSON so the prefixed name maps to the upstream slug. The
   `fill` tool **appends** to textareas — use `evaluate_script` instead:
   ```js
   (el) => {
     const o = JSON.parse(el.value || '{}');
     o['openai/<model>'] = '<upstream-slug>';
     const v = JSON.stringify(o, null, 2);
     const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;
     set.call(el, v);
     el.dispatchEvent(new Event('input',{bubbles:true}));
     el.dispatchEvent(new Event('change',{bubbles:true}));
     return el.value;
   }
   ```
   (pass the textarea uid in `args`). Confirm no "JSON 格式错误" alert.
3. Click **save 提交 / 保存**. The panel closes on success. Verify by typing
   `openai/<model>` in the channel list's **模型关键字 / model keyword** search
   + 查询 — the channel should still match.

### Step 2 — Pricing / ratios
`navigate_page` → `https://<newapi-host>/console/setting?tab=ratio`
(System Settings → **分组与模型定价设置** → **模型倍率设置**).
Add the **prefixed** key to two JSON textareas, preserving existing entries via
`evaluate_script` (read → `JSON.parse` → add key → native-setter → input event):
- **模型倍率** (model ratio): `"openai/<model>": <model_ratio>`
- **模型补全倍率** (completion ratio, custom-models-only): `"openai/<model>": <completion_ratio>`

Click **保存模型倍率设置**. Reload and re-read the textareas to confirm both
keys persisted (the success toast is easy to miss).

### Step 3 — StartClaw admin
`navigate_page` → `https://<startclaw-host>/admin/settings/openclaw`, **VPS** tab,
**AI API Gateway** section:
- **Allowed Models**: empty = allow all (new model already permitted). Only edit
  to restrict (e.g. `minimax-m2.7,<model>`).
- **Default Model**: bare id. To make new Managed-AI bots default to it, set
  `<model>`; otherwise leave as-is. Click **Save**.
- Existing bots are unaffected by these — to switch one, edit that bot's model
  and **Redeploy**.

### Step 4 — Verify end-to-end
new-api **Playground** (`/console/playground`): set the model combobox to
`openai/<model>` (type it; press Enter to accept the custom value), send a
prompt, confirm a response with **no 401 / AuthenticationError**. Stop the
stream to save credits.

## Gotchas (learned the hard way)
- `fill` **appends** to inputs/textareas that already have a value (the model
  redirect key field defaults to `field_1`). For JSON fields, use
  `evaluate_script` with the native value setter + `input` event (React-safe).
- A bare model name like `kimi-k2.6` with **no** `/` would get the `openai/`
  prefix from the platform; a name **with** a `/` is sent as-is. Always make the
  new-api side accept whatever the bot actually sends (`openai/<model>`).
- Completion ratio is **mandatory for custom model names** — omitting it bills
  output at the input rate.
- Don't touch the channel's key/Base URL or other models — only add.
