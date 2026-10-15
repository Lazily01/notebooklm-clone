"""
数据库模型和连接配置
"""
from sqlalchemy import create_engine, Column, String, Text, DateTime, Integer, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os

# 数据库文件路径
DB_PATH = os.path.join(os.path.dirname(__file__), "..", "notebooklm.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

# 创建数据库引擎
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 创建基类
Base = declarative_base()


class Document(Base):
    """文档模型"""
    __tablename__ = "documents"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # pdf, word, audio, image
    file_hash = Column(String, index=True)  # 文件 MD5 哈希，用于去重
    content = Column(Text)  # 文档文本内容
    raw_content = Column(Text)  # base64 编码的原始文件
    file_id = Column(String)  # Qwen-Long file-id（如果使用）
    summary = Column(Text)  # 摘要
    content_preview = Column(String)  # 内容预览（前200字）
    parsing_status = Column(String, default="ready")  # ready, parsing, error
    transcription_status = Column(String)  # 音频转录状态
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Conversation(Base):
    """会话模型"""
    __tablename__ = "conversations"
    
    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)  # 会话标题
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关联的消息
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    """消息模型"""
    __tablename__ = "messages"
    
    id = Column(String, primary_key=True, index=True)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False)
    role = Column(String, nullable=False)  # user, assistant
    content = Column(Text, nullable=False)  # 消息内容
    sources = Column(JSON)  # 引用来源（JSON 格式）
    suggestions = Column(JSON)  # 联想问题（JSON 格式）
    citation_map = Column(JSON)  # 引用映射（JSON 格式）
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关联的会话
    conversation = relationship("Conversation", back_populates="messages")


# 创建所有表
def init_db():
    """初始化数据库"""
    Base.metadata.create_all(bind=engine)
    print(f"[Database] 数据库初始化完成: {DB_PATH}")


# 获取数据库会话
def get_db():
    """获取数据库会话"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
