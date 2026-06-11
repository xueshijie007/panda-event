import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { api } from './api/client';
import { ChartPanel } from './components/ChartPanel';
import { HistoryOrdersTable } from './components/HistoryOrdersTable';
import { OpenOrdersTable } from './components/OpenOrdersTable';
import { OrderPanel } from './components/OrderPanel';
import { StatsPanel } from './components/StatsPanel';
import { translations, type Language } from './i18n';
import type { ChartInterval, ContractInterval, ContractOrder, ContractStats, Kline, OpenContractPayload, RegisterPayload, ReviewStatus, SymbolName, Ticker, User } from './types';
import { formatMoney } from './utils';
import './styles.css';

type PageKey = 'home' | 'fund' | 'rebate' | 'weekly' | 'teaching' | 'simulator' | 'login' | 'register' | 'admin' | 'records' | 'feedback';

const APP_VERSION = '2026.06.09-r3';

interface NavPage {
  key: PageKey;
  path: string;
  label: string;
  shortLabel?: string;
}

const navPages: NavPage[] = [
  { key: 'home', path: '/', label: '首页' },
  { key: 'login', path: '/login', label: '登录' },
  { key: 'register', path: '/register', label: '注册' },
  { key: 'admin', path: '/admin', label: '管理后台', shortLabel: '后台' },
  { key: 'rebate', path: '/rebate', label: '返佣链接' },
  { key: 'simulator', path: '/simulator', label: '事件模拟盘', shortLabel: '模拟盘' },
  { key: 'teaching', path: '/teaching', label: '事件合约教学', shortLabel: '教学' },
  { key: 'fund', path: '/fund', label: '熊猫基金' },
  { key: 'weekly', path: '/weekly', label: '每周活动' },
  { key: 'records', path: '/records', label: '直播战绩' },
  { key: 'feedback', path: '/feedback', label: '意见反馈' },
];

const pageByPath = new Map(navPages.map(page => [page.path, page]));

const featureCards = [
  { badge: '01', title: '注册熊猫社区账户', text: '填写账户、密码、微信/QQ 和交易所 UID，建立活动与返佣识别身份。', target: 'register' as PageKey },
  { badge: '02', title: '领取交易所返佣', text: 'WEEX、Gate、Deepcoin、TurboFlow 注册链接、邀请码和返佣比例集中展示。', target: 'rebate' as PageKey },
  { badge: '03', title: '进入事件模拟盘', text: '用 10,000 虚拟 USDT 练习 BTC/ETH 事件合约，先练规则再实盘。', target: 'simulator' as PageKey },
  { badge: '04', title: '学习做单框架', text: '学习周期、方向、入场条件、仓位控制和复盘模板，降低盲目下单。', target: 'teaching' as PageKey },
];

const secondaryCards = [
  { badge: '活动', title: '熊猫基金', text: '奖池、排名赛、直播 PVP 与每日连胜王。', target: 'fund' as PageKey },
  { badge: '周更', title: '每周活动', text: '本周活动安排、参与条件和奖励说明。', target: 'weekly' as PageKey },
  { badge: '复盘', title: '直播战绩', text: '直播开仓记录、胜率统计和复盘结论。', target: 'records' as PageKey },
  { badge: '反馈', title: '意见反馈', text: '提交 Bug、功能建议或活动建议。', target: 'feedback' as PageKey },
];

const rebatePlatforms = [
  {
    name: 'TurboFlow',
    title: 'TurboFlow 返佣',
    badge: '主推平台',
    summary: '事件总交易量 0.6% · 永续 60%',
    inviteCode: '联系小助理获取',
    rebate: '事件总交易量 0.6% / 永续 60%',
    href: '#',
  },
  {
    name: 'WEEX',
    title: 'WEEX 返佣',
    badge: '事件合约',
    summary: '邀请码bpzr · 返佣比例40%',
    inviteCode: 'bpzr',
    rebate: '40%',
    href: 'https://weasexx.online/zh-CN/register?vipCode=bpzr',
  },
  {
    name: 'Gate',
    title: 'Gate 返佣',
    badge: '主流平台',
    summary: '邀请码待VQCWVFWKAQ · 返佣比例待20%',
    inviteCode: 'VQCWVFWKAQ',
    rebate: '20%',
    href: 'https://www.gatewebsite.net/share/VQCWVFWKAQ',
  },
  {
    name: 'Deepcoin',
    title: 'Deepcoin 返佣',
    badge: '合约平台',
    summary: '邀请码9565847 · 返佣比例40%',
    inviteCode: '9565847',
    rebate: '40%',
    href: 'https://s.xdcjoin.com/9565847',
  },
];

