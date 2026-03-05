interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = '加载失败',
  message = '当前数据暂时不可用，请稍后重试。',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="state-card" role="alert">
      <h3>{title}</h3>
      <p>{message}</p>
      {onRetry ? (
        <button className="button-secondary" onClick={onRetry} type="button">
          重试
        </button>
      ) : null}
    </div>
  );
}
