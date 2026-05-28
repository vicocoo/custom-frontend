import { useState, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { LmFrame } from '@/components/lm/frame'
import { LmTag, type LmTagVariant } from '@/components/lm/tag'
import { LmTerminal } from '@/components/lm/terminal'
import { useStreamLines, type StreamLine } from '@/components/lm/use-stream-lines'
import { useStarfield } from '@/components/lm/use-starfield'

/* ───────── HERO ───────── */

const terminalDemoLines: StreamLine[] = [
  { parts: [{ text: '$ ', cls: 'lm-term-prompt' }, { text: 'curl ', cls: 'lm-term-fn' }, { text: 'https://api.qnous.ai/v1/chat/completions \\', cls: 'lm-term-string' }] },
  { parts: [{ text: '   -H ' }, { text: '"Authorization: Bearer sk-qn-', cls: 'lm-term-string' }, { text: '0xA1F3...REDACTED', cls: 'lm-term-key' }, { text: '" \\', cls: 'lm-term-string' }] },
  { parts: [{ text: '   -d ' }, { text: '\'{"model":"claude-opus-4.1","stream":true,"messages":[...]}\'', cls: 'lm-term-string' }] },
  { html: '<span class="lm-term-line"><span class="lm-term-comment">// 路由命中: tier-1.us-west · 镜像 03 · TTFB 184ms</span></span>' },
  { parts: [{ text: 'data: ', cls: 'lm-term-comment' }, { text: '{"choices":[{"delta":{"content":"', cls: 'lm-term-out' }, { text: '你好', cls: 'lm-term-string' }, { text: '"}}]}', cls: 'lm-term-out' }] },
  { parts: [{ text: 'data: ', cls: 'lm-term-comment' }, { text: '{"choices":[{"delta":{"content":"', cls: 'lm-term-out' }, { text: '我是部署在 QuantumNous', cls: 'lm-term-string' }, { text: '"}}]}', cls: 'lm-term-out' }] },
  { parts: [{ text: 'data: ', cls: 'lm-term-comment' }, { text: '{"choices":[{"delta":{"content":"', cls: 'lm-term-out' }, { text: ' 网关上的 Claude Opus 4.1', cls: 'lm-term-string' }, { text: '"}}]}', cls: 'lm-term-out' }] },
  { parts: [{ text: 'data: ', cls: 'lm-term-comment' }, { text: '{"choices":[{"delta":{"content":"', cls: 'lm-term-out' }, { text: '，可以帮你调用 200+ 模型 ✦', cls: 'lm-term-string' }, { text: '"}}]}', cls: 'lm-term-out' }] },
  { parts: [{ text: 'data: ', cls: 'lm-term-comment' }, { text: '[DONE]', cls: 'lm-term-kw' }] },
  { html: '<span class="lm-term-line"><span class="lm-term-comment">// 用量结算 ── 输入 28 token · 输出 47 token · ¥0.005184</span></span>' },
]

function HeroTerminal() {
  const ref = useRef<HTMLDivElement>(null)
  useStreamLines(ref, terminalDemoLines, { charDelay: 12, lineDelay: 180, loop: true })
  return (
    <LmTerminal
      title={<>~/quantum <b>// curl</b></>}
      meta="PID 0xA1F3 · TTY pts/7"
    >
      <div ref={ref} style={{ minHeight: 220 }} aria-live="polite" />
    </LmTerminal>
  )
}

export function HeroSection({ isAuthenticated }: { isAuthenticated: boolean }) {
  const starfieldRef = useRef<HTMLDivElement>(null)
  useStarfield(starfieldRef)

  return (
    <section className="lm-section lm-hero-section" style={{ paddingTop: 80, paddingBottom: 120, minHeight: '100vh', display: 'flex', alignItems: 'center', position: 'relative' }}>
      {/* Starry sky background */}
      <div ref={starfieldRef} className="lm-hero-particles" />

      <div className="lm-container">
        <div className="lm-grid" style={{ gridTemplateColumns: '1.05fr 1fr', gap: 40, alignItems: 'start' }}>
          {/* Left: copy */}
          <div>
            <div className="lm-row lm-wrap" style={{ gap: 8, marginBottom: 18 }}>
              <LmTag variant="accent">// SYS:ONLINE</LmTag>
              <LmTag>REGION 7</LmTag>
              <LmTag>UPTIME 99.987%</LmTag>
            </div>

            <h1 style={{ fontSize: 'clamp(34px, 5.6vw, 68px)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.025em', marginBottom: 18 }}>
              一个口令<br />
              <span className="lm-text-accent">整片星河</span>
              <span className="lm-cursor" style={{ verticalAlign: 0, height: '0.78em' }} />
            </h1>

            <p style={{ fontSize: 15, color: 'var(--lm-fg-soft)', maxWidth: '52ch', marginBottom: 8, lineHeight: 1.7 }}>
              <span className="lm-text-accent" style={{ fontFamily: 'var(--font-mono)' }}>QuantumNous</span> 是一台跑在你 Prompt 之上的统一推理网关 ——
              <b style={{ color: 'var(--foreground)' }}>200+ 主流大模型</b>，
              <b style={{ color: 'var(--foreground)' }}>单一 OpenAI 兼容端点</b>，
              <b style={{ color: 'var(--foreground)' }}>毫秒级智能路由</b>。
            </p>
            <p className="lm-text-muted" style={{ fontSize: 13, marginBottom: 28 }}>
              <span style={{ fontFamily: 'var(--font-mono)' }}>// 把账号、密钥、限流、计费、降级、重试都交给我们 — 你只管写 prompt。</span>
            </p>

            <div className="lm-row lm-wrap" style={{ gap: 10, marginBottom: 28 }}>
              <Link to={isAuthenticated ? '/dashboard' : '/sign-up'} className="lm-btn lm-btn-primary lm-btn-lg">
                <span style={{ fontFamily: 'var(--font-mono)' }}>$</span> 立即开始使用
              </Link>
              <Link to="/" className="lm-btn lm-btn-lg">
                查看接入文档 <span className="lm-text-muted">→</span>
              </Link>
            </div>

            {/* Mini stat strip */}
            <div className="lm-row lm-wrap" style={{ gap: 24 }}>
              <div>
                <div className="lm-stat-label" style={{ marginBottom: 4 }}>主流模型</div>
                <div className="lm-tnum" style={{ fontSize: 16, fontWeight: 600, color: 'var(--lm-fg-soft)' }}>Mainstream</div>
              </div>
              <div style={{ borderLeft: '1px solid var(--border)', height: 36 }} />
              <div>
                <div className="lm-stat-label" style={{ marginBottom: 4 }}>标准接口</div>
                <div className="lm-tnum" style={{ fontSize: 16, fontWeight: 600, color: 'var(--lm-fg-soft)' }}>Standard</div>
              </div>
              <div style={{ borderLeft: '1px solid var(--border)', height: 36 }} />
              <div>
                <div className="lm-stat-label" style={{ marginBottom: 4 }}>透明计费</div>
                <div className="lm-tnum" style={{ fontSize: 16, fontWeight: 600, color: 'var(--lm-fg-soft)' }}>Transparent</div>
              </div>
            </div>
          </div>

          {/* Right: terminal */}
          <div>
            <div style={{ position: 'relative' }}>
              <div className="lm-scanline-overlay" aria-hidden="true" />
              <HeroTerminal />
            </div>
            <div className="lm-row" style={{ marginTop: 14, gap: 10, fontSize: 11, color: 'var(--muted-foreground)' }}>
              <span className="lm-text-accent">┌─</span>
              <span>实时演示流式响应 · 数据来自演示沙箱</span>
              <span className="lm-text-accent">─┐</span>
            </div>
          </div>
        </div>
      </div>

      {/* Responsive override */}
      <style>{`
        @media (max-width: 1024px) {
          .lm-hero-section .lm-grid[style*="1.05fr"] { grid-template-columns: 1fr !important; gap: 28px !important; }
        }
        @media (max-width: 720px) {
          .lm-hero-section .lm-terminal .lm-terminal-body { font-size: 11.5px !important; padding: 14px 14px 18px !important; }
          .lm-hero-section .lm-terminal .term-meta { display: none !important; }
        }
      `}</style>
    </section>
  )
}

/* ───────── CAPABILITY MATRIX ───────── */
const capabilities = [
  {
    eyebrow: '01 · CHAT',
    title: '对话补全',
    desc: 'GPT-5、Claude Opus 4、DeepSeek V3、通义千问 Max 等 92 款对话模型，支持 system / tools / json schema。',
    tags: [
      { label: 'streaming', variant: 'accent' as const },
      { label: 'function call', variant: 'default' as const },
      { label: 'vision', variant: 'default' as const },
    ],
  },
  {
    eyebrow: '02 · VISION',
    title: '图像生成 / 编辑',
    desc: 'Flux Pro、SD 3.5、即梦、Midjourney Relay。文生图 / 图生图 / 局部重绘 / 高清放大全套接口。',
    tags: [
      { label: 'img2img', variant: 'amber' as const },
      { label: 'controlnet', variant: 'default' as const },
      { label: 'upscale', variant: 'default' as const },
    ],
  },
  {
    eyebrow: '03 · AUDIO',
    title: '语音合成 / 识别',
    desc: 'ElevenLabs、Whisper-V3、Suno V4、火山引擎语音。实时 ASR、克隆音色、歌曲生成一站完成。',
    tags: [
      { label: 'tts', variant: 'cyan' as const },
      { label: 'asr', variant: 'default' as const },
      { label: 'music', variant: 'default' as const },
    ],
  },
  {
    eyebrow: '04 · EMBED',
    title: '向量 & 重排',
    desc: 'text-embedding-3、bge-m3、Cohere Rerank。RAG 全流程兼容，支持批量与多模态向量。',
    tags: [
      { label: 'embed', variant: 'magenta' as const },
      { label: 'rerank', variant: 'default' as const },
      { label: 'multimodal', variant: 'default' as const },
    ],
  },
]

export function CapabilityMatrix() {
  return (
    <section className="lm-section" style={{ paddingTop: 56 }}>
      <div className="lm-container">
        <div>
          <div className="lm-section-eyebrow">CAPABILITY · MATRIX</div>
          <h2 className="lm-section-title">所有能力，一条链路</h2>
          <p className="lm-section-sub">语言、视觉、语音、嵌入、工具调用 —— 同一份 API key 全部通吃。</p>
        </div>

        <div className="lm-grid lm-grid-4" style={{ marginTop: 36 }}>
          {capabilities.map((cap) => (
            <LmFrame key={cap.eyebrow} corners>
              <div className="lm-card-eyebrow">{cap.eyebrow}</div>
              <div className="lm-card-title">{cap.title}</div>
              <div className="lm-card-desc">{cap.desc}</div>
              <div className="lm-row lm-wrap" style={{ gap: 6, marginTop: 14 }}>
                {cap.tags.map((t) => (
                  <LmTag key={t.label} variant={t.variant}>{t.label}</LmTag>
                ))}
              </div>
            </LmFrame>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ───────── MODELS PREVIEW ───────── */
const models: Array<{ id: string; name: string; vendor: string; type: string; typeColor: LmTagVariant; ctx: string; input: string; output: string; status: string; statusColor: LmTagVariant }> = [
  { id: '01', name: 'gpt-5-pro', vendor: 'OpenAI', type: 'chat', typeColor: 'accent', ctx: '256K', input: '¥ 18.40', output: '¥ 73.60', status: '● ONLINE', statusColor: 'accent' },
  { id: '02', name: 'claude-opus-4.1', vendor: 'Anthropic', type: 'chat', typeColor: 'accent', ctx: '200K', input: '¥ 21.60', output: '¥108.00', status: '● ONLINE', statusColor: 'accent' },
  { id: '03', name: 'gemini-2.5-pro', vendor: 'Google', type: 'chat', typeColor: 'accent', ctx: '2M', input: '¥ 9.00', output: '¥ 36.00', status: '● ONLINE', statusColor: 'accent' },
  { id: '04', name: 'deepseek-v3.2', vendor: 'DeepSeek', type: 'chat', typeColor: 'accent', ctx: '128K', input: '¥ 0.50', output: '¥ 1.20', status: '● ONLINE', statusColor: 'accent' },
  { id: '05', name: 'qwen3-max-2509', vendor: '阿里通义', type: 'chat', typeColor: 'accent', ctx: '131K', input: '¥ 2.40', output: '¥ 9.60', status: '● ONLINE', statusColor: 'accent' },
  { id: '06', name: 'flux-pro-1.1-ultra', vendor: 'BFL', type: 'image', typeColor: 'amber', ctx: '—', input: '¥ 0.42 / 张', output: '', status: '● BUSY', statusColor: 'amber' },
  { id: '07', name: 'suno-v4.5', vendor: 'Suno', type: 'audio', typeColor: 'cyan', ctx: '—', input: '¥ 0.18 / 秒', output: '', status: '● ONLINE', statusColor: 'accent' },
  { id: '08', name: 'text-embedding-3-large', vendor: 'OpenAI', type: 'embed', typeColor: 'magenta', ctx: '8K', input: '¥ 0.94', output: '—', status: '● ONLINE', statusColor: 'accent' },
]

export function ModelsPreview() {
  return (
    <section className="lm-section" style={{ paddingTop: 24 }}>
      <div className="lm-container">
        <div className="lm-between" style={{ marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div className="lm-section-eyebrow">MODELS · LIVE</div>
            <h2 className="lm-section-title">
              模型矩阵 <span className="lm-text-muted" style={{ fontSize: 14, fontWeight: 500, fontFamily: 'var(--font-mono)' }}>// 实时计价</span>
            </h2>
          </div>
          <Link to="/pricing" className="lm-btn">前往模型广场 →</Link>
        </div>

        <div className="lm-table-wrap">
          <table className="lm-table">
            <thead>
              <tr>
                <th style={{ width: 44 }}>#</th>
                <th>模型 ID</th>
                <th>厂商</th>
                <th>类型</th>
                <th>上下文</th>
                <th className="num">输入 / 1M</th>
                <th className="num">输出 / 1M</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => (
                <tr key={m.id}>
                  <td className="lm-text-muted">{m.id}</td>
                  <td><b>{m.name}</b></td>
                  <td>{m.vendor}</td>
                  <td><LmTag variant={m.typeColor}>{m.type}</LmTag></td>
                  <td className="lm-tnum">{m.ctx}</td>
                  {m.output === '' ? (
                    <td className="num" colSpan={2} style={{ textAlign: 'right' }}>{m.input}</td>
                  ) : (
                    <>
                      <td className="num">{m.input}</td>
                      <td className="num">{m.output === '—' ? <span className="lm-text-muted">—</span> : m.output}</td>
                    </>
                  )}
                  <td><LmTag variant={m.statusColor}>{m.status}</LmTag></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

/* ───────── QUICKSTART CODE ───────── */
const codeTabs = [
  { id: 'curl', label: 'cURL' },
  { id: 'py', label: 'Python' },
  { id: 'ts', label: 'TypeScript' },
  { id: 'cn', label: '国内 SDK' },
]

const codeSnippets: Record<string, React.ReactNode> = {
  curl: (
    <pre style={{ margin: 0, padding: '18px 22px', fontSize: '12.5px', lineHeight: 1.7, color: 'var(--lm-fg-soft)', whiteSpace: 'pre', overflowX: 'auto' }}>
      <span className="lm-term-comment"># 1. 用你最熟的 OpenAI 协议直接打过去</span>{'\n'}
      <span className="lm-term-prompt" /><span className="lm-term-fn">curl</span>{' https://api.qnous.ai/v1/chat/completions \\\n'}
      {'  -H '}<span className="lm-term-string">"Authorization: Bearer sk-qn-***************"</span>{' \\\n'}
      {'  -H '}<span className="lm-term-string">"Content-Type: application/json"</span>{' \\\n'}
      {'  -d '}<span className="lm-term-string">{'\'{\n    "model": "claude-opus-4.1",\n    "messages": [{"role":"user","content":"你好，自我介绍一下"}],\n    "stream": true\n  }\''}</span>
    </pre>
  ),
  py: (
    <pre style={{ margin: 0, padding: '18px 22px', fontSize: '12.5px', lineHeight: 1.7, color: 'var(--lm-fg-soft)', whiteSpace: 'pre', overflowX: 'auto' }}>
      <span className="lm-term-kw">from</span>{' openai '}<span className="lm-term-kw">import</span>{' OpenAI\n\n'}
      {'client = '}<span className="lm-term-fn">OpenAI</span>{'(\n'}
      {'    api_key='}<span className="lm-term-string">"sk-qn-***************"</span>{',\n'}
      {'    base_url='}<span className="lm-term-string">"https://api.qnous.ai/v1"</span>{',\n)\n\n'}
      {'stream = client.chat.completions.'}<span className="lm-term-fn">create</span>{'(\n'}
      {'    model='}<span className="lm-term-string">"deepseek-v3.2"</span>{',\n'}
      {'    messages=[{'}<span className="lm-term-string">"role"</span>{': '}<span className="lm-term-string">"user"</span>{', '}<span className="lm-term-string">"content"</span>{': '}<span className="lm-term-string">"写一首赛博朋克的俳句"</span>{'}],\n'}
      {'    stream='}<span className="lm-term-num">True</span>{',\n)\n'}
      <span className="lm-term-kw">for</span>{' chunk '}<span className="lm-term-kw">in</span>{' stream:\n'}
      {'    '}<span className="lm-term-fn">print</span>{'(chunk.choices['}<span className="lm-term-num">0</span>{'].delta.content '}<span className="lm-term-kw">or</span>{' '}<span className="lm-term-string">""</span>{', end='}<span className="lm-term-string">""</span>{')'}
    </pre>
  ),
  ts: (
    <pre style={{ margin: 0, padding: '18px 22px', fontSize: '12.5px', lineHeight: 1.7, color: 'var(--lm-fg-soft)', whiteSpace: 'pre', overflowX: 'auto' }}>
      <span className="lm-term-kw">import</span>{' OpenAI '}<span className="lm-term-kw">from</span>{' '}<span className="lm-term-string">"openai"</span>{';\n\n'}
      <span className="lm-term-kw">const</span>{' qn = '}<span className="lm-term-kw">new</span>{' '}<span className="lm-term-fn">OpenAI</span>{'({\n'}
      {'  apiKey: process.env.'}<span className="lm-term-key">QN_KEY</span>{',\n'}
      {'  baseURL: '}<span className="lm-term-string">"https://api.qnous.ai/v1"</span>{',\n});\n\n'}
      <span className="lm-term-kw">const</span>{' r = '}<span className="lm-term-kw">await</span>{' qn.chat.completions.'}<span className="lm-term-fn">create</span>{'({\n'}
      {'  model: '}<span className="lm-term-string">"gpt-5-pro"</span>{',\n'}
      {'  messages: [{ role: '}<span className="lm-term-string">"user"</span>{', content: '}<span className="lm-term-string">"hello, world"</span>{' }],\n});\n'}
      <span className="lm-term-fn">console</span>{'.log(r.choices['}<span className="lm-term-num">0</span>{'].message.content);'}
    </pre>
  ),
  cn: (
    <pre style={{ margin: 0, padding: '18px 22px', fontSize: '12.5px', lineHeight: 1.7, color: 'var(--lm-fg-soft)', whiteSpace: 'pre', overflowX: 'auto' }}>
      <span className="lm-term-comment"># 兼容 Claude / Gemini / 通义 / 智谱 / 文心 原生 SDK</span>{'\n'}
      <span className="lm-term-prompt" /><span className="lm-term-fn">pip</span>{' install qnous-sdk\n\n'}
      <span className="lm-term-kw">from</span>{' qnous '}<span className="lm-term-kw">import</span>{' Qnous\n'}
      {'qn = '}<span className="lm-term-fn">Qnous</span>{'(api_key='}<span className="lm-term-string">"sk-qn-..."</span>{')\n\n'}
      <span className="lm-term-comment"># 用 Claude 原生 messages 协议</span>{'\n'}
      {'qn.claude.messages.'}<span className="lm-term-fn">create</span>{'(model='}<span className="lm-term-string">"claude-opus-4.1"</span>{', ...)\n'}
      <span className="lm-term-comment"># 用 Gemini 原生 generateContent 协议</span>{'\n'}
      {'qn.gemini.generate_content(model='}<span className="lm-term-string">"gemini-2.5-pro"</span>{', ...)'}
    </pre>
  ),
}

export function QuickstartCode() {
  const [activeTab, setActiveTab] = useState('curl')

  return (
    <section className="lm-section">
      <div className="lm-container">
        <div>
          <div className="lm-section-eyebrow">QUICKSTART · 30 SECONDS</div>
          <h2 className="lm-section-title">三行代码，开始飞行</h2>
        </div>

        <LmFrame corners className="!p-0 overflow-hidden" style={{ marginTop: 24, padding: 0 }}>
          <div className="lm-row" style={{ borderBottom: '1px solid var(--border)', padding: '0 12px', gap: 0 }}>
            {codeTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '12px 16px',
                  fontSize: 12,
                  color: activeTab === tab.id ? 'var(--lm-accent)' : 'var(--muted-foreground)',
                  borderBottom: `2px solid ${activeTab === tab.id ? 'var(--lm-accent)' : 'transparent'}`,
                  letterSpacing: '0.04em',
                  background: 'none',
                  border: 'none',
                  borderBottomStyle: 'solid',
                  borderBottomWidth: 2,
                  borderBottomColor: activeTab === tab.id ? 'var(--lm-accent)' : 'transparent',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {tab.label}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <span className="lm-text-muted" style={{ padding: '10px 12px', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
              // base_url: https://api.qnous.ai/v1
            </span>
          </div>
          {codeSnippets[activeTab]}
        </LmFrame>
      </div>
    </section>
  )
}

/* ───────── WHY SECTION ───────── */
export function WhySection() {
  return (
    <section className="lm-section" style={{ paddingTop: 24 }}>
      <div className="lm-container">
        <div className="lm-grid lm-grid-3">
          <div className="lm-card">
            <div className="lm-card-eyebrow">RELIABILITY</div>
            <div className="lm-card-title">三层降级 · 永不掉线</div>
            <div className="lm-card-desc">单家上游故障自动切换镜像通道；Anthropic 国内访问、OpenAI 区域限流，对你的代码完全透明。</div>
            <pre className="lm-ascii-box" style={{ marginTop: 14, fontSize: 11, color: 'var(--lm-border-strong)' }}>
{`┌──┐  ┌──┐  ┌──┐
│A1│→ │A2│→ │A3│
└──┘  └──┘  └──┘`}
            </pre>
          </div>
          <div className="lm-card">
            <div className="lm-card-eyebrow">BILLING</div>
            <div className="lm-card-title">毫厘必争 · 实时核账</div>
            <div className="lm-card-desc">按 token 计费，精确到 6 位小数；每次调用都能查询原始上游价目；月底无意外账单。</div>
            <div className="lm-row lm-wrap" style={{ marginTop: 14, gap: 6 }}>
              <LmTag>¥ 0.000018 / token</LmTag>
            </div>
          </div>
          <div className="lm-card">
            <div className="lm-card-eyebrow">DEVELOPER</div>
            <div className="lm-card-title">为开发者而生</div>
            <div className="lm-card-desc">Playground、用量日志、Webhook、组级配额、密钥分组、IP 白名单 —— 你需要的运维抓手都在控制台里。</div>
            <div className="lm-row lm-wrap" style={{ marginTop: 14, gap: 6 }}>
              <LmTag>Playground</LmTag>
              <LmTag>Webhook</LmTag>
              <LmTag>RBAC</LmTag>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ───────── CTA SECTION ───────── */
export function CtaSection({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <section className="lm-section" style={{ paddingTop: 32 }}>
      <div className="lm-container">
        <LmFrame corners className="!p-[48px] text-center overflow-hidden" style={{
          padding: 48,
          textAlign: 'center' as const,
          background: 'linear-gradient(135deg, var(--lm-surface) 0%, var(--lm-bg-deep) 100%)',
          position: 'relative' as const,
          overflow: 'hidden',
        }}>
          {/* Subtle diagonal lines */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'repeating-linear-gradient(-45deg, transparent 0 60px, oklch(86% 0.22 128 / 0.025) 60px 61px)',
            pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative' }}>
            <div className="lm-section-eyebrow" style={{ display: 'flex', justifyContent: 'center' }}>READY · TO · DEPLOY</div>
            <h2 className="lm-section-title" style={{ fontSize: 'clamp(28px, 4.4vw, 52px)', marginBottom: 14 }}>
              把第一段 prompt <span className="lm-text-accent">交给我们</span>
            </h2>
            <p className="lm-text-muted" style={{ margin: '0 auto 28px', maxWidth: '48ch' }}>
              注册即送 ¥10 测试额度，无需信用卡，30 秒拿到第一把 sk-qn-* 密钥。
            </p>
            <div className="lm-row" style={{ justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
              <Link to={isAuthenticated ? '/dashboard' : '/sign-up'} className="lm-btn lm-btn-primary lm-btn-lg">$ 立即注册</Link>
              <Link to="/dashboard" className="lm-btn lm-btn-lg">进入控制台</Link>
            </div>
            <div className="lm-text-muted" style={{ marginTop: 18, fontSize: 11, fontFamily: 'var(--font-mono)' }}>
              // 已经有账号？ <Link to="/sign-in" className="lm-text-accent">直接登录 →</Link>
            </div>
          </div>
        </LmFrame>
      </div>
    </section>
  )
}