const detailPages: Record<Exclude<PageKey, 'home' | 'simulator' | 'login' | 'register' | 'admin'>, {
  eyebrow: string;
  title: string;
  intro: string;
  stats: string[];
  sections: { title: string; text: string; items: string[] }[];
}> = {
  fund: {
    eyebrow: 'Reward Pool',
    title: '熊猫基金活动中心',
    intro: '集中展示基金活动规则、奖池进度、排名条件和直播对战说明，方便用户快速确认自己该参加哪一类活动。',
    stats: ['总奖池 2000U', '排名赛 / PVP / 连胜王', '周维度更新'],
    sections: [
      { title: '排名赛', text: '按活动周期内的有效交易表现计算排名，页面后续可以接入真实榜单数据。', items: ['展示活动时间', '展示奖池分配', '展示报名入口'] },
      { title: '直播 PVP', text: '用于直播间互动挑战，后续可沉淀对局记录和胜负统计。', items: ['主播开局说明', '用户参与规则', '结果复盘'] },
      { title: '每日连胜王', text: '记录每日连续盈利表现，适合做短周期用户激励。', items: ['每日重置', '连胜次数', '奖励发放说明'] },
    ],
  },
  rebate: {
    eyebrow: 'Referral',
    title: '返佣链接与开户链接',
    intro: '把不同平台注册链接、邀请码、返佣比例和新手操作说明放到一个页面，降低用户找入口的成本。',
    stats: ['开户链接汇总', '邀请码展示', '新手流程说明'],
    sections: [
      { title: '开户注册', text: '每个平台独立卡片展示，避免用户把链接和邀请码搞混。', items: ['注册链接', '邀请码', '平台备注'] },
      { title: '返佣说明', text: '说明返佣比例、统计周期、到账方式和注意事项。', items: ['返佣比例', '统计口径', '到账时间'] },
      { title: '新手路径', text: '从注册、充值模拟说明、风险提醒到练习盘入口形成闭环。', items: ['开户注册', '查看教学', '进入模拟盘'] },
    ],
  },
  weekly: {
    eyebrow: 'Weekly Events',
    title: '熊猫每周活动预览',
    intro: '每周活动页负责发布活动时间、平台、交易要求、奖励规则和群内参与方式。',
    stats: ['每周更新', '活动规则', '奖励说明'],
    sections: [
      { title: '活动日历', text: '按日期展示活动，用户能快速知道本周重点。', items: ['开始时间', '截止时间', '参与平台'] },
      { title: '交易要求', text: '明确交易量、有效订单、报名条件，避免规则解释成本。', items: ['有效交易量', '报名门槛', '结算标准'] },
      { title: '群内公告', text: '同步 VIP 群、直播间和活动回执信息。', items: ['群号/入口', '公告截图位', '获奖名单'] },
    ],
  },
  teaching: {
    eyebrow: 'Education',
    title: '事件合约教学',
    intro: '教学页把入门知识、指标研究、做单技巧和复盘方法分层展示，适合持续扩展文章和视频。',
    stats: ['入门教程', '指标研究', '复盘模板'],
    sections: [
      { title: '基础入门', text: '解释事件合约周期、CALL/PUT、盈亏结构和常见误区。', items: ['合约规则', '周期选择', '风险控制'] },
      { title: '指标研究', text: '沉淀 MACD、均线、量能、关键 K 线等短线参考方法。', items: ['参数设置', '确认逻辑', '失效条件'] },
      { title: '做单纪律', text: '强调等待确认、控制仓位和复盘，不鼓励重仓追单。', items: ['进场条件', '止损限制', '复盘记录'] },
    ],
  },
  records: {
    eyebrow: 'Live Records',
    title: '事件合约直播实战战绩',
    intro: '直播战绩页用于记录开仓时间、方向、周期、结果和复盘结论，让内容更可信。',
    stats: ['开仓记录', '胜率统计', '复盘结论'],
    sections: [
      { title: '直播记录', text: '后续可以把每次直播的开仓记录结构化展示。', items: ['开仓时间', '交易对/方向', '结算结果'] },
      { title: '统计面板', text: '聚合胜率、盈亏、连续亏损等指标，和模拟盘统计保持一致。', items: ['总交易次数', '胜率', '最大回撤'] },
      { title: '复盘沉淀', text: '记录为什么进场、哪里失误、下一次如何避免。', items: ['进场理由', '错误类型', '改进动作'] },
    ],
  },
  feedback: {
    eyebrow: 'Feedback',
    title: '网站意见与功能提议',
    intro: '反馈页用于收集页面体验、功能需求、Bug 和活动建议，后续可接入表单提交接口。',
    stats: ['Bug 反馈', '功能提议', '活动建议'],
    sections: [
      { title: '页面体验', text: '收集导航、移动端、加载速度和可读性问题。', items: ['页面名称', '问题描述', '截图说明'] },
      { title: '功能需求', text: '记录用户希望新增的榜单、返佣、教学或模拟盘能力。', items: ['需求场景', '优先级', '预期效果'] },
      { title: '活动建议', text: '收集用户对奖励规则、活动形式和直播互动的建议。', items: ['活动类型', '奖励方式', '参与门槛'] },
    ],
  },
};

