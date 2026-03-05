// ─── ReminderPanel ────────────────────────────────────────────────────────────
// UI panel for the Deadline Engine module.
// Lets users schedule a browser-notification reminder with a custom message.
// Phase 1: pure in-browser timer, no network call.
import { useEffect, useRef, useState } from 'react';
import { Bell, BellOff, Clock, X, Zap } from 'lucide-react';
import { requestNotificationPermission } from '../../services/notifier/localNotifier';
import { useNotifierStore } from '../../stores/useNotifierStore';
import type { ReminderDTO } from '../../services/notifier/types';
import './ReminderPanel.css';

// ── helpers ───────────────────────────────────────────────────────────────────

function formatCountdown(fireAt: string): string {
    const ms = new Date(fireAt).getTime() - Date.now();
    if (ms <= 0) return '已触发';
    const totalSecs = Math.floor(ms / 1000);
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

const STATUS_LABEL: Record<ReminderDTO['status'], string> = {
    pending: '等待中',
    fired: '已触发',
    dismissed: '已确认',
    cancelled: '已取消',
};

const STATUS_CLASS: Record<ReminderDTO['status'], string> = {
    pending: 'reminder-status--pending',
    fired: 'reminder-status--fired',
    dismissed: 'reminder-status--dismissed',
    cancelled: 'reminder-status--cancelled',
};

// ── Component ─────────────────────────────────────────────────────────────────

const PRESETS = [
    { label: '🚰 喝水 (每 30 分钟)', title: '喝水', msg: '补充水分，保持大脑活跃', repeat: 30 },
    { label: '🚶 站立活动 (每 45 分钟)', title: '起身活动', msg: '释放下背部压力，进行 3-5 分钟放松', repeat: 45 },
    { label: '👀 远眺护眼 (每 60 分钟)', title: '远眺窗外', msg: '保护视力，缓解眼疲劳', repeat: 60 },
];

export function ReminderPanel() {
    const { reminders, permissionGranted, setPermissionGranted, addReminder, dismissReminder, cancelReminderById } =
        useNotifierStore();

    const [taskName, setTaskName] = useState('');
    const [delayMinutes, setDelayMinutes] = useState(30);
    const [message, setMessage] = useState('');
    const [isRepeat, setIsRepeat] = useState(false);
    const [repeatInterval, setRepeatInterval] = useState(30);
    const [error, setError] = useState('');

    // Tick countdown timers every second
    const [, forceUpdate] = useState(0);
    useEffect(() => {
        const id = setInterval(() => forceUpdate((n) => n + 1), 1000);
        return () => clearInterval(id);
    }, []);

    // Request notification permission once on mount
    const permRequested = useRef(false);
    useEffect(() => {
        if (!permRequested.current) {
            permRequested.current = true;
            requestNotificationPermission().then(setPermissionGranted);
        }
    }, [setPermissionGranted]);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        if (!taskName.trim()) { setError('请填写任务名称'); return; }
        if (delayMinutes <= 0) { setError('延迟时间必须大于 0 分钟'); return; }
        if (!message.trim()) { setError('请填写提醒内容'); return; }

        addReminder({
            taskName: taskName.trim(),
            message: message.trim(),
            delayMinutes,
            repeatIntervalMinutes: isRepeat ? repeatInterval : undefined
        });
        setTaskName('');
        setMessage('');
        setDelayMinutes(30);
        setIsRepeat(false);
        setRepeatInterval(30);
    }

    function handlePreset(p: typeof PRESETS[0]) {
        addReminder({
            taskName: p.title,
            message: p.msg,
            delayMinutes: p.repeat,
            repeatIntervalMinutes: p.repeat,
        });
    }

    const pending = reminders.filter((r) => r.status === 'pending');
    const history = reminders.filter((r) => r.status !== 'pending');

    return (
        <div className="reminder-panel">
            {/* Permission banner */}
            {!permissionGranted && (
                <div className="reminder-permission-banner">
                    <BellOff size={14} />
                    <span>浏览器通知权限未授予，提醒将只显示在页面内。</span>
                    <button
                        className="reminder-perm-btn"
                        onClick={() => requestNotificationPermission().then(setPermissionGranted)}
                    >
                        授权通知
                    </button>
                </div>
            )}

            {/* ── Presets ── */}
            <div className="reminder-presets">
                <p className="reminder-form-title">
                    <Zap size={14} /> 快捷预设（循环提醒）
                </p>
                <div className="reminder-preset-buttons">
                    {PRESETS.map((p, i) => (
                        <button key={i} className="reminder-preset-btn" onClick={() => handlePreset(p)}>
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Form ── */}
            <form className="reminder-form" onSubmit={handleSubmit} noValidate>
                <p className="reminder-form-title">
                    <Bell size={14} /> 新建本地提醒
                </p>

                <div className="reminder-field">
                    <label htmlFor="rp-task">任务名称</label>
                    <input
                        id="rp-task"
                        value={taskName}
                        onChange={(e) => setTaskName(e.target.value)}
                        placeholder="如：喝水、起身活动"
                    />
                </div>

                <div className="reminder-field">
                    <label htmlFor="rp-delay">首次延迟时间（分钟，如 0.1 ≈ 6秒）</label>
                    <input
                        id="rp-delay"
                        type="number"
                        min={0.1}
                        step={0.1}
                        max={1440}
                        value={delayMinutes}
                        onChange={(e) => setDelayMinutes(Number(e.target.value))}
                    />
                </div>

                <div className="reminder-field reminder-field-checkbox">
                    <label>
                        <input
                            type="checkbox"
                            checked={isRepeat}
                            onChange={(e) => setIsRepeat(e.target.checked)}
                        />
                        开启循环提醒
                    </label>
                </div>

                {isRepeat && (
                    <div className="reminder-field">
                        <label htmlFor="rp-interval">循环间隔（分钟）</label>
                        <input
                            id="rp-interval"
                            type="number"
                            min={1}
                            max={1440}
                            value={repeatInterval}
                            onChange={(e) => setRepeatInterval(Number(e.target.value))}
                        />
                    </div>
                )}

                <div className="reminder-field">
                    <label htmlFor="rp-msg">提醒内容</label>
                    <textarea
                        id="rp-msg"
                        rows={3}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="如：建议起身进行 3-5 分钟有氧恢复，释放下背部压力。"
                    />
                </div>

                {error && <p className="reminder-error">{error}</p>}

                <button type="submit" className="reminder-submit">
                    <Clock size={13} /> 设置提醒
                </button>
            </form>

            {/* ── Pending reminders ── */}
            {pending.length > 0 && (
                <div className="reminder-section">
                    <p className="reminder-section-title">⏳ 等待中 ({pending.length})</p>
                    <ul className="reminder-list">
                        {pending.map((r) => (
                            <li key={r.id} className="reminder-item reminder-item--pending">
                                <div className="reminder-item-meta">
                                    <span className="reminder-item-name">
                                        {r.repeatIntervalMinutes ? '🔄 ' : ''}{r.taskName}
                                    </span>
                                    <span className="reminder-item-countdown">{formatCountdown(r.fireAt)}</span>
                                </div>
                                <p className="reminder-item-msg">{r.message}</p>
                                <button
                                    className="reminder-item-cancel"
                                    title="取消提醒"
                                    onClick={() => cancelReminderById(r.id)}
                                >
                                    <X size={12} /> 取消
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* ── History ── */}
            {history.length > 0 && (
                <div className="reminder-section">
                    <p className="reminder-section-title">📋 历史记录</p>
                    <ul className="reminder-list">
                        {history.map((r) => (
                            <li key={r.id} className="reminder-item">
                                <div className="reminder-item-meta">
                                    <span className="reminder-item-name">{r.taskName}</span>
                                    <span className={`reminder-status ${STATUS_CLASS[r.status]}`}>
                                        {STATUS_LABEL[r.status]}
                                    </span>
                                </div>
                                <p className="reminder-item-msg">{r.message}</p>
                                {r.status === 'fired' && (
                                    <button
                                        className="reminder-item-dismiss"
                                        onClick={() => dismissReminder(r.id)}
                                    >
                                        已知晓
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {pending.length === 0 && history.length === 0 && (
                <p className="reminder-empty">暂无提醒，试着新建一个吧。</p>
            )}
        </div>
    );
}
