import { LmTopbar } from '@/components/lm/topbar'
import { LmFrame } from '@/components/lm/frame'
import { LmTag } from '@/components/lm/tag'
import { LmStat } from '@/components/lm/stat'
import { LmSection } from '@/components/lm/section'
import { LmTerminal } from '@/components/lm/terminal'
import { LmAsciiBox } from '@/components/lm/ascii-box'

function ColorSwatch({ name, value, css }: { name: string; value: string; css: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
      <div style={{ width: 40, height: 40, borderRadius: 'var(--radius)', background: value, border: '1px solid var(--border)' }} />
      <div>
        <div style={{ fontSize: 12, fontWeight: 600 }}>{name}</div>
        <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{css}</div>
      </div>
    </div>
  )
}

export function DesignSystemPreview() {
  return (
    <div className="lm-shell">
      <LmTopbar />

      <div className="lm-container" style={{ paddingTop: 32, paddingBottom: 80 }}>
        <div className="lm-section-eyebrow">DESIGN SYSTEM</div>
        <h1 className="lm-section-title" style={{ marginBottom: 8 }}>Lo-Fi Mecha 设计系统预览</h1>
        <p className="lm-section-sub" style={{ marginBottom: 48 }}>
          用于开发环境验证组件复用效果和样式还原质量。
        </p>

        {/* ─── COLORS ─── */}
        <LmSection eyebrow="01 · COLORS" title="色彩系统">
          <div className="lm-grid lm-grid-3" style={{ marginTop: 24 }}>
            <div>
              <h4 style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted-foreground)', marginBottom: 12 }}>SURFACES</h4>
              <ColorSwatch name="Background" value="oklch(15% 0.01 130)" css="--background" />
              <ColorSwatch name="BG Deep" value="oklch(11% 0.008 130)" css="--lm-bg-deep" />
              <ColorSwatch name="Surface" value="oklch(19% 0.012 130)" css="--lm-surface / --card" />
              <ColorSwatch name="Surface 2" value="oklch(24% 0.015 130)" css="--lm-surface-2" />
              <ColorSwatch name="Surface 3" value="oklch(29% 0.018 130)" css="--lm-surface-3" />
            </div>
            <div>
              <h4 style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted-foreground)', marginBottom: 12 }}>TEXT</h4>
              <ColorSwatch name="Foreground" value="oklch(94% 0.015 110)" css="--foreground" />
              <ColorSwatch name="FG Soft" value="oklch(78% 0.012 110)" css="--lm-fg-soft" />
              <ColorSwatch name="Muted" value="oklch(58% 0.018 110)" css="--muted-foreground" />
              <ColorSwatch name="Muted 2" value="oklch(45% 0.015 110)" css="--lm-muted-2" />
            </div>
            <div>
              <h4 style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted-foreground)', marginBottom: 12 }}>SEMANTIC</h4>
              <ColorSwatch name="Accent (Lime)" value="oklch(86% 0.22 128)" css="--lm-accent / --primary" />
              <ColorSwatch name="Amber" value="oklch(80% 0.16 80)" css="--lm-amber" />
              <ColorSwatch name="Rose" value="oklch(72% 0.20 18)" css="--lm-rose" />
              <ColorSwatch name="Cyan" value="oklch(80% 0.13 200)" css="--lm-cyan" />
              <ColorSwatch name="Magenta" value="oklch(72% 0.18 330)" css="--lm-magenta" />
            </div>
          </div>
        </LmSection>

        {/* ─── TYPOGRAPHY ─── */}
        <LmSection eyebrow="02 · TYPOGRAPHY" title="字体排版">
          <div style={{ marginTop: 24 }}>
            <p style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 16 }}>
              Primary: JetBrains Mono · Weights: 300–800
            </p>
            {[
              { size: 44, weight: 800, label: 'Hero H1' },
              { size: 38, weight: 700, label: 'Section Title' },
              { size: 24, weight: 700, label: 'Page Title' },
              { size: 15, weight: 600, label: 'Card Title' },
              { size: 14, weight: 400, label: 'Body Text' },
              { size: 12.5, weight: 400, label: 'Table / Small' },
              { size: 11, weight: 500, label: 'Label / Eyebrow' },
            ].map((t) => (
              <div key={t.label} style={{ marginBottom: 12, display: 'flex', alignItems: 'baseline', gap: 16 }}>
                <span style={{ fontSize: t.size, fontWeight: t.weight, lineHeight: 1.2 }}>
                  Aa 量子之巢
                </span>
                <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                  {t.size}px / {t.weight} — {t.label}
                </span>
              </div>
            ))}
          </div>
        </LmSection>

        {/* ─── BUTTONS ─── */}
        <LmSection eyebrow="03 · BUTTONS" title="按钮组件">
          <div className="lm-row lm-wrap" style={{ gap: 12, marginTop: 24 }}>
            <button className="lm-btn lm-btn-primary lm-btn-lg" type="button">Primary LG</button>
            <button className="lm-btn lm-btn-primary" type="button">Primary</button>
            <button className="lm-btn" type="button">Default</button>
            <button className="lm-btn lm-btn-ghost" type="button">Ghost</button>
            <button className="lm-btn lm-btn-lg" type="button">Default LG</button>
          </div>
        </LmSection>

        {/* ─── TAGS ─── */}
        <LmSection eyebrow="04 · TAGS" title="标签组件">
          <div className="lm-row lm-wrap" style={{ gap: 8, marginTop: 24 }}>
            <LmTag>DEFAULT</LmTag>
            <LmTag variant="accent">ACCENT</LmTag>
            <LmTag variant="amber">AMBER</LmTag>
            <LmTag variant="cyan">CYAN</LmTag>
            <LmTag variant="rose">ROSE</LmTag>
            <LmTag variant="magenta">MAGENTA</LmTag>
            <LmTag variant="solid">SOLID</LmTag>
          </div>
        </LmSection>

        {/* ─── CARDS & FRAMES ─── */}
        <LmSection eyebrow="05 · CARDS" title="卡片与框架">
          <div className="lm-grid lm-grid-3" style={{ marginTop: 24 }}>
            <div className="lm-card">
              <div className="lm-card-eyebrow">CARD</div>
              <div className="lm-card-title">标准卡片</div>
              <div className="lm-card-desc">带有边框和悬停效果的基础卡片组件。</div>
            </div>
            <LmFrame corners>
              <div className="lm-card-eyebrow">FRAME</div>
              <div className="lm-card-title">ASCII 框架</div>
              <div className="lm-card-desc">带有 ┌┐└┘ 角标的装饰性框架。</div>
            </LmFrame>
            <LmStat label="API CALLS" value="48.7" unit="M" delta="↑ 12.3% vs 7d" variant="accent" />
          </div>
          <div className="lm-grid lm-grid-4" style={{ marginTop: 16 }}>
            <LmStat label="TOKEN INPUT" value="2.1" unit="B" variant="cyan" />
            <LmStat label="P95 LATENCY" value="312" unit="ms" variant="amber" />
            <LmStat label="ERROR RATE" value="0.02" unit="%" delta="↓ 0.01%" deltaDown variant="rose" />
            <LmStat label="MODELS" value="237" unit="+" variant="accent" />
          </div>
        </LmSection>

        {/* ─── FORMS ─── */}
        <LmSection eyebrow="06 · FORMS" title="表单组件">
          <div style={{ maxWidth: 480, marginTop: 24 }}>
            <div className="lm-field">
              <label>USERNAME <span className="req">*</span></label>
              <div className="lm-input-group">
                <span className="prefix">user@</span>
                <input className="lm-input" type="text" placeholder="your_handle" />
              </div>
            </div>
            <div className="lm-field">
              <label>PASSWORD <span className="req">*</span></label>
              <div className="lm-input-group">
                <input className="lm-input" type="password" placeholder="••••••••" />
                <span className="suffix">SHOW</span>
              </div>
            </div>
            <div className="lm-field">
              <label>EMAIL</label>
              <input className="lm-input" type="email" placeholder="dev@example.com" />
            </div>
            <div className="lm-field">
              <label>BIO</label>
              <textarea className="lm-textarea" placeholder="Tell us about yourself..." />
            </div>
            <label className="lm-checkbox">
              <input type="checkbox" defaultChecked />
              保持登录 30 天
            </label>

            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 8 }}>PASSWORD STRENGTH</div>
              <div className="lm-strength s1"><i /><i /><i /><i /></div>
              <div className="lm-strength s2" style={{ marginTop: 6 }}><i /><i /><i /><i /></div>
              <div className="lm-strength s3" style={{ marginTop: 6 }}><i /><i /><i /><i /></div>
              <div className="lm-strength s4" style={{ marginTop: 6 }}><i /><i /><i /><i /></div>
            </div>
          </div>
        </LmSection>

        {/* ─── TERMINAL ─── */}
        <LmSection eyebrow="07 · TERMINAL" title="终端 / 代码块">
          <div style={{ marginTop: 24 }}>
            <LmTerminal
              title={<>~/project <b>// bash</b></>}
              meta="PID 0x4F2A"
            >
              <span className="lm-term-line">
                <span className="lm-term-prompt" />
                <span className="lm-term-fn">curl</span> -s https://api.qnous.ai/v1/models | <span className="lm-term-fn">jq</span> <span className="lm-term-string">'.data[0]'</span>
              </span>{'\n'}
              <span className="lm-term-line">
                <span className="lm-term-comment">// Response:</span>
              </span>{'\n'}
              <span className="lm-term-line">{'{'}</span>{'\n'}
              <span className="lm-term-line">  <span className="lm-term-key">"id"</span>: <span className="lm-term-string">"gpt-5-pro"</span>,</span>{'\n'}
              <span className="lm-term-line">  <span className="lm-term-key">"object"</span>: <span className="lm-term-string">"model"</span>,</span>{'\n'}
              <span className="lm-term-line">  <span className="lm-term-key">"owned_by"</span>: <span className="lm-term-string">"openai"</span>,</span>{'\n'}
              <span className="lm-term-line">  <span className="lm-term-key">"tokens"</span>: <span className="lm-term-num">256000</span></span>{'\n'}
              <span className="lm-term-line">{'}'}</span>
              <span className="lm-cursor" />
            </LmTerminal>
          </div>
        </LmSection>

        {/* ─── TABLE ─── */}
        <LmSection eyebrow="08 · TABLES" title="数据表格">
          <div className="lm-table-wrap" style={{ marginTop: 24 }}>
            <table className="lm-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>模型 ID</th>
                  <th>厂商</th>
                  <th>类型</th>
                  <th className="num">价格</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="lm-text-muted">01</td>
                  <td><b>gpt-5-pro</b></td>
                  <td>OpenAI</td>
                  <td><LmTag variant="accent">chat</LmTag></td>
                  <td className="num">¥ 18.40</td>
                  <td><LmTag variant="accent">● ONLINE</LmTag></td>
                </tr>
                <tr>
                  <td className="lm-text-muted">02</td>
                  <td><b>flux-pro-1.1</b></td>
                  <td>BFL</td>
                  <td><LmTag variant="amber">image</LmTag></td>
                  <td className="num">¥ 0.42</td>
                  <td><LmTag variant="amber">● BUSY</LmTag></td>
                </tr>
                <tr>
                  <td className="lm-text-muted">03</td>
                  <td><b>whisper-v3</b></td>
                  <td>OpenAI</td>
                  <td><LmTag variant="cyan">audio</LmTag></td>
                  <td className="num">¥ 0.08</td>
                  <td><LmTag variant="accent">● ONLINE</LmTag></td>
                </tr>
              </tbody>
            </table>
          </div>
        </LmSection>

        {/* ─── GRID ─── */}
        <LmSection eyebrow="09 · GRIDS" title="栅格布局">
          <div style={{ marginTop: 24 }}>
            <p className="lm-text-muted" style={{ fontSize: 12, marginBottom: 12 }}>4 Columns (→ 2 at 1024px → 1 at 640px)</p>
            <div className="lm-grid lm-grid-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="lm-card" style={{ textAlign: 'center' }}>Col {i}</div>
              ))}
            </div>
            <p className="lm-text-muted" style={{ fontSize: 12, marginTop: 16, marginBottom: 12 }}>3 Columns</p>
            <div className="lm-grid lm-grid-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="lm-card" style={{ textAlign: 'center' }}>Col {i}</div>
              ))}
            </div>
          </div>
        </LmSection>

        {/* ─── ASCII ─── */}
        <LmSection eyebrow="10 · ASCII" title="ASCII 装饰">
          <div className="lm-row lm-wrap" style={{ gap: 24, marginTop: 24 }}>
            <div>
              <LmAsciiBox>
{`┌─────────────────┐
│  QUANTUM  NOUS  │
│  ───────────     │
│  SYSTEM ONLINE  │
└─────────────────┘`}
              </LmAsciiBox>
            </div>
            <div>
              <div style={{ marginBottom: 8 }}>
                <span className="lm-kbd">Ctrl</span> + <span className="lm-kbd">K</span> — Command palette
              </div>
              <div>
                <span className="lm-kbd">Esc</span> — Close
              </div>
            </div>
          </div>
          <div className="lm-divider-x" style={{ marginTop: 24 }} />
          <div className="lm-hazard-stripe" style={{ marginTop: 24 }} />
        </LmSection>
      </div>
    </div>
  )
}