function getInitialLanguage(): Language {
  const stored = localStorage.getItem('sim_language');
  if (stored === 'zh' || stored === 'en') return stored;
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

function getPageFromLocation(): PageKey {
  return pageByPath.get(window.location.pathname)?.key ?? 'home';
}

function getPathForPage(key: PageKey): string {
  return navPages.find(page => page.key === key)?.path ?? '/';
}

function SiteNav({
  currentPage,
  onNavigate,
  user,
  isAdmin,
  onAdminLogout,
  simulatorAccountControls,
}: {
  currentPage: PageKey;
  onNavigate: (page: PageKey) => void;
  user?: User | null;
  isAdmin?: boolean;
  onAdminLogout?: () => void;
  simulatorAccountControls?: ReactNode;
}) {
  const visiblePages = navPages.filter(page => page.key !== 'admin' && page.key !== 'register' && page.key !== 'login');
  return (
    <header className={simulatorAccountControls ? 'site-header simulator-site-header' : 'site-header'}>
      <button className="brand-mark" type="button" onClick={() => onNavigate('home')}>
        <span>PD</span>
        <strong>熊猫事件社区</strong>
        {currentPage === 'simulator' && <em>加密货币事件合约模拟器</em>}
      </button>
      <nav className="site-nav" aria-label="主导航">
        {visiblePages.map(page => (
          <button
            key={page.key}
            className={currentPage === page.key ? 'nav-link active' : 'nav-link'}
            type="button"
            onClick={() => onNavigate(page.key)}
          >
            {page.shortLabel ?? page.label}
          </button>
        ))}
      </nav>
      <div className="site-account">
        {simulatorAccountControls ? (
          simulatorAccountControls
        ) : isAdmin ? (
          <>
            <button className="account-button" type="button" onClick={() => onNavigate('admin')}>管理后台</button>
            <button className="account-link" type="button" onClick={onAdminLogout}>退出</button>
          </>
        ) : user ? (
          <>
            <span>{user.username}</span>
            <button className="account-button" type="button" onClick={() => onNavigate('simulator')}>进入账户</button>
          </>
        ) : (
          <>
            <button className="account-link" type="button" onClick={() => onNavigate('login')}>登录</button>
            <button className="account-button" type="button" onClick={() => onNavigate('register')}>注册</button>
          </>
        )}
      </div>
    </header>
  );
}

function HomePage({ onNavigate }: { onNavigate: (page: PageKey) => void }) {
  return (
    <>
      <section className="hero-panel">
        <div className="hero-main">
          <p className="eyebrow">Panda Event Community</p>
          <h1>熊猫事件合约社区</h1>
          <p className="hero-copy">一个围绕事件合约用户的入口：注册熊猫账户、领取交易所返佣、使用模拟盘练习，再参与社区活动。</p>
          <div className="hero-actions">
            <button className="primary-action hero-button" type="button" onClick={() => onNavigate('register')}>立即注册账户</button>
            <button className="ghost-button hero-ghost" type="button" onClick={() => onNavigate('rebate')}>查看返佣链接</button>
            <button className="ghost-button hero-ghost" type="button" onClick={() => onNavigate('simulator')}>进入模拟盘</button>
          </div>
          <div className="hero-steps" aria-label="推荐流程">
            <div><span>01</span><strong>注册账户</strong><p>绑定联系方式和交易所 UID</p></div>
            <div><span>02</span><strong>领取返佣</strong><p>查看平台链接与邀请码</p></div>
            <div><span>03</span><strong>模拟练习</strong><p>使用 10,000 虚拟 USDT</p></div>
            <div><span>04</span><strong>参与活动</strong><p>查看基金、周活动和战绩</p></div>
          </div>
        </div>
        <aside className="hero-side">
          <div className="side-card primary">
            <span>主推流程</span>
            <strong>注册账户 → 返佣绑定 → 模拟练习</strong>
          </div>
          <div className="side-card">
            <span>支持平台</span>
            <strong>WEEX / Gate / Deepcoin / TurboFlow</strong>
          </div>
          <div className="side-card">
            <span>小助理阿风</span>
            <strong>QQ 2821305247</strong>
          </div>
          <p>注册、下载、充值或返佣设置遇到问题，可以联系小助理协助处理。</p>
        </aside>
      </section>

      <section className="section-head">
        <p className="eyebrow">Recommended Flow</p>
        <h2>推荐使用路径</h2>
        <p className="muted">按这个顺序走，最不容易漏掉返佣、账户绑定和模拟练习。</p>
      </section>
      <div className="portal-grid">
        {featureCards.map(card => (
          <button className="portal-card" key={card.title} type="button" onClick={() => onNavigate(card.target)}>
            <span>{card.badge}</span>
            <h3>{card.title}</h3>
            <p>{card.text}</p>
          </button>
        ))}
      </div>

      <section className="home-split">
        <article className="home-panel">
          <p className="eyebrow">Why Register First</p>
          <h2>注册不是摆设，是为了把返佣、活动和模拟盘身份统一起来。</h2>
          <p>账户资料会记录联系方式和交易所 UID，后续活动排名、返佣资格核对、客服协助都会围绕这套身份进行。</p>
        </article>
        <article className="home-panel accent">
          <p className="eyebrow">Risk Note</p>
          <h2>模拟盘只做练习，不处理真实充值提现。</h2>
          <p>网站当前核心是教学、练习和信息聚合。真实交易、资金、钱包和平台账户都发生在交易所侧。</p>
        </article>
      </section>

      <section className="section-head compact-section">
        <p className="eyebrow">More</p>
        <h2>活动与复盘</h2>
      </section>
      <div className="secondary-grid">
        {secondaryCards.map(card => (
          <button className="secondary-card" key={card.title} type="button" onClick={() => onNavigate(card.target)}>
            <span>{card.badge}</span>
            <strong>{card.title}</strong>
            <p>{card.text}</p>
          </button>
        ))}
      </div>
    </>
  );
}

function DetailPage({ page }: { page: Exclude<PageKey, 'home' | 'simulator' | 'login' | 'register' | 'admin'> }) {
  const content = detailPages[page];
  return (
    <>
      <section className="page-hero">
        <p className="eyebrow">{content.eyebrow}</p>
        <h1>{content.title}</h1>
        <p>{content.intro}</p>
        <div className="mini-stat-row">
          {content.stats.map(stat => <span key={stat}>{stat}</span>)}
        </div>
      </section>
      <div className="content-grid">
        {content.sections.map(section => (
          <article className="content-card" key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.text}</p>
            <ul>
              {section.items.map(item => <li key={item}>{item}</li>)}
            </ul>
          </article>
        ))}
      </div>
    </>
  );
}

