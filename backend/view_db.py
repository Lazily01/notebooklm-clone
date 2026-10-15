"""
查看数据库内容的脚本
"""
import sqlite3
import sys

# 设置输出编码为 UTF-8
sys.stdout.reconfigure(encoding='utf-8')

# 连接数据库
db_path = "notebooklm.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 查询所有文档
cursor.execute("SELECT id, name, type, file_hash, content, summary, content_preview, parsing_status, created_at FROM documents")
docs = cursor.fetchall()

print(f"\n数据库中共有 {len(docs)} 个文档：\n")
print("=" * 100)

for doc in docs:
    doc_id, name, doc_type, file_hash, content, summary, preview, status, created = doc
    
    print(f"ID: {doc_id}")
    print(f"文件名: {name}")
    print(f"类型: {doc_type}")
    print(f"文件哈希: {file_hash}")
    print(f"内容长度: {len(content) if content else 0} 字符")
    print(f"摘要长度: {len(summary) if summary else 0} 字符")
    
    # 安全显示预览（限制长度）
    if preview:
        safe_preview = preview[:100].replace('\n', ' ').replace('\r', '')
        print(f"内容预览: {safe_preview}...")
    else:
        print(f"内容预览: 无")
    
    print(f"状态: {status}")
    print(f"创建时间: {created}")
    print("=" * 100)
    print()

conn.close()

print(f"\n数据库文件位置: {db_path}")
