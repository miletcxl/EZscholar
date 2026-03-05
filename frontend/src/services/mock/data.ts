import type {
  ActivityEventDTO,
  CommandActionDTO,
  ModuleDetailDTO,
  ModuleSummaryDTO,
  RecentVisitDTO,
} from '../api/types';

export const mockModuleSummaries: ModuleSummaryDTO[] = [
  {
    id: 'deadline-engine',
    title: '日程引擎',
    status: 'warning',
    lastUpdatedAt: '2026-03-05T08:20:00Z',
    kpi: { label: '最近截止任务', value: '7 项' },
  },
  {
    id: 'remote-dispatcher',
    title: '算力调度',
    status: 'busy',
    lastUpdatedAt: '2026-03-05T08:28:00Z',
    kpi: { label: '活跃远程会话', value: '3 个' },
  },
  {
    id: 'flow-guardian',
    title: '心流守护',
    status: 'healthy',
    lastUpdatedAt: '2026-03-05T08:25:00Z',
    kpi: { label: '今日休息提醒', value: '2 次' },
  },
  {
    id: 'output-generator',
    title: '文档生成',
    status: 'healthy',
    lastUpdatedAt: '2026-03-05T08:18:00Z',
    kpi: { label: '报告生成成功率', value: '98.4%' },
  },
  {
    id: 'research-brain',
    title: '科研大脑',
    status: 'busy',
    lastUpdatedAt: '2026-03-05T08:27:00Z',
    kpi: { label: '文献索引总量', value: '2,419 篇' },
  },
  {
    id: 'socratic-interceptor',
    title: '逻辑思辨',
    status: 'healthy',
    lastUpdatedAt: '2026-03-05T08:23:00Z',
    kpi: { label: '今日引导次数', value: '11 次' },
  },
];

export const mockModuleDetails: ModuleDetailDTO[] = [
  {
    id: 'deadline-engine',
    description:
      '基于任务复杂度和正式 DDL 倒推执行节奏，自动生成多阶段提醒与风险预警。',
    capabilities: ['复杂度估计', '阶段性提醒', '风险任务排雷', '提前资源准备建议'],
    recentRuns: [
      { id: 'run-de-1', name: '毕业设计开题报告', state: '风险升高', startedAt: '2026-03-05T07:50:00Z' },
      { id: 'run-de-2', name: '多模态实验复现实验', state: '提醒已发送', startedAt: '2026-03-05T05:10:00Z' },
      { id: 'run-de-3', name: '周会论文阅读', state: '按计划进行', startedAt: '2026-03-04T18:40:00Z' },
    ],
    metrics: [
      { label: '高风险任务占比', value: '23%', trend: 'up' },
      { label: '平均提前提醒天数', value: '9.2 天', trend: 'flat' },
      { label: '漏提醒任务数', value: '0', trend: 'down' },
    ],
  },
  {
    id: 'remote-dispatcher',
    description:
      '统一管理本地与远程 GPU 环境的代码同步与 tmux 进程接管，降低跨端切换成本。',
    capabilities: ['增量同步', '权重排除规则', 'tmux 会话接管', '远程日志回传'],
    recentRuns: [
      { id: 'run-rd-1', name: 'vision-lab 项目同步', state: '同步中', startedAt: '2026-03-05T08:05:00Z' },
      { id: 'run-rd-2', name: 'tmux:train-lora', state: '会话存活', startedAt: '2026-03-05T06:45:00Z' },
      { id: 'run-rd-3', name: '数据预处理任务', state: '完成', startedAt: '2026-03-04T23:20:00Z' },
    ],
    metrics: [
      { label: '今日同步流量', value: '5.8 GB', trend: 'up' },
      { label: '会话在线率', value: '99.2%', trend: 'flat' },
      { label: '失败重试次数', value: '1', trend: 'down' },
    ],
  },
  {
    id: 'flow-guardian',
    description:
      '结合系统负载与输入行为判断心流状态，智能触发休息提醒并在回归时生成进度摘要。',
    capabilities: ['系统负载检测', '久坐提醒', 'Welcome Back 摘要', '静默窗口保护'],
    recentRuns: [
      { id: 'run-fg-1', name: '午后久坐提醒', state: '已通知', startedAt: '2026-03-05T07:30:00Z' },
      { id: 'run-fg-2', name: '高负载静默策略', state: '生效中', startedAt: '2026-03-05T04:25:00Z' },
      { id: 'run-fg-3', name: 'Welcome Back 生成', state: '完成', startedAt: '2026-03-04T17:12:00Z' },
    ],
    metrics: [
      { label: '今日专注时长', value: '4.6 h', trend: 'up' },
      { label: '提醒采纳率', value: '68%', trend: 'up' },
      { label: '误打断次数', value: '0', trend: 'down' },
    ],
  },
  {
    id: 'output-generator',
    description:
      '自动处理实验数据、生成图表并编译 Typst 报告，保持数据脚本和产物可追溯。',
    capabilities: ['数据清洗脚本生成', '图表渲染', 'Typst 编译', '报告产物溯源'],
    recentRuns: [
      { id: 'run-og-1', name: 'AUC 对比实验报告', state: '已完成', startedAt: '2026-03-05T06:05:00Z' },
      { id: 'run-og-2', name: '课程实验周报', state: '编译中', startedAt: '2026-03-05T03:35:00Z' },
      { id: 'run-og-3', name: '会议投影片导出', state: '已完成', startedAt: '2026-03-04T19:18:00Z' },
    ],
    metrics: [
      { label: '平均生成耗时', value: '2m 43s', trend: 'down' },
      { label: '编译成功率', value: '98.4%', trend: 'up' },
      { label: '模板复用率', value: '72%', trend: 'up' },
    ],
  },
  {
    id: 'research-brain',
    description:
      '面向复杂论文版面进行多模态解析与跨文献指标追踪，提升检索准确性与可溯源能力。',
    capabilities: ['PDF 结构化解析', '跨论文语义检索', '指标演进追踪', '引用链可视化'],
    recentRuns: [
      { id: 'run-rb-1', name: 'arXiv:2509.02011 入库', state: '解析中', startedAt: '2026-03-05T08:12:00Z' },
      { id: 'run-rb-2', name: 'AUC 基线追踪查询', state: '完成', startedAt: '2026-03-05T06:52:00Z' },
      { id: 'run-rb-3', name: '图表上下文校验', state: '完成', startedAt: '2026-03-04T21:40:00Z' },
    ],
    metrics: [
      { label: '新增文献索引', value: '37', trend: 'up' },
      { label: '跨文献命中率', value: '91%', trend: 'up' },
      { label: '幻觉纠偏率', value: '83%', trend: 'flat' },
    ],
  },
  {
    id: 'socratic-interceptor',
    description:
      '在启发式导师模式下拦截直接代码输出，转为复杂度分析与边界用例引导。',
    capabilities: ['前置工具拦截', '边界用例生成', '复杂度提示', '模式化教学策略'],
    recentRuns: [
      { id: 'run-si-1', name: '图搜索题目引导', state: '已拦截', startedAt: '2026-03-05T07:15:00Z' },
      { id: 'run-si-2', name: '树遍历边界分析', state: '完成', startedAt: '2026-03-05T05:40:00Z' },
      { id: 'run-si-3', name: '动态规划提示注入', state: '完成', startedAt: '2026-03-04T22:30:00Z' },
    ],
    metrics: [
      { label: '拦截命中率', value: '88%', trend: 'up' },
      { label: '用户自解率', value: '61%', trend: 'up' },
      { label: '误拦截', value: '1', trend: 'down' },
    ],
  },
];