function RebatePage() {
  return (
    <>
      <section className="rebate-hero">
        <div>
          <p className="eyebrow">Exchange Referral</p>
          <h1>事件合约 · 交易所注册返佣</h1>
          <p>WEEX、Gate、Deepcoin、TurboFlow 注册链接、邀请码与返佣比例说明。</p>
          <div className="mini-stat-row">
            <span>注册链接</span>
            <span>邀请码</span>
            <span>最高返佣比例</span>
          </div>
        </div>
        <aside className="rebate-help">
          <p className="eyebrow">事件合约返佣</p>
          <h2>注册链接 · 邀请码 · 最高返佣比例</h2>
          <strong>需要帮助可以联系小助理</strong>
          <p>注册、下载、充值或返佣设置遇到问题，都可以找小助理阿风协助处理。</p>
          <div className="assistant-line">
            <span>小助理阿风</span>
            <strong>QQ 2821305247</strong>
          </div>
        </aside>
      </section>

      <div className="rebate-grid">
        {rebatePlatforms.map(platform => (
          <article className={platform.name === 'TurboFlow' ? 'rebate-card featured' : 'rebate-card'} key={platform.name}>
            <div className="rebate-card-top">
              <span>{platform.badge}</span>
              <strong>{platform.name}</strong>
            </div>
            <h2>{platform.title}</h2>
            <p>{platform.summary}</p>
            <dl>
              <div>
                <dt>邀请码</dt>
                <dd>{platform.inviteCode}</dd>
              </div>
              <div>
                <dt>返佣比例</dt>
                <dd>{platform.rebate}</dd>
              </div>
            </dl>
            <a className="rebate-link" href={platform.href} target="_blank" rel="noreferrer">
              打开注册链接
            </a>
          </article>
        ))}
      </div>
    </>
  );
}

function reviewStatusLabel(status: ReviewStatus['review_status']): string {
  const labels: Record<ReviewStatus['review_status'], string> = {
    not_found: '未注册',
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝',
  };
  return labels[status];
}

function AccountAccessCard({
  mode,
  username,
  password,
  registerData,
  error,
  submitted,
  reviewStatus,
  reviewChecking,
  languageSwitch,
  onUsernameChange,
  onPasswordChange,
  onRegisterDataChange,
  onReviewStatusCheck,
  onSubmit,
  onNavigate,
}: {
  mode: 'login' | 'register';
  username: string;
  password: string;
  registerData: RegisterPayload;
  error: string | null;
  submitted?: boolean;
  reviewStatus?: ReviewStatus | null;
  reviewChecking?: boolean;
  languageSwitch: ReactNode;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onRegisterDataChange: (payload: RegisterPayload) => void;
  onReviewStatusCheck?: () => Promise<void>;
  onSubmit: (event: FormEvent) => Promise<void>;
  onNavigate: (page: PageKey) => void;
}) {
  const isRegister = mode === 'register';
  const registerReady = username.trim()
    && password.trim().length >= 6
    && registerData.exchange_uid.trim();
  const loginReady = username.trim() && password.trim().length >= 6;
  return (
    <section className={isRegister ? 'register-layout' : 'login-shell embedded-login'}>
      <form className="login-card register-card" onSubmit={onSubmit}>
        <div className="login-topline">
          <p className="eyebrow">{isRegister ? 'Create Account' : 'Account Login'}</p>
          {languageSwitch}
        </div>
        <h1>{isRegister ? 'VIP 开通注册' : '登录模拟盘'}</h1>
        <p className="muted">
          {isRegister
            ? 'QQ 号将作为登录账号。提交 TF UID 后等待管理员审核，通过后开通 VIP 模拟盘权限。'
            : '使用 QQ 号和密码登录，审核通过的 VIP 用户才能进入事件模拟盘。'}
        </p>
        <label className="field">
          <span>QQ号</span>
          <input value={username} onChange={event => onUsernameChange(event.target.value)} minLength={1} maxLength={64} placeholder="请输入QQ号" />
        </label>
        <label className="field">
          <span>登录密码</span>
          <input
            value={password}
            onChange={event => onPasswordChange(event.target.value)}
            type="password"
            minLength={6}
            maxLength={128}
            placeholder="至少 6 位密码"
          />
        </label>
        {isRegister && (
          <>
            <div className="invite-alert">
              <span>TF 邀请码</span>
              <strong>请使用熊猫社区专属邀请码开户注册</strong>
              <a
                className="invite-rebate-link"
                href="/rebate"
                onClick={event => {
                  event.preventDefault();
                  onNavigate('rebate');
                }}
              >
                查看返佣链接页面
              </a>
              <p>没有 TF UID 的用户，请先通过开户链接完成注册，再回来填写 UID 提交审核。</p>
            </div>
            <label className="field">
              <span>TF UID</span>
              <input
                value={registerData.exchange_uid}
                onChange={event => onRegisterDataChange({ ...registerData, exchange_uid: event.target.value })}
                minLength={2}
                maxLength={128}
                placeholder="请输入 TF UID"
              />
            </label>
            <p className="form-note">QQ 号作为登录账号使用；TF UID 用于核对 VIP 开通、社区活动和返佣资格。</p>
            {submitted && (
              <div className="submitted-review-card">
                <p className="eyebrow">Review Submitted</p>
                <h2>已提交审核</h2>
                <dl>
                  <div><dt>QQ号</dt><dd>{username.trim()}</dd></div>
                  <div><dt>TF UID</dt><dd>{registerData.exchange_uid.trim()}</dd></div>
                  <div><dt>当前状态</dt><dd>待审核</dd></div>
                </dl>
                <p>请等待管理员通过。审核通过后，使用 QQ 号和密码登录模拟盘。</p>
              </div>
            )}
          </>
        )}
        {!isRegister && (
          <div className="review-query">
            <button className="ghost-button" type="button" disabled={!username.trim() || reviewChecking} onClick={onReviewStatusCheck}>
              {reviewChecking ? '查询中...' : '查询审核状态'}
            </button>
            {reviewStatus && (
              <div className={`review-status-card ${reviewStatus.review_status}`}>
                <span>QQ {reviewStatus.username}</span>
                <strong>{reviewStatusLabel(reviewStatus.review_status)}</strong>
                <p>
                  {reviewStatus.review_status === 'pending'
                    ? '申请已提交，请等待管理员审核通过。'
                    : reviewStatus.review_status === 'approved'
                      ? 'VIP 权限已开通，可以登录模拟盘。'
                      : reviewStatus.review_status === 'rejected'
                        ? '申请已拒绝，请联系管理员核对 QQ 或 TF UID。'
                        : '没有找到注册申请，请先开通 VIP。'}
                </p>
              </div>
            )}
          </div>
        )}
        {error && <p className={submitted ? 'form-success' : 'form-error'}>{error}</p>}
        <button
          className={submitted ? 'primary-action submitted-action' : 'primary-action'}
          type="submit"
          disabled={submitted || (isRegister ? !registerReady : !loginReady)}
        >
          {isRegister ? (submitted ? '已提交审核' : '提交注册审核') : '登录熊猫账户'}
        </button>
        <button
          className="ghost-button account-alt-action"
          type="button"
          onClick={() => onNavigate(isRegister ? 'login' : 'register')}
        >
          {isRegister ? '已有 VIP，去登录' : '没有 VIP，去开通'}
        </button>
      </form>
      {isRegister && (
        <aside className="register-side">
          <p className="eyebrow">What You Get</p>
          <h2>审核通过后开通 VIP 权限</h2>
          <ul>
            <li>10,000 虚拟 USDT 初始余额</li>
            <li>登录账号统一使用 QQ 号</li>
            <li>BTCUSDT / ETHUSDT / XAUUSD 模拟事件合约</li>
            <li>未结算订单、历史订单和胜率统计</li>
            <li>无真实充值、提现或真实交易风险</li>
            <li>联系小助理 QQ 2821305247 可协助快速审核</li>
          </ul>
        </aside>
      )}
    </section>
  );
}

