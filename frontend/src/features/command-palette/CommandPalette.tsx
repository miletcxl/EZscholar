import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import {
  useCommandActionsQuery,
  useExecuteCommandMutation,
} from '../../services/api/hooks';
import type { CommandActionDTO } from '../../services/api/types';
import { useUiStore } from '../../stores/useUiStore';

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

function groupActions(actions: CommandActionDTO[]) {
  return {
    navigate: actions.filter((item) => item.category === 'navigate'),
    simulate: actions.filter((item) => item.category === 'simulate'),
  };
}

export function CommandPalette() {
  const navigate = useNavigate();
  const isOpen = useUiStore((state) => state.isCommandPaletteOpen);
  const close = useUiStore((state) => state.closeCommandPalette);
  const pushToast = useUiStore((state) => state.pushToast);

  const { data, isLoading, isError, refetch } = useCommandActionsQuery();
  const executeMutation = useExecuteCommandMutation();

  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  function handleClose() {
    setSearch('');
    setSelectedIndex(0);
    close();
  }

  const filteredActions = useMemo(() => {
    if (!data) {
      return [];
    }

    const keyword = normalize(search);
    if (!keyword) {
      return data;
    }

    return data.filter((action) => normalize(action.title).includes(keyword));
  }, [data, search]);

  const grouped = useMemo(() => groupActions(filteredActions), [filteredActions]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const input = document.getElementById('command-search') as HTMLInputElement | null;
    input?.focus();
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const allActions = [...grouped.navigate, ...grouped.simulate];

  async function runAction(action: CommandActionDTO) {
    const result = await executeMutation.mutateAsync(action.id);

    if (action.category === 'navigate' && action.targetRoute) {
      navigate(action.targetRoute);
    }

    pushToast({
      tone: result.ok ? 'success' : 'error',
      title: result.message,
    });
    handleClose();
  }

  async function onListKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      handleClose();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, Math.max(allActions.length - 1, 0)));
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    }

    if (event.key === 'Enter' && allActions[selectedIndex]) {
      event.preventDefault();
      await runAction(allActions[selectedIndex]);
    }
  }

  return (
    <div className="command-palette-backdrop" role="presentation" onClick={handleClose}>
      <section
        className="command-palette"
        role="dialog"
        aria-label="命令面板"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="command-search-row">
          <Search size={16} />
          <input
            id="command-search"
            data-testid="command-search"
            type="text"
            placeholder="搜索页面或动作..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={onListKeyDown}
          />
        </div>

        {isLoading ? <p className="command-state">命令加载中...</p> : null}
        {isError ? (
          <p className="command-state">
            命令加载失败。
            <button type="button" onClick={() => refetch()} className="button-link">
              重试
            </button>
          </p>
        ) : null}

        {!isLoading && !isError ? (
          <div className="command-result-wrap" data-testid="command-results">
            {grouped.navigate.length > 0 ? (
              <div className="command-group">
                <p className="command-group-title">导航</p>
                {grouped.navigate.map((action) => {
                  const index = allActions.findIndex((item) => item.id === action.id);
                  return (
                    <button
                      key={action.id}
                      type="button"
                      className={`command-item ${selectedIndex === index ? 'is-selected' : ''}`}
                      onMouseEnter={() => setSelectedIndex(index)}
                      onClick={() => runAction(action)}
                    >
                      <span>{action.title}</span>
                      {action.shortcut ? <kbd>{action.shortcut}</kbd> : null}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {grouped.simulate.length > 0 ? (
              <div className="command-group">
                <p className="command-group-title">模拟动作</p>
                {grouped.simulate.map((action) => {
                  const index = allActions.findIndex((item) => item.id === action.id);
                  return (
                    <button
                      key={action.id}
                      type="button"
                      className={`command-item ${selectedIndex === index ? 'is-selected' : ''}`}
                      onMouseEnter={() => setSelectedIndex(index)}
                      onClick={() => runAction(action)}
                    >
                      <span>{action.title}</span>
                      {action.shortcut ? <kbd>{action.shortcut}</kbd> : <kbd>执行</kbd>}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {allActions.length === 0 ? <p className="command-state">没有匹配结果</p> : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
