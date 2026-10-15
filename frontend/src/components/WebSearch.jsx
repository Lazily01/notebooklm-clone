import React, { useState } from 'react';
import { Search, Loader2, Globe, CheckCircle, XCircle, FileText, Trash2, ExternalLink, Check } from 'lucide-react';

/**
 * 联网搜索组件（仿 NotebookLM Fast Research）
 * 流程：搜索 → 显示结果 → 用户选择 → 导入
 */
export default function WebSearch({ onSearchComplete }) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]); // 搜索结果（仅预览，未导入）
  const [selectedResults, setSelectedResults] = useState([]); // 用户选中的结果
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [showAllResults, setShowAllResults] = useState(false); // 是否展开显示全部

  const handleSearch = async () => {
    if (!query.trim()) {
      setError('请输入搜索关键词');
      return;
    }

    setIsSearching(true);
    setError('');
    setSearchResults([]);
    setShowResults(false);
    setShowAllResults(false);

    try {
      // 只搜索，不爬取，不导入
      const response = await fetch('http://localhost:8000/web-search-preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          max_results: 5, // 搜索 5 个结果
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '搜索失败');
      }

      const data = await response.json();
      
      // 检查是否有结果
      if (!data.results || data.results.length === 0) {
        setError('未找到搜索结果，请尝试其他关键词');
        return;
      }
      
      // 只保存搜索结果，不导入
      setSearchResults(data.results || []);
      // 默认全选
      setSelectedResults(data.results.map((_, index) => index));
      setShowResults(true);
      
    } catch (err) {
      setError(err.message || '搜索失败，请重试');
    } finally {
      setIsSearching(false);
    }
  };
  
  // 切换单个结果的选中状态
  const toggleResult = (index) => {
    setSelectedResults(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };
  
  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedResults.length === searchResults.length) {
      setSelectedResults([]);
    } else {
      setSelectedResults(searchResults.map((_, index) => index));
    }
  };
  
  const handleImport = async () => {
    if (selectedResults.length === 0) {
      setError('请至少选择一个结果');
      return;
    }
    
    setIsImporting(true);
    
    try {
      // 只导入选中的结果
      const selectedUrls = selectedResults.map(index => searchResults[index].url);
      const response = await fetch('http://localhost:8000/web-search-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          urls: selectedUrls,
        }),
      });

      if (!response.ok) {
        throw new Error('导入失败');
      }

      // 导入成功，刷新文档列表
      if (onSearchComplete) {
        onSearchComplete();
      }
      
      // 清空搜索结果
      setShowResults(false);
      setSearchResults([]);
      setQuery('');
      
    } catch (err) {
      setError(err.message || '导入失败，请重试');
    } finally {
      setIsImporting(false);
    }
  };
  
  const handleDelete = () => {
    setShowResults(false);
    setSearchResults([]);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="web-search-container">
      {!showResults ? (
        /* 搜索框 */
        <div className="search-box">
          <div className="search-input-wrapper">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              placeholder="用网页搜索吧！"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isSearching}
              className="search-input"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching || !query.trim()}
              className="search-button"
            >
              {isSearching ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                '→'
              )}
            </button>
          </div>

          {/* 提示信息 */}
          <div className="search-hint">
            <Globe size={14} />
            <span>联网搜索</span>
            <span className="separator">•</span>
            <span>从全网获取最新信息</span>
          </div>
          
          {/* 错误提示 */}
          {error && (
            <div className="error-message">
              <XCircle size={14} />
              <span>{error}</span>
            </div>
          )}
        </div>
      ) : (
        /* 搜索结果卡片（仿 NotebookLM） */
        <div className="results-card">
          <div className="results-header">
            <div className="header-left">
              <Search size={18} className="header-icon" />
              <span className="header-title">搜索完成</span>
            </div>
            <button 
              className="view-button"
              onClick={() => setShowAllResults(!showAllResults)}
            >
              {showAllResults ? '收起' : '更多'}
            </button>
          </div>

          {/* 全选按钮 */}
          <div className="select-all-row" onClick={toggleSelectAll}>
            <div className="checkbox">
              {selectedResults.length === searchResults.length && (
                <Check size={14} className="check-icon" />
              )}
            </div>
            <span className="select-all-text">勾选全部</span>
          </div>

          {/* 搜索结果列表（可选择） */}
          <div className="imported-list">
            {(showAllResults ? searchResults : searchResults.slice(0, 3)).map((result, index) => (
              <div key={index} className="source-item">
                <div className="source-content" onClick={() => toggleResult(index)}>
                  <FileText size={18} className="source-icon" />
                  <div className="source-info">
                    <div className="source-title">{result.title}</div>
                    <div className="source-snippet">{result.snippet || result.url}</div>
                  </div>
                </div>
                <div className="source-actions">
                  <button 
                    className="icon-btn"
                    onClick={() => window.open(result.url, '_blank')}
                    title="Open in new tab"
                  >
                    <ExternalLink size={16} />
                  </button>
                  <div 
                    className={`checkbox ${selectedResults.includes(index) ? 'checked' : ''}`}
                    onClick={() => toggleResult(index)}
                  >
                    {selectedResults.includes(index) && (
                      <Check size={14} className="check-icon" />
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {/* 显示更多按钮 */}
            {!showAllResults && searchResults.length > 3 && (
              <div className="show-more-btn" onClick={() => setShowAllResults(true)}>
                <Globe size={14} />
                <span>显示更多 {searchResults.length - 3} 个结果</span>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="actions">
            <button className="action-btn delete-btn" onClick={handleDelete}>
              <Trash2 size={14} />
              <span>删除</span>
            </button>
            <button 
              className="action-btn import-btn" 
              onClick={handleImport}
              disabled={isImporting}
            >
              {isImporting ? (
                <>
                  <Loader2 className="animate-spin" size={14} />
                  <span>导入中</span>
                </>
              ) : (
                <>
                  <CheckCircle size={14} />
                  <span>导入选中</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .web-search-container {
          background: var(--color-surface);
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
          overflow: hidden;
          box-shadow: var(--shadow-sm);
          transition: var(--transition-base);
        }
        
        .web-search-container:hover {
          box-shadow: var(--shadow-md);
        }

        .search-box {
          padding: var(--space-4);
        }
        
        /* 结果卡片样式（仿 NotebookLM） */
        .results-card {
          background: var(--color-primary-light);
          padding: var(--space-4);
        }
        
        .results-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-3);
        }
        
        .header-left {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        
        .header-icon {
          color: var(--color-primary);
        }
        
        .header-title {
          font-size: var(--text-sm);
          font-weight: var(--font-semibold);
          color: var(--color-text-primary);
        }
        
        .view-button {
          font-size: var(--text-xs);
          color: var(--color-primary);
          background: transparent;
          border: none;
          cursor: pointer;
          font-weight: var(--font-medium);
          transition: var(--transition-fast);
        }
        
        .view-button:hover {
          color: var(--color-primary-hover);
          text-decoration: underline;
        }
        
        /* 全选行 */
        .select-all-row {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-3);
          background: var(--color-surface);
          border-radius: var(--radius-md);
          margin-bottom: var(--space-2);
          cursor: pointer;
          transition: var(--transition-base);
        }
        
        .select-all-row:hover {
          background: var(--color-surface-hover);
        }
        
        .select-all-text {
          font-size: var(--text-sm);
          font-weight: var(--font-medium);
          color: var(--color-text-primary);
        }
        
        /* 复选框样式 */
        .checkbox {
          width: 20px;
          height: 20px;
          border: 2px solid var(--color-border-dark);
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: var(--transition-base);
          flex-shrink: 0;
        }
        
        .checkbox:hover {
          border-color: var(--color-text-tertiary);
          background: var(--color-surface-hover);
        }
        
        .checkbox.checked {
          background: var(--color-primary);
          border-color: var(--color-primary);
          transform: scale(1.05);
        }
        
        .checkbox.checked:hover {
          background: var(--color-primary-hover);
          border-color: var(--color-primary-hover);
        }
        
        .check-icon {
          color: var(--color-surface);
        }
        
        .imported-list {
          background: var(--color-surface);
          border-radius: var(--radius-md);
          padding: var(--space-1);
          margin-bottom: var(--space-3);
          max-height: 400px;
          overflow-y: auto;
        }
        
        /* 源项目样式 */
        .source-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-3);
          border-radius: var(--radius-md);
          margin-bottom: var(--space-2);
          border: 1px solid transparent;
          transition: var(--transition-base);
          background: var(--color-surface);
        }
        
        .source-item:hover {
          background: var(--color-surface-hover);
          border-color: var(--color-border);
          box-shadow: var(--shadow-xs);
          transform: translateX(2px);
        }
        
        .source-content {
          display: flex;
          align-items: flex-start;
          gap: var(--space-3);
          flex: 1;
          cursor: pointer;
          min-width: 0;
        }
        
        .source-icon {
          color: var(--color-primary);
          flex-shrink: 0;
          margin-top: 2px;
        }
        
        .source-info {
          flex: 1;
          min-width: 0;
        }
        
        .source-title {
          font-size: var(--text-sm);
          font-weight: var(--font-medium);
          color: var(--color-text-primary);
          margin-bottom: var(--space-1);
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        
        .source-snippet {
          font-size: var(--text-xs);
          color: var(--color-text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        
        .source-actions {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          flex-shrink: 0;
        }
        
        .icon-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          border-radius: var(--radius-sm);
          cursor: pointer;
          color: var(--color-text-secondary);
          transition: var(--transition-base);
        }
        
        .icon-btn:hover {
          background: var(--color-bg-secondary);
          color: var(--color-text-primary);
        }
        
        /* 显示更多按钮 */
        .show-more-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-2);
          padding: var(--space-3);
          margin: var(--space-1) var(--space-2);
          font-size: var(--text-xs);
          color: var(--color-primary);
          cursor: pointer;
          border-radius: var(--radius-sm);
          transition: var(--transition-base);
        }
        
        .show-more-btn:hover {
          background: var(--color-bg-secondary);
        }
        
        .actions {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        
        .action-btn {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-2) var(--space-4);
          border: none;
          border-radius: var(--radius-md);
          font-size: var(--text-xs);
          font-weight: var(--font-medium);
          cursor: pointer;
          background: var(--color-surface);
          color: var(--color-text-secondary);
          transition: var(--transition-base);
          box-shadow: var(--shadow-xs);
        }
        
        .action-btn:hover {
          background: var(--color-bg-secondary);
          transform: translateY(-1px);
          box-shadow: var(--shadow-sm);
        }
        
        .action-btn:active {
          transform: translateY(0);
        }
        
        .delete-btn {
          margin-left: auto;
        }
        
        .delete-btn:hover {
          background: var(--color-error-light);
          color: var(--color-error);
        }
        
        .import-btn {
          background: var(--color-primary);
          color: var(--color-surface);
        }
        
        .import-btn:hover {
          background: var(--color-primary-hover);
        }
        
        .import-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .search-input-wrapper {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-3);
          border: 2px solid var(--color-border);
          border-radius: var(--radius-lg);
          background: var(--color-bg-primary);
          margin-bottom: var(--space-3);
          transition: var(--transition-base);
        }

        .search-input-wrapper:focus-within {
          border-color: var(--color-primary);
          background: var(--color-surface);
          box-shadow: var(--shadow-focus);
        }

        .search-icon {
          color: var(--color-text-tertiary);
          flex-shrink: 0;
        }

        .search-input {
          flex: 1;
          border: none;
          outline: none;
          font-size: var(--text-sm);
          color: var(--color-text-primary);
          background: transparent;
        }

        .search-input::placeholder {
          color: var(--color-text-tertiary);
        }

        .search-button {
          background: transparent;
          color: var(--color-primary);
          border: none;
          padding: var(--space-1);
          cursor: pointer;
          display: flex;
          align-items: center;
          border-radius: var(--radius-sm);
          transition: var(--transition-base);
          flex-shrink: 0;
        }

        .search-button:hover:not(:disabled) {
          background: var(--color-primary-light);
        }

        .search-button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .search-hint {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-size: var(--text-xs);
          color: var(--color-text-secondary);
          padding: 0 var(--space-1);
        }

        .separator {
          color: var(--color-border-dark);
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-2) var(--space-3);
          background: var(--color-error-light);
          color: var(--color-error);
          border-radius: var(--radius-md);
          font-size: var(--text-xs);
          border: 1px solid var(--color-error);
        }

        .search-results {
          margin-top: var(--space-3);
          padding-top: var(--space-3);
          border-top: 1px solid var(--color-border);
        }

        .results-header {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          margin-bottom: var(--space-2);
          font-size: var(--text-xs);
          font-weight: var(--font-medium);
          color: var(--color-success);
        }

        .success-icon {
          color: var(--color-success);
          flex-shrink: 0;
        }

        .results-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .result-item {
          display: flex;
          align-items: flex-start;
          gap: var(--space-2);
          padding: var(--space-2);
          background: var(--color-surface-hover);
          border-radius: var(--radius-md);
          font-size: var(--text-xs);
          border: 1px solid var(--color-bg-secondary);
        }

        .result-info {
          flex: 1;
          min-width: 0;
        }

        .result-title {
          font-weight: 500;
          color: #111827;
          margin-bottom: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .result-url {
          color: #6b7280;
          font-size: 11px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