function AdminPage({ onLogout }: { onLogout: () => void }) {
  const [adminName, setAdminName] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [token, setToken] = useState(() => localStorage.getItem('admin_token') ?? '');
  const [users, setUsers] = useState<User[]>([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [adminError, setAdminError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadUsers(nextFilter = statusFilter, nextToken = token) {
    if (!nextToken) return;
    setLoading(true);
    setAdminError(null);
    try {
      const nextUsers = await api.getAdminUsers(nextToken, nextFilter);
      setUsers(nextUsers);
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : '后台数据加载失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdminLogin(event: FormEvent) {
    event.preventDefault();
    setAdminError(null);
    try {
      const response = await api.adminLogin(adminName, adminPassword);
      localStorage.setItem('admin_token', response.token);
      setToken(response.token);
      await loadUsers(statusFilter, response.token);
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : '后台登录失败');
    }
  }

  async function reviewUser(userId: number, action: 'approve' | 'reject') {
    setAdminError(null);
    try {
      if (action === 'approve') {
        await api.approveUser(token, userId);
      } else {
        await api.rejectUser(token, userId);
      }
      await loadUsers();
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : '审核操作失败');
    }
  }

  if (!token) {
    return (
      <section className="admin-shell">
        <form className="login-card" onSubmit={handleAdminLogin}>
          <p className="eyebrow">Admin</p>
          <h1>管理员后台</h1>
          <p className="muted">请使用服务器环境变量配置的管理员账户登录后台。</p>
          <label className="field"><span>管理员账户</span><input value={adminName} onChange={event => setAdminName(event.target.value)} /></label>
          <label className="field"><span>管理员密码</span><input type="password" value={adminPassword} onChange={event => setAdminPassword(event.target.value)} /></label>
          {adminError && <p className="form-error">{adminError}</p>}
          <button className="primary-action" type="submit">登录后台</button>
        </form>
      </section>
    );
  }

  return (
    <section className="admin-shell">
      <div className="admin-top">
        <div>
          <p className="eyebrow">Admin Review</p>
          <h1>用户注册审核</h1>
          <p className="muted">这里可以查看用户提交的 QQ 号和 TF UID，并决定是否开通 VIP 模拟盘权限。</p>
        </div>
        <div className="admin-actions">
          <select value={statusFilter} onChange={event => {
            setStatusFilter(event.target.value);
            loadUsers(event.target.value);
          }}>
            <option value="pending">待审核</option>
            <option value="approved">已通过</option>
            <option value="rejected">已拒绝</option>
            <option value="all">全部</option>
          </select>
          <button className="ghost-button" type="button" onClick={() => loadUsers()}>刷新</button>
          <button className="ghost-button" type="button" onClick={() => {
            localStorage.removeItem('admin_token');
            setToken('');
            setUsers([]);
            onLogout();
          }}>退出后台</button>
        </div>
      </div>
      {adminError && <div className="error-banner"><span>{adminError}</span><button onClick={() => setAdminError(null)}>关闭</button></div>}
      <div className="admin-table">
        <table>
          <thead>
            <tr>
              <th>QQ账号</th>
              <th>联系方式</th>
              <th>TF UID</th>
              <th>状态</th>
              <th>注册时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && <tr><td className="empty-cell" colSpan={6}>{loading ? '加载中...' : '暂无用户'}</td></tr>}
            {users.map(item => (
              <tr key={item.id}>
                <td>{item.username}</td>
                <td>QQ · {item.contact_account}</td>
                <td>{item.exchange_uid}</td>
                <td><span className={`review-badge ${item.review_status}`}>{item.review_status}</span></td>
                <td>{new Date(item.created_at).toLocaleString()}</td>
                <td>
                  <div className="review-actions">
                    <button className="chip active" type="button" onClick={() => reviewUser(item.id, 'approve')}>通过</button>
                    <button className="chip danger" type="button" onClick={() => reviewUser(item.id, 'reject')}>拒绝</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SimulatorGate({ onNavigate }: { onNavigate: (page: PageKey) => void }) {
  return (
    <section className="simulator-gate">
      <div>
        <p className="eyebrow">Simulator Access</p>
        <h1>请先登录 VIP 账户</h1>
        <p>事件模拟盘需要登录后使用。使用 QQ 号注册并提交 TF UID，管理员审核通过后即可开通 VIP 权限。</p>
        <div className="hero-actions">
          <button className="primary-action hero-button" type="button" onClick={() => onNavigate('login')}>登录 VIP</button>
          <button className="ghost-button hero-ghost" type="button" onClick={() => onNavigate('register')}>开通 VIP</button>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return <footer className="site-footer">熊猫事件合约社区 · 专注事件合约教学 · 仅供学习交流 · 版本 {APP_VERSION}</footer>;
}

function App() {
  const [currentPage, setCurrentPage] = useState<PageKey>(getPageFromLocation);
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
  const t = translations[language];
  const [user, setUser] = useState<User | null>(null);
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('admin_token') ?? '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [registerData, setRegisterData] = useState<RegisterPayload>({
    username: '',
    password: '',
    contact_type: 'qq',
    contact_account: '',
    exchange_uid: '',
  });
  const [symbol, setSymbol] = useState<SymbolName>('BTCUSDT');
  const [chartInterval, setChartInterval] = useState<ChartInterval>('5m');
  const [orderInterval, setOrderInterval] = useState<ContractInterval>('5m');
  const [klines, setKlines] = useState<Kline[]>([]);
  const [ticker, setTicker] = useState<Ticker | null>(null);
  const [openOrders, setOpenOrders] = useState<ContractOrder[]>([]);
  const [historyOrders, setHistoryOrders] = useState<ContractOrder[]>([]);
  const [stats, setStats] = useState<ContractStats | null>(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const [accountLoading, setAccountLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registerNotice, setRegisterNotice] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus | null>(null);
  const [reviewChecking, setReviewChecking] = useState(false);
  const [settlementNotice, setSettlementNotice] = useState<ContractOrder | null>(null);
  const accountLoadedRef = useRef(false);
  const openOrderIdsRef = useRef<Set<number>>(new Set());
  const marketRequestIdRef = useRef(0);

  function navigate(page: PageKey) {
    const path = getPathForPage(page);
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  useEffect(() => {
    const onPopState = () => setCurrentPage(getPageFromLocation());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function changeLanguage(next: Language) {
    setLanguage(next);
    localStorage.setItem('sim_language', next);
  }

  const loadMarket = useCallback(async () => {
    const requestId = marketRequestIdRef.current + 1;
    marketRequestIdRef.current = requestId;
    const requestedSymbol = symbol;
    setMarketLoading(true);
    try {
      const [nextKlines, nextTicker] = await Promise.all([
        api.getKlines(requestedSymbol, chartInterval, 200),
        api.getTicker(requestedSymbol),
      ]);
      if (marketRequestIdRef.current !== requestId || nextTicker.symbol !== requestedSymbol) return;
      setKlines(nextKlines);
      setTicker(nextTicker);
    } catch (err) {
      if (marketRequestIdRef.current !== requestId) return;
      setError(err instanceof Error ? err.message : translations[language].failedMarket);
    } finally {
      if (marketRequestIdRef.current === requestId) {
        setMarketLoading(false);
      }
    }
  }, [symbol, chartInterval, language]);

  useEffect(() => {
    setKlines([]);
    setTicker(null);
  }, [symbol, chartInterval]);

  const loadAccount = useCallback(async (userId: number) => {
    if (!accountLoadedRef.current) {
      setAccountLoading(true);
    }
    try {
      const [nextUser, nextOpen, nextHistory, nextStats] = await Promise.all([
        api.getMe(userId),
        api.getOpenOrders(userId),
        api.getHistory(userId),
        api.getStats(userId),
      ]);
      if (accountLoadedRef.current) {
        const newlySettled = nextHistory.find(order => openOrderIdsRef.current.has(order.id));
        if (newlySettled) {
          setSettlementNotice(newlySettled);
        }
      }
      setUser(nextUser);
      setOpenOrders(nextOpen);
      setHistoryOrders(nextHistory);
      setStats(nextStats);
      openOrderIdsRef.current = new Set(nextOpen.map(order => order.id));
      accountLoadedRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : translations[language].failedAccount);
    } finally {
      setAccountLoading(false);
    }
  }, [language]);

  function clearAccountState() {
    setUser(null);
    setOpenOrders([]);
    setHistoryOrders([]);
    setStats(null);
    openOrderIdsRef.current = new Set();
    accountLoadedRef.current = false;
  }

  useEffect(() => {
    const storedUserId = localStorage.getItem('sim_user_id');
    if (!storedUserId) return;
    api.getMe(Number(storedUserId))
      .then(setUser)
      .catch(() => localStorage.removeItem('sim_user_id'));
  }, []);

  useEffect(() => {
    if (currentPage !== 'simulator') return;
    loadMarket();
    const timer = window.setInterval(loadMarket, 2_500);
    return () => window.clearInterval(timer);
  }, [currentPage, loadMarket]);

  useEffect(() => {
    if (!user || currentPage !== 'simulator') return;
    loadAccount(user.id);
    const timer = window.setInterval(() => loadAccount(user.id), 4_000);
    return () => window.clearInterval(timer);
  }, [user?.id, currentPage, loadAccount]);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setError(null);
    clearAccountState();
    try {
      const nextUser = await api.login(username.trim(), password);
      localStorage.setItem('sim_user_id', String(nextUser.id));
      setUser(nextUser);
      await loadAccount(nextUser.id);
      navigate('simulator');
    } catch (err) {
      localStorage.removeItem('sim_user_id');
      try {
        const admin = await api.adminLogin(username.trim(), password);
        localStorage.setItem('admin_token', admin.token);
        setAdminToken(admin.token);
        setError(null);
        navigate('home');
      } catch {
        setError(err instanceof Error ? err.message : t.loginFailed);
      }
    }
  }

  async function handleRegister(event: FormEvent) {
    event.preventDefault();
    if (registerNotice) return;
    setError(null);
    clearAccountState();
    try {
      const nextUser = await api.register({
        ...registerData,
        username: username.trim(),
        password,
        contact_type: 'qq',
        contact_account: username.trim(),
        exchange_uid: registerData.exchange_uid.trim(),
      });
      setRegisterNotice(`VIP 开通申请已提交，QQ ${nextUser.username} 正在等待管理员审核。审核通过后即可登录模拟盘。`);
      setReviewStatus({
        username: nextUser.username,
        review_status: 'pending',
        exchange_uid: nextUser.exchange_uid,
        reviewed_at: null,
      });
    } catch (err) {
      localStorage.removeItem('sim_user_id');
      setError(err instanceof Error ? err.message : '注册失败');
    }
  }

  async function handleCheckReviewStatus() {
    const qq = username.trim();
    if (!qq) return;
    setError(null);
    setReviewChecking(true);
    try {
      const nextStatus = await api.getReviewStatus(qq);
      setReviewStatus(nextStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : '审核状态查询失败');
    } finally {
      setReviewChecking(false);
    }
  }

  async function handleSubmitOrder(payload: OpenContractPayload) {
    if (!user) return;
    setError(null);
    setSubmitting(true);
    try {
      await api.openContract(user.id, payload);
      await loadAccount(user.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.orderFailed);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetAccount() {
    if (!user) return;
    const confirmed = window.confirm('确认重置模拟盘资产？余额会恢复为 10,000 虚拟 USDT，并清空你的模拟订单记录。');
    if (!confirmed) return;
    setError(null);
    try {
      const nextUser = await api.resetAccount(user.id);
      setUser(nextUser);
      setOpenOrders([]);
      setHistoryOrders([]);
      setStats(null);
      await loadAccount(nextUser.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '重置资产失败');
    }
  }

  function logout() {
    localStorage.removeItem('sim_user_id');
    clearAccountState();
  }

  function adminLogout() {
    localStorage.removeItem('admin_token');
    setAdminToken('');
    navigate('home');
  }

  const languageSwitch = (
    <div className="language-switch" aria-label={t.language}>
      <button className={language === 'zh' ? 'chip active' : 'chip'} onClick={() => changeLanguage('zh')} type="button">中文</button>
      <button className={language === 'en' ? 'chip active' : 'chip'} onClick={() => changeLanguage('en')} type="button">EN</button>
    </div>
  );

  const simulatorAccountControls = user ? (
    <div className="user-strip nav-user-strip">
      {languageSwitch}
      <span>{user.username}</span>
      <span className="vip-badge">VIP权限</span>
      <strong>{formatMoney(Number(user.balance))} USDT</strong>
      <button className="ghost-button reset-button" onClick={handleResetAccount}>重置资产</button>
      <button className="ghost-button" onClick={logout}>{t.logout}</button>
    </div>
  ) : null;

  const marketingPage = useMemo(() => {
    if (currentPage === 'home') return <HomePage onNavigate={navigate} />;
    if (currentPage === 'rebate') return <RebatePage />;
    if (currentPage !== 'simulator' && currentPage !== 'login' && currentPage !== 'register' && currentPage !== 'admin') return <DetailPage page={currentPage} />;
    return null;
  }, [currentPage]);

  if (currentPage === 'admin') {
    return (
      <main className="site-shell simulator-shell">
        <SiteNav currentPage={currentPage} onNavigate={navigate} user={null} isAdmin={Boolean(adminToken)} onAdminLogout={adminLogout} />
        <AdminPage onLogout={adminLogout} />
      </main>
    );
  }

  if (currentPage === 'register') {
    return (
      <main className="site-shell">
        <SiteNav currentPage={currentPage} onNavigate={navigate} user={user} isAdmin={Boolean(adminToken)} onAdminLogout={adminLogout} />
        <AccountAccessCard
          mode="register"
          username={username}
          password={password}
          registerData={registerData}
          error={registerNotice ?? error}
          submitted={Boolean(registerNotice)}
          reviewStatus={reviewStatus}
          reviewChecking={reviewChecking}
          languageSwitch={languageSwitch}
          onUsernameChange={value => {
            setUsername(value);
            setRegisterNotice(null);
            setReviewStatus(null);
            setRegisterData({ ...registerData, username: value, contact_type: 'qq', contact_account: value });
          }}
          onPasswordChange={value => {
            setPassword(value);
            setRegisterData({ ...registerData, password: value });
          }}
          onRegisterDataChange={setRegisterData}
          onReviewStatusCheck={handleCheckReviewStatus}
          onSubmit={handleRegister}
          onNavigate={navigate}
        />
        <SiteFooter />
      </main>
    );
  }

  if (currentPage === 'login') {
    return (
      <main className="site-shell">
        <SiteNav currentPage={currentPage} onNavigate={navigate} user={user} isAdmin={Boolean(adminToken)} onAdminLogout={adminLogout} />
        <AccountAccessCard
          mode="login"
          username={username}
          password={password}
          registerData={registerData}
          error={error}
          reviewStatus={reviewStatus}
          reviewChecking={reviewChecking}
          languageSwitch={languageSwitch}
          onUsernameChange={value => {
            setUsername(value);
            setReviewStatus(null);
          }}
          onPasswordChange={setPassword}
          onRegisterDataChange={setRegisterData}
          onReviewStatusCheck={handleCheckReviewStatus}
          onSubmit={handleLogin}
          onNavigate={navigate}
        />
        <SiteFooter />
      </main>
    );
  }

  if (currentPage !== 'simulator') {
    return (
      <main className="site-shell">
        <SiteNav currentPage={currentPage} onNavigate={navigate} user={user} isAdmin={Boolean(adminToken)} onAdminLogout={adminLogout} />
        {marketingPage}
        <SiteFooter />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="site-shell simulator-shell">
        <SiteNav currentPage={currentPage} onNavigate={navigate} user={user} isAdmin={Boolean(adminToken)} onAdminLogout={adminLogout} />
        <SimulatorGate onNavigate={navigate} />
        <SiteFooter />
      </main>
    );
  }

  return (
    <main className="site-shell simulator-shell">
      <SiteNav
        currentPage={currentPage}
        onNavigate={navigate}
        user={user}
        isAdmin={Boolean(adminToken)}
        onAdminLogout={adminLogout}
        simulatorAccountControls={simulatorAccountControls}
      />
      <section className="app-shell">
        {error && <div className="error-banner"><span>{error}</span><button onClick={() => setError(null)}>{t.dismiss}</button></div>}
        {settlementNotice && (
          <div className="settlement-modal-backdrop" role="dialog" aria-modal="true">
            <div className="settlement-modal">
              <p className="eyebrow">Settlement</p>
              <h2>{settlementNotice.status === 'WON' ? '这单拿下了' : settlementNotice.status === 'LOST' ? '这单没走出来' : '这单打平了'}</h2>
              <p>
                {settlementNotice.status === 'WON'
                  ? '可以把这单的入场点和周期选择发到群里交流一下，好的交易逻辑值得复盘沉淀。'
                  : settlementNotice.status === 'LOST'
                    ? '先别急着追下一单。建议进群看下老师复盘，确认这次是方向、位置还是周期没处理好。'
                    : '价格刚好走平，资金已按规则处理。可以继续观察下一根 K 线再决定。'}
              </p>
              <dl>
                <div><dt>订单</dt><dd>#{settlementNotice.id}</dd></div>
                <div><dt>方向</dt><dd>{settlementNotice.direction === 'CALL' ? '涨' : '跌'}</dd></div>
                <div><dt>盈亏</dt><dd className={settlementNotice.profit_loss >= 0 ? 'positive' : 'negative'}>{formatMoney(settlementNotice.profit_loss)} USDT</dd></div>
              </dl>
              <button className="primary-action" type="button" onClick={() => setSettlementNotice(null)}>知道了</button>
            </div>
          </div>
        )}

        <div className="main-grid">
          <ChartPanel
            symbol={symbol}
            interval={chartInterval}
            ticker={ticker}
            klines={klines}
            openOrders={openOrders}
            loading={marketLoading}
            t={t}
            onSymbolChange={setSymbol}
            onIntervalChange={(next) => {
              setChartInterval(next);
              setOrderInterval(next);
            }}
          />
          <OrderPanel
            symbol={symbol}
            interval={orderInterval}
            balance={Number(user.balance)}
            submitting={submitting}
            language={language}
            t={t}
            onIntervalChange={setOrderInterval}
            onSubmit={handleSubmitOrder}
          />
        </div>

        <div className="data-grid">
          <OpenOrdersTable orders={openOrders} loading={accountLoading} language={language} ticker={ticker} t={t} />
          <HistoryOrdersTable orders={historyOrders} loading={accountLoading} language={language} t={t} />
        </div>
        <StatsPanel stats={stats} t={t} />
      </section>
      <SiteFooter />
    </main>
  );
}

export default App;

