Cyber-Scholar Agent — Frontend Implementation Plan
目标
在 C:\Users\25336\Desktop\UniHelper\UniHelperCode\frontend 目录下，从零搭建一个类似 Notion 深色模式的高级 Web 界面。此界面将作为 Cyber-Scholar Agent 的静态交互控制台。

技术栈选型
核心框架：React + Vite + TypeScript
样式方案：Vanilla CSS（原生的 CSS 模块与全局变量，摒弃 TailwindCSS，使用自定义的高级深色系调色板和微交互动画）
图标库：基于 Lucide React 或直接使用内联 SVG
界面架构 (参考 Notion 设计)
左侧固定侧边栏 (Sidebar)

工作空间切换器与用户头像
基础导航：搜索 (Search)、主页 (Home)、会议 (Meetings)、Notion AI、收件箱 (Inbox)、库 (Library)
代理节点 (Agents)：展示已挂载的底层 Agent 实例
深色系毛玻璃质感与 hover 动画
右侧主内容区 (Main Content)

顶部导航栏 (Header)：面包屑导航栏、全局控制按钮（全屏、设置）
最近访问 (Recently Visited)：展示最近交互过的文件或任务卡片
核心功能区 (Getting Started / Agent Features)：网格系统排列卡片，静态展示架构设计中的六大核心能力：
Deadline Engine 面板
Remote Dispatcher 中枢
Flow Guardian 状态
Output Generator 流水线
Research Brain 大脑
Socratic Interceptor 导师
活动报告 (Activity Report) / 时间线：按照时间轴展示当天的系统事件记录（如：上午 9:00 模型权重下载完毕，下午 3:00 任务提醒）
设计规范 (Aesthetics)
色阶：背景 #191919，侧边栏 #202020，卡片表面 #252525，文字为主白 #ebeced、次级灰 #9b9b9b。
互动体验：卡片与按键增加平滑过渡动画 transition: all 0.2s ease，避免设计枯燥。
排版 (Typography)：默认使用系统级无衬线字体，或引入 
Inter
。
执行步骤
[已请求授权] 在 UniHelperCode 下初始化 Vite React TS 项目（由于原目录有 md 文件，建议放在新建的 frontend 子目录内，以防冲突污染文件）。
构建全局的 index.css 设计系统（定义好颜色变量）。
编写 Sidebar 和 MainContent 组件布局。
填充 RecentVisits、FeatureGrid 和 ActivityTimeline。
在界面上体现具体的静态接口设计。