export const mockRecentVisits: RecentVisitDTO[] = [
  {
    id: 'rv-1',
    title: 'AUC 基线追踪查询',
    path: '/modules/research-brain',
    visitedAt: '2026-03-05T08:12:00Z',
    category: 'module',
  },
  {
    id: 'rv-2',
    title: 'Deadline 风险任务清单',
    path: '/modules/deadline-engine',
    visitedAt: '2026-03-05T07:50:00Z',
    category: 'module',
  },
  {
    id: 'rv-3',
    title: '活动时间线',
    path: '/activity',
    visitedAt: '2026-03-05T07:33:00Z',
    category: 'activity',
  },
  {
    id: 'rv-4',
    title: '远程会话状态',
    path: '/modules/remote-dispatcher',
    visitedAt: '2026-03-05T06:45:00Z',
    category: 'module',
  },
];

export const mockActivityEvents: ActivityEventDTO[] = [
  {
    id: 'evt-1',
    at: '2026-03-05T08:18:00Z',
    level: 'success',
    source: 'output-generator',
    message: 'AUC 对比实验报告已生成并归档到 /reports/auc-compare.pdf',
  },
  {
    id: 'evt-2',
    at: '2026-03-05T08:12:00Z',
    level: 'info',
    source: 'research-brain',
    message: '新文献解析队列 +1，正在构建图表上下文索引。',
  },
  {
    id: 'evt-3',
    at: '2026-03-05T07:50:00Z',
    level: 'warning',
    source: 'deadline-engine',
    message: '任务“毕业设计开题报告”剩余缓冲时间不足 72 小时。',
  },
  {
    id: 'evt-4',
    at: '2026-03-05T07:30:00Z',
    level: 'info',
    source: 'flow-guardian',
    message: '检测到久坐 95 分钟，已发送起身活动提醒。',
  },
  {
    id: 'evt-5',
    at: '2026-03-05T06:45:00Z',
    level: 'info',
    source: 'remote-dispatcher',
    message: 'tmux 会话 train-lora 正常运行，GPU 利用率 86%。',
  },
];

export const mockCommandActions: CommandActionDTO[] = [
  {
    id: 'cmd-nav-dashboard',
    title: '前往首页总览',
    category: 'navigate',
    shortcut: 'G D',
    targetRoute: '/',
  },
  {
    id: 'cmd-nav-research',
    title: '跳转到 Research Brain',
    category: 'navigate',
    shortcut: 'G R',
    targetRoute: '/modules/research-brain',
  },
  {
    id: 'cmd-nav-activity',
    title: '打开活动时间线',
    category: 'navigate',
    shortcut: 'G A',
    targetRoute: '/activity',
  },
  {
    id: 'cmd-sim-health',
    title: '模拟触发 Flow Guardian 休息提醒',
    category: 'simulate',
    source: 'flow-guardian',
    message: '已模拟发送休息提醒，建议进行 3-5 分钟有氧恢复。',
  },
  {
    id: 'cmd-sim-sync',
    title: '模拟执行 Remote Dispatcher 增量同步',
    category: 'simulate',
    source: 'remote-dispatcher',
    message: '已模拟发起增量同步任务（排除 *.bin/*.pt）。',
  },
  {
    id: 'cmd-sim-socratic',
    title: '模拟开启 Socratic 引导模式',
    category: 'simulate',
    source: 'socratic-interceptor',
    message: '已模拟开启苏格拉底式拦截，后续代码请求将转换为引导提示。',
  },
];
